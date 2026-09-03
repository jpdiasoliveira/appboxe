-- Wave 6: Notificações in-app

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID REFERENCES public.academies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_self ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Novo lead → notifica SCHOOL_OWNER da academia
CREATE OR REPLACE FUNCTION public.notify_lead_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, academy_id, title, body)
  SELECT
    uar.user_id,
    NEW.academy_id,
    'Novo lead na landing',
    NEW.name || ' (' || NEW.email || ')'
  FROM public.user_academy_roles uar
  WHERE uar.academy_id = NEW.academy_id
    AND uar.role = 'SCHOOL_OWNER'
    AND uar.status = 'ATIVO';
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_notify_owner
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_lead_created();
