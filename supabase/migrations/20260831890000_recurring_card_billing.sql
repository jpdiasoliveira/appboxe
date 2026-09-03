-- UP-205: cobrança recorrente cartão + retry D+1, D+3, D+7

ALTER TABLE public.academy_invoices
  ADD COLUMN IF NOT EXISTS charge_attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_charge_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_charge_retry_date DATE;

COMMENT ON COLUMN public.academy_invoices.charge_attempt_count IS
  'Tentativas de cobrança automática no cartão (0 = primeira cobrança no vencimento).';
COMMENT ON COLUMN public.academy_invoices.next_charge_retry_date IS
  'Próxima data de retry automático no cartão (D+1, D+3, D+7 após falhas).';

CREATE OR REPLACE FUNCTION public.advance_student_subscription_billing(p_subscription_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.plan_period;
  v_next DATE;
BEGIN
  SELECT ap.period, ss.next_billing_date
  INTO v_period, v_next
  FROM public.student_subscriptions ss
  INNER JOIN public.academy_plans ap ON ap.id = ss.academy_plan_id
  WHERE ss.id = p_subscription_id;

  IF NOT FOUND OR v_next IS NULL THEN
    RETURN;
  END IF;

  v_next := CASE v_period
    WHEN 'MENSAL' THEN (v_next + INTERVAL '1 month')::date
    WHEN 'TRIMESTRAL' THEN (v_next + INTERVAL '3 months')::date
    WHEN 'SEMESTRAL' THEN (v_next + INTERVAL '6 months')::date
    WHEN 'ANUAL' THEN (v_next + INTERVAL '1 year')::date
    ELSE (v_next + INTERVAL '1 month')::date
  END;

  UPDATE public.student_subscriptions
  SET next_billing_date = v_next
  WHERE id = p_subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_recurring_subscription_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created INTEGER := 0;
BEGIN
  WITH inserted AS (
    INSERT INTO public.academy_invoices (
      student_id,
      academy_id,
      student_subscription_id,
      amount,
      due_date,
      status
    )
    SELECT
      ss.student_id,
      s.academy_id,
      ss.id,
      ap.price,
      ss.next_billing_date,
      'PENDENTE'
    FROM public.student_subscriptions ss
    INNER JOIN public.students s ON s.id = ss.student_id
    INNER JOIN public.academy_plans ap ON ap.id = ss.academy_plan_id
    INNER JOIN public.student_payment_methods spm
      ON spm.student_id = s.id AND spm.is_default = true
    INNER JOIN public.academy_feature_flags f
      ON f.academy_id = s.academy_id
      AND f.flag_key = 'module_payments_card'
      AND f.enabled = true
    WHERE ss.status = 'ATIVO'
      AND s.status <> 'INATIVO'
      AND ss.next_billing_date IS NOT NULL
      AND ss.next_billing_date <= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1
        FROM public.academy_invoices i
        WHERE i.student_subscription_id = ss.id
          AND i.status IN ('PENDENTE', 'ATRASADO')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.academy_invoices i
        WHERE i.student_subscription_id = ss.id
          AND i.due_date = ss.next_billing_date
      )
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_created FROM inserted;

  RETURN v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_recurring_card_charge_jobs()
RETURNS TABLE (
  subscription_id UUID,
  invoice_id UUID,
  student_id UUID,
  academy_id UUID,
  amount NUMERIC,
  due_date DATE,
  charge_attempt_count INT,
  next_charge_retry_date DATE,
  payment_method_id UUID,
  gateway TEXT,
  gateway_token TEXT,
  brand TEXT,
  last_four TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_document TEXT,
  customer_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_recurring_subscription_invoices();
  PERFORM public.refresh_academy_invoice_status();

  RETURN QUERY
  SELECT
    ss.id AS subscription_id,
    i.id AS invoice_id,
    s.id AS student_id,
    s.academy_id,
    i.amount,
    i.due_date,
    i.charge_attempt_count,
    i.next_charge_retry_date,
    spm.id AS payment_method_id,
    spm.gateway,
    spm.gateway_token,
    spm.brand,
    spm.last_four,
    COALESCE(NULLIF(p.name, ''), split_part(u.email, '@', 1)) AS customer_name,
    u.email AS customer_email,
    s.cpf AS customer_document,
    s.phone AS customer_phone
  FROM public.academy_invoices i
  INNER JOIN public.student_subscriptions ss ON ss.id = i.student_subscription_id
  INNER JOIN public.students s ON s.id = i.student_id
  INNER JOIN public.student_payment_methods spm
    ON spm.student_id = s.id AND spm.is_default = true
  INNER JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  INNER JOIN public.academy_feature_flags f
    ON f.academy_id = s.academy_id
    AND f.flag_key = 'module_payments_card'
    AND f.enabled = true
  WHERE ss.status = 'ATIVO'
    AND s.status <> 'INATIVO'
    AND i.status IN ('PENDENTE', 'ATRASADO')
    AND i.charge_attempt_count < 4
    AND (
      (i.charge_attempt_count = 0 AND i.due_date <= CURRENT_DATE)
      OR (i.next_charge_retry_date IS NOT NULL AND i.next_charge_retry_date <= CURRENT_DATE)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_recurring_card_charge_failure(p_invoice_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.academy_invoices%ROWTYPE;
  v_next_retry DATE;
BEGIN
  SELECT * INTO v_invoice
  FROM public.academy_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  v_next_retry := CASE v_invoice.charge_attempt_count + 1
    WHEN 1 THEN v_invoice.due_date + 1
    WHEN 2 THEN v_invoice.due_date + 3
    WHEN 3 THEN v_invoice.due_date + 7
    ELSE NULL
  END;

  UPDATE public.academy_invoices
  SET
    charge_attempt_count = v_invoice.charge_attempt_count + 1,
    last_charge_attempt_at = now(),
    next_charge_retry_date = v_next_retry
  WHERE id = p_invoice_id;

  RETURN json_build_object(
    'invoice_id', p_invoice_id,
    'charge_attempt_count', v_invoice.charge_attempt_count + 1,
    'next_charge_retry_date', v_next_retry
  );
END;
$$;

REVOKE ALL ON FUNCTION public.advance_student_subscription_billing(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_recurring_subscription_invoices() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_recurring_card_charge_jobs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_recurring_card_charge_failure(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.advance_student_subscription_billing(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_recurring_subscription_invoices() TO service_role;
GRANT EXECUTE ON FUNCTION public.list_recurring_card_charge_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_recurring_card_charge_failure(UUID) TO service_role;

COMMENT ON FUNCTION public.list_recurring_card_charge_jobs() IS
  'Lista faturas elegíveis para cobrança automática no cartão (UP-205).';
COMMENT ON FUNCTION public.record_recurring_card_charge_failure(UUID) IS
  'Registra falha de cobrança recorrente e agenda retry D+1/D+3/D+7.';
