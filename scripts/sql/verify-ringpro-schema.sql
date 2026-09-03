-- RingPro — Verificação do schema remoto (uma query)
-- CLI: npx supabase db query --linked -f scripts/sql/verify-ringpro-schema.sql
--
-- Esperado: 0 LEGADO_POS · 6 OK_RINGPRO · RESUMO ≈ 34 · 2 ENUM_ROLES · 5 RPC

SELECT tipo, objeto FROM (
  SELECT 'LEGADO_POS' AS tipo, tablename AS objeto, 1 AS ord
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'clientes', 'empresas', 'lojas', 'produtos', 'vendas',
      'itens_venda', 'pagamentos_venda', 'sessoes_caixa',
      'movimentacoes_caixa', 'estoque_localizacao', 'historico_estoque'
    )
  UNION ALL
  SELECT 'OK_RINGPRO', tablename, 2
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'academies', 'students', 'platform_staff_invites', 'academy_branches',
      'platform_settings', 'saas_payments'
    )
  UNION ALL
  SELECT 'RESUMO', count(*)::text, 3
  FROM pg_tables WHERE schemaname = 'public'
  UNION ALL
  SELECT 'ENUM_ROLES', enumlabel, 4
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'user_role'
    AND enumlabel IN ('PLATFORM_SUPPORT', 'PLATFORM_FINANCE')
  UNION ALL
  SELECT 'RPC', proname, 5
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND proname IN (
      'platform_network_stats',
      'get_public_academy_flags',
      'get_public_platform_staff_invite',
      'is_platform_staff',
      'is_platform_operator'
    )
  UNION ALL
  SELECT 'MIGRATION', version, 6
  FROM supabase_migrations.schema_migrations
  WHERE version IN (
    '20260831460000', '20260831470000', '20260831470100',
    '20260831480000', '20260831490000', '20260831500000',
    '20260831710000', '20260831720000', '20260831730000', '20260831740000'
  )
) x
ORDER BY ord, objeto;
