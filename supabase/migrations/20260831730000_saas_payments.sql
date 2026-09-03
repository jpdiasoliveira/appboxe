-- UP-SCH-13: histórico de tentativas de cobrança SaaS (espelha academy_payments)

CREATE TABLE public.saas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.saas_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'PIX',
  status payment_record_status NOT NULL DEFAULT 'PENDENTE',
  paid_at TIMESTAMPTZ,
  gateway_payment_id TEXT,
  idempotency_key TEXT,
  gateway_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saas_payments_invoice_id_idx
  ON public.saas_payments (invoice_id);

CREATE UNIQUE INDEX saas_payments_idempotency_key_idx
  ON public.saas_payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX saas_payments_gateway_payment_id_idx
  ON public.saas_payments (gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;

ALTER TABLE public.saas_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY saas_payments_platform ON public.saas_payments
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY saas_payments_platform_staff_read ON public.saas_payments
  FOR SELECT TO authenticated
  USING (public.is_platform_operator());

CREATE POLICY saas_payments_platform_finance_insert ON public.saas_payments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_finance());

CREATE POLICY saas_payments_owner_read ON public.saas_payments
  FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT i.id
      FROM public.saas_invoices i
      WHERE i.academy_id IN (SELECT public.user_academy_ids())
        AND public.has_academy_role(i.academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    )
  );

COMMENT ON TABLE public.saas_payments IS
  'Tentativas de pagamento de faturas SaaS (academia → RingPro).';
COMMENT ON COLUMN public.saas_payments.idempotency_key IS
  'Chave única por tentativa — evita duplicata em webhook retry.';
