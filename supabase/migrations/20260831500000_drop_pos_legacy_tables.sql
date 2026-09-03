-- Remove sistema legado POS/varejo (clientes, lojas, vendas, estoque).
-- Não faz parte do RingPro — criado em protótipo anterior no mesmo projeto Supabase.
-- Seguro: sem dados de produção; DROP IF EXISTS em ordem de dependência.

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

COMMENT ON SCHEMA public IS
  'RingPro — schema public após remoção de tabelas POS legadas (20260831500000).';
