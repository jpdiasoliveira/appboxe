-- UP-107: termo/regulamento na matrícula do aluno

CREATE TABLE public.academy_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT 'Termo de matrícula',
  content_html TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX academy_terms_one_active_per_academy
  ON public.academy_terms (academy_id)
  WHERE is_active = true;

CREATE TABLE public.student_term_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academy_terms(id) ON DELETE RESTRICT,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, term_id)
);

CREATE INDEX student_term_acceptances_student_idx
  ON public.student_term_acceptances (student_id, accepted_at DESC);

CREATE TRIGGER academy_terms_updated_at
  BEFORE UPDATE ON public.academy_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.academy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_term_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_terms_staff_select ON public.academy_terms
  FOR SELECT TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner());

CREATE POLICY academy_terms_owner_manage ON public.academy_terms
  FOR ALL TO authenticated
  USING (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  )
  WITH CHECK (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  );

CREATE POLICY term_acceptances_staff_select ON public.student_term_acceptances
  FOR SELECT TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner());

CREATE POLICY term_acceptances_student_select ON public.student_term_acceptances
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.get_public_student_invite(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_term RECORD;
BEGIN
  SELECT i.email, i.status, i.expires_at, i.academy_id, a.name AS academy_name, a.slug AS academy_slug, a.status AS academy_status
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

  SELECT t.id, t.version, t.title, t.content_html
  INTO v_term
  FROM public.academy_terms t
  WHERE t.academy_id = v_row.academy_id
    AND t.is_active = true
  LIMIT 1;

  RETURN json_build_object(
    'valid', true,
    'email', v_row.email,
    'academy_name', v_row.academy_name,
    'academy_slug', v_row.academy_slug,
    'expires_at', v_row.expires_at,
    'term', CASE
      WHEN v_term.id IS NOT NULL THEN json_build_object(
        'id', v_term.id,
        'version', v_term.version,
        'title', v_term.title,
        'content_html', v_term.content_html
      )
      ELSE NULL
    END
  );
END;
$$;

-- Termo padrão para academia de teste (seed — só se academia existir)
INSERT INTO public.academy_terms (academy_id, version, title, content_html, is_active)
SELECT
  'a0000000-0000-4000-8000-000000000001',
  1,
  'Termo de matrícula e uso',
  '<p>Ao concluir o cadastro, você declara estar ciente das regras da academia, política de cancelamento, uso de imagem em treinos e responsabilidade pelas informações fornecidas.</p><p>O não cumprimento das normas internas pode resultar em suspensão da matrícula conforme regulamento local.</p>',
  true
WHERE EXISTS (
  SELECT 1 FROM public.academies WHERE id = 'a0000000-0000-4000-8000-000000000001'
)
AND NOT EXISTS (
  SELECT 1
  FROM public.academy_terms
  WHERE academy_id = 'a0000000-0000-4000-8000-000000000001'
    AND is_active = true
);
