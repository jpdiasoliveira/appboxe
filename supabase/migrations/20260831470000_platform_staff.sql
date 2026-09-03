-- UP-404 (parte 1): novos valores do enum user_role
-- Deve ficar em migration separada — PostgreSQL não permite usar novos valores
-- do enum na mesma transação em que foram criados.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'PLATFORM_SUPPORT';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'PLATFORM_FINANCE';
