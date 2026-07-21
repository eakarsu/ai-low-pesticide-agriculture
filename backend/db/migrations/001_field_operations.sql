BEGIN;
CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY, tenant_id TEXT NOT NULL, customer_id INTEGER NOT NULL,
  field_id INTEGER, status TEXT NOT NULL DEFAULT 'quote_draft', version INTEGER NOT NULL DEFAULT 1,
  required_skills JSONB NOT NULL DEFAULT '[]', service_address_ref TEXT NOT NULL, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ,
  technician_id TEXT, subtotal_cents BIGINT NOT NULL, tax_cents BIGINT NOT NULL, total_cents BIGINT NOT NULL,
  idempotency_key TEXT NOT NULL, request_digest TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key), CHECK (subtotal_cents >= 0 AND tax_cents >= 0 AND total_cents = subtotal_cents + tax_cents)
);
CREATE TABLE IF NOT EXISTS service_order_lines (
  order_id UUID NOT NULL REFERENCES service_orders(id), line_no INTEGER NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('labor','inventory','change_order')),
  sku TEXT, description TEXT NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0), unit_cents BIGINT NOT NULL CHECK (unit_cents >= 0), PRIMARY KEY(order_id,line_no)
);
CREATE TABLE IF NOT EXISTS field_operation_events (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID NOT NULL REFERENCES service_orders(id), event_type TEXT NOT NULL,
  from_status TEXT, to_status TEXT, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, reason TEXT, payload JSONB NOT NULL DEFAULT '{}', occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION immutable_field_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'field operation events are append-only'; END $$;
DROP TRIGGER IF EXISTS field_operation_events_immutable ON field_operation_events;
CREATE TRIGGER field_operation_events_immutable BEFORE UPDATE OR DELETE ON field_operation_events FOR EACH ROW EXECUTE FUNCTION immutable_field_event();
DROP TRIGGER IF EXISTS field_operation_events_no_truncate ON field_operation_events;
CREATE TRIGGER field_operation_events_no_truncate BEFORE TRUNCATE ON field_operation_events FOR EACH STATEMENT EXECUTE FUNCTION immutable_field_event();
CREATE TABLE IF NOT EXISTS field_provider_outbox (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID REFERENCES service_orders(id), provider TEXT NOT NULL CHECK(provider IN ('maps','calendar','messaging','payment','tax','accounting')),
  operation TEXT NOT NULL, idempotency_key TEXT NOT NULL, payload_digest TEXT NOT NULL, payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), lease_until TIMESTAMPTZ, provider_receipt TEXT, last_error TEXT, UNIQUE(provider,idempotency_key)
);
CREATE TABLE IF NOT EXISTS field_provider_webhooks (
  provider TEXT NOT NULL, provider_event_id TEXT NOT NULL, payload_digest TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ, PRIMARY KEY(provider,provider_event_id)
);
CREATE INDEX IF NOT EXISTS service_orders_schedule_idx ON service_orders(technician_id,starts_at,ends_at) WHERE status NOT IN ('cancelled','refunded');
CREATE INDEX IF NOT EXISTS field_outbox_claim_idx ON field_provider_outbox(status,available_at);
COMMIT;
