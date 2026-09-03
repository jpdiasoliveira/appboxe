-- UP-403: métricas agregadas da rede (portal plataforma)

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
  IF NOT public.is_platform_owner() THEN
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

REVOKE ALL ON FUNCTION public.platform_network_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_network_stats() TO authenticated;

COMMENT ON FUNCTION public.platform_network_stats() IS
  'KPIs agregados da rede RingPro — somente PLATFORM_OWNER.';
