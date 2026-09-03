-- Estatísticas de treino/luta registradas pela academia (histórico resumido).

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS fights_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sparring_sessions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS training_started_at DATE;

COMMENT ON COLUMN public.students.fights_count IS 'Lutas oficiais registradas pela academia';
COMMENT ON COLUMN public.students.sparring_sessions IS 'Sessões de sparring relevantes (marcos)';
COMMENT ON COLUMN public.students.training_started_at IS 'Início dos treinos na academia';
