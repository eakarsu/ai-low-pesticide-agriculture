# Field operations runbook

## Supported boundary

The production workflow is `/api/field-operations` plus the Field Operations UI.
It persists quotes, bookings, dispatch, work, changes, invoices, payment/refund
confirmation, cancellation, resources, communications, provider work, and an
append-only event trail. Auto-generated gap pages, generic LLM recommendations,
sample data, and custom demos are disabled in production and are not an
operational decision source. `backend/db/schema.sql` and `seed.sql` are legacy
development bootstrap files and must never be applied to an existing database.

## Configuration and release

Use Node 24 and PostgreSQL 16 or newer. Install with `npm ci` separately in
`backend/` and `frontend/`. Supply environment variables from a secret manager;
do not source or copy the ignored local `.env` files into an image.

- `DATABASE_URL`, a restricted PostgreSQL service account.
- `JWT_SECRET`, at least 32 random characters; rotate with a controlled session
  invalidation plan. Tokens use HS256, carry a tenant, and expire after eight hours.
- `DEFAULT_TENANT_ID` and an exact comma-separated `CORS_ORIGIN` allowlist.
- `PROVIDER_WEBHOOK_SECRETS_JSON`, with independent 32+ character values for
  maps, calendar, messaging, payment, tax, and accounting.
- `PROVIDER_ENDPOINTS_JSON` and `PROVIDER_TOKENS_JSON` for the worker. Remote
  endpoints must be HTTPS. Provider tokens never enter outbox payloads.
- `ENABLE_GENERATED_FEATURES=false`; production startup rejects `true`.

Run `./start.sh check`. Back up PostgreSQL, then deliberately apply additive
migrations with `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`. The migration is
replay-safe and CI executes it twice. `./start.sh start` only starts the API;
`./start.sh worker` only claims provider outbox work. Neither command installs,
seeds, creates, drops, or migrates a database, nor kills another process.

## Lifecycle and concurrency

Orders use integer cents, an idempotency key plus canonical request digest, a
monotonic version, and tenant-scoped queries. Mutations require the caller's
expected version. Booking and reassignment take a transaction-scoped advisory
lock for the technician, then validate database-owned skills, active status,
service radius, blackouts, overlapping committed jobs, and locked inventory.
Only one concurrent overlapping booking can succeed. Inventory is reserved on
booking, consumed on completion, and released on cancellation.

Normal flow is `quote_draft → quote_sent → booked → dispatched → in_progress →
completed/partially_completed → invoiced`. Partial work requires a structured
summary. Technician change orders pause work until a customer decision and update
invoiceable totals only after approval. No-shows can be rescheduled; dispatcher
reassignment is blocked once work starts. Cancellation requires a reason and
queues calendar and customer-message compensation.

Payment and refund success cannot be asserted through the ordinary transition
endpoint. Only a signed, idempotent payment webhook can move an invoiced order to
paid or a refund-pending order to refunded. The current implementation supports
partial charge receipts but only full refunds; extend the invoice model and tests
before offering partial refunds.

## Providers and reconciliation

Every maps, calendar, messaging, payment, tax, or accounting call first enters
`field_provider_outbox` with a stable idempotency key and payload digest. Workers
claim with `FOR UPDATE SKIP LOCKED`, use bounded timeouts, retry 429/5xx/network
failures with exponential delay, and dead-letter terminal/exhausted work. Run
multiple workers for throughput. Replay is restricted to admin callers and only
dead-letter rows.

Providers must echo their outbound `idempotencyKey` and send an independent
`x-provider-event-id` plus canonical-JSON HMAC-SHA256 in
`x-provider-signature`. Event IDs are unique per provider; replaying an ID with a
different digest returns 409. Reconcile outbox receipt, webhook row, order event,
invoice/payment, and communication state before retrying a disputed operation.
Never invent a new idempotency key for a call the provider may already have
accepted.

## Offline recovery and communications

Offline mutations are unique by tenant/device/mutation ID and bind to a payload
digest. The server applies only a supported mutation against the submitted base
version. A stale client receives the current/submitted versions and must merge or
ask the operator; it is never last-write-wins. Customer communication stores an
opaque destination reference, template, status, receipt, and error—not an API
credential or provider token.

## Monitoring and incidents

Probe `/health/live` for the process and `/health/ready` for PostgreSQL. Alert on
readiness failure, any dead letters, oldest pending outbox age, worker retry rate,
webhook signature failures, booking conflicts, version conflicts, refund failures,
and calendar/payment receipt mismatches. Track job counts by lifecycle, technician
utilization, inventory headroom, API p95/p99, and database lock time.

During provider outage, leave accepted outbox jobs durable, stop workers if the
provider cannot honor idempotency, and keep the API/event trail online. After the
provider recovers, reconcile receipts before replay. During database recovery,
stop API and workers, restore to a new instance, verify append-only events and
provider receipts, run migrations and the end-to-end suite, then switch traffic.
Set RPO/RTO from measured production backup and restore drills.

## Release evidence and external gates

CI installs from lockfiles, replays migrations, runs unit and PostgreSQL/API
journeys (concurrent overbooking, no-show/reschedule/reassignment, partial work,
change approval, signed payments/refunds, offline conflicts, cancellation and
dead-letter replay), builds the frontend, and audits runtime dependencies.

Before launch, certify each real provider contract in a sandbox; complete payment
and tax legal review; verify maps/service areas and calendar semantics; test SMS/
email consent and suppression; perform PostgreSQL backup/restore and load tests;
and obtain agronomist/pesticide-label review. AI features require a separate
privacy, prompt-injection, grounding, cost, and output-evaluation release gate.

