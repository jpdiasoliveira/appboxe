# Architecture — RingPro

## Monorepo

- `frontend/` — React 19 + Vite 8 + TypeScript + Tailwind 4
- `supabase/` — migrations, seed, Edge Functions (futuro)

## Frontend

```text
src/
  lib/           # supabase client, types, auth-utils
  contexts/      # AuthProvider, AcademyProvider
  features/      # por portal (auth, platform, academy, student)
  components/    # UI compartilhada
  layouts/       # AuthLayout, DashboardLayout
  routes/        # guards, nav-config
```

## Auth flow

Supabase Auth → `profiles` + `user_academy_roles` → redirect por `UserRole`.

## Multi-tenant

`academy_id` em tabelas de negócio + RLS. Ver `supabase.md`.

## Multi-canal (web + app)

| Fase | Cliente | Stack |
|---|---|---|
| MVP | Web responsiva | `frontend/` — React + Vite + `@supabase/supabase-js` |
| V2 | App Store / Google Play (portal aluno) | Capacitor ou React Native — **mesmo** Supabase |

**Regras app-ready (MVP):**

- Lógica de negócio em RLS + Edge Functions, não só no React
- Auth via Supabase JWT (funciona em web e mobile)
- Service role apenas em Edge Functions
- Portal aluno: mobile-first

Detalhes: [docs/PRD.md §5.3](../../docs/PRD.md#53-estratégia-multi-canal--web-e-apps-nas-lojas).
