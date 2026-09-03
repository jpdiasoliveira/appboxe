-- UP-303: período experimental configurável pelo dono da academia.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.students.trial_ends_at IS
  'Fim do período experimental (TRIAL). NULL = sem data fixa (ex.: aula grátis).';
