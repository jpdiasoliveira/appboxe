-- UP-311: documentos do aluno (atestado, saúde, etc.) — upload pelo staff

CREATE TYPE public.student_document_type AS ENUM (
  'SAUDE',
  'ATESTADO',
  'CONTRATO',
  'OUTRO'
);

CREATE TYPE public.student_document_source AS ENUM (
  'WHATSAPP',
  'EMAIL',
  'PRESENCIAL',
  'OUTRO'
);

CREATE TABLE public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_type public.student_document_type NOT NULL DEFAULT 'OUTRO',
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  received_via public.student_document_source NOT NULL DEFAULT 'OUTRO',
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX student_documents_student_idx
  ON public.student_documents (student_id, created_at DESC);

CREATE INDEX student_documents_academy_idx
  ON public.student_documents (academy_id, created_at DESC);

CREATE TRIGGER student_documents_updated_at
  BEFORE UPDATE ON public.student_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.can_manage_student_documents(p_student_id UUID, p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_owner()
    OR (
      public.is_academy_staff(p_academy_id)
      AND (
        public.is_school_owner(p_academy_id)
        OR (
          public.has_academy_role(p_academy_id, ARRAY['ASSISTANT']::user_role[])
          AND NOT public.has_academy_role(p_academy_id, ARRAY['SCHOOL_OWNER']::user_role[])
        )
        OR (
          public.is_scoped_professor(p_academy_id)
          AND public.student_in_instructor_scope(p_student_id, p_academy_id)
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_student_documents(UUID, UUID) TO authenticated;

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_documents_staff_all ON public.student_documents
  FOR ALL TO authenticated
  USING (public.can_manage_student_documents(student_id, academy_id))
  WITH CHECK (public.can_manage_student_documents(student_id, academy_id));

CREATE POLICY student_documents_self_read ON public.student_documents
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.student_documents IS
  'Documentos anexados ao aluno (atestado, saúde) — upload pelo staff da academia.';

-- Storage: bucket privado — path {academy_id}/{student_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.storage_student_id_from_object_name(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(p_name, '/', 2), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.can_access_student_document_object(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_manage_student_documents(
      public.storage_student_id_from_object_name(p_name),
      public.storage_academy_id_from_object_name(p_name)
    )
    OR EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = public.storage_student_id_from_object_name(p_name)
        AND s.user_id = auth.uid()
    );
$$;

CREATE POLICY student_documents_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND public.can_access_student_document_object(name)
  );

CREATE POLICY student_documents_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-documents'
    AND public.can_manage_student_documents(
      public.storage_student_id_from_object_name(name),
      public.storage_academy_id_from_object_name(name)
    )
  );

CREATE POLICY student_documents_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND public.can_manage_student_documents(
      public.storage_student_id_from_object_name(name),
      public.storage_academy_id_from_object_name(name)
    )
  );
