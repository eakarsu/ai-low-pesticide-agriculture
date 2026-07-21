'use strict';

const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const policy = require('../governance/fieldOperations');
const providers = require('../services/providers');
const router = express.Router();

const ACTIVE_SCHEDULE = ['booked', 'dispatched', 'in_progress', 'change_requested', 'partially_completed'];

class DomainError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function domain(status, code, message) { throw new DomainError(status, code, message); }
function policyCheck(fn) {
  try { return fn(); } catch (error) { domain(422, 'invalid_operation', error.message); }
}
function requireRole(user, ...roles) {
  if (!roles.includes(user.role) && user.role !== 'admin') domain(403, 'forbidden', 'role cannot perform this operation');
}
function route(handler) {
  return async (req, res, next) => {
    try { await handler(req, res); }
    catch (error) {
      if (error instanceof DomainError || error instanceof providers.ProviderError) {
        res.status(error.status || 409).json({ error: error.code || 'provider_error', message: error.message });
      } else next(error);
    }
  };
}
async function transaction(callback) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await callback(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
async function lockOrder(client, tenantId, id) {
  const found = await client.query('SELECT * FROM service_orders WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [id, tenantId]);
  if (!found.rowCount) domain(404, 'not_found', 'order not found');
  return found.rows[0];
}
async function event(client, tenantId, orderId, type, actor, fromStatus, toStatus, reason = null, payload = {}) {
  await client.query(
    `INSERT INTO field_operation_events(tenant_id,order_id,event_type,from_status,to_status,actor_id,actor_role,reason,payload)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [tenantId, orderId, type, fromStatus, toStatus, String(actor.id), actor.role, reason, JSON.stringify(payload)]
  );
}
function bookingFrom(body) {
  const booking = body.booking || {};
  policyCheck(() => policy.assertIdentifier(booking.technicianId, 'technician id'));
  const starts = new Date(booking.startsAt); const ends = new Date(booking.endsAt);
  if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || starts >= ends) domain(422, 'invalid_schedule', 'invalid booking interval');
  if (ends - starts > 7 * 24 * 3600 * 1000) domain(422, 'invalid_schedule', 'booking cannot exceed seven days');
  if (!Number.isFinite(booking.travelKm) || booking.travelKm < 0) domain(422, 'invalid_travel', 'travelKm must be non-negative');
  const skills = booking.requiredSkills || [];
  if (!Array.isArray(skills) || skills.length > 20) domain(422, 'invalid_skills', 'requiredSkills must contain at most 20 values');
  skills.forEach((skill) => policyCheck(() => policy.assertIdentifier(skill, 'skill')));
  return { ...booking, startsAt: starts.toISOString(), endsAt: ends.toISOString(), requiredSkills: [...new Set(skills)] };
}
async function assertResource(client, tenantId, booking, excludeOrderId = null) {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`${tenantId}:${booking.technicianId}`]);
  const tech = await client.query(
    `SELECT t.*,COALESCE(array_agg(s.skill) FILTER (WHERE s.skill IS NOT NULL),'{}') skills
     FROM field_technicians t LEFT JOIN field_technician_skills s ON s.tenant_id=t.tenant_id AND s.technician_id=t.id
     WHERE t.tenant_id=$1 AND t.id=$2 AND t.active GROUP BY t.tenant_id,t.id`,
    [tenantId, booking.technicianId]
  );
  if (!tech.rowCount) domain(422, 'technician_unavailable', 'technician does not exist or is inactive');
  const overlap = await client.query(
    `SELECT id FROM service_orders WHERE tenant_id=$1 AND technician_id=$2 AND id<>COALESCE($5::uuid,'00000000-0000-0000-0000-000000000000'::uuid)
       AND status=ANY($6::text[]) AND starts_at<$4 AND ends_at>$3 LIMIT 1`,
    [tenantId, booking.technicianId, booking.startsAt, booking.endsAt, excludeOrderId, ACTIVE_SCHEDULE]
  );
  if (overlap.rowCount) domain(409, 'overbooked', 'technician has an overlapping job');
  const blackout = await client.query(
    `SELECT id FROM field_technician_blackouts WHERE tenant_id=$1 AND technician_id=$2 AND starts_at<$4 AND ends_at>$3 LIMIT 1`,
    [tenantId, booking.technicianId, booking.startsAt, booking.endsAt]
  );
  if (blackout.rowCount) domain(409, 'technician_blackout', 'technician is unavailable in this interval');
  policyCheck(() => policy.assertBooking({
    requiredSkills: booking.requiredSkills,
    technician: { skills: tech.rows[0].skills, serviceRadiusKm: Number(tech.rows[0].service_radius_km) },
    travelKm: booking.travelKm, startsAt: booking.startsAt, endsAt: booking.endsAt,
    existingBookings: [], inventory: [],
  }));
  return tech.rows[0];
}
function inventoryLines(lines) {
  return (lines || []).filter((line) => line.kind === 'inventory').map((line) => ({ sku: line.sku, quantity: line.quantity }));
}
async function assertInventory(client, tenantId, lines, reserve = false, orderId = null) {
  for (const line of inventoryLines(lines)) {
    policyCheck(() => policy.assertIdentifier(line.sku, 'inventory sku'));
    const found = await client.query('SELECT * FROM field_inventory WHERE tenant_id=$1 AND sku=$2 FOR UPDATE', [tenantId, line.sku]);
    if (!found.rowCount || found.rows[0].on_hand - found.rows[0].reserved < line.quantity) domain(409, 'inventory_unavailable', `insufficient inventory: ${line.sku}`);
    if (reserve) {
      await client.query('UPDATE field_inventory SET reserved=reserved+$1,version=version+1,updated_at=NOW() WHERE tenant_id=$2 AND sku=$3', [line.quantity, tenantId, line.sku]);
      await client.query(
        `INSERT INTO field_inventory_reservations(tenant_id,order_id,sku,quantity) VALUES($1,$2,$3,$4)
         ON CONFLICT(order_id,sku) DO NOTHING`, [tenantId, orderId, line.sku, line.quantity]
      );
    }
  }
}
async function releaseInventory(client, tenantId, orderId, consume = false) {
  const held = await client.query(
    `SELECT r.*,i.reserved,i.on_hand FROM field_inventory_reservations r JOIN field_inventory i USING(tenant_id,sku)
     WHERE r.tenant_id=$1 AND r.order_id=$2 AND r.state='reserved' FOR UPDATE OF i,r`, [tenantId, orderId]
  );
  for (const row of held.rows) {
    await client.query(
      `UPDATE field_inventory SET reserved=reserved-$1,on_hand=on_hand-$2,version=version+1,updated_at=NOW()
       WHERE tenant_id=$3 AND sku=$4`, [row.quantity, consume ? row.quantity : 0, tenantId, row.sku]
    );
    await client.query('UPDATE field_inventory_reservations SET state=$1 WHERE order_id=$2 AND sku=$3', [consume ? 'consumed' : 'released', orderId, row.sku]);
  }
}
async function orderLines(client, orderId) {
  return (await client.query('SELECT * FROM service_order_lines WHERE order_id=$1 ORDER BY line_no', [orderId])).rows;
}

router.post('/webhooks/:provider', route(async (req, res) => {
  const secrets = providers.parseObjectEnv('PROVIDER_WEBHOOK_SECRETS_JSON');
  const provider = req.params.provider;
  const eventId = String(req.get('x-provider-event-id') || '');
  if (!eventId || eventId.length > 200 || !policy.verifyWebhook(secrets[provider], req.body, req.get('x-provider-signature'))) domain(401, 'invalid_signature', 'invalid provider signature');
  const payloadDigest = policy.digest(req.body);
  const result = await transaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO field_provider_webhooks(provider,provider_event_id,payload_digest) VALUES($1,$2,$3)
       ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING provider_event_id`, [provider, eventId, payloadDigest]
    );
    if (!inserted.rowCount) {
      const existing = await client.query('SELECT * FROM field_provider_webhooks WHERE provider=$1 AND provider_event_id=$2', [provider, eventId]);
      if (existing.rows[0]?.payload_digest !== payloadDigest) domain(409, 'event_conflict', 'event ID is bound to another payload');
      return { duplicate: true, result: existing.rows[0].result };
    }
    const outcome = await applyWebhook(client, provider, eventId, req.body);
    await client.query(`UPDATE field_provider_webhooks SET status='processed',processed_at=NOW(),result=$1 WHERE provider=$2 AND provider_event_id=$3`, [JSON.stringify(outcome), provider, eventId]);
    return { accepted: true, result: outcome };
  });
  res.status(result.duplicate ? 200 : 202).json(result);
}));

