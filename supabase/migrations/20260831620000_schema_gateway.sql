-- UP-SCH-02: colunas gateway (Pagar.me / UP-202) — academia e SaaS

ALTER TABLE public.academy_invoices
  ADD COLUMN IF NOT EXISTS gateway_provider TEXT,
  ADD COLUMN IF NOT EXISTS gateway_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.academy_payments
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS gateway_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.saas_invoices
  ADD COLUMN IF NOT EXISTS gateway_provider TEXT,
  ADD COLUMN IF NOT EXISTS gateway_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS academy_invoices_gateway_charge_id_idx
  ON public.academy_invoices (gateway_charge_id)
  WHERE gateway_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS academy_invoices_academy_status_due_idx
  ON public.academy_invoices (academy_id, status, due_date);

CREATE INDEX IF NOT EXISTS academy_payments_invoice_id_idx
  ON public.academy_payments (invoice_id);

CREATE UNIQUE INDEX IF NOT EXISTS academy_payments_idempotency_key_idx
  ON public.academy_payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS saas_invoices_gateway_charge_id_idx
  ON public.saas_invoices (gateway_charge_id)
  WHERE gateway_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS saas_invoices_academy_status_due_idx
  ON public.saas_invoices (academy_id, status, due_date);

COMMENT ON COLUMN public.academy_invoices.gateway_charge_id IS
  'ID da cobrança no gateway (Pagar.me) para webhook e conciliação.';
COMMENT ON COLUMN public.academy_payments.idempotency_key IS
  'Chave única por tentativa de pagamento — evita duplicata em webhook retry.';
