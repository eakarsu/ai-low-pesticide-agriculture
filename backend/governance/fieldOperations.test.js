'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ops = require('./fieldOperations');

const booking = { requiredSkills: ['ipm'], technician: { skills: ['ipm', 'spraying'], serviceRadiusKm: 40 }, travelKm: 12, startsAt: '2026-08-01T10:00:00Z', endsAt: '2026-08-01T12:00:00Z', existingBookings: [], inventory: [{ sku: 'BIO-1', requested: 2, available: 3 }] };
test('accepts feasible booking and prevents overbooking', () => { assert.equal(ops.assertBooking(booking), true); assert.throws(() => ops.assertBooking({ ...booking, existingBookings: [{ startsAt: '2026-08-01T11:00:00Z', endsAt: '2026-08-01T13:00:00Z' }] }), /overbooked/); });
test('enforces skills, service area, and inventory', () => { assert.throws(() => ops.assertBooking({ ...booking, requiredSkills: ['licensed'] }), /skill/); assert.throws(() => ops.assertBooking({ ...booking, travelKm: 50 }), /service area/); assert.throws(() => ops.assertBooking({ ...booking, inventory: [{ sku: 'X', requested: 4, available: 1 }] }), /inventory/); });
test('prices integer-cent quote deterministically', () => assert.deepEqual(ops.priceQuote([{ quantity: 2, unitCents: 1250 }], 725), { subtotalCents: 2500, taxCents: 181, totalCents: 2681 }));
test('gates lifecycle transitions by role', () => { assert.equal(ops.assertTransition('booked', 'dispatched', 'dispatcher'), true); assert.throws(() => ops.assertTransition('booked', 'paid', 'dispatcher'), /invalid/); assert.throws(() => ops.assertTransition('paid', 'refund_pending', 'technician'), /role/); });
test('creates typed provider work without secrets', () => { const job = ops.providerOperation('maps', 'route', { addressRef: 'loc-1' }, 'job-1'); assert.equal(job.status, 'pending'); assert.throws(() => ops.providerOperation('payment', 'charge', { apiToken: 'leak' }, 'x'), /credentials/); });
test('signs webhooks and rejects tampering', () => { const secret = 'x'.repeat(32); const event = { id: 'evt-1', state: 'paid' }; const sig = ops.signWebhook(secret, event); assert.equal(ops.verifyWebhook(secret, event, sig), true); assert.equal(ops.verifyWebhook(secret, { ...event, state: 'failed' }, sig), false); });
test('bounds retries and dead-letters failures', () => { assert.equal(ops.nextAttempt(0, true).status, 'retry'); assert.equal(ops.nextAttempt(4, true).status, 'dead_letter'); assert.equal(ops.nextAttempt(0, false).status, 'dead_letter'); });
test('offline recovery detects version conflict', () => { assert.equal(ops.mergeOffline({ version: 4 }, { baseVersion: 4, changes: { note: 'partial' } }).nextVersion, 5); assert.equal(ops.mergeOffline({ version: 4 }, { baseVersion: 3, changes: {} }).accepted, false); });
test('reassignment is blocked after work begins', () => assert.throws(() => ops.assertReassignment({ status: 'in_progress', booking }, booking.technician), /after work starts/));
test('migration is additive, append-only and replay-safe', () => { const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/001_field_operations.sql'), 'utf8'); assert.match(sql, /IF NOT EXISTS/i); assert.match(sql, /UNIQUE.*idempotency_key/is); assert.match(sql, /immutable_field_event/i); assert.match(sql, /BEFORE TRUNCATE/i); assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE\s+field_operation_events/i); });
test('launcher has explicit modes and no destructive bootstrap', () => { const start = fs.readFileSync(path.join(__dirname, '../../start.sh'), 'utf8'); assert.match(start, /check\|migrate\|start/); assert.doesNotMatch(start, /kill -9|npm install|seed\.sql|createdb/); });
