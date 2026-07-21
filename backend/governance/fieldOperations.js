'use strict';

const crypto = require('crypto');

const transitions = Object.freeze({
  quote_draft: ['quote_sent', 'cancelled'],
  quote_sent: ['booked', 'cancelled'],
  booked: ['dispatched', 'cancelled'],
  dispatched: ['in_progress', 'no_show', 'cancelled'],
  in_progress: ['partially_completed', 'completed', 'change_requested', 'cancelled'],
  change_requested: ['in_progress', 'cancelled'],
  partially_completed: ['in_progress', 'invoiced', 'cancelled'],
  completed: ['invoiced'],
  invoiced: ['paid', 'refund_pending'],
  paid: ['refund_pending'],
  refund_pending: ['refunded', 'refund_failed'],
  refund_failed: ['refund_pending'],
  no_show: ['booked', 'cancelled'],
});

const roleTransitions = Object.freeze({
  customer: new Set(['quote_draft:quote_sent', 'quote_sent:booked', 'quote_sent:cancelled', 'booked:cancelled', 'invoiced:paid']),
  dispatcher: new Set(['booked:dispatched', 'dispatched:no_show', 'no_show:booked', 'booked:cancelled']),
  technician: new Set(['dispatched:in_progress', 'in_progress:partially_completed', 'in_progress:completed', 'partially_completed:in_progress', 'in_progress:change_requested']),
  finance: new Set(['completed:invoiced', 'partially_completed:invoiced', 'invoiced:paid', 'invoiced:refund_pending', 'paid:refund_pending', 'refund_pending:refunded', 'refund_pending:refund_failed', 'refund_failed:refund_pending']),
  admin: new Set(['*']),
});

const providers = new Set(['maps', 'calendar', 'messaging', 'payment', 'tax', 'accounting']);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

function assertTransition(from, to, role) {
  if (!transitions[from]?.includes(to)) throw new Error(`invalid transition ${from} -> ${to}`);
  const grants = roleTransitions[role];
  if (!grants || (!grants.has('*') && !grants.has(`${from}:${to}`))) throw new Error('role cannot perform transition');
  return true;
}

function assertBooking(input) {
  const required = new Set(input.requiredSkills || []);
  const actual = new Set(input.technician?.skills || []);
  for (const skill of required) if (!actual.has(skill)) throw new Error(`missing technician skill: ${skill}`);
  if (!Number.isFinite(input.travelKm) || input.travelKm < 0 || input.travelKm > input.technician.serviceRadiusKm) throw new Error('outside service area');
  if (!input.startsAt || !input.endsAt || Date.parse(input.startsAt) >= Date.parse(input.endsAt)) throw new Error('invalid booking interval');
  if ((input.existingBookings || []).some((b) => Date.parse(input.startsAt) < Date.parse(b.endsAt) && Date.parse(input.endsAt) > Date.parse(b.startsAt))) throw new Error('technician overbooked');
  for (const line of input.inventory || []) {
    if (!Number.isInteger(line.requested) || line.requested < 0 || line.requested > line.available) throw new Error(`insufficient inventory: ${line.sku}`);
  }
  return true;
}

function assertIdentifier(value, label = 'identifier') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.:@/-]{1,200}$/.test(value)) throw new Error(`invalid ${label}`);
  return value;
}

function assertReason(value, required = false) {
  if (required && (typeof value !== 'string' || value.trim().length < 3)) throw new Error('reason is required');
  if (value != null && (typeof value !== 'string' || value.length > 1000)) throw new Error('invalid reason');
  return value?.trim() || null;
}

function assertMoney(amount, label = 'amount') {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000) throw new Error(`invalid ${label}`);
  return amount;
}

function priceQuote(lines, taxBasisPoints) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('quote requires lines');
  const subtotalCents = lines.reduce((sum, line) => {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0 || !Number.isInteger(line.unitCents) || line.unitCents < 0) throw new Error('invalid quote line');
    return sum + line.quantity * line.unitCents;
  }, 0);
  if (!Number.isInteger(taxBasisPoints) || taxBasisPoints < 0 || taxBasisPoints > 10000) throw new Error('invalid tax rate');
  const taxCents = Math.round(subtotalCents * taxBasisPoints / 10000);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

function providerOperation(provider, operation, payload, idempotencyKey) {
  if (!providers.has(provider)) throw new Error('unsupported provider');
  if (!operation || !idempotencyKey || idempotencyKey.length > 200) throw new Error('operation and idempotency key required');
  if (/(secret|password|token|apiKey)/i.test(canonical(payload))) throw new Error('provider payload may not contain credentials');
  return { provider, operation, payload, idempotencyKey, payloadDigest: digest(payload), attempts: 0, status: 'pending' };
}

function nextAttempt(attempts, retryable, maxAttempts = 5) {
  const next = attempts + 1;
  if (!retryable || next >= maxAttempts) return { status: 'dead_letter', attempts: next, delaySeconds: null };
  return { status: 'retry', attempts: next, delaySeconds: Math.min(900, 2 ** next) };
}

function signWebhook(secret, event) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('webhook secret must be at least 32 characters');
  return crypto.createHmac('sha256', secret).update(canonical(event)).digest('hex');
}

function verifyWebhook(secret, event, signature) {
  if (typeof secret !== 'string' || secret.length < 32 || !signature) return false;
  const expected = Buffer.from(signWebhook(secret, event), 'hex');
  let supplied;
  try { supplied = Buffer.from(String(signature), 'hex'); } catch { return false; }
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

function mergeOffline(current, mutation) {
  if (mutation.baseVersion !== current.version) return { accepted: false, conflict: { currentVersion: current.version, submittedVersion: mutation.baseVersion } };
  return { accepted: true, nextVersion: current.version + 1, changes: mutation.changes };
}

function assertReassignment(job, technician) {
  if (!['booked', 'dispatched', 'no_show'].includes(job.status)) throw new Error('job cannot be reassigned after work starts');
  return assertBooking({ ...job.booking, technician });
}

module.exports = { transitions, canonical, digest, assertTransition, assertBooking, assertIdentifier, assertReason, assertMoney, priceQuote, providerOperation, nextAttempt, signWebhook, verifyWebhook, mergeOffline, assertReassignment };
