-- Wave 2: Portal Plataforma — planos SaaS, feature flags, faturas

CREATE TYPE invoice_status AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO');

CREATE TABLE public.saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_students INT NOT NULL DEFAULT 100,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER saas_plans_updated_at
  BEFORE UPDATE ON public.saas_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.academies
  ADD COLUMN saas_plan_id UUID REFERENCES public.saas_plans(id) ON DELETE SET NULL;

CREATE TABLE public.academy_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academy_id, flag_key)
);

CREATE TRIGGER academy_feature_flags_updated_at
  BEFORE UPDATE ON public.academy_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.saas_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'PENDENTE',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER saas_invoices_updated_at
  BEFORE UPDATE ON public.saas_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;

-- RLS saas_plans: platform owner full; school owner read own plan via academy
CREATE POLICY saas_plans_platform ON public.saas_plans
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY saas_plans_member_read ON public.saas_plans
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT a.saas_plan_id FROM public.academies a
      WHERE a.id IN (SELECT public.user_academy_ids())
        AND a.saas_plan_id IS NOT NULL
    )
  );

-- RLS feature flags
CREATE POLICY flags_platform ON public.academy_feature_flags
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY flags_owner_manage ON public.academy_feature_flags
  FOR ALL TO authenticated
  USING (public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[]))
  WITH CHECK (public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[]));

CREATE POLICY flags_member_read ON public.academy_feature_flags
  FOR SELECT TO authenticated
  USING (academy_id IN (SELECT public.user_academy_ids()));

-- RLS saas_invoices
CREATE POLICY invoices_platform ON public.saas_invoices
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY invoices_owner_read ON public.saas_invoices
  FOR SELECT TO authenticated
  USING (public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[]));

-- Platform owner can insert/update academies
CREATE POLICY academies_platform_insert ON public.academies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_owner());

CREATE POLICY academies_platform_update ON public.academies
  FOR UPDATE TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

-- Seed planos SaaS
INSERT INTO public.saas_plans (id, name, price_monthly, max_students, features) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Básico', 99.00, 50, '{"support":"email"}'::jsonb),
  ('b0000000-0000-4000-8000-000000000002', 'Pro', 199.00, 200, '{"support":"priority"}'::jsonb),
  ('b0000000-0000-4000-8000-000000000003', 'Enterprise', 399.00, 9999, '{"support":"dedicated"}'::jsonb)
ON CONFLICT DO NOTHING;

UPDATE public.academies
SET saas_plan_id = 'b0000000-0000-4000-8000-000000000001'
WHERE slug = 'academia-teste' AND saas_plan_id IS NULL;