async function applyWebhook(client, provider, eventId, payload) {
  if (payload.idempotencyKey) {
    const updated = await client.query(
      `UPDATE field_provider_outbox SET status='completed',provider_receipt=$1,lease_until=NULL,updated_at=NOW()
       WHERE provider=$2 AND idempotency_key=$3 RETURNING order_id`, [String(payload.receipt || eventId), provider, String(payload.idempotencyKey)]
    );
    if (!updated.rowCount) domain(422, 'unknown_operation', 'webhook does not match an outbound operation');
  }
  if (provider === 'messaging' && payload.communicationId) {
    await client.query(`UPDATE field_customer_communications SET status=$1,provider_receipt=$2,sent_at=CASE WHEN $1='sent' THEN NOW() ELSE sent_at END,last_error=$3 WHERE id=$4`,
      [payload.type === 'message.sent' ? 'sent' : 'failed', String(payload.receipt || eventId), payload.error || null, payload.communicationId]);
  }
  if (provider === 'tax' && payload.type === 'tax.quoted') {
    const order = await lockOrder(client, String(payload.tenantId || ''), payload.orderId);
    if (order.status !== 'quote_draft') domain(409, 'quote_locked', 'tax cannot change a quote after it is sent');
    if (!Number.isInteger(payload.taxBasisPoints) || payload.taxBasisPoints < 0 || payload.taxBasisPoints > 10000) domain(422, 'invalid_tax', 'invalid provider tax rate');
    const tax = Math.round(Number(order.subtotal_cents) * payload.taxBasisPoints / 10000);
    await client.query('UPDATE service_orders SET tax_cents=$1,total_cents=subtotal_cents+$1,version=version+1,updated_at=NOW() WHERE id=$2', [tax, order.id]);
    await event(client, order.tenant_id, order.id, 'tax_quoted', { id: provider, role: 'provider' }, order.status, order.status, null, { providerEventId: eventId, taxBasisPoints: payload.taxBasisPoints });
    return { provider, orderId: order.id, taxCents: tax };
  }
  if (provider !== 'payment') return { provider, reconciled: true };
  const type = payload.type;
  if (!['charge.succeeded', 'charge.failed', 'refund.succeeded', 'refund.failed'].includes(type)) domain(422, 'unsupported_event', 'unsupported payment event');
  policyCheck(() => policy.assertIdentifier(String(payload.orderId || ''), 'order id'));
  const order = await lockOrder(client, String(payload.tenantId || ''), payload.orderId);
  const invoice = (await client.query('SELECT * FROM field_invoices WHERE order_id=$1 FOR UPDATE', [order.id])).rows[0];
  if (!invoice) domain(409, 'invoice_missing', 'payment event has no invoice');
  const amount = policyCheck(() => policy.assertMoney(payload.amountCents));
  const kind = type.startsWith('refund') ? 'refund' : 'charge';
  if (kind === 'charge' && amount > invoice.balance_cents) domain(409, 'amount_mismatch', 'charge exceeds invoice balance');
  if (kind === 'refund' && amount !== Number(invoice.total_cents)) domain(409, 'amount_mismatch', 'only full refunds are supported');
  const succeeded = type.endsWith('succeeded');
  await client.query(
    `INSERT INTO field_payments(id,tenant_id,order_id,invoice_id,provider,provider_payment_id,kind,status,amount_cents,idempotency_key,failure_code)
     VALUES($1,$2,$3,$4,'payment',$5,$6,$7,$8,$9,$10)
     ON CONFLICT(provider,provider_payment_id) DO NOTHING`,
    [crypto.randomUUID(), order.tenant_id, order.id, invoice.id, String(payload.providerPaymentId || eventId), kind,
      succeeded ? 'succeeded' : 'failed', amount, `webhook:${eventId}`, payload.failureCode || null]
  );
  let toStatus = order.status;
  if (succeeded && kind === 'charge') {
    const balance = Number(invoice.balance_cents) - amount;
    await client.query(`UPDATE field_invoices SET balance_cents=$1,status=$2,updated_at=NOW() WHERE id=$3`, [balance, balance === 0 ? 'paid' : 'partially_paid', invoice.id]);
    if (balance === 0 && order.status === 'invoiced') toStatus = 'paid';
  } else if (succeeded && kind === 'refund') {
    await client.query(`UPDATE field_invoices SET status='refunded',balance_cents=0,updated_at=NOW() WHERE id=$1`, [invoice.id]);
    if (order.status === 'refund_pending') toStatus = 'refunded';
  } else if (!succeeded && kind === 'refund' && order.status === 'refund_pending') toStatus = 'refund_failed';
  if (toStatus !== order.status) {
    await client.query('UPDATE service_orders SET status=$1,version=version+1,updated_at=NOW() WHERE id=$2', [toStatus, order.id]);
    await event(client, order.tenant_id, order.id, 'provider_transition', { id: provider, role: 'provider' }, order.status, toStatus, payload.failureCode || null, { providerEventId: eventId });
  }
  return { provider, orderId: order.id, status: toStatus };
}

