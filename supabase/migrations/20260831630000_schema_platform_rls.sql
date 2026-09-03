-- UP-SCH-03: RLS equipe plataforma (SUPPORT / FINANCE)

CREATE OR REPLACE FUNCTION public.is_platform_finance()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_owner()
    OR EXISTS (
      SELECT 1 FROM public.user_academy_roles
      WHERE user_id = auth.uid()
        AND academy_id IS NULL
        AND role = 'PLATFORM_FINANCE'
        AND status = 'ATIVO'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_finance() TO authenticated;

-- Academias: equipe plataforma pode ler (KPIs, suporte)
DROP POLICY IF EXISTS academies_platform_staff_read ON public.academies;
CREATE POLICY academies_platform_staff_read ON public.academies
  FOR SELECT TO authenticated
  USING (public.is_platform_operator());

-- Planos SaaS: leitura para equipe plataforma
DROP POLICY IF EXISTS saas_plans_platform_staff_read ON public.saas_plans;
CREATE POLICY saas_plans_platform_staff_read ON public.saas_plans
  FOR SELECT TO authenticated
  USING (public.is_platform_operator());

-- Faturas SaaS: leitura equipe; update financeiro
DROP POLICY IF EXISTS invoices_platform_staff_read ON public.saas_invoices;
CREATE POLICY invoices_platform_staff_read ON public.saas_invoices
  FOR SELECT TO authenticated
  USING (public.is_platform_operator());

DROP POLICY IF EXISTS invoices_platform_finance_update ON public.saas_invoices;
CREATE POLICY invoices_platform_finance_update ON public.saas_invoices
  FOR UPDATE TO authenticated
  USING (public.is_platform_finance())
  WITH CHECK (public.is_platform_finance());
