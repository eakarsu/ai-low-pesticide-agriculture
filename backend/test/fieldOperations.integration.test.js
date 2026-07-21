'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const jwt = require('jsonwebtoken');

const enabled = Boolean(process.env.TEST_DATABASE_URL);
if (enabled) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET ||= 'integration-test-secret-that-is-longer-than-32-chars';
process.env.DEFAULT_TENANT_ID ||= 'test-tenant';
process.env.CORS_ORIGIN ||= 'http://localhost:5173';
process.env.PROVIDER_WEBHOOK_SECRETS_JSON = JSON.stringify({
  payment: 'payment-webhook-secret-that-is-at-least-32-chars',
  maps: 'maps-webhook-secret-that-is-at-least-32-characters',
  calendar: 'calendar-webhook-secret-at-least-32-characters',
  messaging: 'messaging-webhook-secret-at-least-32-characters',
  tax: 'tax-webhook-secret-that-is-at-least-32-characters',
  accounting: 'accounting-webhook-secret-at-least-32-characters',
});

const app = require('../server');
const pool = require('../db');
const policy = require('../governance/fieldOperations');
const providers = require('../services/providers');

const suite = test.describe;

suite('field operations PostgreSQL/API lifecycle', { skip: !enabled }, () => {
  let server; let base;
  const tenantId = 'test-tenant';

  test.before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  test.beforeEach(async () => {
    await pool.query('ALTER TABLE field_operation_events DISABLE TRIGGER field_operation_events_no_truncate');
    await pool.query(`TRUNCATE field_provider_webhooks,field_offline_mutations,field_payments,
      field_customer_communications,field_change_orders,field_invoices,field_inventory_reservations,
      field_provider_outbox,field_operation_events,service_order_lines,service_orders,
      field_technician_blackouts,field_technician_skills,field_technicians,field_inventory
      RESTART IDENTITY CASCADE`);
    await pool.query('ALTER TABLE field_operation_events ENABLE TRIGGER field_operation_events_no_truncate');
    for (const id of ['tech-a', 'tech-b']) {
      await pool.query(`INSERT INTO field_technicians(id,tenant_id,name,service_radius_km,home_location_ref)
        VALUES($1,$2,$3,50,'depot-1')`, [id, tenantId, id]);
      await pool.query(`INSERT INTO field_technician_skills VALUES($1,$2,'ipm'),($1,$2,'spraying')`, [tenantId, id]);
    }
    await pool.query(`INSERT INTO field_inventory(tenant_id,sku,description,on_hand) VALUES($1,'BIO-1','Biological control',20)`, [tenantId]);
  });

  function auth(role = 'admin', id = 101) {
    return jwt.sign({ id, role, tenantId }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '10m' });
  }

  async function request(method, path, body, options = {}) {
    const headers = { authorization: `Bearer ${options.token || auth()}`, 'content-type': 'application/json', ...(options.headers || {}) };
    const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const payload = await response.json();
    return { status: response.status, body: payload };
  }

  function orderBody(offsetHours = 0, technicianId = 'tech-a') {
    const startsAt = new Date(Date.UTC(2026, 7, 1, 10 + offsetHours)).toISOString();
    const endsAt = new Date(Date.UTC(2026, 7, 1, 12 + offsetHours)).toISOString();
    return {
      fieldId: null, serviceAddressRef: 'field:north-40', taxBasisPoints: 725,
      booking: { technicianId, startsAt, endsAt, travelKm: 12, requiredSkills: ['ipm'] },
      lines: [
        { kind: 'labor', description: 'Threshold-guided IPM service', quantity: 2, unitCents: 5000 },
        { kind: 'inventory', sku: 'BIO-1', description: 'Biological control unit', quantity: 2, unitCents: 1200 },
      ],
    };
  }

  async function createOrder(key = crypto.randomUUID(), body = orderBody()) {
    return request('POST', '/api/field-operations/orders', body, { headers: { 'idempotency-key': key } });
  }

  async function transition(order, toStatus, extra = {}, token) {
    return request('POST', `/api/field-operations/orders/${order.id}/transitions`,
      { expectedVersion: order.version, toStatus, travelKm: 12, ...extra }, { token });
  }

  async function progressToBooked(order) {
    let response = await transition(order, 'quote_sent'); assert.equal(response.status, 200);
    response = await transition(response.body, 'booked'); assert.equal(response.status, 200);
    return response.body;
  }

  test('idempotent quotes and advisory booking locks prevent concurrent overbooking', async () => {
    await assert.rejects(pool.query('TRUNCATE field_operation_events'), /append-only/);
    const key = 'quote-idempotency-1';
    const first = await createOrder(key); assert.equal(first.status, 201);
    const duplicate = await createOrder(key); assert.equal(duplicate.status, 200); assert.equal(duplicate.body.id, first.body.id);
    const conflict = await createOrder(key, { ...orderBody(), taxBasisPoints: 800 }); assert.equal(conflict.status, 409);
    const second = await createOrder('quote-idempotency-2'); assert.equal(second.status, 201);
    const sentOne = await transition(first.body, 'quote_sent');
    const sentTwo = await transition(second.body, 'quote_sent');
    const attempts = await Promise.all([transition(sentOne.body, 'booked'), transition(sentTwo.body, 'booked')]);
    assert.deepEqual(attempts.map((entry) => entry.status).sort(), [200, 409]);
    const inventory = (await pool.query(`SELECT reserved FROM field_inventory WHERE tenant_id=$1 AND sku='BIO-1'`, [tenantId])).rows[0];
    assert.equal(inventory.reserved, 2);
  });

  test('no-show rescheduling and reassignment remain versioned and stop after work starts', async () => {
    let order = (await createOrder()).body;
    order = await progressToBooked(order);
    let response = await transition(order, 'dispatched'); order = response.body;
    response = await transition(order, 'no_show', { reason: 'customer was not present' }); order = response.body;
    response = await request('POST', `/api/field-operations/orders/${order.id}/reschedule`, {
      expectedVersion: order.version, startsAt: '2026-08-02T10:00:00.000Z', endsAt: '2026-08-02T12:00:00.000Z',
      travelKm: 12, reason: 'customer requested another day',
    });
    assert.equal(response.status, 200); assert.equal(response.body.status, 'booked'); order = response.body;
    response = await request('POST', `/api/field-operations/orders/${order.id}/reassign`, {
      expectedVersion: order.version, technicianId: 'tech-b', travelKm: 9, reason: 'primary technician unavailable',
    });
    assert.equal(response.status, 200); assert.equal(response.body.technician_id, 'tech-b'); order = response.body;
    response = await transition(order, 'dispatched'); order = response.body;
    response = await transition(order, 'in_progress'); order = response.body;
    response = await request('POST', `/api/field-operations/orders/${order.id}/reassign`, {
      expectedVersion: order.version, technicianId: 'tech-a', travelKm: 9, reason: 'late reassignment',
    });
    assert.equal(response.status, 409);
  });

  test('partial work, approved change order, invoice, payment and full refund are auditable', async () => {
    let order = await progressToBooked((await createOrder()).body);
    order = (await transition(order, 'dispatched')).body;
    order = (await transition(order, 'in_progress')).body;
    let response = await request('POST', `/api/field-operations/orders/${order.id}/change-orders`, {
      expectedVersion: order.version, description: 'Additional beneficial insects', quantity: 1,
      unitCents: 1500, taxBasisPoints: 725,
    }, { token: auth('technician', 202) });
    assert.equal(response.status, 201); const change = response.body;
    order = (await request('GET', `/api/field-operations/orders/${order.id}`)).body;
    response = await request('POST', `/api/field-operations/orders/${order.id}/change-orders/${change.id}/decision`,
      { decision: 'approved', reason: 'customer approved additional treatment' }, { token: auth('customer', 101) });
    assert.equal(response.status, 200);
    order = (await request('GET', `/api/field-operations/orders/${order.id}`)).body;
    response = await transition(order, 'partially_completed', { workSummary: { completed: ['north rows'], remaining: ['south rows'] } }, auth('technician', 202));
    assert.equal(response.status, 200); order = response.body;
    response = await transition(order, 'invoiced', {}, auth('finance', 303));
    assert.equal(response.status, 200); order = response.body;
    const consumed = (await pool.query(`SELECT on_hand,reserved FROM field_inventory WHERE tenant_id=$1 AND sku='BIO-1'`, [tenantId])).rows[0];
    assert.deepEqual(consumed, { on_hand: 18, reserved: 0 });
    const detail = (await request('GET', `/api/field-operations/orders/${order.id}`)).body;
    assert.equal(detail.invoice.status, 'issued');
    const providerRows = await pool.query('SELECT DISTINCT provider FROM field_provider_outbox WHERE order_id=$1', [order.id]);
    assert.deepEqual(providerRows.rows.map((row) => row.provider).sort(), ['accounting', 'calendar', 'maps', 'messaging', 'payment', 'tax']);
    const charge = { type: 'charge.succeeded', tenantId, orderId: order.id,
      amountCents: Number(detail.invoice.total_cents), providerPaymentId: 'pay-1',
      idempotencyKey: `${order.id}:payment:charge`, receipt: 'receipt-charge-1' };
    const paymentSecret = JSON.parse(process.env.PROVIDER_WEBHOOK_SECRETS_JSON).payment;
    response = await request('POST', '/api/field-operations/webhooks/payment', charge, { token: '', headers: {
      authorization: '', 'x-provider-event-id': 'evt-charge-1', 'x-provider-signature': policy.signWebhook(paymentSecret, charge),
    } });
    assert.equal(response.status, 202, JSON.stringify(response.body)); assert.equal(response.body.result.status, 'paid');
    order = (await request('GET', `/api/field-operations/orders/${order.id}`)).body;
    response = await transition(order, 'refund_pending', { reason: 'service outcome guarantee' }, auth('finance', 303));
    assert.equal(response.status, 200); order = response.body;
    const refund = { type: 'refund.succeeded', tenantId, orderId: order.id,
      amountCents: Number(detail.invoice.total_cents), providerPaymentId: 'refund-1',
      idempotencyKey: `${order.id}:payment:refund`, receipt: 'receipt-refund-1' };
    response = await request('POST', '/api/field-operations/webhooks/payment', refund, { token: '', headers: {
      authorization: '', 'x-provider-event-id': 'evt-refund-1', 'x-provider-signature': policy.signWebhook(paymentSecret, refund),
    } });
    assert.equal(response.status, 202, JSON.stringify(response.body)); assert.equal(response.body.result.status, 'refunded');
    const duplicate = await request('POST', '/api/field-operations/webhooks/payment', refund, { token: '', headers: {
      authorization: '', 'x-provider-event-id': 'evt-refund-1', 'x-provider-signature': policy.signWebhook(paymentSecret, refund),
    } });
    assert.equal(duplicate.status, 200); assert.equal(duplicate.body.duplicate, true);
    const events = (await request('GET', `/api/field-operations/orders/${order.id}`)).body.events;
    assert.ok(events.some((entry) => entry.to_status === 'paid'));
    assert.ok(events.some((entry) => entry.to_status === 'refunded'));
  });

  test('offline recovery is idempotent and reports stale-version conflicts', async () => {
    let order = await progressToBooked((await createOrder()).body);
    order = (await transition(order, 'dispatched')).body;
    order = (await transition(order, 'in_progress')).body;
    const mutation = { deviceId: 'tablet-7', mutationId: 'mutation-1', orderId: order.id,
      baseVersion: order.version, type: 'work_summary', changes: { note: 'completed north boundary offline' } };
    let response = await request('POST', '/api/field-operations/offline/mutations', mutation, { token: auth('technician', 202) });
    assert.equal(response.status, 202); assert.equal(response.body.status, 'accepted');
    response = await request('POST', '/api/field-operations/offline/mutations', mutation, { token: auth('technician', 202) });
    assert.equal(response.status, 202); assert.equal(response.body.status, 'accepted');
    response = await request('POST', '/api/field-operations/offline/mutations', { ...mutation, mutationId: 'mutation-2' }, { token: auth('technician', 202) });
    assert.equal(response.status, 409); assert.equal(response.body.status, 'conflict');
  });

  test('cancellation releases inventory and provider failures dead-letter for explicit replay', async () => {
    let order = await progressToBooked((await createOrder()).body);
    let response = await transition(order, 'cancelled', { reason: 'weather made treatment unsafe' });
    assert.equal(response.status, 200);
    const inventory = (await pool.query(`SELECT reserved FROM field_inventory WHERE tenant_id=$1 AND sku='BIO-1'`, [tenantId])).rows[0];
    assert.equal(inventory.reserved, 0);
    process.env.PROVIDER_ENDPOINTS_JSON = '{}'; process.env.PROVIDER_TOKENS_JSON = '{}';
    const result = await providers.workOnce(pool);
    assert.equal(result.status, 'dead_letter');
    response = await request('POST', `/api/field-operations/provider-jobs/${result.id}/replay`, {});
    assert.equal(response.status, 200); assert.equal(response.body.status, 'pending');
    let seenIdempotency = '';
    const providerServer = http.createServer((req, res) => {
      seenIdempotency = String(req.headers['idempotency-key'] || '');
      req.resume(); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ receipt: 'provider-receipt-1' }));
    });
    await new Promise((resolve) => providerServer.listen(0, '127.0.0.1', resolve));
    const endpoint = `http://127.0.0.1:${providerServer.address().port}`;
    process.env.PROVIDER_ENDPOINTS_JSON = JSON.stringify(Object.fromEntries(['maps', 'calendar', 'messaging', 'payment', 'tax', 'accounting'].map((name) => [name, endpoint])));
    process.env.PROVIDER_TOKENS_JSON = JSON.stringify(Object.fromEntries(['maps', 'calendar', 'messaging', 'payment', 'tax', 'accounting'].map((name) => [name, 'provider-test-token-long-enough'])));
    const completed = await providers.workOnce(pool);
    await new Promise((resolve) => providerServer.close(resolve));
    assert.equal(completed.status, 'completed'); assert.ok(seenIdempotency);
  });
});
