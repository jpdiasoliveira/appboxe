-- Convite aberto: academia gera link sem e-mail; aluno informa e-mail e dados no formulário.

ALTER TABLE public.student_invites
  ALTER COLUMN email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.get_public_student_invite(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_term RECORD;
BEGIN
  SELECT
    i.email,
    i.status,
    i.expires_at,
    i.prefill_name,
    i.academy_id,
    a.name AS academy_name,
    a.slug AS academy_slug,
    a.status AS academy_status
  INTO v_row
  FROM public.student_invites i
  JOIN public.academies a ON a.id = i.academy_id
  WHERE i.token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'NOT_FOUND');
  END IF;

  IF v_row.academy_status <> 'ATIVO' THEN
    RETURN json_build_object('valid', false, 'reason', 'ACADEMY_INACTIVE');
  END IF;

  IF v_row.status <> 'PENDING' THEN
    RETURN json_build_object('valid', false, 'reason', 'ALREADY_USED', 'academy_name', v_row.academy_name);
  END IF;

  IF v_row.expires_at < now() THEN
    UPDATE public.student_invites SET status = 'EXPIRED' WHERE token = p_token AND status = 'PENDING';
    RETURN json_build_object('valid', false, 'reason', 'EXPIRED', 'academy_name', v_row.academy_name);
  END IF;

  SELECT t.id, t.version, t.title, t.content_html
  INTO v_term
  FROM public.academy_terms t
  WHERE t.academy_id = v_row.academy_id
    AND t.is_active = true
  LIMIT 1;

  RETURN json_build_object(
    'valid', true,
    'email', v_row.email,
    'academy_name', v_row.academy_name,
    'academy_slug', v_row.academy_slug,
    'expires_at', v_row.expires_at,
    'prefill_name', v_row.prefill_name,
    'term', CASE
      WHEN v_term.id IS NOT NULL THEN json_build_object(
        'id', v_term.id,
        'version', v_term.version,
        'title', v_term.title,
        'content_html', v_term.content_html
      )
      ELSE NULL
    END
  );
END;
$$;
