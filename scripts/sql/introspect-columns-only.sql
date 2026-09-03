-- RingPro — Catálogo rápido: tabelas + colunas (public)
-- Supabase → SQL Editor → Run → Export CSV

SELECT
  t.table_name AS tabela,
  c.ordinal_position AS ordem,
  c.column_name AS coluna,
  c.udt_name AS tipo,
  c.is_nullable AS nullable,
  c.column_default AS default_value,
  col_description(
    (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass,
    c.ordinal_position
  ) AS comentario_pg
FROM information_schema.tables t
JOIN information_schema.columns c
  ON c.table_schema = t.table_schema
  AND c.table_name = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
