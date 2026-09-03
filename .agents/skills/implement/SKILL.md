---
name: implement
description: Implementar 1 ticket RingPro — Supabase RLS, personas, waves e regras de mensalidade/inadimplência conforme PRD.
---

# implement

## Pré-requisitos

- [ ] [`read-standards`](../read-standards/SKILL.md)
- [ ] [`ringpro-domain`](../ringpro-domain/SKILL.md) — se feature de produto
- [ ] Ticket ou Wave explícita pelo usuário
- [ ] Trechos relevantes do [`docs/PRD.md`](../../../docs/PRD.md)

## Ordem técnica (backend-first)

```text
1. supabase/migrations/     → tabelas + enums + RLS policies
2. Edge Functions           → webhooks, cron (se pagamento/inadimplência)
3. Hooks/services           → lógica de domínio (UI burra)
4. Componentes/páginas      → portal correto (/platform | /academy | /student | /a/{slug})
5. Testes                   → auth, RLS, pagamento, ASSISTANT bloqueado
```

Ler [`.agents/docs/supabase.md`](../../docs/supabase.md) em qualquer tarefa com banco ou auth.

## Implementar por Wave

| Wave | Escopo | Entidades-chave |
|------|--------|-----------------|
| **1** | Auth + tenant | `profiles`, `academies`, `user_academy_roles`, RLS base |
| **2** | Plataforma | `saas_plans`, CRUD academias, `academy_feature_flags`, financeiro SaaS |
| **3** | Academia | `students`, `academy_plans`, `training_categories`, `instructors`, financeiro local, presença |
| **4** | Aluno | `student_subscriptions`, `student_payment_methods`, gateway pagamento (ADR-001), PIX/boleto |
| **5** | Landing | `landing_page_config`, `leads`, rota pública `/a/{slug}` |
| **6** | Polish | notificações, exports, auditoria |

**Não implementar Wave N+1 antes de fechar fundação da Wave N.**

## Checklist por tipo de tarefa

### Auth (Wave 1)
- [ ] Redirect: PLATFORM_OWNER → `/platform` · staff → `/academy` · STUDENT → `/student`
- [ ] `must_change_password` força troca de senha
- [ ] E-mail não verificado bloqueia acesso

### Portal Academia (Wave 3)
- [ ] Cadastro aluno presencial (Owner/Professor/Assistant)
- [ ] Lista alunos com badge `INADIMPLENTE`
- [ ] Variante ASSISTANT: sem rotas/dados financeiros
- [ ] Categorias vinculadas ao limite do `academy_plan`

### Portal Aluno (Wave 4)
- [ ] Escolha plano + categorias
- [ ] Cartão só via SDK do gateway (token) — ver [ADR-001](../../../docs/decisoes/001-gateway-pagamentos.md)
- [ ] PIX/boleto aguardam webhook → `PAGO`

### Financeiro (transversal)
- [ ] Grace period 3 dias antes de `INADIMPLENTE`
- [ ] Retry cartão D+1, D+3, D+7
- [ ] Ações financeiras em `audit_logs`

### Feature flag
- [ ] UI oculta módulo se flag off
- [ ] RLS ou Edge Function também bloqueia

## O que NÃO fazer

- Commit, push, PR (skills separadas)
- Self-register aluno, pro-rata, filiais, app mobile (fora MVP)
- Cartão coletado por professor/assistant
- Service role key no frontend
- Tabela sem RLS
- `any`, catch vazio, N+1

## Definition of done

- [ ] Alinhado ao ticket, Wave e PRD §10
- [ ] Persona correta com permissões (ASSISTANT testado)
- [ ] RLS em tabelas novas
- [ ] Feature flags respeitadas (se aplicável)
- [ ] Mockup do portal correspondente seguido (`mockups/<portal>/`)
- [ ] Checks locais OK
