-- UP-SCH-12: dados fiscais/cobrança da academia

ALTER TABLE public.academies
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT;

CREATE INDEX IF NOT EXISTS academies_cnpj_idx
  ON public.academies (cnpj)
  WHERE cnpj IS NOT NULL;

-- Dono da academia pode atualizar dados operacionais (settings, CNPJ, e-mail de cobrança).
DROP POLICY IF EXISTS academies_owner_update ON public.academies;
CREATE POLICY academies_owner_update ON public.academies
  FOR UPDATE TO authenticated
  USING (public.is_school_owner(id))
  WITH CHECK (public.is_school_owner(id));

COMMENT ON COLUMN public.academies.cnpj IS
  'CNPJ da academia para faturamento e notas (formato livre no MVP).';
COMMENT ON COLUMN public.academies.billing_email IS
  'E-mail para faturas SaaS e comunicações financeiras da plataforma.';
