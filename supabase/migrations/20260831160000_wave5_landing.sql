-- Wave 5: Landing page pública + leads

CREATE TABLE public.landing_page_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL UNIQUE REFERENCES public.academies(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  category_interest TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'NOVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER landing_page_config_updated_at
  BEFORE UPDATE ON public.landing_page_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.landing_page_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Helper: landing publicada e módulo ativo
CREATE OR REPLACE FUNCTION public.is_landing_public(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.landing_page_config l
    JOIN public.academies a ON a.id = l.academy_id
    WHERE l.academy_id = p_academy_id
      AND l.published = true
      AND a.status = 'ATIVO'
      AND EXISTS (
        SELECT 1 FROM public.academy_feature_flags f
        WHERE f.academy_id = p_academy_id
          AND f.flag_key = 'module_landing'
          AND f.enabled = true
      )
  );
$$;

-- landing_page_config: owner edita
CREATE POLICY landing_owner ON public.landing_page_config
  FOR ALL TO authenticated
  USING (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  )
  WITH CHECK (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  );

-- landing_page_config: leitura pública
CREATE POLICY landing_public_read ON public.landing_page_config
  FOR SELECT TO anon, authenticated
  USING (public.is_landing_public(academy_id));

-- academies: nome/slug público quando landing publicada
CREATE POLICY academies_landing_public ON public.academies
  FOR SELECT TO anon
  USING (public.is_landing_public(id));

-- categorias e planos públicos na landing
CREATE POLICY categories_landing_public ON public.training_categories
  FOR SELECT TO anon
  USING (public.is_landing_public(academy_id) AND status = 'ATIVO');

CREATE POLICY plans_landing_public ON public.academy_plans
  FOR SELECT TO anon
  USING (public.is_landing_public(academy_id) AND is_public = true AND status = 'ATIVO');

-- leads: visitante envia formulário
CREATE POLICY leads_anon_insert ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.is_landing_public(academy_id));

-- leads: staff da academia lê
CREATE POLICY leads_staff_read ON public.leads
  FOR SELECT TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner());

CREATE POLICY leads_staff_update ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[]) OR public.is_platform_owner())
  WITH CHECK (public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[]) OR public.is_platform_owner());

GRANT EXECUTE ON FUNCTION public.is_landing_public(UUID) TO anon, authenticated;

GRANT SELECT ON public.landing_page_config TO anon;
GRANT SELECT ON public.academies TO anon;
GRANT SELECT ON public.training_categories TO anon;
GRANT SELECT ON public.academy_plans TO anon;
GRANT INSERT ON public.leads TO anon;
