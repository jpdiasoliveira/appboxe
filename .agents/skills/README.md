# Skills — RingPro

Skills alinhadas ao **modelo de negócio**: SaaS multi-tenant para academias de artes marciais, com personas, mensalidades, inadimplência e feature flags.

## Regra para agentes

```text
read-standards (sempre)
    ↓
ringpro-domain (features de produto)
    ↓
skill da ação (implement, ui-standards, …)
```

## Catálogo

| Skill | Quando |
|-------|--------|
| [`execute-plan`](./execute-plan/SKILL.md) | Maratona — `docs/PLANO-EXECUCAO.md` |
| [`read-standards`](./read-standards/SKILL.md) | **Obrigatória** — início de toda tarefa |
| [`ringpro-domain`](./ringpro-domain/SKILL.md) | Features de produto — personas, planos, waves |
| [`implement`](./implement/SKILL.md) | Codar 1 ticket (Supabase + RLS + portal) |
| [`ui-standards`](./ui-standards/SKILL.md) | UI/mockup por portal |
| [`to-commit`](./to-commit/SKILL.md) | Commit (só se usuário pedir) |
| [`to-pr`](./to-pr/SKILL.md) | PR com plano de teste por persona |
| [`code-review`](./code-review/SKILL.md) | Review negócio + técnico |

## Docs de apoio

| Doc | Conteúdo |
|-----|----------|
| [`.agents/docs/ringpro-domain.md`](../docs/ringpro-domain.md) | Modelo de negócio completo |
| [`.agents/docs/supabase.md`](../docs/supabase.md) | RLS, Auth, Edge Functions |
| [`docs/PRD.md`](../../docs/PRD.md) | Requisitos oficiais |

## Portais (referência rápida)

| Portal | Rota | Roles |
|--------|------|-------|
| Plataforma | `/platform/*` | PLATFORM_OWNER |
| Academia | `/academy/*` | SCHOOL_OWNER, PROFESSOR, ASSISTANT |
| Aluno | `/student/*` | STUDENT |
| Landing | `/a/{slug}` | Público |
| Auth | `/auth/*`, `/login` | Todos |
