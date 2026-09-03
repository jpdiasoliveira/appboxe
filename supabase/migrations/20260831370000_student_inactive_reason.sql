-- Motivo e data ao inativar aluno manualmente pela academia.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS inactive_reason TEXT,
  ADD COLUMN IF NOT EXISTS inactive_at TIMESTAMPTZ;

COMMENT ON COLUMN public.students.inactive_reason IS 'Motivo registrado pela academia ao inativar o aluno';
COMMENT ON COLUMN public.students.inactive_at IS 'Data/hora da inativação manual';
