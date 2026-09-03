-- Remove tabelas do sistema legado (pré-RingPro) no schema public.
-- Seguro: só DROP IF EXISTS nas tabelas conhecidas do projeto antigo.

DROP TABLE IF EXISTS public.boxers CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.gyms CASCADE;
DROP TABLE IF EXISTS public.ktech CASCADE;

-- Migrations customizadas do sistema anterior (não é supabase_migrations.schema_migrations)
DROP TABLE IF EXISTS public.schema_migrations CASCADE;

-- Objetos legados opcionais (se existirem de protótipos)
DROP TABLE IF EXISTS public.boxe_students CASCADE;
DROP TABLE IF EXISTS public.boxe_plans CASCADE;
DROP TABLE IF EXISTS public.boxe_payments CASCADE;
DROP TABLE IF EXISTS public.nex_club_users CASCADE;
DROP TABLE IF EXISTS public.join_club_users CASCADE;

-- POS/varejo (sistema anterior) — ver também 20260831500000_drop_pos_legacy_tables.sql
DROP VIEW IF EXISTS public.v_estoque_global CASCADE;
DROP TABLE IF EXISTS public.itens_venda CASCADE;
DROP TABLE IF EXISTS public.pagamentos_venda CASCADE;
DROP TABLE IF EXISTS public.movimentacoes_caixa CASCADE;
DROP TABLE IF EXISTS public.vendas CASCADE;
DROP TABLE IF EXISTS public.sessoes_caixa CASCADE;
DROP TABLE IF EXISTS public.estoque_localizacao CASCADE;
DROP TABLE IF EXISTS public.historico_estoque CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.produtos CASCADE;
DROP TABLE IF EXISTS public.lojas CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;
DROP SEQUENCE IF EXISTS public.vendas_numero_venda_seq;
