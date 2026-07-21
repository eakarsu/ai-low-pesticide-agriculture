BEGIN;

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMPTZ;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS work_summary JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS field_technicians (
  id TEXT NOT NULL, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE, service_radius_km NUMERIC(8,2) NOT NULL,
  home_location_ref TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id,id), CHECK (service_radius_km >= 0)
);
CREATE TABLE IF NOT EXISTS field_technician_skills (
  tenant_id TEXT NOT NULL, technician_id TEXT NOT NULL, skill TEXT NOT NULL,
  PRIMARY KEY (tenant_id,technician_id,skill),
  FOREIGN KEY (tenant_id,technician_id) REFERENCES field_technicians(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS field_technician_blackouts (
  id UUID PRIMARY KEY, tenant_id TEXT NOT NULL, technician_id TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, reason TEXT,
  FOREIGN KEY (tenant_id,technician_id) REFERENCES field_technicians(tenant_id,id) ON DELETE CASCADE,
  CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS field_inventory (
  tenant_id TEXT NOT NULL, sku TEXT NOT NULL, description TEXT NOT NULL,
  on_hand INTEGER NOT NULL DEFAULT 0, reserved INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id,sku), CHECK(on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand)
);
CREATE TABLE IF NOT EXISTS field_inventory_reservations (
  tenant_id TEXT NOT NULL, order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL, quantity INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(order_id,sku), FOREIGN KEY(tenant_id,sku) REFERENCES field_inventory(tenant_id,sku),
  CHECK(quantity > 0), CHECK(state IN ('reserved','consumed','released'))
);

CREATE TABLE IF NOT EXISTS field_change_orders (
  id UUID PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', description TEXT NOT NULL,
  quantity INTEGER NOT NULL, unit_cents BIGINT NOT NULL, subtotal_delta_cents BIGINT NOT NULL,
  tax_delta_cents BIGINT NOT NULL, total_delta_cents BIGINT NOT NULL,
  requested_by TEXT NOT NULL, approved_by TEXT, version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_at TIMESTAMPTZ,
  CHECK(status IN ('pending','approved','rejected')), CHECK(quantity > 0), CHECK(unit_cents >= 0)
);
CREATE TABLE IF NOT EXISTS field_invoices (
  id UUID PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID NOT NULL UNIQUE REFERENCES service_orders(id),
  status TEXT NOT NULL DEFAULT 'issued', subtotal_cents BIGINT NOT NULL, tax_cents BIGINT NOT NULL,
  total_cents BIGINT NOT NULL, balance_cents BIGINT NOT NULL, provider_receipt TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), due_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(status IN ('issued','partially_paid','paid','refund_pending','refunded','void')),
  CHECK(total_cents = subtotal_cents + tax_cents AND balance_cents >= 0)
);
CREATE TABLE IF NOT EXISTS field_payments (
  id UUID PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID NOT NULL REFERENCES service_orders(id),
  invoice_id UUID NOT NULL REFERENCES field_invoices(id), provider TEXT NOT NULL DEFAULT 'payment',
  provider_payment_id TEXT, kind TEXT NOT NULL, status TEXT NOT NULL, amount_cents BIGINT NOT NULL,
  idempotency_key TEXT NOT NULL, failure_code TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider,idempotency_key), UNIQUE(provider,provider_payment_id),
  CHECK(kind IN ('charge','refund')), CHECK(status IN ('pending','succeeded','failed')), CHECK(amount_cents > 0)
);
CREATE TABLE IF NOT EXISTS field_customer_communications (
  id UUID PRIMARY KEY, tenant_id TEXT NOT NULL, order_id UUID REFERENCES service_orders(id),
  channel TEXT NOT NULL, template TEXT NOT NULL, destination_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', provider_receipt TEXT, last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_at TIMESTAMPTZ,
  CHECK(channel IN ('email','sms','push')), CHECK(status IN ('queued','sent','failed'))
);
CREATE TABLE IF NOT EXISTS field_offline_mutations (
  tenant_id TEXT NOT NULL, device_id TEXT NOT NULL, mutation_id TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES service_orders(id), base_version INTEGER NOT NULL,
  mutation_type TEXT NOT NULL, payload_digest TEXT NOT NULL, status TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}', received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id,device_id,mutation_id), CHECK(status IN ('accepted','conflict','rejected'))
);

ALTER TABLE field_provider_outbox ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE field_provider_outbox ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE field_provider_webhooks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'received';
ALTER TABLE field_provider_webhooks ADD COLUMN IF NOT EXISTS result JSONB NOT NULL DEFAULT '{}';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='service_orders_status_check') THEN
    ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check CHECK(status IN
      ('quote_draft','quote_sent','booked','dispatched','in_progress','change_requested','partially_completed','completed','invoiced','paid','refund_pending','refund_failed','refunded','no_show','cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='field_provider_outbox_status_check') THEN
    ALTER TABLE field_provider_outbox ADD CONSTRAINT field_provider_outbox_status_check
      CHECK(status IN ('pending','running','retry','completed','dead_letter'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS field_blackout_schedule_idx ON field_technician_blackouts(tenant_id,technician_id,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS field_order_tenant_status_idx ON service_orders(tenant_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS field_events_order_idx ON field_operation_events(tenant_id,order_id,occurred_at);
CREATE INDEX IF NOT EXISTS field_comms_order_idx ON field_customer_communications(tenant_id,order_id,created_at);

COMMIT;
