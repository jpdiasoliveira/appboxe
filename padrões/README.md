# Padrões — metodologia reutilizável

Pasta **autocontida** com o passo a passo para criar e evoluir produtos de software: discovery → documentação → código.

**Copie esta pasta** para outro workspace ou use como referência — não depende de um produto específico.

---

## Como usar

1. **Novo produto** → [01](./01-Playbook-Metodologia-Projetos.md) + [02](./02-Ciclo-Documentacao-Mockups-ER.md)
2. **Escopo de negócio** → preencher [05](./05-Template-Escopo-Negocio.md) no repo do produto (`docs/escopo-negocio.md`)
3. **Desenvolvimento** → [06](./06-Fluxo-Desenvolvimento-Codigo.md)
4. **Setup IA no repo** → [07](./07-Setup-Repositorio-IA.md) + [templates/](./templates/)
5. **Qualidade** → [03](./03-Praticas-Proibidas.md) + [04](./04-Padroes-UI.md) + [08](./08-Padroes-Testes-E2E.md)
6. **Escopo e PRs empilhadas** → [09](./09-Governanca-Escopo-e-PRs-Empilhadas.md)

Índice de uma página: [padroes-da-empresa.md](./padroes-da-empresa.md).

---

## Estrutura

```text
padrões/
├── README.md
├── padroes-da-empresa.md
├── 01 … 11              ← metodologia ativa (genérica)
├── templates/             ← AGENTS, issue-tracker, catálogo de skills
└── legado/                ← exemplos históricos de produtos antigos
```

---

## Documentos (01–09)

| # | Documento | Fase |
|---|-----------|------|
| 01 | [Playbook](./01-Playbook-Metodologia-Projetos.md) | Discovery: personas → pacote |
| 02 | [Ciclo docs / mockups / ER](./02-Ciclo-Documentacao-Mockups-ER.md) | Rodadas com stakeholder |
| 03 | [Práticas proibidas](./03-Praticas-Proibidas.md) | Qualidade de código |
| 04 | [Padrões de UI](./04-Padroes-UI.md) | Design system e mockups |
| 05 | [Template escopo de negócio](./05-Template-Escopo-Negocio.md) | Preencher por projeto |
| 06 | [Fluxo de desenvolvimento](./06-Fluxo-Desenvolvimento-Codigo.md) | US → tracker → PR |
| 07 | [Setup repositório IA](./07-Setup-Repositorio-IA.md) | AGENTS.md, skills, `.agents/docs/` |
| 08 | [Padrões testes e2e](./08-Padroes-Testes-E2E.md) | Fixtures, teardown, CI |
| 09 | [Governança escopo / PRs empilhadas](./09-Governanca-Escopo-e-PRs-Empilhadas.md) | Prioridade, stacked PRs, personas vs roles |
| 10 | [Checklist novo SaaS](./10-Checklist-Novo-SaaS.md) | Bootstrap dia 1 — uma página |
| 11 | [Definition of Done](./11-Definition-of-Done.md) | Pronto: ticket, PR, release |

### Templates

| Pasta | Conteúdo |
|-------|----------|
| [templates/](./templates/) | `AGENTS.md`, `issue-tracker`, PR, review, ADR, catálogo de skills |

---

## Fluxo completo

```text
01 discovery → 02 alinhamento → 05 escopo (no repo do produto)
    → mockups/schema → 07 setup IA (AGENTS + skills)
    → 06 tickets → código (03 + 04 + 08)
    → 09 governança (escopo, stacked PRs, review)
```

---

## Legado

Exemplos e versões antigas de **produtos específicos** — não usar em projetos novos:

→ [legado/README.md](./legado/README.md)

---

## Convenções desta pasta

| Regra | Detalhe |
|-------|---------|
| **Genérico** | Sem nomes de produto, repo ou pessoa nesta pasta |
| **Nomenclatura proibida** | Sem referências a KTech, Join Club ou Nex/Next Club — ver [03](./03-Praticas-Proibidas.md) §10 |
| **Skills (agentes)** | Produto deve ter `AGENTS.md` + `.agents/skills/` — leitura obrigatória; ver [03](./03-Praticas-Proibidas.md) §11 |
| **Artefatos do produto** | Ficam no repo de cada projeto (`docs/`, `mockups/`, `docs/PRD.md`, `AGENTS.md`) |
| **Numeração** | `01-` a `11-` na raiz; templates em `templates/`; obsoleto → `legado/` |
