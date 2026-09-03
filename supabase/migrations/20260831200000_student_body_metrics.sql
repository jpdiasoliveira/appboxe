-- UP-105: histórico de evolução física (peso/altura)

CREATE TABLE public.student_body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight_kg NUMERIC(5, 2),
  height_cm NUMERIC(5, 1),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT body_metrics_at_least_one CHECK (weight_kg IS NOT NULL OR height_cm IS NOT NULL)
);

CREATE INDEX student_body_metrics_student_idx
  ON public.student_body_metrics (student_id, measured_at DESC);

ALTER TABLE public.student_body_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY body_metrics_select ON public.student_body_metrics
  FOR SELECT TO authenticated
  USING (
    public.is_academy_staff(academy_id)
    OR public.is_platform_owner()
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY body_metrics_insert ON public.student_body_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_academy_staff(academy_id)
    OR public.is_platform_owner()
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

-- Importar medição atual do cadastro como ponto inicial
INSERT INTO public.student_body_metrics (student_id, academy_id, weight_kg, height_cm, measured_at, notes)
SELECT
  id,
  academy_id,
  weight_kg,
  height_cm,
  COALESCE(enrollment_date::timestamptz, now()),
  'Importado do cadastro'
FROM public.students
WHERE weight_kg IS NOT NULL OR height_cm IS NOT NULL;
