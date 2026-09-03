-- UP-313: turmas operacionais com roster fixo (class_groups)

CREATE TABLE public.class_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  training_category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.academy_branches(id) ON DELETE SET NULL,
  instructor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  max_students INTEGER NOT NULL DEFAULT 20 CHECK (max_students > 0),
  status public.academy_status NOT NULL DEFAULT 'ATIVO',
  schedule_hint JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT class_groups_category_academy CHECK (training_category_id IS NOT NULL)
);

CREATE INDEX class_groups_academy_idx ON public.class_groups (academy_id, status);
CREATE INDEX class_groups_category_idx ON public.class_groups (training_category_id);

CREATE TABLE public.class_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_group_id UUID NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_group_id, student_id)
);

CREATE INDEX class_group_members_student_idx ON public.class_group_members (student_id);

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL;

ALTER TABLE public.schedule_series
  ADD COLUMN IF NOT EXISTS class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL;

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL;

ALTER TABLE public.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_student_id_training_category_id_class_date_key;

CREATE UNIQUE INDEX attendance_records_category_daily_uidx
  ON public.attendance_records (student_id, training_category_id, class_date)
  WHERE class_group_id IS NULL;

CREATE UNIQUE INDEX attendance_records_group_daily_uidx
  ON public.attendance_records (student_id, class_group_id, class_date)
  WHERE class_group_id IS NOT NULL;

