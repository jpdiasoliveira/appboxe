-- UP-110: dados agregados para gráficos do dashboard academia

CREATE OR REPLACE FUNCTION public.get_academy_dashboard_charts(p_academy_id UUID)
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

  v_can_finance :=
    public.has_academy_role(p_academy_id, ARRAY['SCHOOL_OWNER', 'PROFESSOR']::user_role[])
    OR public.is_platform_owner();

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
        FROM public.students
        WHERE academy_id = p_academy_id
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

GRANT EXECUTE ON FUNCTION public.get_academy_dashboard_charts(UUID) TO authenticated;
