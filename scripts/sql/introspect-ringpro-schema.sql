-- =============================================================================
-- RingPro — Introspecção do schema PostgreSQL (Supabase)
-- =============================================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → colar e Run
--
-- O que faz (vários resultados, um abaixo do outro):
--   1. Resumo por schema
--   2. Catálogo: tabela + coluna + tipo + null + default
--   3. Chaves primárias
--   4. Chaves estrangeiras (mapa ER)
--   5. UNIQUE / CHECK
--   6. Índices
--   7. Enums
--   8. Funções/RPC públicas
--   9. RLS (policies por tabela)
--  10. Tabelas SEM RLS habilitado (auditoria)
--  11. Contagem de linhas por tabela (public)
--  12. Markdown pronto para colar em doc (uma linha por coluna)
--
-- Dica: em cada resultado, use "Download CSV" no Supabase para arquivar.
-- =============================================================================

-- ─── 1. Resumo por schema ───────────────────────────────────────────────────
SELECT
  table_schema AS schema,
  count(*) AS tabelas
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY table_schema
ORDER BY table_schema;

-- ─── 2. Catálogo completo de colunas (principal) ────────────────────────────
SELECT
  c.table_schema AS schema,
  c.table_name AS tabela,
  c.ordinal_position AS ordem,
  c.column_name AS coluna,
  c.data_type AS tipo_base,
  CASE
    WHEN c.character_maximum_length IS NOT NULL
      THEN c.data_type || '(' || c.character_maximum_length || ')'
    WHEN c.numeric_precision IS NOT NULL
      THEN c.data_type || '(' || c.numeric_precision
        || coalesce(',' || c.numeric_scale::text, '') || ')'
    WHEN c.udt_name = 'uuid' THEN 'uuid'
    WHEN c.udt_name LIKE '%\_status' ESCAPE '\' OR c.udt_name LIKE '%\_role' ESCAPE '\'
      THEN c.udt_name
    ELSE c.udt_name
  END AS tipo,
  c.is_nullable AS nullable,
  c.column_default AS default_value
FROM information_schema.columns c
WHERE c.table_schema IN ('public', 'auth', 'storage')
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = c.table_schema
      AND t.table_name = c.table_name
      AND t.table_type = 'BASE TABLE'
  )
ORDER BY c.table_schema, c.table_name, c.ordinal_position;

-- ─── 3. Chaves primárias ────────────────────────────────────────────────────
SELECT
  tc.table_schema AS schema,
  tc.table_name AS tabela,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS pk_colunas
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_schema, tc.table_name
ORDER BY tc.table_name;

-- ─── 4. Chaves estrangeiras (grafo ER) ──────────────────────────────────────
SELECT
  tc.table_schema AS schema,
  tc.table_name AS tabela_origem,
  kcu.column_name AS coluna_origem,
  ccu.table_schema AS schema_destino,
  ccu.table_name AS tabela_destino,
  ccu.column_name AS coluna_destino,
  rc.update_rule AS on_update,
  rc.delete_rule AS on_delete,
  tc.constraint_name AS fk_nome
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
  AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;

-- ─── 5. UNIQUE e CHECK ──────────────────────────────────────────────────────
SELECT
  tc.table_schema AS schema,
  tc.table_name AS tabela,
  tc.constraint_type AS tipo,
  tc.constraint_name AS nome,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS colunas
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('UNIQUE', 'CHECK')
GROUP BY tc.table_schema, tc.table_name, tc.constraint_type, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_type;

-- ─── 6. Índices ─────────────────────────────────────────────────────────────
SELECT
  schemaname AS schema,
  tablename AS tabela,
  indexname AS indice,
  indexdef AS definicao
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ─── 7. Enums customizados ──────────────────────────────────────────────────
SELECT
  t.typname AS enum_nome,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS valores
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- ─── 8. Funções/RPC (public) ────────────────────────────────────────────────
SELECT
  p.proname AS funcao,
  pg_get_function_identity_arguments(p.oid) AS argumentos,
  pg_get_function_result(p.oid) AS retorno,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END AS volatilidade,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security,
  obj_description(p.oid, 'pg_proc') AS comentario
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- ─── 9. RLS — policies por tabela ───────────────────────────────────────────
SELECT
  schemaname AS schema,
  tablename AS tabela,
  policyname AS policy,
  permissive AS permissivo,
  roles AS roles,
  cmd AS comando,
  qual AS using_expr,
  with_check AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ─── 10. Tabelas public SEM RLS (atenção RingPro) ───────────────────────────
SELECT
  c.relname AS tabela,
  c.relrowsecurity AS rls_habilitado,
  c.relforcerowsecurity AS rls_forcado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- ─── 11. Contagem de linhas (útil antes de refatorar) ───────────────────────
-- Gera SQL dinâmico; copie o resultado e rode numa segunda query se preferir.
SELECT
  'SELECT ''' || quote_ident(tablename) || ''' AS tabela, count(*) AS linhas FROM public.'
    || quote_ident(tablename) || ' UNION ALL'
  AS sql_contagem
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Versão pronta (pode demorar um pouco em bases grandes):
DO $$
DECLARE
  r RECORD;
  sql TEXT := '';
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  LOOP
    sql := sql || format(
      'SELECT %L AS tabela, count(*)::bigint AS linhas FROM public.%I UNION ALL ',
      r.tablename, r.tablename
    );
  END LOOP;
  IF sql <> '' THEN
    sql := left(sql, length(sql) - 11); -- remove último UNION ALL
    sql := 'CREATE TEMP TABLE _ringpro_row_counts AS ' || sql || ';';
    EXECUTE sql;
  END IF;
END $$;

SELECT * FROM _ringpro_row_counts ORDER BY tabela;

-- ─── 12. Markdown para documentação (copiar resultado) ──────────────────────
SELECT
  '| ' || c.table_name
    || ' | ' || c.column_name
    || ' | ' || CASE
         WHEN c.character_maximum_length IS NOT NULL
           THEN c.data_type || '(' || c.character_maximum_length || ')'
         ELSE c.udt_name
       END
    || ' | ' || c.is_nullable
    || ' | ' || coalesce(replace(c.column_default, '|', '\|'), '—')
    || ' |' AS markdown_linha
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;
