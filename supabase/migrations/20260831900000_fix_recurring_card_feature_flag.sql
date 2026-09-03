-- Fix UP-205: academy_feature_flags usa flag_key (não key)

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
