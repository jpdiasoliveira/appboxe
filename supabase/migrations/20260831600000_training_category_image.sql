-- Foto opcional por modalidade na landing (owner faz upload em Categorias)

ALTER TABLE public.training_categories
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.training_categories.image_url IS
  'URL pública opcional (Storage landing-assets ou link externo) exibida na seção Modalidades da landing.';

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
          tc.image_url,
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
