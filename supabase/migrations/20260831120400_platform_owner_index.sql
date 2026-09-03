-- Platform owner: um registro por user sem academy
CREATE UNIQUE INDEX IF NOT EXISTS user_academy_roles_platform_unique
  ON public.user_academy_roles (user_id, role)
  WHERE academy_id IS NULL AND role = 'PLATFORM_OWNER';
