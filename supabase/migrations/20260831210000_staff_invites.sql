-- UP-106: convite de professor / sub-professor via link público

CREATE TABLE public.staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_invites_status_check CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  CONSTRAINT staff_invites_role_check CHECK (role IN ('PROFESSOR', 'ASSISTANT'))
);

CREATE INDEX staff_invites_token_idx ON public.staff_invites (token) WHERE status = 'PENDING';

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_invites_owner ON public.staff_invites
  FOR ALL TO authenticated
  USING (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  )
  WITH CHECK (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  );

CREATE OR REPLACE FUNCTION public.get_public_staff_invite(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT i.email, i.role, i.status, i.expires_at, a.name AS academy_name, a.slug AS academy_slug, a.status AS academy_status
  INTO v_row
  FROM public.staff_invites i
  JOIN public.academies a ON a.id = i.academy_id
  WHERE i.token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'NOT_FOUND');
  END IF;

  IF v_row.academy_status <> 'ATIVO' THEN
    RETURN json_build_object('valid', false, 'reason', 'ACADEMY_INACTIVE');
  END IF;

  IF v_row.status <> 'PENDING' THEN
    RETURN json_build_object('valid', false, 'reason', 'ALREADY_USED', 'academy_name', v_row.academy_name);
  END IF;

  IF v_row.expires_at < now() THEN
    UPDATE public.staff_invites SET status = 'EXPIRED' WHERE token = p_token AND status = 'PENDING';
    RETURN json_build_object('valid', false, 'reason', 'EXPIRED', 'academy_name', v_row.academy_name);
  END IF;

  RETURN json_build_object(
    'valid', true,
    'email', v_row.email,
    'role', v_row.role,
    'academy_name', v_row.academy_name,
    'academy_slug', v_row.academy_slug,
    'expires_at', v_row.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_staff_invite(UUID) TO anon, authenticated;
