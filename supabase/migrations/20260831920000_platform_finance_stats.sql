-- UP-208: KPIs plataforma ampliados (churn, receita mês, pendentes)

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
  v_faturas_pendentes INT;
  v_leads_mes INT;
  v_churn_30d INT;
  v_receita_mes NUMERIC;
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

  SELECT count(*)::INT INTO v_faturas_pendentes
  FROM public.saas_invoices WHERE status = 'PENDENTE';

  SELECT count(*)::INT INTO v_leads_mes
  FROM public.leads
  WHERE created_at >= date_trunc('month', now());

  SELECT count(*)::INT INTO v_churn_30d
  FROM public.academies
  WHERE status <> 'ATIVO'
    AND updated_at >= (CURRENT_DATE - INTERVAL '30 days');

  SELECT COALESCE(sum(amount), 0) INTO v_receita_mes
  FROM public.saas_invoices
  WHERE status = 'PAGO'
    AND paid_at >= date_trunc('month', now());

  RETURN json_build_object(
    'academias_ativas', v_academias_ativas,
    'academias_inativas', v_academias_inativas,
    'mrr_saas', v_mrr,
    'total_alunos', v_total_alunos,
    'alunos_ativos', v_alunos_ativos,
    'faturas_atrasadas', v_faturas_atrasadas,
    'faturas_pendentes', v_faturas_pendentes,
    'leads_mes', v_leads_mes,
    'churn_academias_30d', v_churn_30d,
    'receita_recebida_mes', v_receita_mes
  );
END;
$$;

COMMENT ON FUNCTION public.platform_network_stats() IS
  'KPIs agregados da rede RingPro — MRR, alunos, churn 30d, receita mês (UP-208).';