router.use(auth);

router.get('/availability', route(async (req, res) => {
  const booking = bookingFrom({ booking: { technicianId: req.query.technicianId, startsAt: req.query.startsAt,
    endsAt: req.query.endsAt, travelKm: Number(req.query.travelKm), requiredSkills: String(req.query.requiredSkills || '').split(',').filter(Boolean) } });
  await transaction((client) => assertResource(client, req.user.tenantId, booking));
  res.json({ available: true, technicianId: booking.technicianId, startsAt: booking.startsAt, endsAt: booking.endsAt });
}));

router.post('/resources/technicians', route(async (req, res) => {
  requireRole(req.user, 'dispatcher');
  const id = policyCheck(() => policy.assertIdentifier(req.body.id, 'technician id'));
  const skills = [...new Set(req.body.skills || [])];
  skills.forEach((skill) => policyCheck(() => policy.assertIdentifier(skill, 'skill')));
  if (!Number.isFinite(req.body.serviceRadiusKm) || req.body.serviceRadiusKm < 0) domain(422, 'invalid_radius', 'invalid service radius');
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO field_technicians(id,tenant_id,name,service_radius_km,home_location_ref)
       VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id,id) DO UPDATE SET name=EXCLUDED.name,service_radius_km=EXCLUDED.service_radius_km,home_location_ref=EXCLUDED.home_location_ref,version=field_technicians.version+1,updated_at=NOW()`,
      [id, req.user.tenantId, String(req.body.name || id).slice(0, 200), req.body.serviceRadiusKm, String(req.body.homeLocationRef || 'unknown').slice(0, 200)]
    );
    await client.query('DELETE FROM field_technician_skills WHERE tenant_id=$1 AND technician_id=$2', [req.user.tenantId, id]);
    for (const skill of skills) await client.query('INSERT INTO field_technician_skills VALUES($1,$2,$3)', [req.user.tenantId, id, skill]);
  });
  res.status(201).json({ id, skills });
}));

router.post('/resources/inventory', route(async (req, res) => {
  requireRole(req.user, 'dispatcher');
  const sku = policyCheck(() => policy.assertIdentifier(req.body.sku, 'sku'));
  if (!Number.isInteger(req.body.onHand) || req.body.onHand < 0) domain(422, 'invalid_inventory', 'onHand must be a non-negative integer');
  const result = await pool.query(
    `INSERT INTO field_inventory(tenant_id,sku,description,on_hand) VALUES($1,$2,$3,$4)
     ON CONFLICT(tenant_id,sku) DO UPDATE SET description=EXCLUDED.description,on_hand=EXCLUDED.on_hand,version=field_inventory.version+1,updated_at=NOW()
     WHERE EXCLUDED.on_hand>=field_inventory.reserved RETURNING *`,
    [req.user.tenantId, sku, String(req.body.description || sku).slice(0, 500), req.body.onHand]
  );
  if (!result.rowCount) domain(409, 'inventory_reserved', 'onHand cannot be lower than reserved inventory');
  res.status(201).json(result.rows[0]);
}));

router.post('/orders', route(async (req, res) => {
  const idempotencyKey = String(req.get('idempotency-key') || '');
  policyCheck(() => policy.assertIdentifier(idempotencyKey, 'idempotency key'));
  const booking = bookingFrom(req.body);
  const totals = policyCheck(() => policy.priceQuote(req.body.lines, req.body.taxBasisPoints));
  for (const line of req.body.lines) {
    if (!['labor', 'inventory'].includes(line.kind || 'labor')) domain(422, 'invalid_line', 'line kind must be labor or inventory');
    if (typeof line.description !== 'string' || !line.description.trim() || line.description.length > 1000) domain(422, 'invalid_line', 'line description is required');
    if (line.kind === 'inventory') policyCheck(() => policy.assertIdentifier(line.sku, 'inventory sku'));
  }
  const requestDigest = policy.digest(req.body);
  const id = crypto.randomUUID();
  const result = await transaction(async (client) => {
    const existing = await client.query('SELECT * FROM service_orders WHERE tenant_id=$1 AND idempotency_key=$2', [req.user.tenantId, idempotencyKey]);
    if (existing.rowCount) {
      if (existing.rows[0].request_digest !== requestDigest) domain(409, 'idempotency_conflict', 'idempotency key conflict');
      return { order: existing.rows[0], created: false };
    }
    await assertResource(client, req.user.tenantId, booking);
    await assertInventory(client, req.user.tenantId, req.body.lines, false);
    const inserted = await client.query(
      `INSERT INTO service_orders(id,tenant_id,customer_id,field_id,required_skills,service_address_ref,starts_at,ends_at,technician_id,subtotal_cents,tax_cents,total_cents,idempotency_key,request_digest,quote_expires_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW()+INTERVAL '7 days') RETURNING *`,
      [id, req.user.tenantId, req.user.id, req.body.fieldId || null, JSON.stringify(booking.requiredSkills),
        policyCheck(() => policy.assertIdentifier(req.body.serviceAddressRef, 'service address reference')),
        booking.startsAt, booking.endsAt, booking.technicianId, totals.subtotalCents, totals.taxCents, totals.totalCents, idempotencyKey, requestDigest]
    );
    for (const [index, line] of req.body.lines.entries()) {
      await client.query('INSERT INTO service_order_lines(order_id,line_no,kind,sku,description,quantity,unit_cents) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [id, index + 1, line.kind || 'labor', line.sku || null, String(line.description || '').slice(0, 1000), line.quantity, line.unitCents]);
    }
    await event(client, req.user.tenantId, id, 'created', req.user, null, 'quote_draft', null, { totals, booking });
    await providers.enqueue(client, req.user.tenantId, id, 'maps', 'distance.validate', { orderId: id, addressRef: req.body.serviceAddressRef, technicianId: booking.technicianId, claimedTravelKm: booking.travelKm }, `${id}:maps:quote`);
    await providers.enqueue(client, req.user.tenantId, id, 'tax', 'quote.calculate', { orderId: id, subtotalCents: totals.subtotalCents, addressRef: req.body.serviceAddressRef }, `${id}:tax:quote`);
    return { order: inserted.rows[0], created: true };
  });
  res.status(result.created ? 201 : 200).json(result.order);
}));

router.get('/orders/:id', route(async (req, res) => {
  const order = (await pool.query('SELECT * FROM service_orders WHERE id=$1 AND tenant_id=$2', [req.params.id, req.user.tenantId])).rows[0];
  if (!order) domain(404, 'not_found', 'order not found');
  const [lines, events, changes, invoice, communications] = await Promise.all([
    pool.query('SELECT * FROM service_order_lines WHERE order_id=$1 ORDER BY line_no', [order.id]),
    pool.query('SELECT * FROM field_operation_events WHERE tenant_id=$1 AND order_id=$2 ORDER BY occurred_at,id', [req.user.tenantId, order.id]),
    pool.query('SELECT * FROM field_change_orders WHERE tenant_id=$1 AND order_id=$2 ORDER BY created_at', [req.user.tenantId, order.id]),
    pool.query('SELECT * FROM field_invoices WHERE tenant_id=$1 AND order_id=$2', [req.user.tenantId, order.id]),
    pool.query('SELECT * FROM field_customer_communications WHERE tenant_id=$1 AND order_id=$2 ORDER BY created_at', [req.user.tenantId, order.id]),
  ]);
  res.json({ ...order, lines: lines.rows, events: events.rows, changeOrders: changes.rows,
    invoice: invoice.rows[0] || null, communications: communications.rows });
}));

router.get('/orders', route(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const values = [req.user.tenantId, limit];
  let where = 'tenant_id=$1';
  if (req.query.status) { where += ' AND status=$3'; values.push(String(req.query.status)); }
  const result = await pool.query(
    `SELECT id,status,version,customer_id,service_address_ref,starts_at,ends_at,technician_id,total_cents,updated_at
     FROM service_orders WHERE ${where} ORDER BY updated_at DESC LIMIT $2`, values
  );
  res.json({ orders: result.rows, limit });
}));

router.post('/orders/:id/transitions', route(async (req, res) => {
  const updated = await transaction(async (client) => {
    const order = await lockOrder(client, req.user.tenantId, req.params.id);
    if (order.version !== req.body.expectedVersion) domain(409, 'version_conflict', `current version is ${order.version}`);
    if (['paid', 'refunded'].includes(req.body.toStatus)) domain(409, 'provider_required', `${req.body.toStatus} is confirmed by a signed payment webhook`);
    policyCheck(() => policy.assertTransition(order.status, req.body.toStatus, req.user.role));
    const lines = await orderLines(client, order.id);
    const to = req.body.toStatus;
    const reason = policyCheck(() => policy.assertReason(req.body.reason, to === 'cancelled' || to === 'no_show'));
    if (to === 'booked') {
      const booking = bookingFrom({ booking: { technicianId: order.technician_id, startsAt: order.starts_at,
        endsAt: order.ends_at, travelKm: Number(req.body.travelKm), requiredSkills: order.required_skills } });
      await assertResource(client, order.tenant_id, booking, order.id);
      await assertInventory(client, order.tenant_id, lines, true, order.id);
      await providers.enqueue(client, order.tenant_id, order.id, 'calendar', 'reserve', { orderId: order.id, technicianId: order.technician_id, startsAt: order.starts_at, endsAt: order.ends_at }, `${order.id}:calendar:book:${order.version}`);
    }
    if (to === 'quote_sent') {
      await providers.queueCommunication(client, order.tenant_id, order.id, 'quote_sent', String(req.body.destinationRef || `customer:${order.customer_id}`), `${order.id}:message:quote:${order.version}`);
    }
    if (to === 'dispatched') {
      await providers.enqueue(client, order.tenant_id, order.id, 'maps', 'route', { orderId: order.id, technicianId: order.technician_id, addressRef: order.service_address_ref }, `${order.id}:maps:dispatch:${order.version}`);
      await providers.queueCommunication(client, order.tenant_id, order.id, 'technician_dispatched', String(req.body.destinationRef || `customer:${order.customer_id}`), `${order.id}:message:dispatch:${order.version}`);
    }
    if (to === 'partially_completed' && (!req.body.workSummary || typeof req.body.workSummary !== 'object')) domain(422, 'work_summary_required', 'partial work requires a structured work summary');
    if (to === 'completed') {
      await releaseInventory(client, order.tenant_id, order.id, true);
      await providers.enqueue(client, order.tenant_id, order.id, 'accounting', 'job.complete', { orderId: order.id, totalCents: Number(order.total_cents) }, `${order.id}:accounting:complete`);
    }
    if (to === 'invoiced') {
      if (order.status === 'partially_completed') await releaseInventory(client, order.tenant_id, order.id, true);
      const invoiceId = crypto.randomUUID();
      await client.query(
        `INSERT INTO field_invoices(id,tenant_id,order_id,subtotal_cents,tax_cents,total_cents,balance_cents,due_at)
         VALUES($1,$2,$3,$4,$5,$6,$6,NOW()+INTERVAL '30 days') ON CONFLICT(order_id) DO NOTHING`,
        [invoiceId, order.tenant_id, order.id, order.subtotal_cents, order.tax_cents, order.total_cents]
      );
      const invoice = (await client.query('SELECT * FROM field_invoices WHERE order_id=$1', [order.id])).rows[0];
      await providers.enqueue(client, order.tenant_id, order.id, 'accounting', 'invoice.issue', { orderId: order.id, invoiceId: invoice.id, totalCents: Number(invoice.total_cents) }, `${order.id}:accounting:invoice`);
      await providers.enqueue(client, order.tenant_id, order.id, 'payment', 'charge.create', { orderId: order.id, invoiceId: invoice.id, amountCents: Number(invoice.total_cents) }, `${order.id}:payment:charge`);
      await providers.queueCommunication(client, order.tenant_id, order.id, 'invoice_issued', String(req.body.destinationRef || `customer:${order.customer_id}`), `${order.id}:message:invoice`);
    }
    if (to === 'refund_pending') {
      const invoice = (await client.query('SELECT * FROM field_invoices WHERE order_id=$1 FOR UPDATE', [order.id])).rows[0];
      if (!invoice || !['paid', 'refund_pending'].includes(invoice.status)) domain(409, 'not_paid', 'only a paid invoice can be refunded');
      await client.query(`UPDATE field_invoices SET status='refund_pending',updated_at=NOW() WHERE id=$1`, [invoice.id]);
      await providers.enqueue(client, order.tenant_id, order.id, 'payment', 'refund.create', { orderId: order.id, invoiceId: invoice.id, amountCents: Number(invoice.total_cents), reason }, `${order.id}:payment:refund`);
    }
    if (to === 'cancelled') {
      await releaseInventory(client, order.tenant_id, order.id, false);
      if (order.technician_id) await providers.enqueue(client, order.tenant_id, order.id, 'calendar', 'cancel', { orderId: order.id, technicianId: order.technician_id }, `${order.id}:calendar:cancel`);
      await providers.queueCommunication(client, order.tenant_id, order.id, 'service_cancelled', String(req.body.destinationRef || `customer:${order.customer_id}`), `${order.id}:message:cancel`);
    }
    if (to === 'no_show') await providers.queueCommunication(client, order.tenant_id, order.id, 'customer_no_show', String(req.body.destinationRef || `customer:${order.customer_id}`), `${order.id}:message:no-show:${order.version}`);
    const set = [`status=$1`, `version=version+1`, `updated_at=NOW()`];
    const values = [to];
    if (to === 'dispatched') set.push('dispatched_at=NOW()');
    if (to === 'in_progress') set.push('started_at=COALESCE(started_at,NOW())');
    if (['partially_completed', 'completed'].includes(to)) { values.push(JSON.stringify(req.body.workSummary || {})); set.push(`work_summary=$${values.length}`); }
    if (to === 'completed') set.push('completed_at=NOW()');
    if (to === 'cancelled') { set.push(`cancelled_at=NOW()`); values.push(reason); set.push(`cancellation_reason=$${values.length}`); }
    values.push(order.id);
    const result = await client.query(`UPDATE service_orders SET ${set.join(',')} WHERE id=$${values.length} RETURNING *`, values);
    await event(client, order.tenant_id, order.id, 'transition', req.user, order.status, to, reason, { workSummary: req.body.workSummary || null });
    return result.rows[0];
  });
  res.json(updated);
}));

router.post('/orders/:id/reschedule', route(async (req, res) => {
  requireRole(req.user, 'dispatcher', 'customer');
  const updated = await transaction(async (client) => {
    const order = await lockOrder(client, req.user.tenantId, req.params.id);
    if (order.version !== req.body.expectedVersion) domain(409, 'version_conflict', `current version is ${order.version}`);
    if (!['booked', 'no_show'].includes(order.status)) domain(409, 'invalid_status', 'only booked or no-show jobs can be rescheduled');
    const booking = bookingFrom({ booking: { technicianId: order.technician_id, startsAt: req.body.startsAt,
      endsAt: req.body.endsAt, travelKm: Number(req.body.travelKm), requiredSkills: order.required_skills } });
    await assertResource(client, order.tenant_id, booking, order.id);
    const result = await client.query(`UPDATE service_orders SET starts_at=$1,ends_at=$2,status='booked',version=version+1,updated_at=NOW() WHERE id=$3 RETURNING *`, [booking.startsAt, booking.endsAt, order.id]);
    await providers.enqueue(client, order.tenant_id, order.id, 'calendar', 'reschedule', { orderId: order.id, technicianId: order.technician_id, startsAt: booking.startsAt, endsAt: booking.endsAt }, `${order.id}:calendar:reschedule:${order.version}`);
    await providers.queueCommunication(client, order.tenant_id, order.id, 'service_rescheduled', String(req.body.destinationRef || `customer:${order.customer_id}`), `${order.id}:message:reschedule:${order.version}`);
    await event(client, order.tenant_id, order.id, 'rescheduled', req.user, order.status, 'booked', policyCheck(() => policy.assertReason(req.body.reason, true)), booking);
    return result.rows[0];
  });
  res.json(updated);
}));

router.post('/orders/:id/reassign', route(async (req, res) => {
  requireRole(req.user, 'dispatcher');
  const updated = await transaction(async (client) => {
    const order = await lockOrder(client, req.user.tenantId, req.params.id);
    if (order.version !== req.body.expectedVersion) domain(409, 'version_conflict', `current version is ${order.version}`);
    if (!['booked', 'dispatched', 'no_show'].includes(order.status)) domain(409, 'invalid_status', 'job cannot be reassigned after work starts');
    const booking = bookingFrom({ booking: { technicianId: req.body.technicianId, startsAt: order.starts_at,
      endsAt: order.ends_at, travelKm: Number(req.body.travelKm), requiredSkills: order.required_skills } });
    await assertResource(client, order.tenant_id, booking, order.id);
    const result = await client.query('UPDATE service_orders SET technician_id=$1,status=$2,version=version+1,updated_at=NOW() WHERE id=$3 RETURNING *', [booking.technicianId, order.status === 'no_show' ? 'booked' : order.status, order.id]);
    await providers.enqueue(client, order.tenant_id, order.id, 'calendar', 'reassign', { orderId: order.id, fromTechnicianId: order.technician_id, technicianId: booking.technicianId, startsAt: order.starts_at, endsAt: order.ends_at }, `${order.id}:calendar:reassign:${order.version}`);
    await event(client, order.tenant_id, order.id, 'reassigned', req.user, order.status, result.rows[0].status, policyCheck(() => policy.assertReason(req.body.reason, true)), { from: order.technician_id, to: booking.technicianId });
    return result.rows[0];
  });
  res.json(updated);
}));

router.post('/orders/:id/change-orders', route(async (req, res) => {
  requireRole(req.user, 'technician');
  const change = await transaction(async (client) => {
    const order = await lockOrder(client, req.user.tenantId, req.params.id);
    if (order.version !== req.body.expectedVersion || order.status !== 'in_progress') domain(409, 'version_or_status_conflict', 'change orders require the current in-progress version');
    const quantity = req.body.quantity; const unitCents = req.body.unitCents;
    policyCheck(() => policy.priceQuote([{ quantity, unitCents }], req.body.taxBasisPoints));
    const subtotal = quantity * unitCents; const tax = Math.round(subtotal * req.body.taxBasisPoints / 10000);
    const id = crypto.randomUUID();
    const inserted = await client.query(
      `INSERT INTO field_change_orders(id,tenant_id,order_id,description,quantity,unit_cents,subtotal_delta_cents,tax_delta_cents,total_delta_cents,requested_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, order.tenant_id, order.id, String(req.body.description || '').slice(0, 1000), quantity, unitCents, subtotal, tax, subtotal + tax, String(req.user.id)]
    );
    await client.query(`UPDATE service_orders SET status='change_requested',version=version+1,updated_at=NOW() WHERE id=$1`, [order.id]);
    await event(client, order.tenant_id, order.id, 'change_requested', req.user, order.status, 'change_requested', null, { changeOrderId: id, totalDeltaCents: subtotal + tax });
    await providers.queueCommunication(client, order.tenant_id, order.id, 'change_order_requested', String(req.body.destinationRef || `customer:${order.customer_id}`), `${order.id}:message:change:${id}`);
    return inserted.rows[0];
  });
  res.status(201).json(change);
}));

