-- RingPro: professor e assistant podem gerar convites de aluno (UP-322 revert parcial)

DROP POLICY IF EXISTS invites_owner ON public.student_invites;

CREATE POLICY invites_staff ON public.student_invites
  FOR ALL TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner())
  WITH CHECK (public.is_academy_staff(academy_id) OR public.is_platform_owner());
