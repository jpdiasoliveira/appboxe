-- Permite RPC is_platform_owner no client e Edge Functions com JWT do usuário
GRANT EXECUTE ON FUNCTION public.is_platform_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_academy_role(UUID, user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_academy_ids() TO authenticated;
