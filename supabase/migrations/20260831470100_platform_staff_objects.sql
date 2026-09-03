-- UP-404 (parte 2): equipe interna da plataforma (suporte / financeiro)

CREATE TABLE IF NOT EXISTS public.platform_staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.user_role NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_staff_invites_status_check
    CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  CONSTRAINT platform_staff_invites_role_check
    CHECK (role IN ('PLATFORM_SUPPORT', 'PLATFORM_FINANCE'))
);

CREATE INDEX IF NOT EXISTS platform_staff_invites_token_idx
  ON public.platform_staff_invites (token)
  WHERE status = 'PENDING';

ALTER TABLE public.platform_staff_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_staff_invites_owner ON public.platform_staff_invites
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_academy_roles
    WHERE user_id = auth.uid()
      AND academy_id IS NULL
      AND role IN ('PLATFORM_SUPPORT', 'PLATFORM_FINANCE')
      AND status = 'ATIVO'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_operator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_owner() OR public.is_platform_staff();
$$;

CREATE UNIQUE INDEX IF NOT EXISTS user_academy_roles_platform_staff_unique
  ON public.user_academy_roles (user_id, role)
  WHERE academy_id IS NULL AND role IN ('PLATFORM_SUPPORT', 'PLATFORM_FINANCE');

CREATE OR REPLACE FUNCTION public.get_public_platform_staff_invite(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT i.email, i.role, i.status, i.expires_at
  INTO v_row
  FROM public.platform_staff_invites i
  WHERE i.token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'NOT_FOUND');
  END IF;

  IF v_row.status <> 'PENDING' THEN
    RETURN json_build_object('valid', false, 'reason', 'ALREADY_USED');
  END IF;

  IF v_row.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'reason', 'EXPIRED');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'email', v_row.email,
    'role', v_row.role,
    'expires_at', v_row.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_platform_staff_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_platform_staff_invite(UUID) TO anon, authenticated;

-- Operadores da plataforma leem convites pendentes
CREATE POLICY platform_staff_invites_staff_read ON public.platform_staff_invites
  FOR SELECT TO authenticated
  USING (public.is_platform_operator());

COMMENT ON TABLE public.platform_staff_invites IS
  'Convites para equipe interna RingPro (fora do tenant academia).';

-- UP-403: permitir equipe plataforma ver KPIs após UP-404
CREATE OR REPLACE FUNCTION public.platform_network_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_academias_ativas INT;
  v_academias_inativas INT;
  v_mrr NUMERIC;
  v_total_alunos INT;
  v_alunos_ativos INT;
  v_faturas_atrasadas INT;
  v_leads_mes INT;
BEGIN
  IF NOT public.is_platform_operator() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::INT INTO v_academias_ativas
  FROM public.academies WHERE status = 'ATIVO';

  SELECT count(*)::INT INTO v_academias_inativas
  FROM public.academies WHERE status <> 'ATIVO';

  SELECT COALESCE(sum(sp.price_monthly), 0) INTO v_mrr
  FROM public.academies a
  JOIN public.saas_plans sp ON sp.id = a.saas_plan_id
  WHERE a.status = 'ATIVO';

  SELECT count(*)::INT INTO v_total_alunos FROM public.students;

  SELECT count(*)::INT INTO v_alunos_ativos
  FROM public.students WHERE status = 'ATIVO';

  SELECT count(*)::INT INTO v_faturas_atrasadas
  FROM public.saas_invoices WHERE status = 'ATRASADO';

  SELECT count(*)::INT INTO v_leads_mes
  FROM public.leads
  WHERE created_at >= date_trunc('month', now());

  RETURN json_build_object(
    'academias_ativas', v_academias_ativas,
    'academias_inativas', v_academias_inativas,
    'mrr_saas', v_mrr,
    'total_alunos', v_total_alunos,
    'alunos_ativos', v_alunos_ativos,
    'faturas_atrasadas', v_faturas_atrasadas,
    'leads_mes', v_leads_mes
  );
END;
$$;
