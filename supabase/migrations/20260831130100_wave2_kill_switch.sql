-- Suspende academias com fatura SaaS 15+ dias atrasada
CREATE OR REPLACE FUNCTION public.apply_saas_kill_switch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.academies a
  SET status = 'SUSPENSO'
  WHERE a.status = 'ATIVO'
    AND EXISTS (
      SELECT 1 FROM public.saas_invoices i
      WHERE i.academy_id = a.id
        AND i.status = 'ATRASADO'
        AND i.due_date < (CURRENT_DATE - INTERVAL '15 days')
    );
END;
$$;

-- Marca faturas vencidas como ATRASADO
CREATE OR REPLACE FUNCTION public.refresh_saas_invoice_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.saas_invoices
  SET status = 'ATRASADO', updated_at = now()
  WHERE status = 'PENDENTE'
    AND due_date < CURRENT_DATE;
  PERFORM public.apply_saas_kill_switch();
END;
$$;
