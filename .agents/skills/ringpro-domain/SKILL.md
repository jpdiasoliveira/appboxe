---
name: ringpro-domain
description: Modelo de negócio RingPro — personas, portais, planos, inadimplência, feature flags e waves. Ler antes de implementar qualquer feature de produto.
---

# ringpro-domain — modelo de negócio

## Quando usar

- Implementar qualquer feature além de setup puro de infra
- Dúvida sobre permissões, planos, pagamentos ou tenant
- Criar mockup ou tela de um portal específico
- Review de PR que toca regra de negócio

## Pré-requisito

- [ ] Já leu [`read-standards`](../read-standards/SKILL.md)

## Ler

- [`.agents/docs/ringpro-domain.md`](../../docs/ringpro-domain.md) — **referência completa**
- Trechos do [`docs/PRD.md`](../../../docs/PRD.md) do épico da tarefa
- [`docs/wireflows.md`](../../../docs/wireflows.md) — jornada correspondente
- [`docs/modelo-racional-permissoes.md`](../../../docs/modelo-racional-permissoes.md) — se tocar RBAC

## Mapa rápido — qual portal?

| Se a tarefa é sobre… | Portal | Role principal |
|---------------------|--------|----------------|
| Academias na rede, MRR SaaS, flags globais | Plataforma | PLATFORM_OWNER |
| Alunos, professores, planos locais, financeiro escola | Academia | SCHOOL_OWNER / PROFESSOR |
| Alunos e presença **sem** valores | Academia | ASSISTANT |
| Mensalidade, cartão, modalidades | Aluno | STUDENT |
| Site público da escola, leads | Landing | Público + SCHOOL_OWNER (editor) |
| Login, reset, 2FA | Auth | Todos |

## Armadilhas comuns (não cometer)

| Erro | Correto |
|------|---------|
| Confundir plano SaaS com plano de mensalidade | SaaS = academia paga RingPro · Mensalidade = aluno paga academia |
| ASSISTANT vê financeiro “escondido” | RLS nega acesso — não só `display: none` |
| Professor cadastra cartão do aluno | Só aluno no portal `/student/pagamento` |
| Self-register aluno no MVP | Cadastro presencial por Owner/Professor |
| Pular Wave 3 e ir direto ao aluno | Ordem: Auth → Plataforma → Academia → Aluno → Landing |
| Implementar módulo com flag off | Respeitar `academy_feature_flags` |
| Pro-rata na troca de plano | MVP: efeito no próximo ciclo |

## Status e enums (usar exatamente)

**Aluno:** `ATIVO` · `INADIMPLENTE` · `INATIVO` · `TRIAL` (UI: **Experimental**)

**Academia:** `ATIVO` · `INATIVO` · `SUSPENSO`

**Fatura:** `PENDENTE` · `PAGO` · `ATRASADO` · `CANCELADO`

**Pagamento:** `CARTAO` · `PIX` · `BOLETO`

## Saída esperada

Antes de codar, o agente sabe:

- qual persona usa a feature
- qual `academy_id` / RLS se aplica
- qual wave/épico
- quais regras do PRD §10 são afetadas
