-- UP-SCH-11: config global do SaaS (gateway, e-mail transacional)

CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT platform_settings_key_check CHECK (
    key IN ('gateway', 'email', 'billing')
  )
);

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_settings_owner_all ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_platform_owner())
  WITH CHECK (public.is_platform_owner());

CREATE POLICY platform_settings_staff_read ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.is_platform_operator());

INSERT INTO public.platform_settings (key, value) VALUES
  (
    'gateway',
    jsonb_build_object(
      'provider', 'pagarme',
      'environment', 'sandbox',
      'webhook_enabled', false
    )
  ),
  (
    'email',
    jsonb_build_object(
      'from_name', 'RingPro',
      'from_address', null,
      'reply_to', null
    )
  ),
  (
    'billing',
    jsonb_build_object(
      'default_due_day', 10,
      'grace_days_saas', 15
    )
  )
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.platform_settings IS
  'Configuração global do RingPro (singleton por key: gateway, email, billing).';
