# Definition of Done (DoD)

Critérios objetivos de “pronto” em três níveis. Adapte nomes de comandos e paths ao stack do projeto.

Relacionado: [06](./06-Fluxo-Desenvolvimento-Codigo.md), [08](./08-Padroes-Testes-E2E.md), [09](./09-Governanca-Escopo-e-PRs-Empilhadas.md).

---

## DoD — Ticket (antes de abrir PR)

Um ticket só está **pronto para PR** quando:

| # | Critério |
|---|----------|
| 1 | Implementa **apenas** o escopo do ticket (sem “já aproveitei e fiz o próximo”) |
| 2 | Branch `feat/<id>-<slug>` ou `fix/<id>-<slug>` derivada da base correta |
| 3 | Código segue módulo/tela **referência** do repo |
| 4 | `AGENTS.md` e `.agents/docs/` relevantes foram consultados |
| 5 | Checks locais passam (= CI): lint, typecheck, testes unitários |
| 6 | Se mudou HTTP, auth ou persistência → e2e passou |
| 7 | Se mudou schema → migration gerada pela ferramenta oficial (não manual) |
| 8 | Sem `.env`, secrets ou dados reais commitados |
| 9 | Sem `console.log` / código morto / WIP comentado |
| 10 | Ticket no tracker → **Em revisão** (após PR aberta) |

---

## DoD — Pull Request (pronta para merge)

Uma PR só está **pronta para merge** quando:

| # | Critério |
|---|----------|
| 1 | **1 PR = 1 ticket** (exceto tickets formalmente inseparáveis) |
| 2 | Descrição preenchida ([template](./templates/PULL_REQUEST_TEMPLATE.md)): o quê, por quê, como testar |
| 3 | Link do ticket no tracker na descrição |
| 4 | **CI verde** no commit mais recente (todos os jobs obrigatórios) |
| 5 | Review **APPROVED** (humano e/ou bot, conforme política do time) |
| 6 | Sem `CHANGES_REQUESTED` pendente |
| 7 | Se PR empilhada: base mergeada ou aprovada para merge na ordem correta |
| 8 | Contrato de API / Swagger / tipos front atualizados se o contrato mudou |
| 9 | PRD ou ADR atualizado se houve decisão de produto não óbvia |
| 10 | Merge autorizado pela política do time (gestão pode bloquear mesmo com tudo verde) |

**CI verde sozinho não é DoD de PR.**

---

## DoD — Release / MVP (fatia de produto)

Uma fatia de release só está **entregue** quando:

| # | Critério |
|---|----------|
| 1 | Critérios de aceite da HU/Feature correspondente atendidos |
| 2 | Todas as PRs da fatia mergeadas na branch estável acordada |
| 3 | Ambiente de staging (se existir) validado nos fluxos críticos |
| 4 | Sem regressão conhecida aberta no tracker |
| 5 | Documentação de usuário ou release notes (se o time exigir) |
| 6 | Decisões relevantes registradas (PRD, ADR ou comentário na Feature) |

---

## Matriz rápida

| Pergunta | Ticket | PR | Release |
|----------|--------|-----|---------|
| CI verde? | Obrigatório local | Obrigatório remoto | Obrigatório no ambiente alvo |
| Review aprovado? | — | Obrigatório | — |
| Escopo fechado? | 1 ticket | 1 PR | HU/Feature |
| Tracker atualizado? | Em revisão | Link na PR | Concluído |

---

## Anti-padrões (não é “pronto”)

- PR aberta só para “mostrar progresso” sem critérios de ticket atendidos
- Merge com testes falhando “porque é só em dev”
- Várias features na mesma branch “para economizar review”
- Implementar fora do PRD do release atual sem registro
- Aceitar sugestão da IA que amplia escopo sem ticket novo

---

## Templates relacionados

- [PULL_REQUEST_TEMPLATE.md](./templates/PULL_REQUEST_TEMPLATE.md)
- [REVIEW.md](./templates/REVIEW.md)
- [ADR.template.md](./templates/ADR.template.md)
