---
name: code-review
description: Review RingPro — PRD, RLS multi-tenant, ASSISTANT sem financeiro, PCI, feature flags e waves.
---

# code-review

## Pré-requisitos

- [ ] [`read-standards`](../read-standards/SKILL.md)
- [ ] [`ringpro-domain`](../ringpro-domain/SKILL.md)
- [ ] Usuário pediu review

## Checklist de negócio

| # | Verificar |
|---|-----------|
| 1 | Escopo dentro do ticket/PRD/Wave atual? |
| 2 | Portal e persona corretos (`/platform`, `/academy`, `/student`, `/a/{slug}`)? |
| 3 | `academy_id` + RLS em tabelas novas? |
| 4 | **ASSISTANT** bloqueado em financeiro (RLS, não só UI)? |
| 5 | **STUDENT** só acessa próprios dados? |
| 6 | Cartão só no portal aluno (token Pagar.me)? |
| 7 | Professor/assistant não coleta cartão? |
| 8 | Plano SaaS ≠ plano mensalidade? |
| 9 | Grace period 3 dias / status `INADIMPLENTE` correto? |
| 10 | Feature flags respeitadas? |
| 11 | Sem self-register aluno (MVP)? |
| 12 | Sem escopo V2 (mobile, filiais, pro-rata, etc.)? |

## Checklist técnico

| # | Verificar |
|---|-----------|
| 1 | `padrões/03-Praticas-Proibidas.md` |
| 2 | Nomenclatura RingPro — §10 |
| 3 | Service role só em Edge Functions |
| 4 | UI: tokens, UI burra, portal correto |
| 5 | Sem secrets no diff |
| 6 | Testes: auth, RLS, ASSISTANT, pagamento (se aplicável) |

## Formato

- 🔴 Bloqueante — corrigir antes do merge
- 🟡 Sugestão
- 🟢 OK

**Não alterar código** — apenas relatar.

## Bloqueantes frequentes no RingPro

- Tabela sem RLS
- ASSISTANT com SELECT em `invoices`/`payments`
- `service_role` key importada no frontend
- Cartão em formulário do professor
- Query sem filtro de tenant (exceto PLATFORM_OWNER controlado)
- Módulo implementado com feature flag off por default sem gate
