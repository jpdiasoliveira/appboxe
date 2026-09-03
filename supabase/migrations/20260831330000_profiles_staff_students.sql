-- Staff pode ler/atualizar perfil de alunos da academia; professor lê planos ativos para vincular.
-- Idempotente: policies podem já existir se aplicadas manualmente antes do db push.

DROP POLICY IF EXISTS profiles_staff_select ON public.profiles;
CREATE POLICY profiles_staff_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT s.user_id
      FROM public.students s
      WHERE public.is_academy_staff(s.academy_id)
    )
    OR public.is_platform_owner()
  );

DROP POLICY IF EXISTS profiles_staff_update_students ON public.profiles;
CREATE POLICY profiles_staff_update_students ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    user_id IN (
      SELECT s.user_id
      FROM public.students s
      WHERE public.is_school_owner(s.academy_id)
        OR (
          public.is_scoped_professor(s.academy_id)
          AND public.student_in_instructor_scope(s.id, s.academy_id)
        )
        OR (
          public.has_academy_role(s.academy_id, ARRAY['ASSISTANT']::user_role[])
          AND NOT public.has_academy_role(s.academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
        )
    )
    OR public.is_platform_owner()
  )
  WITH CHECK (
    user_id IN (
      SELECT s.user_id
      FROM public.students s
      WHERE public.is_school_owner(s.academy_id)
        OR (
          public.is_scoped_professor(s.academy_id)
          AND public.student_in_instructor_scope(s.id, s.academy_id)
        )
        OR (
          public.has_academy_role(s.academy_id, ARRAY['ASSISTANT']::user_role[])
          AND NOT public.has_academy_role(s.academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
        )
    )
    OR public.is_platform_owner()
  );

DROP POLICY IF EXISTS plans_professor_operational_read ON public.academy_plans;
CREATE POLICY plans_professor_operational_read ON public.academy_plans
  FOR SELECT TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND status = 'ATIVO'
  );
