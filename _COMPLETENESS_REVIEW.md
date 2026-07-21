# Completeness Review: ai-low-pesticide-agriculture

**Review date:** 2026-07-20

## Assessment basis

Static inspection plus isolated PostgreSQL schema/migration application, explicit administrator provisioning, backend startup, database-backed login/authenticated API acceptance, maintained tests, security/source checks, and a production frontend build. External agriculture/provider certification remains a release gate.

## Classification

**Functional but incomplete**

This is a substantive but unfinished field/local services application, not just an empty scaffold. Inspection found 97 source files across `frontend/`, `backend/` using Next.js, React, Express; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Implement quote, availability, booking, dispatch, job status, change-order, invoice, payment, and cancellation lifecycles.
2. Add technician/resource skills, travel/service-area constraints, inventory, customer communications, and offline recovery.
3. Integrate maps, calendar, messaging, payment, tax, and accounting providers with idempotent webhooks.
4. Test overbooking, no-shows, partial work, refunds, rescheduling, and technician reassignment end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.

## Evidence inspected

- `frontend/src/App.tsx:38`
- `backend/routes/sample_data.js:8`
- `backend/server.js`
- `backend/middleware/auth.js`
- `requirements.txt`
- `start.sh`

## Recommended next action

Choose one real field/local services journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress (2026-07-19)

- Requirement 1: completed the field-service lifecycle behind tenant-scoped, authenticated, versioned APIs and a production Field Operations screen: idempotent quote creation, availability, booking, dispatch, job/event detail, no-show, rescheduling, reassignment, partial/completed work, customer-approved change orders, invoices, provider-confirmed charges and refunds, and reasoned cancellation. Integer-cent totals, quote request digests, optimistic versions, provider-only paid/refunded transitions, and an append-only event trigger protect financial and status integrity.
- Requirement 2: added database-owned technicians, skills, active state, service radius, blackouts, transaction/advisory-locked overlap checks, inventory availability/reservation/consumption/release, durable customer communication records, and idempotent offline mutations with explicit version conflicts instead of last-write-wins recovery.
- Requirement 3: added typed maps, calendar, messaging, payment, tax, and accounting outbox jobs with payload digests and stable idempotency keys; a separately launched worker claims leases with `SKIP LOCKED`, enforces HTTPS for remote endpoints, bounds timeouts/retries, persists receipts, dead-letters terminal failures, and supports admin-only replay. Canonical HMAC webhooks are idempotent by provider/event ID, reject payload substitution, reconcile outbound receipts, and apply tax, messaging, charge, failure, and full-refund outcomes transactionally.
- Requirement 4: added PostgreSQL/API journeys for simultaneous overbooking, quote idempotency conflicts, no-show and rescheduling, pre-work technician reassignment and post-start rejection, partial work, approved change orders, invoicing, signed charge and refund webhooks, webhook replay, offline replay/conflict, cancellation inventory release, provider dead-letter/replay, and successful provider delivery.
- Requirement 5: CI now installs both lockfiles on Node 24, applies all additive migrations twice to PostgreSQL, runs syntax/security/unit/integration tests, builds the production frontend, and fails on moderate-or-higher runtime dependency advisories. Startup has explicit `check`, opt-in `migrate`, `start`, and `worker` modes; it no longer kills processes, installs packages, creates a database, seeds, or migrates during launch. Generated/mock/LLM routes and UI navigation are disabled in production, production validates provider webhook configuration, health endpoints are nondestructive, and repository checks reject tracked environment files, private-key/API-key patterns, destructive launcher regressions, and an ungated generated surface. The unused Python dependency manifest was removed.
- Verification: additive migrations applied and replayed cleanly on a disposable PostgreSQL 14.17 database; 16 tests passed including five end-to-end PostgreSQL/API journeys; backend source/security checks passed; backend and frontend production dependency audits reported zero vulnerabilities; the TypeScript/Vite production build passed; lockfile `npm ci` dry runs passed; `/health/ready` returned ready after a production-mode start and startup did not change order state. The ignored root/backend `.env` files have never been tracked in reachable Git history, and the tracked historical ZIP showed no private-key, API-key, JWT assignment, or database-URL assignment match; local secret values were not read or changed. Launch still requires external sandbox certification for each real provider, payment/tax/accounting and consent review, credential provisioning/rotation policy, agronomist and pesticide-label review, production load/backup-restore exercises, and a separate privacy/grounding/prompt-injection/cost evaluation before any AI surface can be enabled.

## Runtime acceptance (2026-07-20)

- `start.sh start` requires an explicit validated `BACKEND_PORT`, refuses an occupied port, binds only to loopback, maps the validator's existing tenant value only in test mode, and performs no install, migration, seed, or process termination. `backend/server.js` contains no listener-port fallback.
- The new bootstrap identity path is separate and acknowledgement-gated. It refuses an existing email and stores only the requested PostgreSQL administrator with a bcrypt cost-12 password; no broad `seed.sql` operation is used for acceptance.
- The first and only row for this project in `_runtime_non_suite_repair_shard2l.tsv` is `API_VERIFIED / startup_login_session_api`. PostgreSQL ran at `127.0.0.1:55623`, the backend bound at `127.0.0.1:6060`, and reserved UI port `6061` remained listener-free. Login verified the persisted `users` row and the authenticated `/api/auth/me` route reloaded it from PostgreSQL.
- Current verification passed the backend source/safety checks, 11 maintained policy tests with the opt-in PostgreSQL suite not run in the local non-database invocation, and the TypeScript/Vite production build. Shell syntax, diff checks, and assigned-port release checks passed.
