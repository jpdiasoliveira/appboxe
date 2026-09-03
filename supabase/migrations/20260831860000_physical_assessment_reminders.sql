-- UP-305: avaliação física periódica (lembrete peso/altura)

CREATE TABLE public.body_assessment_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  due_on DATE NOT NULL,
  student_notified_at TIMESTAMPTZ,
  staff_notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, due_on)
);

CREATE INDEX body_assessment_cycles_academy_open_idx
  ON public.body_assessment_cycles (academy_id, due_on)
  WHERE resolved_at IS NULL;

CREATE INDEX body_assessment_cycles_student_open_idx
  ON public.body_assessment_cycles (student_id, due_on DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.body_assessment_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY body_assessment_cycles_staff_read ON public.body_assessment_cycles
  FOR SELECT TO authenticated
  USING (
    public.is_academy_staff(academy_id)
    OR public.is_platform_owner()
  );

CREATE POLICY body_assessment_cycles_student_read ON public.body_assessment_cycles
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.academy_physical_assessment_interval_months(p_academy_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE(NULLIF((a.settings->>'physical_assessment_interval_months')::int, 0), 6),
    1
  )
  FROM public.academies a
  WHERE a.id = p_academy_id;
$$;

CREATE OR REPLACE FUNCTION public.academy_has_physical_assessment(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT enabled
      FROM public.academy_feature_flags
      WHERE academy_id = p_academy_id
        AND flag_key = 'module_physical_assessment'
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.student_last_body_measurement_on(p_student_id UUID)
RETURNS DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT MAX(m.measured_at::date)
      FROM public.student_body_metrics m
      WHERE m.student_id = p_student_id
    ),
    (
      SELECT COALESCE(s.enrollment_date, s.created_at::date)
      FROM public.students s
      WHERE s.id = p_student_id
    ),
    CURRENT_DATE
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_body_assessment_cycles(p_student_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.body_assessment_cycles
  SET resolved_at = now()
  WHERE student_id = p_student_id
    AND resolved_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_resolve_body_assessment_cycles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.resolve_body_assessment_cycles(NEW.student_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER student_body_metrics_resolve_assessment
  AFTER INSERT ON public.student_body_metrics
  FOR EACH ROW EXECUTE FUNCTION public.trg_resolve_body_assessment_cycles();

CREATE OR REPLACE FUNCTION public.get_body_assessment_status(p_student_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_enabled BOOLEAN;
  v_interval INTEGER;
  v_last DATE;
  v_due_on DATE;
  v_open_cycle public.body_assessment_cycles%ROWTYPE;
BEGIN
  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_enabled := public.academy_has_physical_assessment(v_student.academy_id);
  IF NOT v_enabled THEN
    RETURN json_build_object('enabled', false);
  END IF;

  IF NOT (
    public.is_platform_owner()
    OR public.is_academy_staff(v_student.academy_id)
    OR v_student.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_interval := public.academy_physical_assessment_interval_months(v_student.academy_id);
  v_last := public.student_last_body_measurement_on(p_student_id);
  v_due_on := (v_last + make_interval(months => v_interval))::date;

  SELECT * INTO v_open_cycle
  FROM public.body_assessment_cycles
  WHERE student_id = p_student_id
    AND resolved_at IS NULL
  ORDER BY due_on DESC
  LIMIT 1;

  RETURN json_build_object(
    'enabled', true,
    'interval_months', v_interval,
    'last_measured_on', v_last,
    'due_on', v_due_on,
    'is_due', CURRENT_DATE >= v_due_on,
    'has_open_cycle', v_open_cycle.id IS NOT NULL,
    'open_cycle_id', v_open_cycle.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_physical_assessment_due()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycles_created INTEGER := 0;
  v_student_notified INTEGER := 0;
  v_staff_notified INTEGER := 0;
  v_cycle public.body_assessment_cycles%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_interval INTEGER;
  v_last DATE;
  v_due_on DATE;
BEGIN
  WITH due_students AS (
    SELECT
      s.id AS student_id,
      s.academy_id,
      s.user_id,
      public.academy_physical_assessment_interval_months(s.academy_id) AS interval_months,
      public.student_last_body_measurement_on(s.id) AS last_measured_on
    FROM public.students s
    INNER JOIN public.academy_feature_flags f
      ON f.academy_id = s.academy_id
     AND f.flag_key = 'module_physical_assessment'
     AND f.enabled = true
    WHERE s.status IN ('ATIVO', 'INADIMPLENTE', 'TRIAL')
      AND s.user_id IS NOT NULL
  ),
  due_rows AS (
    SELECT
      student_id,
      academy_id,
      (last_measured_on + make_interval(months => interval_months))::date AS due_on
    FROM due_students
    WHERE (last_measured_on + make_interval(months => interval_months))::date <= CURRENT_DATE
  ),
  inserted AS (
    INSERT INTO public.body_assessment_cycles (student_id, academy_id, due_on)
    SELECT student_id, academy_id, due_on
    FROM due_rows
    ON CONFLICT (student_id, due_on) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_cycles_created FROM inserted;

  FOR v_cycle IN
    SELECT *
    FROM public.body_assessment_cycles
    WHERE resolved_at IS NULL
      AND (student_notified_at IS NULL OR staff_notified_at IS NULL)
  LOOP
    SELECT * INTO v_student FROM public.students WHERE id = v_cycle.student_id;
    IF NOT FOUND OR v_student.user_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_student.user_id;

    IF v_cycle.student_notified_at IS NULL THEN
      INSERT INTO public.notifications (user_id, academy_id, title, body, kind, reference_id)
      VALUES (
        v_student.user_id,
        v_cycle.academy_id,
        'Atualize seu peso e altura',
        'Sua avaliação física está pendente. A última medição foi em ' ||
          to_char(public.student_last_body_measurement_on(v_student.id), 'DD/MM/YYYY') ||
          '. Atualize em Meu perfil.',
        'physical_assessment_due',
        v_cycle.id
      )
      ON CONFLICT (user_id, kind, reference_id) DO NOTHING;

      UPDATE public.body_assessment_cycles
      SET student_notified_at = now()
      WHERE id = v_cycle.id;

      v_student_notified := v_student_notified + 1;
    END IF;

    IF v_cycle.staff_notified_at IS NULL THEN
      INSERT INTO public.notifications (user_id, academy_id, title, body, kind, reference_id)
      SELECT
        uar.user_id,
        v_cycle.academy_id,
        'Avaliação física pendente',
        COALESCE(v_profile.name, 'Aluno') || ' precisa atualizar peso/altura (vencida em ' ||
          to_char(v_cycle.due_on, 'DD/MM/YYYY') || ').',
        'physical_assessment_staff',
        v_cycle.id
      FROM public.user_academy_roles uar
      WHERE uar.academy_id = v_cycle.academy_id
        AND uar.status = 'ATIVO'
        AND uar.role IN ('SCHOOL_OWNER', 'ASSISTANT')
      ON CONFLICT (user_id, kind, reference_id) DO NOTHING;

      INSERT INTO public.notifications (user_id, academy_id, title, body, kind, reference_id)
      SELECT
        uar.user_id,
        v_cycle.academy_id,
        'Avaliação física pendente',
        COALESCE(v_profile.name, 'Aluno') || ' precisa atualizar peso/altura (vencida em ' ||
          to_char(v_cycle.due_on, 'DD/MM/YYYY') || ').',
        'physical_assessment_staff',
        v_cycle.id
      FROM public.user_academy_roles uar
      WHERE uar.academy_id = v_cycle.academy_id
        AND uar.status = 'ATIVO'
        AND uar.role = 'PROFESSOR'
        AND EXISTS (
          SELECT 1
          FROM public.student_categories sc
          INNER JOIN public.instructor_training_categories itc
            ON itc.training_category_id = sc.training_category_id
           AND itc.academy_id = v_cycle.academy_id
           AND itc.user_id = uar.user_id
          WHERE sc.student_id = v_cycle.student_id
        )
      ON CONFLICT (user_id, kind, reference_id) DO NOTHING;

      UPDATE public.body_assessment_cycles
      SET staff_notified_at = now()
      WHERE id = v_cycle.id;

      v_staff_notified := v_staff_notified + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'cycles_created', v_cycles_created,
    'student_notifications', v_student_notified,
    'staff_notification_batches', v_staff_notified
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.academy_physical_assessment_interval_months(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.academy_has_physical_assessment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_last_body_measurement_on(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_body_assessment_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_physical_assessment_due() TO service_role;
