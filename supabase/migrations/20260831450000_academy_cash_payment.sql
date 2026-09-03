-- RingPro: pagamento em dinheiro registrado pelo dono da academia

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'DINHEIRO';

CREATE OR REPLACE FUNCTION public.mark_academy_invoice_paid_cash(p_invoice_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.academy_invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_invoice
  FROM public.academy_invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  IF NOT (public.is_school_owner(v_invoice.academy_id) OR public.is_platform_owner()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_invoice.status = 'PAGO' THEN
    RAISE EXCEPTION 'Fatura já está paga';
  END IF;

  IF v_invoice.status = 'CANCELADO' THEN
    RAISE EXCEPTION 'Fatura cancelada não pode ser paga';
  END IF;

  UPDATE public.academy_invoices
  SET status = 'PAGO'
  WHERE id = p_invoice_id;

  INSERT INTO public.academy_payments (invoice_id, amount, method, status, paid_at)
  VALUES (p_invoice_id, v_invoice.amount, 'DINHEIRO', 'PAGO', now());

  UPDATE public.students
  SET status = 'ATIVO', updated_at = now()
  WHERE id = v_invoice.student_id
    AND status = 'INADIMPLENTE'
    AND NOT EXISTS (
      SELECT 1
      FROM public.academy_invoices i
      WHERE i.student_id = v_invoice.student_id
        AND i.id <> p_invoice_id
        AND i.status IN ('ATRASADO', 'PENDENTE')
        AND i.due_date < CURRENT_DATE
    );

  RETURN jsonb_build_object(
    'invoice_id', p_invoice_id,
    'student_id', v_invoice.student_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_academy_invoice_paid_cash(UUID) TO authenticated;
