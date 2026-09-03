-- Aluno cria a primeira fatura pendente no onboarding (valor do plano ativo).

CREATE OR REPLACE FUNCTION public.create_student_onboarding_invoice(p_student_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_sub public.student_subscriptions%ROWTYPE;
  v_plan public.academy_plans%ROWTYPE;
  v_existing_id UUID;
  v_invoice_id UUID;
BEGIN
  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado ou sem permissão';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.academy_invoices
  WHERE student_id = p_student_id
    AND status IN ('PENDENTE', 'ATRASADO')
  ORDER BY due_date
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT * INTO v_sub
  FROM public.student_subscriptions
  WHERE student_id = p_student_id
    AND status = 'ATIVO'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhuma assinatura ativa encontrada';
  END IF;

  SELECT * INTO v_plan
  FROM public.academy_plans
  WHERE id = v_sub.academy_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano da assinatura não encontrado';
  END IF;

  INSERT INTO public.academy_invoices (
    student_id,
    academy_id,
    student_subscription_id,
    amount,
    due_date,
    status
  )
  VALUES (
    p_student_id,
    v_student.academy_id,
    v_sub.id,
    v_plan.price,
    CURRENT_DATE + 5,
    'PENDENTE'
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_student_onboarding_invoice(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_student_onboarding_invoice(UUID) TO authenticated;

COMMENT ON FUNCTION public.create_student_onboarding_invoice(UUID) IS
  'Cria fatura PENDENTE da primeira mensalidade no onboarding do aluno (idempotente).';