router.post('/orders/:id/change-orders/:changeId/decision', route(async (req, res) => {
  requireRole(req.user, 'customer');
  const result = await transaction(async (client) => {
    const order = await lockOrder(client, req.user.tenantId, req.params.id);
    const change = (await client.query('SELECT * FROM field_change_orders WHERE id=$1 AND order_id=$2 AND tenant_id=$3 FOR UPDATE', [req.params.changeId, order.id, order.tenant_id])).rows[0];
    if (!change || change.status !== 'pending') domain(409, 'change_unavailable', 'change order is not pending');
    if (!['approved', 'rejected'].includes(req.body.decision)) domain(422, 'invalid_decision', 'decision must be approved or rejected');
    await client.query('UPDATE field_change_orders SET status=$1,approved_by=$2,version=version+1,decided_at=NOW() WHERE id=$3', [req.body.decision, String(req.user.id), change.id]);
    if (req.body.decision === 'approved') {
      const nextLine = (await client.query('SELECT COALESCE(MAX(line_no),0)+1 next FROM service_order_lines WHERE order_id=$1', [order.id])).rows[0].next;
      await client.query(`INSERT INTO service_order_lines VALUES($1,$2,'change_order',NULL,$3,$4,$5)`, [order.id, nextLine, change.description, change.quantity, change.unit_cents]);
      await client.query(`UPDATE service_orders SET subtotal_cents=subtotal_cents+$1,tax_cents=tax_cents+$2,total_cents=total_cents+$3,status='in_progress',version=version+1,updated_at=NOW() WHERE id=$4`, [change.subtotal_delta_cents, change.tax_delta_cents, change.total_delta_cents, order.id]);
    } else await client.query(`UPDATE service_orders SET status='in_progress',version=version+1,updated_at=NOW() WHERE id=$1`, [order.id]);
    await event(client, order.tenant_id, order.id, `change_${req.body.decision}`, req.user, order.status, 'in_progress', policyCheck(() => policy.assertReason(req.body.reason, false)), { changeOrderId: change.id });
    return { id: change.id, status: req.body.decision };
  });
  res.json(result);
}));

