-- UP-312: reposição de aula — créditos e remarcação

CREATE TYPE public.class_makeup_status AS ENUM (
  'DISPONIVEL',
  'USADO',
  'EXPIRADO',
  'CANCELADO'
);

CREATE TABLE public.class_makeup_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  training_category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  source_attendance_id UUID REFERENCES public.attendance_records(id) ON DELETE SET NULL,
  source_session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,
  status public.class_makeup_status NOT NULL DEFAULT 'DISPONIVEL',
  expires_at DATE NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT class_makeup_credits_category_academy CHECK (
    training_category_id IS NOT NULL
  )
);

CREATE TABLE public.class_makeup_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID NOT NULL UNIQUE REFERENCES public.class_makeup_credits(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX class_makeup_credits_student_idx
  ON public.class_makeup_credits (student_id, status, expires_at);

CREATE INDEX class_makeup_credits_academy_idx
  ON public.class_makeup_credits (academy_id, status);

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS is_makeup BOOLEAN NOT NULL DEFAULT false;

CREATE TRIGGER class_makeup_credits_updated_at
  BEFORE UPDATE ON public.class_makeup_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.academy_makeup_credit_days(p_academy_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE(NULLIF((a.settings->>'makeup_credit_days')::int, 0), 30),
    1
  )
  FROM public.academies a
  WHERE a.id = p_academy_id;
$$;

CREATE OR REPLACE FUNCTION public.refresh_class_makeup_credit_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.class_makeup_credits
  SET status = 'EXPIRADO', updated_at = now()
  WHERE status = 'DISPONIVEL'
    AND expires_at < CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_class_makeup_credit(
  p_student_id UUID,
  p_training_category_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_source_attendance_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_category public.training_categories%ROWTYPE;
  v_credit_id UUID;
  v_expires DATE;
BEGIN
  PERFORM public.refresh_class_makeup_credit_status();

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado';
  END IF;

  SELECT * INTO v_category
  FROM public.training_categories
  WHERE id = p_training_category_id
    AND academy_id = v_student.academy_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modalidade inválida para esta academia';
  END IF;

  IF NOT public.can_manage_student_documents(p_student_id, v_student.academy_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_categories sc
    WHERE sc.student_id = p_student_id
      AND sc.training_category_id = p_training_category_id
  ) THEN
    RAISE EXCEPTION 'Aluno não está matriculado nesta modalidade';
  END IF;

  v_expires := CURRENT_DATE + public.academy_makeup_credit_days(v_student.academy_id);

  INSERT INTO public.class_makeup_credits (
    academy_id,
    student_id,
    training_category_id,
    source_attendance_id,
    status,
    expires_at,
    granted_by,
    notes
  ) VALUES (
    v_student.academy_id,
    p_student_id,
    p_training_category_id,
    p_source_attendance_id,
    'DISPONIVEL',
    v_expires,
    auth.uid(),
    NULLIF(trim(p_notes), '')
  )
  RETURNING id INTO v_credit_id;

  INSERT INTO public.notifications (user_id, academy_id, title, body, kind, reference_id)
  VALUES (
    v_student.user_id,
    v_student.academy_id,
    'Crédito de reposição disponível',
    'Você tem uma reposição em ' || v_category.name ||
      ' válida até ' || to_char(v_expires, 'DD/MM/YYYY') || '.',
    'makeup_credit_granted',
    v_credit_id
  );

  RETURN v_credit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_class_makeup_credit(
  p_credit_id UUID,
  p_session_date DATE,
  p_time_start TIME,
  p_time_end TIME,
  p_title TEXT DEFAULT 'Reposição'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit public.class_makeup_credits%ROWTYPE;
  v_category public.training_categories%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_session_id UUID;
  v_starts TIMESTAMPTZ;
  v_ends TIMESTAMPTZ;
BEGIN
  PERFORM public.refresh_class_makeup_credit_status();

  SELECT * INTO v_credit
  FROM public.class_makeup_credits
  WHERE id = p_credit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crédito não encontrado';
  END IF;

  IF v_credit.status <> 'DISPONIVEL' THEN
    RAISE EXCEPTION 'Crédito não está disponível';
  END IF;

  IF v_credit.expires_at < CURRENT_DATE THEN
    UPDATE public.class_makeup_credits SET status = 'EXPIRADO', updated_at = now()
    WHERE id = p_credit_id;
    RAISE EXCEPTION 'Crédito expirado';
  END IF;

  IF NOT public.can_manage_student_documents(v_credit.student_id, v_credit.academy_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF p_time_end <= p_time_start THEN
    RAISE EXCEPTION 'Horário inválido';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = v_credit.student_id;
  SELECT * INTO v_category FROM public.training_categories WHERE id = v_credit.training_category_id;

  v_starts := (p_session_date::text || 'T' || p_time_start::text)::timestamptz;
  v_ends := (p_session_date::text || 'T' || p_time_end::text)::timestamptz;

  INSERT INTO public.class_sessions (
    academy_id,
    created_by,
    session_type,
    event_kind,
    category_id,
    student_id,
    instructor_user_id,
    title,
    color,
    starts_at,
    ends_at,
    status,
    is_makeup,
    visible_to_student
  ) VALUES (
    v_credit.academy_id,
    auth.uid(),
    'INDIVIDUAL',
    'CLASS',
    v_credit.training_category_id,
    v_credit.student_id,
    auth.uid(),
    COALESCE(NULLIF(trim(p_title), ''), 'Reposição'),
    '#0891B2',
    v_starts,
    v_ends,
    'SCHEDULED',
    true,
    true
  )
  RETURNING id INTO v_session_id;

  INSERT INTO public.class_makeup_redemptions (credit_id, class_session_id, redeemed_by)
  VALUES (p_credit_id, v_session_id, auth.uid());

  UPDATE public.class_makeup_credits
  SET status = 'USADO', updated_at = now()
  WHERE id = p_credit_id;

  INSERT INTO public.notifications (user_id, academy_id, title, body, kind, reference_id)
  VALUES (
    v_student.user_id,
    v_credit.academy_id,
    'Reposição agendada',
    'Sua reposição em ' || v_category.name || ' foi marcada para ' ||
      to_char(v_starts, 'DD/MM/YYYY HH24:MI') || '.',
    'makeup_credit_redeemed',
    v_session_id
  );

  RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_class_makeup_credit(p_credit_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit public.class_makeup_credits%ROWTYPE;
BEGIN
  SELECT * INTO v_credit FROM public.class_makeup_credits WHERE id = p_credit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crédito não encontrado';
  END IF;

  IF NOT public.can_manage_student_documents(v_credit.student_id, v_credit.academy_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_credit.status <> 'DISPONIVEL' THEN
    RAISE EXCEPTION 'Somente créditos disponíveis podem ser cancelados';
  END IF;

  UPDATE public.class_makeup_credits
  SET status = 'CANCELADO', updated_at = now()
  WHERE id = p_credit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_class_makeup_credit(UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_class_makeup_credit(UUID, DATE, TIME, TIME, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_class_makeup_credit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_makeup_credit_days(UUID) TO authenticated;

ALTER TABLE public.class_makeup_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_makeup_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY class_makeup_credits_staff ON public.class_makeup_credits
  FOR ALL TO authenticated
  USING (public.can_manage_student_documents(student_id, academy_id))
  WITH CHECK (public.can_manage_student_documents(student_id, academy_id));

CREATE POLICY class_makeup_credits_self_read ON public.class_makeup_credits
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY class_makeup_redemptions_staff_read ON public.class_makeup_redemptions
  FOR SELECT TO authenticated
  USING (
    credit_id IN (
      SELECT c.id FROM public.class_makeup_credits c
      WHERE public.can_manage_student_documents(c.student_id, c.academy_id)
    )
  );

CREATE POLICY class_makeup_redemptions_self_read ON public.class_makeup_redemptions
  FOR SELECT TO authenticated
  USING (
    credit_id IN (
      SELECT c.id FROM public.class_makeup_credits c
      JOIN public.students s ON s.id = c.student_id
      WHERE s.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.class_makeup_credits IS
  'Crédito de reposição de aula por aluno/modalidade (UP-312).';
COMMENT ON TABLE public.class_makeup_redemptions IS
  'Uso do crédito — vincula a uma class_session de reposição.';
