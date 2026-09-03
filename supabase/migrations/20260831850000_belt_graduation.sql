-- UP-302: graduação / faixas por modalidade

CREATE TABLE public.belt_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  training_category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#E5E7EB',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (training_category_id, name),
  UNIQUE (training_category_id, sort_order)
);

CREATE INDEX belt_levels_category_idx
  ON public.belt_levels (training_category_id, sort_order);

CREATE TABLE public.student_belt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  training_category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  belt_level_id UUID NOT NULL REFERENCES public.belt_levels(id) ON DELETE RESTRICT,
  promoted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  promoted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX student_belt_history_student_idx
  ON public.student_belt_history (student_id, promoted_at DESC);

CREATE INDEX student_belt_history_category_idx
  ON public.student_belt_history (training_category_id, promoted_at DESC);

CREATE TRIGGER belt_levels_updated_at
  BEFORE UPDATE ON public.belt_levels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.can_manage_graduation(
  p_academy_id UUID,
  p_training_category_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_owner()
    OR public.is_school_owner(p_academy_id)
    OR (
      public.has_academy_role(p_academy_id, ARRAY['ASSISTANT']::user_role[])
      AND NOT public.has_academy_role(p_academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    )
    OR (
      public.is_scoped_professor(p_academy_id)
      AND p_training_category_id IN (SELECT public.instructor_category_ids(p_academy_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.promote_student_belt(
  p_student_id UUID,
  p_training_category_id UUID,
  p_belt_level_id UUID,
  p_promoted_at DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_level public.belt_levels%ROWTYPE;
  v_category public.training_categories%ROWTYPE;
  v_history_id UUID;
BEGIN
  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado';
  END IF;

  IF NOT public.can_manage_graduation(v_student.academy_id, p_training_category_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF NOT public.student_in_instructor_scope(p_student_id, v_student.academy_id)
    AND public.is_scoped_professor(v_student.academy_id) THEN
    RAISE EXCEPTION 'Aluno fora do seu escopo';
  END IF;

  SELECT * INTO v_level
  FROM public.belt_levels
  WHERE id = p_belt_level_id
    AND academy_id = v_student.academy_id
    AND training_category_id = p_training_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Faixa inválida para esta modalidade';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.student_categories sc
    WHERE sc.student_id = p_student_id
      AND sc.training_category_id = p_training_category_id
  ) THEN
    RAISE EXCEPTION 'Aluno não está matriculado nesta modalidade';
  END IF;

  SELECT * INTO v_category
  FROM public.training_categories
  WHERE id = p_training_category_id;

  INSERT INTO public.student_belt_history (
    academy_id,
    student_id,
    training_category_id,
    belt_level_id,
    promoted_at,
    promoted_by,
    notes
  )
  VALUES (
    v_student.academy_id,
    p_student_id,
    p_training_category_id,
    p_belt_level_id,
    COALESCE(p_promoted_at, CURRENT_DATE),
    auth.uid(),
    NULLIF(trim(p_notes), '')
  )
  RETURNING id INTO v_history_id;

  INSERT INTO public.notifications (user_id, academy_id, title, body, kind, reference_id)
  VALUES (
    v_student.user_id,
    v_student.academy_id,
    'Nova graduação',
    'Parabéns! Você foi graduado para ' || v_level.name || ' em ' || v_category.name || '.',
    'belt_promotion',
    v_history_id
  );

  RETURN v_history_id;
END;
$$;

ALTER TABLE public.belt_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_belt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY belt_levels_staff ON public.belt_levels
  FOR ALL TO authenticated
  USING (public.can_manage_graduation(academy_id, training_category_id))
  WITH CHECK (public.can_manage_graduation(academy_id, training_category_id));

CREATE POLICY student_belt_history_staff ON public.student_belt_history
  FOR ALL TO authenticated
  USING (
    public.can_manage_graduation(academy_id, training_category_id)
    AND (
      NOT public.is_scoped_professor(academy_id)
      OR public.student_in_instructor_scope(student_id, academy_id)
    )
  )
  WITH CHECK (
    public.can_manage_graduation(academy_id, training_category_id)
    AND (
      NOT public.is_scoped_professor(academy_id)
      OR public.student_in_instructor_scope(student_id, academy_id)
    )
  );

CREATE POLICY student_belt_history_student_read ON public.student_belt_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_belt_history.student_id
        AND s.user_id = auth.uid()
    )
  );

GRANT EXECUTE ON FUNCTION public.can_manage_graduation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_student_belt(UUID, UUID, UUID, DATE, TEXT) TO authenticated;

COMMENT ON TABLE public.belt_levels IS 'Faixas/graduações configuráveis por modalidade (UP-302)';
COMMENT ON TABLE public.student_belt_history IS 'Histórico de promoções de faixa do aluno';
