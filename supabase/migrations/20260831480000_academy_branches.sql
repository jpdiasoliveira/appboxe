-- UP-405: fundação multi-unidade (filiais por academia)

CREATE TABLE IF NOT EXISTS public.academy_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  status public.academy_status NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academy_id, slug)
);

CREATE INDEX IF NOT EXISTS academy_branches_academy_idx
  ON public.academy_branches (academy_id);

ALTER TABLE public.academy_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_branches_owner ON public.academy_branches
  FOR ALL TO authenticated
  USING (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  )
  WITH CHECK (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  );

CREATE POLICY academy_branches_staff_read ON public.academy_branches
  FOR SELECT TO authenticated
  USING (public.is_academy_staff(academy_id));

COMMENT ON TABLE public.academy_branches IS
  'Filiais/unidades de uma academia — cadastro mínimo; billing unificado no MVP.';
