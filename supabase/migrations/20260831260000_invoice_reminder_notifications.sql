-- UP-111: lembretes de vencimento (in-app) com deduplicação

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind TEXT,
  ADD COLUMN IF NOT EXISTS reference_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_kind_ref_idx
  ON public.notifications (user_id, kind, reference_id)
  WHERE kind IS NOT NULL AND reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.notify_upcoming_academy_invoices()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_3d INTEGER := 0;
  v_created_today INTEGER := 0;
BEGIN
  PERFORM public.apply_academy_dunning();

  WITH inserted AS (
    INSERT INTO public.notifications (user_id, academy_id, title, body, kind, reference_id)
    SELECT
      s.user_id,
      i.academy_id,
      'Mensalidade vence em 3 dias',
      'Sua mensalidade de R$ ' || TRIM(to_char(i.amount, 'FM999999990.00')) ||
        ' vence em ' || to_char(i.due_date, 'DD/MM/YYYY') ||
        '. Acesse o portal do aluno para pagar.',
      'invoice_due_3d',
      i.id
    FROM public.academy_invoices i
    JOIN public.students s ON s.id = i.student_id
    WHERE i.status = 'PENDENTE'
      AND i.due_date = CURRENT_DATE + 3
    ON CONFLICT (user_id, kind, reference_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_created_3d FROM inserted;

  WITH inserted AS (
    INSERT INTO public.notifications (user_id, academy_id, title, body, kind, reference_id)
    SELECT
      s.user_id,
      i.academy_id,
      CASE
        WHEN i.status = 'ATRASADO' THEN 'Mensalidade em atraso'
        ELSE 'Mensalidade vence hoje'
      END,
      'Sua mensalidade de R$ ' || TRIM(to_char(i.amount, 'FM999999990.00')) ||
        ' vence em ' || to_char(i.due_date, 'DD/MM/YYYY') ||
        '. Acesse o portal do aluno para pagar.',
      'invoice_due_today',
      i.id
    FROM public.academy_invoices i
    JOIN public.students s ON s.id = i.student_id
    WHERE i.status IN ('PENDENTE', 'ATRASADO')
      AND i.due_date = CURRENT_DATE
    ON CONFLICT (user_id, kind, reference_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_created_today FROM inserted;

  RETURN json_build_object(
    'created_due_3d', v_created_3d,
    'created_due_today', v_created_today
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_upcoming_academy_invoices() TO service_role;
