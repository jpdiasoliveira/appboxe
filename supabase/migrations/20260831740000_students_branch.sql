-- UP-SCH-14: filial operacional do aluno (fundação multi-unidade)

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.academy_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS students_branch_idx
  ON public.students (branch_id)
  WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS students_academy_branch_idx
  ON public.students (academy_id, branch_id);

CREATE OR REPLACE FUNCTION public.validate_student_branch_academy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.academy_branches b
      WHERE b.id = NEW.branch_id
        AND b.academy_id = NEW.academy_id
    ) THEN
      RAISE EXCEPTION 'branch_id deve pertencer à mesma academia do aluno';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_validate_branch ON public.students;
CREATE TRIGGER students_validate_branch
  BEFORE INSERT OR UPDATE OF branch_id, academy_id ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.validate_student_branch_academy();

COMMENT ON COLUMN public.students.branch_id IS
  'Filial/unidade onde o aluno treina; NULL = sede ou não definido no MVP.';
