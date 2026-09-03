---
name: to-commit
description: Commit RingPro — escopos por portal (platform/academy/student/auth/supabase) e convenções do projeto.
---

# to-commit

## Pré-requisitos

- [ ] [`read-standards`](../read-standards/SKILL.md)
- [ ] Usuário **pediu** commit
- [ ] Implementação concluída e checks passando

## Escopos Conventional Commits (portal/Wave)

| Escopo | Quando |
|--------|--------|
| `auth` | Wave 1 — login, RBAC, sessão |
| `supabase` | migrations, RLS, Edge Functions |
| `platform` | Wave 2 — portal dono SaaS |
| `academy` | Wave 3 — portal academia |
| `student` | Wave 4 — portal aluno |
| `landing` | Wave 5 — página pública |
| `docs` | PRD, skills, diagramas |
| `mockups` | HTML/CSS de referência |

Exemplos:

```text
feat(auth): login com redirect por role
feat(supabase): RLS students e invoices por academy_id
feat(academy): listagem alunos com filtro inadimplente
fix(student): webhook PIX atualiza status ATIVO
```

## Regras

1. Nunca commitar `.env`, `SUPABASE_SERVICE_ROLE_KEY`, tokens Pagar.me raw
2. Branch: `feat/ringpro-XXX-slug`
3. Mensagem: **porquê** + portal/Wave quando relevante
4. Sem `--no-verify` / `--amend` sem pedido explícito

## Não fazer

- Push · PR · alterar git config
