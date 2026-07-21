'use strict';

const crypto = require('crypto');
const policy = require('../governance/fieldOperations');

class ProviderError extends Error {
  constructor(message, retryable = false) { super(message); this.retryable = retryable; }
}

function parseObjectEnv(name) {
  try {
    const parsed = JSON.parse(process.env[name] || '{}');
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
    return parsed;
  } catch { throw new Error(`${name} must be a JSON object`); }
}

async function enqueue(client, tenantId, orderId, provider, operation, payload, idempotencyKey) {
  const job = policy.providerOperation(provider, operation, payload, idempotencyKey);
  const result = await client.query(
    `INSERT INTO field_provider_outbox(tenant_id,order_id,provider,operation,idempotency_key,payload_digest,payload)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(provider,idempotency_key) DO NOTHING RETURNING *`,
    [tenantId, orderId || null, job.provider, job.operation, job.idempotencyKey, job.payloadDigest, JSON.stringify(job.payload)]
  );
  if (result.rowCount) return result.rows[0];
  const existing = await client.query(
    'SELECT * FROM field_provider_outbox WHERE provider=$1 AND idempotency_key=$2',
    [provider, idempotencyKey]
  );
  if (existing.rows[0]?.payload_digest !== job.payloadDigest) throw new ProviderError('provider idempotency key conflict');
  return existing.rows[0];
}

async function queueCommunication(client, tenantId, orderId, template, destinationRef, idempotencyKey, details = {}) {
  policy.assertIdentifier(destinationRef, 'destination reference');
  const payload = { communicationId: crypto.randomUUID(), orderId, template, destinationRef, channel: details.channel || 'email', details };
  const job = await enqueue(client, tenantId, orderId, 'messaging', 'send', payload, idempotencyKey);
  await client.query(
    `INSERT INTO field_customer_communications(id,tenant_id,order_id,channel,template,destination_ref)
     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,
    [payload.communicationId, tenantId, orderId, payload.channel, template, destinationRef]
  );
  return job;
}

async function claim(pool, leaseSeconds = 60) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(
      `SELECT * FROM field_provider_outbox
       WHERE (status IN ('pending','retry') AND available_at<=NOW())
          OR (status='running' AND lease_until<NOW())
       ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1`
    );
    if (!found.rowCount) { await client.query('COMMIT'); return null; }
    const job = found.rows[0];
    await client.query(
      `UPDATE field_provider_outbox SET status='running',attempts=attempts+1,
       lease_until=NOW()+($1::text||' seconds')::interval,updated_at=NOW() WHERE id=$2`,
      [leaseSeconds, job.id]
    );
    await client.query('COMMIT');
    return { ...job, attempts: job.attempts + 1 };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

function providerUrl(provider, operation) {
  const endpoints = parseObjectEnv('PROVIDER_ENDPOINTS_JSON');
  const base = endpoints[provider];
  if (!base) throw new ProviderError(`provider endpoint is not configured: ${provider}`, false);
  const url = new URL(String(base));
  if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new ProviderError('remote provider endpoints must use HTTPS', false);
  }
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${encodeURIComponent(operation)}`;
  return url;
}

async function send(job) {
  const tokens = parseObjectEnv('PROVIDER_TOKENS_JSON');
  const token = tokens[job.provider];
  if (typeof token !== 'string' || token.length < 16) throw new ProviderError(`provider credential is not configured: ${job.provider}`, false);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.PROVIDER_TIMEOUT_MS || 10000));
  try {
    const response = await fetch(providerUrl(job.provider, job.operation), {
      method: 'POST', signal: controller.signal,
      headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json',
        'idempotency-key': job.idempotency_key },
      body: JSON.stringify(job.payload),
    });
    const text = (await response.text()).slice(0, 10000);
    if (!response.ok) throw new ProviderError(`provider HTTP ${response.status}`, response.status === 429 || response.status >= 500);
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { receipt: text }; }
    return String(body.receipt || body.id || response.headers.get('x-request-id') || policy.digest(body));
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(error.name === 'AbortError' ? 'provider timeout' : 'provider network failure', true);
  } finally { clearTimeout(timeout); }
}

async function workOnce(pool) {
  const job = await claim(pool);
  if (!job) return null;
  try {
    const receipt = await send(job);
    await pool.query(
      `UPDATE field_provider_outbox SET status='completed',provider_receipt=$1,
       lease_until=NULL,last_error=NULL,updated_at=NOW() WHERE id=$2`, [receipt, job.id]
    );
    return { id: job.id, status: 'completed', receipt };
  } catch (error) {
    const retry = policy.nextAttempt(job.attempts - 1, error.retryable === true);
    await pool.query(
      `UPDATE field_provider_outbox SET status=$1,available_at=CASE WHEN $2::int IS NULL THEN available_at ELSE NOW()+($2::text||' seconds')::interval END,
       lease_until=NULL,last_error=$3,updated_at=NOW() WHERE id=$4`,
      [retry.status, retry.delaySeconds, error.message.slice(0, 1000), job.id]
    );
    return { id: job.id, status: retry.status, error: error.message };
  }
}

module.exports = { ProviderError, enqueue, queueCommunication, claim, send, workOnce, parseObjectEnv };
