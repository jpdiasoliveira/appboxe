-- Professor com escopo por modalidade; financeiro e gestão só para SCHOOL_OWNER.
-- SCHOOL_OWNER = professor no dia a dia + visão/gestão completa (nunca cai no escopo restrito).
-- Mesmo digitando a URL, RLS bloqueia dados fora do escopo para professor puro.

-- Helpers
CREATE OR REPLACE FUNCTION public.is_school_owner(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_academy_role(p_academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner();
$$;

CREATE OR REPLACE FUNCTION public.is_scoped_professor(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_academy_role(p_academy_id, ARRAY['PROFESSOR']::user_role[])
    AND NOT public.has_academy_role(p_academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    AND NOT public.is_platform_owner();
$$;

CREATE OR REPLACE FUNCTION public.instructor_category_ids(p_academy_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT training_category_id
  FROM public.instructor_training_categories
  WHERE academy_id = p_academy_id
    AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.student_in_instructor_scope(p_student_id UUID, p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.student_categories sc WHERE sc.student_id = p_student_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.student_categories sc
      INNER JOIN public.instructor_training_categories itc
        ON itc.training_category_id = sc.training_category_id
       AND itc.academy_id = p_academy_id
       AND itc.user_id = auth.uid()
      WHERE sc.student_id = p_student_id
    );
$$;

CREATE OR REPLACE FUNCTION public.class_session_in_instructor_scope(
  p_academy_id UUID,
  p_session_type public.schedule_session_type,
  p_category_id UUID,
  p_student_id UUID,
  p_instructor_user_id UUID
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

-- Financeiro: somente dono (e plataforma)
CREATE OR REPLACE FUNCTION public.can_view_academy_finance(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_school_owner(p_academy_id);
$$;

-- students
DROP POLICY IF EXISTS students_staff ON public.students;

CREATE POLICY students_owner ON public.students
  FOR ALL TO authenticated
  USING (public.is_school_owner(academy_id))
  WITH CHECK (public.is_school_owner(academy_id));

CREATE POLICY students_assistant ON public.students
  FOR ALL TO authenticated
  USING (
    public.has_academy_role(academy_id, ARRAY['ASSISTANT']::user_role[])
    AND NOT public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
  )
  WITH CHECK (
    public.has_academy_role(academy_id, ARRAY['ASSISTANT']::user_role[])
    AND NOT public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
  );

CREATE POLICY students_professor_insert ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (public.is_scoped_professor(academy_id));

CREATE POLICY students_professor_select ON public.students
  FOR SELECT TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND public.student_in_instructor_scope(id, academy_id)
  );

CREATE POLICY students_professor_update ON public.students
  FOR UPDATE TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND public.student_in_instructor_scope(id, academy_id)
  )
  WITH CHECK (
    public.is_scoped_professor(academy_id)
    AND public.student_in_instructor_scope(id, academy_id)
  );

-- training_categories
DROP POLICY IF EXISTS categories_staff ON public.training_categories;

CREATE POLICY categories_owner ON public.training_categories
  FOR ALL TO authenticated
  USING (public.is_school_owner(academy_id))
  WITH CHECK (public.is_school_owner(academy_id));

CREATE POLICY categories_assistant_read ON public.training_categories
  FOR SELECT TO authenticated
  USING (
    public.has_academy_role(academy_id, ARRAY['ASSISTANT']::user_role[])
    AND NOT public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
  );

CREATE POLICY categories_professor_read ON public.training_categories
  FOR SELECT TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND id IN (SELECT public.instructor_category_ids(academy_id))
  );

-- academy_plans — professor sem acesso
DROP POLICY IF EXISTS plans_staff ON public.academy_plans;

CREATE POLICY plans_academy_read ON public.academy_plans
  FOR SELECT TO authenticated
  USING (
    public.is_school_owner(academy_id)
    OR (
      public.has_academy_role(academy_id, ARRAY['ASSISTANT']::user_role[])
      AND NOT public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    )
    OR public.is_platform_owner()
  );

CREATE POLICY plans_owner_write ON public.academy_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_school_owner(academy_id));

CREATE POLICY plans_owner_update ON public.academy_plans
  FOR UPDATE TO authenticated
  USING (public.is_school_owner(academy_id))
  WITH CHECK (public.is_school_owner(academy_id));

CREATE POLICY plans_owner_delete ON public.academy_plans
  FOR DELETE TO authenticated
  USING (public.is_school_owner(academy_id));

-- leads — somente dono
DROP POLICY IF EXISTS leads_staff_read ON public.leads;

CREATE POLICY leads_owner_read ON public.leads
  FOR SELECT TO authenticated
  USING (public.is_school_owner(academy_id));

-- student_invites — somente dono
DROP POLICY IF EXISTS invites_staff ON public.student_invites;

CREATE POLICY invites_owner ON public.student_invites
  FOR ALL TO authenticated
  USING (public.is_school_owner(academy_id))
  WITH CHECK (public.is_school_owner(academy_id));

-- attendance
DROP POLICY IF EXISTS attendance_staff ON public.attendance_records;

CREATE POLICY attendance_owner_assistant ON public.attendance_records
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

CREATE POLICY attendance_professor ON public.attendance_records
  FOR ALL TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND training_category_id IN (SELECT public.instructor_category_ids(academy_id))
  )
  WITH CHECK (
    public.is_scoped_professor(academy_id)
    AND training_category_id IN (SELECT public.instructor_category_ids(academy_id))
  );

-- agenda
DROP POLICY IF EXISTS schedule_series_staff ON public.schedule_series;
DROP POLICY IF EXISTS class_sessions_staff ON public.class_sessions;

CREATE POLICY schedule_series_owner_assistant ON public.schedule_series
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

CREATE POLICY schedule_series_professor ON public.schedule_series
  FOR ALL TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND public.class_session_in_instructor_scope(
      academy_id, session_type, category_id, student_id, instructor_user_id
    )
  )
  WITH CHECK (
    public.is_scoped_professor(academy_id)
    AND public.class_session_in_instructor_scope(
      academy_id, session_type, category_id, student_id, instructor_user_id
    )
  );

CREATE POLICY class_sessions_owner_assistant ON public.class_sessions
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

CREATE POLICY class_sessions_professor ON public.class_sessions
  FOR ALL TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND public.class_session_in_instructor_scope(
      academy_id, session_type, category_id, student_id, instructor_user_id
    )
  )
  WITH CHECK (
    public.is_scoped_professor(academy_id)
    AND public.class_session_in_instructor_scope(
      academy_id, session_type, category_id, student_id, instructor_user_id
    )
  );

