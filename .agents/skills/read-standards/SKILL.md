---
name: read-standards
description: Leitura obrigatória no início de toda tarefa. Garante que o agente siga os padrões do RingPro antes de codar, documentar ou commitar.
---

# read-standards — leitura obrigatória

## Quando usar

**Sempre.** Antes de qualquer outra ação neste repositório.

Se você ainda não leu esta skill nesta tarefa → **pare e leia agora**.

## Por que existe

As skills mantêm **um padrão único** alinhado ao **modelo de negócio RingPro** (SaaS multi-tenant para academias de luta):

- mesmas personas, portais e regras de inadimplência
- mesma ordem de Waves (Auth → Plataforma → Academia → Aluno → Landing)
- mesmo stack Supabase + RLS
- mesmo fluxo ticket → código → commit → PR

**Improvisar fora das skills = fora do padrão = rejeitar em review.**

## Checklist — ler na ordem

### 1. Governança

- [ ] [`AGENTS.md`](../../../AGENTS.md)

### 2. Modelo de negócio RingPro (feature de produto)

- [ ] [`ringpro-domain`](../ringpro-domain/SKILL.md) ou [`.agents/docs/ringpro-domain.md`](../../docs/ringpro-domain.md)
- [ ] [`docs/PRD.md`](../../../docs/PRD.md) — trechos do épico da tarefa
- [ ] [`docs/escopo-negocio.md`](../../../docs/escopo-negocio.md) — personas e regras críticas

### 3. Qualidade

- [ ] [`padrões/03-Praticas-Proibidas.md`](../../../padrões/03-Praticas-Proibidas.md) — §10 nomenclatura · §11 skills

### 4. Skill da tarefa

| Vou fazer… | Ler |
|------------|-----|
| Implementar código | [`implement`](../implement/SKILL.md) + [`supabase.md`](../../docs/supabase.md) se banco/auth |
| Feature de produto | [`ringpro-domain`](../ringpro-domain/SKILL.md) |
| Tela ou mockup | [`ui-standards`](../ui-standards/SKILL.md) |
| Commit | [`to-commit`](../to-commit/SKILL.md) — só se usuário pediu |
| PR | [`to-pr`](../to-pr/SKILL.md) — só se usuário pediu |
| Review | [`code-review`](../code-review/SKILL.md) |

### 5. Dados e permissões (se aplicável)

- [ ] [`docs/diagrama-er.md`](../../../docs/diagrama-er.md)
- [ ] [`docs/modelo-racional-permissoes.md`](../../../docs/modelo-racional-permissoes.md)
- [ ] [`docs/wireflows.md`](../../../docs/wireflows.md)
- [ ] [`docs/roadmap-desenvolvimento.md`](../../../docs/roadmap-desenvolvimento.md) — confirmar Wave

## Regras RingPro (memorizar)

| # | Regra |
|---|-------|
| 1 | Produto = **RingPro** — sem nomes proibidos (§10) |
| 2 | Tenant = **academia** (`academy_id` + RLS) |
| 3 | **ASSISTANT** nunca acessa financeiro |
| 4 | **Aluno** paga e cadastra cartão — não professor |
| 5 | **Plano SaaS** ≠ **plano de mensalidade** |
| 6 | Inadimplência após **3 dias** de grace period |
| 7 | Academia SaaS **SUSPENSA** após 15 dias atraso |
| 8 | Sem self-register aluno no MVP |
| 9 | Respeitar **feature flags** por academia |
| 10 | Sem ticket → não implementar (exceto setup Wave explícito) |
| 11 | Sem pedido do usuário → não commitar / não abrir PR |

## Saída esperada

- Persona e portal da tarefa identificados
- Wave/épico confirmado
- Documentos e skill específica lidos
- Só então executar
