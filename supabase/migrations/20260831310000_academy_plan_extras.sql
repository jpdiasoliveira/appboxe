-- UP-116: planos flexíveis — trial, taxa, modalidades, histórico de preço

ALTER TABLE public.academy_plans
  ADD COLUMN IF NOT EXISTS enrollment_fee NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS trial_days INT,
  ADD COLUMN IF NOT EXISTS first_class_free BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS annual_discount_pct NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS max_classes_per_week INT;

COMMENT ON COLUMN public.academy_plans.enrollment_fee IS 'Taxa de matrícula única; NULL ou 0 = sem taxa / cortesia';
COMMENT ON COLUMN public.academy_plans.trial_days IS 'Dias de trial opcionais; NULL = sem trial fixo';
COMMENT ON COLUMN public.academy_plans.annual_discount_pct IS 'Referência de desconto no anual; preço final continua livre';

CREATE TABLE public.academy_plan_categories (
  academy_plan_id UUID NOT NULL REFERENCES public.academy_plans(id) ON DELETE CASCADE,
  training_category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (academy_plan_id, training_category_id)
);

CREATE TABLE public.academy_plan_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_plan_id UUID NOT NULL REFERENCES public.academy_plans(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX academy_plan_price_history_plan_idx
  ON public.academy_plan_price_history (academy_plan_id, created_at DESC);

ALTER TABLE public.academy_plan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_plan_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_categories_staff ON public.academy_plan_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_plans p
      WHERE p.id = academy_plan_id
        AND public.is_academy_staff(p.academy_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_plans p
      WHERE p.id = academy_plan_id
        AND public.is_academy_staff(p.academy_id)
    )
  );

CREATE POLICY plan_price_history_staff ON public.academy_plan_price_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_plans p
      WHERE p.id = academy_plan_id
        AND public.is_academy_staff(p.academy_id)
    )
  );

CREATE POLICY plan_price_history_staff_insert ON public.academy_plan_price_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_plans p
      WHERE p.id = academy_plan_id
        AND public.is_academy_staff(p.academy_id)
    )
  );
