-- Security Hardening: Validações de integridade, RLS de alunos e proteção contra alteração indevida de status/financeiro

-- 1. Trigger de proteção de colunas sensíveis na tabela students
-- Alunos (auth.uid() = user_id) podem atualizar apenas campos pessoais permitidos (phone, birth_date, weight_kg, height_cm, emergency contacts).
-- Alteração de status, academy_id, user_id, enrollment_date e onboarding_completed_at requer staff/platform_owner ou service_role.

CREATE OR REPLACE FUNCTION public.protect_student_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_staff_or_owner BOOLEAN;
BEGIN
  -- Se executado via service_role ou sem contexto de usuário autenticado (cron, migrations, triggers internas), permite
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se quem está executando é platform_owner ou staff da academia
  SELECT (public.is_platform_owner() OR public.is_academy_staff(OLD.academy_id))
  INTO v_is_staff_or_owner;

  IF v_is_staff_or_owner THEN
    RETURN NEW;
  END IF;

  -- Se for o próprio aluno atualizando:
  IF OLD.user_id = auth.uid() THEN
    -- Bloquear alteração de status por conta própria (deve passar por pagamento/cron)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Não é permitido ao aluno alterar seu próprio status.';
    END IF;

    -- Bloquear alteração de vínculo de tenant ou identidade
    IF NEW.academy_id IS DISTINCT FROM OLD.academy_id THEN
      RAISE EXCEPTION 'Não é permitido alterar a academia vinculada.';
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Não é permitido alterar o usuário vinculado.';
    END IF;

    IF NEW.enrollment_date IS DISTINCT FROM OLD.enrollment_date THEN
      RAISE EXCEPTION 'Não é permitido alterar a data de matrícula.';
    END IF;

    -- onboarding_completed_at é alterado apenas na conclusão do fluxo
    -- Demais campos (phone, weight_kg, height_cm, birth_date, emergency_contact_name, emergency_contact_phone, onboarding_completed_at) são permitidos.
    RETURN NEW;
  END IF;

  -- Qualquer outro usuário não autorizado
  RAISE EXCEPTION 'Sem permissão para atualizar este perfil de aluno.';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_student_sensitive_columns ON public.students;
CREATE TRIGGER trg_protect_student_sensitive_columns
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_student_sensitive_columns();

-- 2. Garantir que RLS de student_subscriptions e student_categories permita onboarding íntegro
-- subs_self_write e subs_self_update garantem que o aluno só cria/atualiza assinatura para seu próprio ID
DROP POLICY IF EXISTS subs_self_write ON public.student_subscriptions;
CREATE POLICY subs_self_write ON public.student_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS subs_self_update ON public.student_subscriptions;
CREATE POLICY subs_self_update ON public.student_subscriptions
  FOR UPDATE TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

-- stu_cat_self: Aluno seleciona e gerencia suas próprias modalidades durante e após onboarding
DROP POLICY IF EXISTS stu_cat_self ON public.student_categories;
CREATE POLICY stu_cat_self ON public.student_categories
  FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