router.post('/offline/mutations', route(async (req, res) => {
  const deviceId = policyCheck(() => policy.assertIdentifier(req.body.deviceId, 'device id'));
  const mutationId = policyCheck(() => policy.assertIdentifier(req.body.mutationId, 'mutation id'));
  const orderId = policyCheck(() => policy.assertIdentifier(req.body.orderId, 'order id'));
  const digest = policy.digest(req.body);
  const result = await transaction(async (client) => {
    const duplicate = await client.query('SELECT * FROM field_offline_mutations WHERE tenant_id=$1 AND device_id=$2 AND mutation_id=$3', [req.user.tenantId, deviceId, mutationId]);
    if (duplicate.rowCount) {
      if (duplicate.rows[0].payload_digest !== digest) domain(409, 'mutation_conflict', 'mutation ID is bound to another payload');
      return duplicate.rows[0];
    }
    const order = await lockOrder(client, req.user.tenantId, orderId);
    let status = 'accepted'; let output;
    if (order.version !== req.body.baseVersion) { status = 'conflict'; output = { currentVersion: order.version, submittedVersion: req.body.baseVersion }; }
    else if (req.body.type !== 'work_summary' || !['in_progress', 'partially_completed'].includes(order.status)) { status = 'rejected'; output = { reason: 'unsupported mutation or order state' }; }
    else {
      const summary = { ...order.work_summary, ...req.body.changes, offlineDeviceId: deviceId };
      await client.query('UPDATE service_orders SET work_summary=$1,version=version+1,updated_at=NOW() WHERE id=$2', [JSON.stringify(summary), order.id]);
      await event(client, order.tenant_id, order.id, 'offline_work_recovered', req.user, order.status, order.status, null, { deviceId, mutationId });
      output = { version: order.version + 1 };
    }
    return (await client.query(
      `INSERT INTO field_offline_mutations(tenant_id,device_id,mutation_id,order_id,base_version,mutation_type,payload_digest,status,result)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [order.tenant_id, deviceId, mutationId, order.id, req.body.baseVersion, req.body.type, digest, status, JSON.stringify(output)]
    )).rows[0];
  });
  res.status(result.status === 'conflict' ? 409 : result.status === 'rejected' ? 422 : 202).json(result);
}));

router.post('/provider-jobs/:id/replay', route(async (req, res) => {
  requireRole(req.user, 'admin');
  const result = await pool.query(
    `UPDATE field_provider_outbox SET status='pending',attempts=0,available_at=NOW(),lease_until=NULL,last_error=NULL,updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2 AND status='dead_letter' RETURNING id,status`, [req.params.id, req.user.tenantId]
  );
  if (!result.rowCount) domain(409, 'not_dead_letter', 'only a dead-letter job can be replayed');
  res.json(result.rows[0]);
}));

module.exports = router;
