-- RingPro: seed data (dev)
-- Senha dos usuários de teste: RingPro@dev123
-- Criar via Supabase Dashboard ou após db push rodar script de seed manual.

-- Academia teste
INSERT INTO public.academies (id, name, slug, status)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Academia Teste',
  'academia-teste',
  'ATIVO'
)
ON CONFLICT (slug) DO NOTHING;

-- Nota: usuários auth devem ser criados via Supabase Auth Admin API ou Dashboard.
-- Após criar users, vincular roles em user_academy_roles e atualizar profiles.
--
-- Exemplo (substituir UUIDs dos auth.users):
-- INSERT INTO user_academy_roles (user_id, academy_id, role) VALUES
--   ('<platform-owner-uuid>', NULL, 'PLATFORM_OWNER'),
--   ('<owner-uuid>', 'a0000000-0000-4000-8000-000000000001', 'SCHOOL_OWNER'),
--   ...
