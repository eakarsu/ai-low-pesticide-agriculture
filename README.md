# AgriSense low-pesticide field operations

The supported production slice is a real field-service journey for agricultural
IPM work: quote, resource-aware booking, dispatch, status, partial work and change
approval, invoicing, provider-confirmed payment/refund, cancellation, customer
communications, and offline recovery.

```sh
(cd backend && npm ci)
(cd frontend && npm ci)
./start.sh check
ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate   # explicit release step
./start.sh start                              # API only
./start.sh worker                             # provider outbox worker
```

Copy `.env.example` into your secret-management workflow; do not commit `.env`.
Startup never installs dependencies, seeds or migrates data, creates a database,
deletes files, or kills processes. See `RUNBOOK.md` for contracts, lifecycle,
recovery, provider reconciliation, and launch gates.

Generated audit demos and ungrounded LLM routes remain source artifacts for local
experimentation only. Production rejects their feature flag and the production UI
does not route to them. `archive.zip` is a historical snapshot, not a release
artifact; do not extract it into or deploy it from the supported checkout.
