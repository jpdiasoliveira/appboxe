-- UP-SCH-04: documentação no catálogo PostgreSQL

COMMENT ON TABLE public.academies IS
  'Tenant RingPro — uma academia por registro; settings jsonb para logo, trial, onboarding.';
COMMENT ON TABLE public.saas_plans IS
  'Planos que a academia contrata do RingPro (SaaS).';
COMMENT ON TABLE public.saas_invoices IS
  'Mensalidade da academia para o RingPro (não confundir com academy_invoices).';
COMMENT ON TABLE public.academy_feature_flags IS
  'Módulos ativáveis por academia (module_*).';
COMMENT ON TABLE public.platform_staff_invites IS
  'Convites para equipe interna RingPro (PLATFORM_SUPPORT / PLATFORM_FINANCE).';
COMMENT ON TABLE public.user_academy_roles IS
  'RBAC multi-tenant; academy_id NULL = papel global de plataforma.';
COMMENT ON TABLE public.students IS
  'Aluno matriculado em uma academia; user_id liga a auth.users.';
COMMENT ON TABLE public.student_subscriptions IS
  'Plano de mensalidade local ativo do aluno (academy_plans).';
COMMENT ON TABLE public.academy_invoices IS
  'Fatura do aluno para a academia (mensalidade).';
COMMENT ON TABLE public.academy_payments IS
  'Pagamento de uma academy_invoice (PIX, cartão, dinheiro…).';
COMMENT ON TABLE public.student_payment_methods IS
  'Cartão tokenizado no gateway — nunca PAN em claro.';
COMMENT ON TABLE public.training_categories IS
  'Modalidades de treino; image_url opcional na landing.';
COMMENT ON TABLE public.leads IS
  'Interesse captado na landing pública antes da matrícula.';
COMMENT ON TABLE public.landing_page_config IS
  'Seções JSON da landing por academia.';
COMMENT ON TABLE public.audit_logs IS
  'Auditoria append-only de ações críticas.';
