-- UP-505: tokens FCM por dispositivo + payload de push no cron de vencimento

CREATE TABLE public.push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX push_device_tokens_user_id_idx ON public.push_device_tokens (user_id);

ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_device_tokens_self ON public.push_device_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_upcoming_academy_invoices()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_3d INTEGER := 0;
  v_created_today INTEGER := 0;
  v_push JSONB := '[]'::jsonb;
  v_part JSONB;
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
    RETURNING user_id, academy_id, title, body, kind, reference_id
  )
  SELECT
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'academy_id', academy_id,
      'title', title,
      'body', body,
      'kind', kind,
      'reference_id', reference_id
    )), '[]'::jsonb)
  INTO v_created_3d, v_part
  FROM inserted;

  v_push := v_push || v_part;

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
    RETURNING user_id, academy_id, title, body, kind, reference_id
  )
  SELECT
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'academy_id', academy_id,
      'title', title,
      'body', body,
      'kind', kind,
      'reference_id', reference_id
    )), '[]'::jsonb)
  INTO v_created_today, v_part
  FROM inserted;

  v_push := v_push || v_part;

  RETURN json_build_object(
    'created_due_3d', v_created_3d,
    'created_due_today', v_created_today,
    'push_messages', v_push
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_upcoming_academy_invoices() TO service_role;
