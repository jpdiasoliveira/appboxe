-- RingPro: user_academy_roles + audit_logs
CREATE TABLE public.user_academy_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID REFERENCES public.academies(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  status role_status NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, academy_id, role)
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_academy_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helpers RLS
CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_academy_roles
    WHERE user_id = auth.uid()
      AND role = 'PLATFORM_OWNER'
      AND status = 'ATIVO'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_academy_role(p_academy_id UUID, p_roles user_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_academy_roles
    WHERE user_id = auth.uid()
      AND academy_id = p_academy_id
      AND role = ANY(p_roles)
      AND status = 'ATIVO'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_academy_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT academy_id FROM public.user_academy_roles
  WHERE user_id = auth.uid()
    AND status = 'ATIVO'
    AND academy_id IS NOT NULL;
$$;

-- RLS academies
CREATE POLICY academies_platform_all ON public.academies
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY academies_member_select ON public.academies
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_academy_ids()));

-- RLS user_academy_roles
CREATE POLICY roles_select_own ON public.user_academy_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_owner()
    OR public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
  );

CREATE POLICY roles_platform_manage ON public.user_academy_roles
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY roles_owner_insert ON public.user_academy_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
  );

-- RLS audit_logs
CREATE POLICY audit_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY audit_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_owner()
    OR user_id = auth.uid()
    OR (academy_id IS NOT NULL AND public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[]))
  );
