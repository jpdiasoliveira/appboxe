-- Aluno lê modalidades ativas da academia no onboarding e no portal (/student/modalidades).
-- Espelha plans_student_read (wave3); categories_staff foi substituída por políticas de staff em professor_scope_rls.

CREATE POLICY categories_student_read ON public.training_categories
  FOR SELECT TO authenticated
  USING (
    academy_id IN (SELECT public.user_academy_ids())
    AND status = 'ATIVO'
  );
