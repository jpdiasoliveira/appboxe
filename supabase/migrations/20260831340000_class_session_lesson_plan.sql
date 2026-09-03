-- Plano da aula: descrição pelo professor + visibilidade no portal do aluno

ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS lesson_description TEXT,
  ADD COLUMN IF NOT EXISTS visible_to_student BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.schedule_series
  ADD COLUMN IF NOT EXISTS lesson_description TEXT,
  ADD COLUMN IF NOT EXISTS visible_to_student BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.class_sessions.lesson_description IS 'Conteúdo/plano da aula (ex.: foco técnico, aquecimento)';
COMMENT ON COLUMN public.class_sessions.visible_to_student IS 'Quando false, a aula não aparece no portal do aluno';

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
        AND cs.category_id IN (
          SELECT sc.training_category_id
          FROM public.student_categories sc
          WHERE sc.student_id = s.id
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
