-- UP-321: professor só vê aluno com modalidade compartilhada (opção A).
-- Aluno sem student_categories fica visível apenas para owner/assistant.
-- Professor pode vincular a primeira modalidade (das suas) no cadastro ou edição.

CREATE OR REPLACE FUNCTION public.student_in_instructor_scope(p_student_id UUID, p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_categories sc
    INNER JOIN public.instructor_training_categories itc
      ON itc.training_category_id = sc.training_category_id
     AND itc.academy_id = p_academy_id
     AND itc.user_id = auth.uid()
    WHERE sc.student_id = p_student_id
  );
$$;

COMMENT ON FUNCTION public.student_in_instructor_scope(UUID, UUID) IS
  'True quando o aluno tem ao menos uma modalidade em comum com o professor (UP-321).';

CREATE OR REPLACE FUNCTION public.professor_can_manage_student_categories(
  p_student_id UUID,
  p_training_category_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = p_student_id
      AND public.is_scoped_professor(s.academy_id)
      AND p_training_category_id IN (SELECT public.instructor_category_ids(s.academy_id))
      AND (
        public.student_in_instructor_scope(p_student_id, s.academy_id)
        OR NOT EXISTS (
          SELECT 1 FROM public.student_categories sc WHERE sc.student_id = p_student_id
        )
      )
  );
$$;

COMMENT ON FUNCTION public.professor_can_manage_student_categories(UUID, UUID) IS
  'Professor vincula só suas modalidades; primeira vínculo permitido se aluno ainda não tem nenhuma.';

DROP POLICY IF EXISTS stu_cat_staff ON public.student_categories;

CREATE POLICY stu_cat_owner ON public.student_categories
  FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM public.students s WHERE public.is_school_owner(s.academy_id)
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s WHERE public.is_school_owner(s.academy_id)
    )
  );

CREATE POLICY stu_cat_assistant ON public.student_categories
  FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id
      FROM public.students s
      WHERE public.has_academy_role(s.academy_id, ARRAY['ASSISTANT']::user_role[])
        AND NOT public.has_academy_role(s.academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT s.id
      FROM public.students s
      WHERE public.has_academy_role(s.academy_id, ARRAY['ASSISTANT']::user_role[])
        AND NOT public.has_academy_role(s.academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    )
  );

CREATE POLICY stu_cat_professor ON public.student_categories
  FOR ALL TO authenticated
  USING (
    public.professor_can_manage_student_categories(student_id, training_category_id)
  )
  WITH CHECK (
    public.professor_can_manage_student_categories(student_id, training_category_id)
  );

GRANT EXECUTE ON FUNCTION public.professor_can_manage_student_categories(UUID, UUID) TO authenticated;
