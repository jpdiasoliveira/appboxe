-- UP-114: professores por modalidade + overview para tela de categorias

CREATE TABLE public.instructor_training_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, training_category_id)
);

CREATE INDEX instructor_training_categories_category_idx
  ON public.instructor_training_categories (training_category_id);

ALTER TABLE public.instructor_training_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY instructor_categories_staff ON public.instructor_training_categories
  FOR ALL
  USING (public.is_academy_staff(academy_id))
  WITH CHECK (public.is_academy_staff(academy_id));

CREATE OR REPLACE FUNCTION public.check_instructor_category_academy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat_academy UUID;
BEGIN
  SELECT academy_id INTO v_cat_academy
  FROM public.training_categories
  WHERE id = NEW.training_category_id;

  IF v_cat_academy IS NULL OR v_cat_academy <> NEW.academy_id THEN
    RAISE EXCEPTION 'Categoria não pertence à academia';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER instructor_training_categories_academy_check
  BEFORE INSERT OR UPDATE ON public.instructor_training_categories
  FOR EACH ROW EXECUTE FUNCTION public.check_instructor_category_academy();

CREATE OR REPLACE FUNCTION public.get_academy_category_overview(p_academy_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_academy_staff(p_academy_id) OR public.is_platform_owner()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

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
            SELECT COALESCE(json_agg(json_build_object(
              'user_id', itc.user_id,
              'name', COALESCE(p.name, '—')
            ) ORDER BY p.name), '[]'::json)
            FROM public.instructor_training_categories itc
            LEFT JOIN public.profiles p ON p.user_id = itc.user_id
            WHERE itc.training_category_id = tc.id
              AND itc.academy_id = p_academy_id
          ) AS instructors
        FROM public.training_categories tc
        WHERE tc.academy_id = p_academy_id
        ORDER BY tc.name
      ) t
    ),
    '[]'::json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_academy_category_overview(UUID) TO authenticated;
