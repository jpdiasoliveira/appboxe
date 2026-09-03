-- UP-306: contrato PDF da academia (upload nas configurações + link no convite)

CREATE TABLE public.academy_contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Contrato de matrícula',
  file_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size_bytes BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX academy_contract_one_active_per_academy
  ON public.academy_contract_documents (academy_id)
  WHERE is_active = true;

CREATE INDEX academy_contract_documents_academy_idx
  ON public.academy_contract_documents (academy_id, created_at DESC);

CREATE TRIGGER academy_contract_documents_updated_at
  BEFORE UPDATE ON public.academy_contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.academy_contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_contract_staff_select ON public.academy_contract_documents
  FOR SELECT TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner());

CREATE POLICY academy_contract_owner_manage ON public.academy_contract_documents
  FOR ALL TO authenticated
  USING (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  )
  WITH CHECK (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
    OR public.is_platform_owner()
  );

COMMENT ON TABLE public.academy_contract_documents IS
  'Contrato PDF ativo da academia — exibido no convite de matrícula (UP-306).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'academy-documents',
  'academy-documents',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY academy_documents_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'academy-documents'
    AND (
      public.can_manage_academy_storage_object(name)
      OR public.is_platform_owner()
    )
  );

CREATE POLICY academy_documents_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academy-documents'
    AND public.can_manage_academy_storage_object(name)
  );

CREATE POLICY academy_documents_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'academy-documents'
    AND public.can_manage_academy_storage_object(name)
  );

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
  v_contract RECORD;
BEGIN
  SELECT i.email, i.status, i.expires_at, i.academy_id, a.name AS academy_name, a.slug AS academy_slug, a.status AS academy_status
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

  SELECT c.id, c.title, c.original_filename
  INTO v_contract
  FROM public.academy_contract_documents c
  WHERE c.academy_id = v_row.academy_id
    AND c.is_active = true
  LIMIT 1;

  RETURN json_build_object(
    'valid', true,
    'email', v_row.email,
    'academy_name', v_row.academy_name,
    'academy_slug', v_row.academy_slug,
    'expires_at', v_row.expires_at,
    'term', CASE
      WHEN v_term.id IS NOT NULL THEN json_build_object(
        'id', v_term.id,
        'version', v_term.version,
        'title', v_term.title,
        'content_html', v_term.content_html
      )
      ELSE NULL
    END,
    'contract', CASE
      WHEN v_contract.id IS NOT NULL THEN json_build_object(
        'id', v_contract.id,
        'title', v_contract.title,
        'original_filename', v_contract.original_filename
      )
      ELSE NULL
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invite_contract_for_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_contract public.academy_contract_documents%ROWTYPE;
BEGIN
  SELECT i.status, i.expires_at, i.academy_id, a.status AS academy_status
  INTO v_row
  FROM public.student_invites i
  JOIN public.academies a ON a.id = i.academy_id
  WHERE i.token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;

  IF v_row.academy_status <> 'ATIVO' OR v_row.status <> 'PENDING' OR v_row.expires_at < now() THEN
    RETURN json_build_object('ok', false, 'reason', 'INVALID');
  END IF;

  SELECT * INTO v_contract
  FROM public.academy_contract_documents
  WHERE academy_id = v_row.academy_id
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'reason', 'NO_CONTRACT');
  END IF;

  RETURN json_build_object(
    'ok', true,
    'file_path', v_contract.file_path,
    'title', v_contract.title,
    'original_filename', v_contract.original_filename,
    'mime_type', v_contract.mime_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_contract_for_token(UUID) TO anon, authenticated, service_role;
