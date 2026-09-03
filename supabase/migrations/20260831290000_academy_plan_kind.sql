-- UP-114: tipo de plano (grupo vs individual) + descrição

CREATE TYPE public.plan_kind AS ENUM ('GROUP', 'INDIVIDUAL');

ALTER TABLE public.academy_plans
  ADD COLUMN plan_kind public.plan_kind NOT NULL DEFAULT 'GROUP',
  ADD COLUMN description TEXT;

COMMENT ON COLUMN public.academy_plans.plan_kind IS 'GROUP = turma; INDIVIDUAL = aulas particulares (1 modalidade)';
