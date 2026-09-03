-- UP-407: leitura pública de feature flags da landing (anon)

CREATE OR REPLACE FUNCTION public.get_public_academy_flags(p_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_academy_id UUID;
  v_self_register BOOLEAN;
BEGIN
  SELECT id INTO v_academy_id
  FROM public.academies
  WHERE slug = p_slug AND status = 'ATIVO';

  IF v_academy_id IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT COALESCE(
    (SELECT enabled FROM public.academy_feature_flags
     WHERE academy_id = v_academy_id AND flag_key = 'module_student_self_register'),
    false
  ) INTO v_self_register;

  RETURN json_build_object(
    'found', true,
    'academy_id', v_academy_id,
    'module_student_self_register', v_self_register
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_academy_flags(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_academy_flags(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_academy_flags(TEXT) IS
  'Flags públicas da academia para landing — sem auth.';
