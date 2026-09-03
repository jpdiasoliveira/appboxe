-- UP-301: check-in por QR code

CREATE TYPE public.attendance_qr_status AS ENUM ('ACTIVE', 'EXPIRED', 'CLOSED');

CREATE TABLE public.attendance_qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  training_category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  class_date DATE NOT NULL DEFAULT CURRENT_DATE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  status public.attendance_qr_status NOT NULL DEFAULT 'ACTIVE',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX attendance_qr_sessions_academy_date_idx
  ON public.attendance_qr_sessions (academy_id, class_date, status);

CREATE INDEX attendance_qr_sessions_token_idx
  ON public.attendance_qr_sessions (token)
  WHERE status = 'ACTIVE';

CREATE TRIGGER attendance_qr_sessions_updated_at
  BEFORE UPDATE ON public.attendance_qr_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_attendance_qr_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.attendance_qr_sessions
  SET status = 'EXPIRED', updated_at = now()
  WHERE status = 'ACTIVE'
    AND expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.create_attendance_qr_session(
  p_training_category_id UUID,
  p_class_date DATE DEFAULT CURRENT_DATE,
  p_class_group_id UUID DEFAULT NULL,
  p_ttl_minutes INTEGER DEFAULT 120
)
RETURNS TABLE (
  session_id UUID,
  token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category public.training_categories%ROWTYPE;
  v_token TEXT;
  v_expires TIMESTAMPTZ;
  v_session_id UUID;
BEGIN
  PERFORM public.refresh_attendance_qr_sessions();

  SELECT * INTO v_category
  FROM public.training_categories
  WHERE id = p_training_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modalidade não encontrada';
  END IF;

  IF NOT public.is_academy_staff(v_category.academy_id) AND NOT public.is_platform_owner() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF public.is_scoped_professor(v_category.academy_id)
    AND p_training_category_id NOT IN (SELECT public.instructor_category_ids(v_category.academy_id)) THEN
    RAISE EXCEPTION 'Modalidade fora do seu escopo';
  END IF;

  IF p_class_group_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.class_groups cg
      WHERE cg.id = p_class_group_id
        AND cg.academy_id = v_category.academy_id
        AND cg.training_category_id = p_training_category_id
    ) THEN
      RAISE EXCEPTION 'Turma inválida para esta modalidade';
    END IF;
  END IF;

  UPDATE public.attendance_qr_sessions
  SET status = 'CLOSED', updated_at = now()
  WHERE academy_id = v_category.academy_id
    AND training_category_id = p_training_category_id
    AND class_date = p_class_date
    AND status = 'ACTIVE'
    AND (
      (class_group_id IS NULL AND p_class_group_id IS NULL)
      OR class_group_id = p_class_group_id
    );

  v_token := encode(gen_random_bytes(18), 'hex');
  v_expires := now() + make_interval(mins => GREATEST(p_ttl_minutes, 5));

  INSERT INTO public.attendance_qr_sessions (
    academy_id,
    training_category_id,
    class_group_id,
    class_date,
    token,
    expires_at,
    created_by
  )
  VALUES (
    v_category.academy_id,
    p_training_category_id,
    p_class_group_id,
    p_class_date,
    v_token,
    v_expires,
    auth.uid()
  )
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT v_session_id, v_token, v_expires;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_attendance_qr_checkin(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.attendance_qr_sessions%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_attendance_id UUID;
BEGIN
  PERFORM public.refresh_attendance_qr_sessions();

  SELECT * INTO v_session
  FROM public.attendance_qr_sessions
  WHERE token = p_token
    AND status = 'ACTIVE'
    AND expires_at >= now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QR inválido ou expirado';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE user_id = auth.uid()
    AND academy_id = v_session.academy_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado nesta academia';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_categories sc
    WHERE sc.student_id = v_student.id
      AND sc.training_category_id = v_session.training_category_id
  ) THEN
    RAISE EXCEPTION 'Você não está matriculado nesta modalidade';
  END IF;

  IF v_session.class_group_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.class_group_members cgm
      WHERE cgm.class_group_id = v_session.class_group_id
        AND cgm.student_id = v_student.id
    ) THEN
    RAISE EXCEPTION 'Você não pertence a esta turma';
  END IF;

  IF v_session.class_group_id IS NULL THEN
    INSERT INTO public.attendance_records (
      academy_id,
      student_id,
      training_category_id,
      class_date,
      present,
      recorded_by,
      class_group_id
    )
    VALUES (
      v_session.academy_id,
      v_student.id,
      v_session.training_category_id,
      v_session.class_date,
      true,
      auth.uid(),
      NULL
    )
    ON CONFLICT (student_id, training_category_id, class_date)
      WHERE class_group_id IS NULL
    DO UPDATE SET
      present = true,
      recorded_by = auth.uid()
    RETURNING id INTO v_attendance_id;
  ELSE
    INSERT INTO public.attendance_records (
      academy_id,
      student_id,
      training_category_id,
      class_date,
      present,
      recorded_by,
      class_group_id
    )
    VALUES (
      v_session.academy_id,
      v_student.id,
      v_session.training_category_id,
      v_session.class_date,
      true,
      auth.uid(),
      v_session.class_group_id
    )
    ON CONFLICT (student_id, class_group_id, class_date)
      WHERE class_group_id IS NOT NULL
    DO UPDATE SET
      present = true,
      recorded_by = auth.uid()
    RETURNING id INTO v_attendance_id;
  END IF;

  RETURN v_attendance_id;
END;
$$;

ALTER TABLE public.attendance_qr_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_qr_owner_assistant ON public.attendance_qr_sessions
  FOR ALL TO authenticated
  USING (
    public.is_school_owner(academy_id)
    OR (
      public.has_academy_role(academy_id, ARRAY['ASSISTANT']::user_role[])
      AND NOT public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    )
  )
  WITH CHECK (
    public.is_school_owner(academy_id)
    OR (
      public.has_academy_role(academy_id, ARRAY['ASSISTANT']::user_role[])
      AND NOT public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    )
  );

CREATE POLICY attendance_qr_professor ON public.attendance_qr_sessions
  FOR ALL TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND training_category_id IN (SELECT public.instructor_category_ids(academy_id))
  )
  WITH CHECK (
    public.is_scoped_professor(academy_id)
    AND training_category_id IN (SELECT public.instructor_category_ids(academy_id))
  );

GRANT EXECUTE ON FUNCTION public.refresh_attendance_qr_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_attendance_qr_session(UUID, DATE, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_attendance_qr_checkin(TEXT) TO authenticated;

COMMENT ON TABLE public.attendance_qr_sessions IS 'Sessões de check-in por QR (UP-301)';
