-- Convite de matrícula: aluno preenche dados via link público

CREATE TABLE public.student_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES auth.users(id),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT student_invites_status_check CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED'))
);

CREATE INDEX student_invites_token_idx ON public.student_invites (token) WHERE status = 'PENDING';

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 1),
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

ALTER TABLE public.student_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY invites_staff ON public.student_invites
  FOR ALL TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner())
  WITH CHECK (public.is_academy_staff(academy_id) OR public.is_platform_owner());

CREATE OR REPLACE FUNCTION public.get_public_student_invite(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT i.email, i.status, i.expires_at, a.name AS academy_name, a.slug AS academy_slug, a.status AS academy_status
  INTO v_row
  FROM public.student_invites i
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
    UPDATE public.student_invites SET status = 'EXPIRED' WHERE token = p_token AND status = 'PENDING';
    RETURN json_build_object('valid', false, 'reason', 'EXPIRED', 'academy_name', v_row.academy_name);
  END IF;

  RETURN json_build_object(
    'valid', true,
    'email', v_row.email,
    'academy_name', v_row.academy_name,
    'academy_slug', v_row.academy_slug,
    'expires_at', v_row.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_student_invite(UUID) TO anon, authenticated;