-- RPCs com escopo
CREATE OR REPLACE FUNCTION public.get_academy_category_overview(p_academy_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_finance BOOLEAN;
BEGIN
  IF NOT (public.is_academy_staff(p_academy_id) OR public.is_platform_owner()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_can_finance := public.can_view_academy_finance(p_academy_id);

  RETURN COALESCE(
    (
      SELECT json_agg(row_to_json(t) ORDER BY t.name)
      FROM (
        SELECT
          tc.id,
          tc.name,
          tc.description,
          tc.color,
          tc.status,
          tc.max_capacity,
          tc.schedule_label,
          (
            SELECT COUNT(*)::int
            FROM public.student_categories sc
            JOIN public.students s ON s.id = sc.student_id
            WHERE sc.training_category_id = tc.id
              AND s.academy_id = p_academy_id
              AND s.status IN ('ATIVO', 'TRIAL')
          ) AS student_count,
          (
            SELECT COUNT(*)::int
            FROM public.class_sessions cs
            WHERE cs.category_id = tc.id
              AND cs.academy_id = p_academy_id
              AND cs.status = 'SCHEDULED'
              AND cs.starts_at >= date_trunc('week', now())
              AND cs.starts_at < date_trunc('week', now()) + interval '1 week'
          ) AS sessions_this_week,
          (
            SELECT CASE
              WHEN COUNT(*) = 0 THEN NULL
              ELSE ROUND(
                (COUNT(*) FILTER (WHERE ar.present)::numeric / COUNT(*)::numeric) * 100,
                1
              )
            END
            FROM public.attendance_records ar
            WHERE ar.training_category_id = tc.id
              AND ar.academy_id = p_academy_id
              AND ar.class_date >= date_trunc('month', CURRENT_DATE)::date
              AND ar.class_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
          ) AS attendance_rate_pct,
          CASE
            WHEN v_can_finance THEN (
              SELECT COALESCE(SUM(i.amount), 0)::numeric
              FROM public.academy_invoices i
              JOIN public.student_categories sc ON sc.student_id = i.student_id
              WHERE sc.training_category_id = tc.id
                AND i.academy_id = p_academy_id
                AND i.status = 'PAGO'
                AND i.created_at >= date_trunc('month', now())
                AND i.created_at < date_trunc('month', now()) + interval '1 month'
            )
            ELSE NULL
          END AS revenue_month,
          (
            SELECT COALESCE(json_agg(json_build_object(
              'user_id', itc.user_id,
              'name', COALESCE(p.name, '—')
            ) ORDER BY p.name), '[]'::json)
            FROM public.instructor_training_categories itc
            LEFT JOIN public.profiles p ON p.user_id = itc.user_id
            WHERE itc.training_category_id = tc.id
              AND itc.academy_id = p_academy_id
          ) AS instructors,
          (
            SELECT COALESCE(json_agg(json_build_object(
              'id', s.id,
              'name', COALESCE(pr.name, '—'),
              'status', s.status
            ) ORDER BY pr.name), '[]'::json)
            FROM public.student_categories sc
            JOIN public.students s ON s.id = sc.student_id
            LEFT JOIN public.profiles pr ON pr.user_id = s.user_id
            WHERE sc.training_category_id = tc.id
              AND s.academy_id = p_academy_id
              AND s.status IN ('ATIVO', 'TRIAL', 'INADIMPLENTE')
          ) AS students
        FROM public.training_categories tc
        WHERE tc.academy_id = p_academy_id
          AND (
            public.is_school_owner(p_academy_id)
            OR public.has_academy_role(p_academy_id, ARRAY['ASSISTANT']::user_role[])
            OR public.is_platform_owner()
            OR (
              public.is_scoped_professor(p_academy_id)
              AND tc.id IN (SELECT public.instructor_category_ids(p_academy_id))
            )
          )
        ORDER BY tc.name
      ) t
    ),
    '[]'::json
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_academy_dashboard_charts(p_academy_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_finance BOOLEAN;
  v_scoped_professor BOOLEAN;
BEGIN
  IF NOT (public.is_academy_staff(p_academy_id) OR public.is_platform_owner()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  v_can_finance := public.can_view_academy_finance(p_academy_id);
  v_scoped_professor := public.is_scoped_professor(p_academy_id);

  RETURN json_build_object(
    'active_by_month', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.month), '[]'::json)
      FROM (
        SELECT
          to_char(d.month, 'YYYY-MM') AS month,
          COUNT(s.id)::int AS value
        FROM generate_series(
          date_trunc('month', now()) - interval '5 months',
          date_trunc('month', now()),
          interval '1 month'
        ) AS d(month)
        LEFT JOIN public.students s
          ON s.academy_id = p_academy_id
          AND s.status IN ('ATIVO', 'TRIAL')
          AND date_trunc('month', s.enrollment_date::timestamp) = d.month
          AND (
            NOT v_scoped_professor
            OR public.student_in_instructor_scope(s.id, p_academy_id)
          )
        GROUP BY d.month
        ORDER BY d.month
      ) t
    ),
    'delinquency_pct', (
      SELECT CASE
        WHEN total = 0 THEN 0
        ELSE ROUND((inad::numeric / total::numeric) * 100, 1)
      END
      FROM (
        SELECT
          COUNT(*) FILTER (WHERE status = 'INADIMPLENTE') AS inad,
          COUNT(*) FILTER (WHERE status IN ('ATIVO', 'INADIMPLENTE', 'TRIAL')) AS total
        FROM public.students s
        WHERE s.academy_id = p_academy_id
          AND (
            NOT v_scoped_professor
            OR public.student_in_instructor_scope(s.id, p_academy_id)
          )
      ) x
    ),
    'revenue_by_month', CASE
      WHEN v_can_finance THEN (
        SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.month), '[]'::json)
        FROM (
          SELECT
            to_char(d.month, 'YYYY-MM') AS month,
            COALESCE(SUM(i.amount), 0)::numeric AS value
          FROM generate_series(
            date_trunc('month', now()) - interval '5 months',
            date_trunc('month', now()),
            interval '1 month'
          ) AS d(month)
          LEFT JOIN public.academy_invoices i
            ON i.academy_id = p_academy_id
            AND i.status = 'PAGO'
            AND date_trunc('month', i.created_at) = d.month
          GROUP BY d.month
          ORDER BY d.month
        ) t
      )
      ELSE NULL
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_school_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_scoped_professor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.instructor_category_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_in_instructor_scope(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.class_session_in_instructor_scope(UUID, public.schedule_session_type, UUID, UUID, UUID) TO authenticated;

-- instructor_training_categories — dono gerencia, staff lê
DROP POLICY IF EXISTS instructor_categories_staff ON public.instructor_training_categories;

CREATE POLICY instructor_categories_owner ON public.instructor_training_categories
  FOR ALL TO authenticated
  USING (public.is_school_owner(academy_id))
  WITH CHECK (public.is_school_owner(academy_id));

CREATE POLICY instructor_categories_read ON public.instructor_training_categories
  FOR SELECT TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner());

-- Tabelas auxiliares de planos: somente dono
DROP POLICY IF EXISTS plan_categories_staff ON public.academy_plan_categories;
DROP POLICY IF EXISTS plan_price_history_staff ON public.academy_plan_price_history;
DROP POLICY IF EXISTS plan_price_history_staff_insert ON public.academy_plan_price_history;

CREATE POLICY plan_categories_owner ON public.academy_plan_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_plans p
      WHERE p.id = academy_plan_id
        AND public.is_school_owner(p.academy_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_plans p
      WHERE p.id = academy_plan_id
        AND public.is_school_owner(p.academy_id)
    )
  );

CREATE POLICY plan_price_history_owner ON public.academy_plan_price_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_plans p
      WHERE p.id = academy_plan_id
        AND public.is_school_owner(p.academy_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_plans p
      WHERE p.id = academy_plan_id
        AND public.is_school_owner(p.academy_id)
    )
  );
