-- UP-103: wizard de onboarding do aluno pós-login

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.students.onboarding_completed_at IS
  'Preenchido quando o aluno conclui o wizard inicial (perfil, plano, modalidades, pagamento).';

-- Alunos já existentes antes desta migration não passam pelo wizard
UPDATE public.students
SET onboarding_completed_at = COALESCE(enrollment_date::timestamptz, now())
WHERE onboarding_completed_at IS NULL;
