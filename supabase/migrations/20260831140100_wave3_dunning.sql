-- Dunning academia: faturas atrasadas + aluno INADIMPLENTE após 3 dias de grace

CREATE OR REPLACE FUNCTION public.refresh_academy_invoice_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.academy_invoices
  SET status = 'ATRASADO'
  WHERE status = 'PENDENTE'
    AND due_date < CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_academy_dunning()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_academy_invoice_status();

  UPDATE public.students s
  SET status = 'INADIMPLENTE', updated_at = now()
  WHERE s.status IN ('ATIVO', 'TRIAL')
    AND EXISTS (
      SELECT 1 FROM public.academy_invoices i
      WHERE i.student_id = s.id
        AND i.status IN ('ATRASADO', 'PENDENTE')
        AND i.due_date < (CURRENT_DATE - INTERVAL '3 days')
    );

  UPDATE public.students s
  SET status = 'ATIVO', updated_at = now()
  WHERE s.status = 'INADIMPLENTE'
    AND NOT EXISTS (
      SELECT 1 FROM public.academy_invoices i
      WHERE i.student_id = s.id
        AND i.status IN ('ATRASADO', 'PENDENTE')
        AND i.due_date < CURRENT_DATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_academy_invoice_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_academy_dunning() TO authenticated;
