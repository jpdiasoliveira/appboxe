---
name: to-pr
description: PR RingPro — 1 ticket, plano de teste por persona/portal e checklist Supabase RLS.
---

# to-pr

## Pré-requisitos

- [ ] [`read-standards`](../read-standards/SKILL.md)
- [ ] [`ringpro-domain`](../ringpro-domain/SKILL.md) — para plano de teste
- [ ] Usuário pediu PR
- [ ] Commit(s) na branch do ticket

## Regras

1. **1 PR = 1 ticket = 1 Wave scope** (não misturar platform + student na mesma PR)
2. Template: [`padrões/templates/PULL_REQUEST_TEMPLATE.md`](../../../padrões/templates/PULL_REQUEST_TEMPLATE.md)
3. Linkar ticket · CI verde · não mergear sem pedido

## Plano de teste — incluir na PR

Adaptar ao portal da PR:

### Auth (Wave 1)
- [ ] Login PLATFORM_OWNER → `/platform/dashboard`
- [ ] Login SCHOOL_OWNER/PROFESSOR → `/academy/dashboard`
- [ ] Login ASSISTANT → `/academy/dashboard` sem financeiro
- [ ] Login STUDENT → `/student/dashboard`
- [ ] Senha provisória força troca

### Academia (Wave 3)
- [ ] Owner cadastra aluno → credenciais enviadas
- [ ] Lista filtra inadimplentes
- [ ] ASSISTANT: 403 ou vazio em financeiro

### Aluno (Wave 4)
- [ ] Escolhe plano e categorias
- [ ] Cartão tokeniza · PIX/boleto aguarda confirmação
- [ ] Histórico de pagamentos

### Plataforma (Wave 2)
- [ ] Cria academia + SCHOOL_OWNER
- [ ] Feature flag desliga módulo

### Supabase (qualquer Wave)
- [ ] RLS: usuário academia A não vê dados academia B
- [ ] Sem service role no bundle frontend

## Checklist PR

- [ ] Sem secrets · sem nomes proibidos §10
- [ ] Alinhado PRD + skill `implement`
- [ ] Review: `padrões/templates/REVIEW.md`
