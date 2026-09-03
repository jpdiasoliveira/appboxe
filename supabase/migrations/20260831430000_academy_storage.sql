-- RingPro: Storage buckets para logo da academia e assets da landing (UP-OWN-04)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'academy-logos',
    'academy-logos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'landing-assets',
    'landing-assets',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
ON CONFLICT (id) DO NOTHING;

-- Primeiro segmento do path = academy_id (ex.: {uuid}/logo.png ou {uuid}/landing/hero-123.jpg)
CREATE OR REPLACE FUNCTION public.storage_academy_id_from_object_name(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(p_name, '/', 1), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_academy_storage_object(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_owner()
    OR public.has_academy_role(
      public.storage_academy_id_from_object_name(p_name),
      ARRAY['SCHOOL_OWNER']::user_role[]
    );
$$;

-- Leitura pública (buckets são public; necessário para listagem autenticada)
CREATE POLICY academy_storage_public_select ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('academy-logos', 'landing-assets'));

CREATE POLICY academy_storage_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('academy-logos', 'landing-assets')
    AND public.can_manage_academy_storage_object(name)
  );

CREATE POLICY academy_storage_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('academy-logos', 'landing-assets')
    AND public.can_manage_academy_storage_object(name)
  )
  WITH CHECK (
    bucket_id IN ('academy-logos', 'landing-assets')
    AND public.can_manage_academy_storage_object(name)
  );

CREATE POLICY academy_storage_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('academy-logos', 'landing-assets')
    AND public.can_manage_academy_storage_object(name)
  );
