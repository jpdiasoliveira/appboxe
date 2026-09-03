-- UP-310: corrigir geração de token QR (pgcrypto em extensions no Supabase)

CREATE OR REPLACE FUNCTION public.create_attendance_qr_session(
  p_training_category_id UUID,
  p_class_date DATE DEFAULT CURRENT_DATE,
  p_class_group_id UUID DEFAULT NULL,
  p_ttl_minutes INTEGER DEFAULT 120
)
RETURNS TABLE (
  session_id UUID,
  token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_category public.training_categories%ROWTYPE;
  v_token TEXT;
  v_expires TIMESTAMPTZ;
  v_session_id UUID;
BEGIN
  PERFORM public.refresh_attendance_qr_sessions();

  SELECT * INTO v_category
  FROM public.training_categories
  WHERE id = p_training_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modalidade não encontrada';
  END IF;

  IF NOT public.is_academy_staff(v_category.academy_id) AND NOT public.is_platform_owner() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF public.is_scoped_professor(v_category.academy_id)
    AND p_training_category_id NOT IN (SELECT public.instructor_category_ids(v_category.academy_id)) THEN
    RAISE EXCEPTION 'Modalidade fora do seu escopo';
  END IF;

  IF p_class_group_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.class_groups cg
      WHERE cg.id = p_class_group_id
        AND cg.academy_id = v_category.academy_id
        AND cg.training_category_id = p_training_category_id
    ) THEN
      RAISE EXCEPTION 'Turma inválida para esta modalidade';
    END IF;
  END IF;

  UPDATE public.attendance_qr_sessions
  SET status = 'CLOSED', updated_at = now()
  WHERE academy_id = v_category.academy_id
    AND training_category_id = p_training_category_id
    AND class_date = p_class_date
    AND status = 'ACTIVE'
    AND (
      (class_group_id IS NULL AND p_class_group_id IS NULL)
      OR class_group_id = p_class_group_id
    );

  v_token := encode(gen_random_bytes(18), 'hex');
  v_expires := now() + make_interval(mins => GREATEST(p_ttl_minutes, 5));

  INSERT INTO public.attendance_qr_sessions (
    academy_id,
    training_category_id,
    class_group_id,
    class_date,
    token,
    expires_at,
    created_by
  )
  VALUES (
    v_category.academy_id,
    p_training_category_id,
    p_class_group_id,
    p_class_date,
    v_token,
    v_expires,
    auth.uid()
  )
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT v_session_id, v_token, v_expires;
END;
$$;
