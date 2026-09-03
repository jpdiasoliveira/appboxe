-- Fix UP-205: casts explícitos em list_recurring_card_charge_jobs (RETURN QUERY)

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
    ss.id::UUID AS subscription_id,
    i.id::UUID AS invoice_id,
    s.id::UUID AS student_id,
    s.academy_id::UUID AS academy_id,
    i.amount::NUMERIC AS amount,
    i.due_date::DATE AS due_date,
    i.charge_attempt_count::INT AS charge_attempt_count,
    i.next_charge_retry_date::DATE AS next_charge_retry_date,
    spm.id::UUID AS payment_method_id,
    spm.gateway::TEXT AS gateway,
    spm.gateway_token::TEXT AS gateway_token,
    spm.brand::TEXT AS brand,
    spm.last_four::TEXT AS last_four,
    COALESCE(NULLIF(p.name, ''), split_part(u.email, '@', 1))::TEXT AS customer_name,
    u.email::TEXT AS customer_email,
    s.cpf::TEXT AS customer_document,
    s.phone::TEXT AS customer_phone
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