CREATE TRIGGER class_groups_updated_at
  BEFORE UPDATE ON public.class_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.class_group_member_count(p_class_group_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.class_group_members
  WHERE class_group_id = p_class_group_id;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_class_group(p_class_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_groups cg
    WHERE cg.id = p_class_group_id
      AND (
        public.is_school_owner(cg.academy_id)
        OR public.has_academy_role(cg.academy_id, ARRAY['ASSISTANT']::user_role[])
        OR (
          public.is_scoped_professor(cg.academy_id)
          AND (
            cg.instructor_user_id = auth.uid()
            OR cg.training_category_id IN (SELECT public.instructor_category_ids(cg.academy_id))
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.class_group_in_instructor_scope(
  p_class_group_id UUID,
  p_academy_id UUID,
  p_category_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_class_group_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.class_groups cg
      WHERE cg.id = p_class_group_id
        AND cg.academy_id = p_academy_id
        AND cg.training_category_id = p_category_id
        AND cg.training_category_id IN (SELECT public.instructor_category_ids(p_academy_id))
    );
$$;

DROP POLICY IF EXISTS class_sessions_professor ON public.class_sessions;

CREATE OR REPLACE FUNCTION public.class_session_in_instructor_scope(
  p_academy_id UUID,
  p_session_type public.schedule_session_type,
  p_category_id UUID,
  p_student_id UUID,
  p_instructor_user_id UUID,
  p_class_group_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_session_type = 'GROUP' THEN
      p_category_id IS NOT NULL
      AND p_category_id IN (SELECT public.instructor_category_ids(p_academy_id))
      AND public.class_group_in_instructor_scope(p_class_group_id, p_academy_id, p_category_id)
    WHEN p_session_type = 'INDIVIDUAL' THEN
      p_instructor_user_id = auth.uid()
      OR (
        p_student_id IS NOT NULL
        AND public.student_in_instructor_scope(p_student_id, p_academy_id)
      )
    ELSE
      p_category_id IS NULL
      OR p_category_id IN (SELECT public.instructor_category_ids(p_academy_id))
  END;
$$;

DROP POLICY IF EXISTS class_sessions_professor ON public.class_sessions;

CREATE POLICY class_sessions_professor ON public.class_sessions
  FOR ALL TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND public.class_session_in_instructor_scope(
      academy_id, session_type, category_id, student_id, instructor_user_id, class_group_id
    )
  )
  WITH CHECK (
    public.is_scoped_professor(academy_id)
    AND public.class_session_in_instructor_scope(
      academy_id, session_type, category_id, student_id, instructor_user_id, class_group_id
    )
  );

CREATE OR REPLACE FUNCTION public.get_student_class_sessions(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS SETOF public.class_sessions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cs.*
  FROM public.class_sessions cs
  JOIN public.students s ON s.user_id = auth.uid()
  WHERE cs.academy_id = s.academy_id
    AND cs.status = 'SCHEDULED'
    AND cs.visible_to_student = true
    AND cs.starts_at >= p_from
    AND cs.starts_at < p_to
    AND (
      (cs.session_type = 'INDIVIDUAL' AND cs.student_id = s.id)
      OR (
        cs.session_type = 'GROUP'
        AND (
          (
            cs.class_group_id IS NOT NULL
            AND cs.class_group_id IN (
              SELECT cgm.class_group_id
              FROM public.class_group_members cgm
              WHERE cgm.student_id = s.id
            )
          )
          OR (
            cs.class_group_id IS NULL
            AND cs.category_id IN (
              SELECT sc.training_category_id
              FROM public.student_categories sc
              WHERE sc.student_id = s.id
            )
          )
        )
      )
      OR (
        cs.session_type = 'EVENT'
        AND (
          cs.category_id IS NULL
          OR cs.category_id IN (
            SELECT sc.training_category_id
            FROM public.student_categories sc
            WHERE sc.student_id = s.id
          )
        )
      )
    )
  ORDER BY cs.starts_at;
$$;

CREATE OR REPLACE FUNCTION public.add_class_group_member(
  p_class_group_id UUID,
  p_student_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.class_groups%ROWTYPE;
  v_member_id UUID;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_group FROM public.class_groups WHERE id = p_class_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma não encontrada';
  END IF;

  IF NOT public.can_manage_class_group(p_class_group_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students st
    WHERE st.id = p_student_id
      AND st.academy_id = v_group.academy_id
  ) THEN
    RAISE EXCEPTION 'Aluno inválido para esta academia';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_categories sc
    WHERE sc.student_id = p_student_id
      AND sc.training_category_id = v_group.training_category_id
  ) THEN
    INSERT INTO public.student_categories (student_id, training_category_id)
    VALUES (p_student_id, v_group.training_category_id);
  END IF;

  SELECT public.class_group_member_count(p_class_group_id) INTO v_count;
  IF v_count >= v_group.max_students THEN
    RAISE EXCEPTION 'Turma atingiu capacidade máxima (%)', v_group.max_students;
  END IF;

  INSERT INTO public.class_group_members (class_group_id, student_id)
  VALUES (p_class_group_id, p_student_id)
  ON CONFLICT (class_group_id, student_id) DO NOTHING
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_class_group_member(
  p_class_group_id UUID,
  p_student_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_class_group(p_class_group_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  DELETE FROM public.class_group_members
  WHERE class_group_id = p_class_group_id
    AND student_id = p_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_category_students_to_class_group(
  p_class_group_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.class_groups%ROWTYPE;
  v_added INTEGER := 0;
  v_count INTEGER;
  r RECORD;
BEGIN
  SELECT * INTO v_group FROM public.class_groups WHERE id = p_class_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma não encontrada';
  END IF;

  IF NOT public.can_manage_class_group(p_class_group_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  FOR r IN
    SELECT sc.student_id
    FROM public.student_categories sc
    INNER JOIN public.students st ON st.id = sc.student_id
    WHERE sc.training_category_id = v_group.training_category_id
      AND st.academy_id = v_group.academy_id
      AND st.status IN ('ATIVO', 'TRIAL', 'INADIMPLENTE')
  LOOP
    SELECT public.class_group_member_count(p_class_group_id) INTO v_count;
    EXIT WHEN v_count >= v_group.max_students;

    IF NOT EXISTS (
      SELECT 1 FROM public.class_group_members
      WHERE class_group_id = p_class_group_id AND student_id = r.student_id
    ) THEN
      INSERT INTO public.class_group_members (class_group_id, student_id)
      VALUES (p_class_group_id, r.student_id);
      v_added := v_added + 1;
    END IF;
  END LOOP;

  RETURN v_added;
END;
$$;

ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY class_groups_owner ON public.class_groups
  FOR ALL TO authenticated
  USING (public.is_school_owner(academy_id))
  WITH CHECK (public.is_school_owner(academy_id));

CREATE POLICY class_groups_assistant ON public.class_groups
  FOR ALL TO authenticated
  USING (
    public.has_academy_role(academy_id, ARRAY['ASSISTANT']::user_role[])
    AND NOT public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
  )
  WITH CHECK (
    public.has_academy_role(academy_id, ARRAY['ASSISTANT']::user_role[])
    AND NOT public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
  );

CREATE POLICY class_groups_professor ON public.class_groups
  FOR ALL TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND (
      instructor_user_id = auth.uid()
      OR training_category_id IN (SELECT public.instructor_category_ids(academy_id))
    )
  )
  WITH CHECK (
    public.is_scoped_professor(academy_id)
    AND (
      instructor_user_id = auth.uid()
      OR training_category_id IN (SELECT public.instructor_category_ids(academy_id))
    )
  );

CREATE POLICY class_groups_student_read ON public.class_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.class_group_members cgm
      INNER JOIN public.students s ON s.id = cgm.student_id
      WHERE cgm.class_group_id = class_groups.id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY class_group_members_staff ON public.class_group_members
  FOR ALL TO authenticated
  USING (public.can_manage_class_group(class_group_id))
  WITH CHECK (public.can_manage_class_group(class_group_id));

CREATE POLICY class_group_members_student_read ON public.class_group_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = class_group_members.student_id
        AND s.user_id = auth.uid()
    )
  );

GRANT EXECUTE ON FUNCTION public.class_group_member_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_class_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.class_group_in_instructor_scope(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.class_session_in_instructor_scope(UUID, public.schedule_session_type, UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_class_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_class_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_category_students_to_class_group(UUID) TO authenticated;

COMMENT ON TABLE public.class_groups IS 'Turma operacional com roster fixo dentro de uma modalidade (UP-313)';
COMMENT ON TABLE public.class_group_members IS 'Roster de alunos por turma operacional';
