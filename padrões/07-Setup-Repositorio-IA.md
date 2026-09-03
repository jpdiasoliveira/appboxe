# Setup de repositório para IA — AGENTS, skills e docs técnicos

Complementa o [06](./06-Fluxo-Desenvolvimento-Codigo.md) (**Passo 10**).  
Guia **genérico** para qualquer repo de código (API, frontend, monorepo) que use agentes (Cursor, Claude Code, Pi, etc.).

---

## Objetivo

Cada repositório de código deve ser **autossuficiente** para a IA:

- saber **onde** ler regras (sem inventar requisitos);
- saber **quais skills** rodar e em que ordem;
- saber **quando parar** e pedir aprovação humana.

Esta pasta (`padrões/`) não substitui os arquivos do produto — ela define **o que copiar/adaptar** ao criar um repo novo.

---

## Estrutura mínima por repo de código

```text
<repo>/
├── AGENTS.md                 ← regras para IAs (fonte primária)
├── README.md                 ← setup local (comandos, env, portas)
├── docs/
│   ├── PRD.md                ← escopo do release atual
│   └── agents/
│       └── issue-tracker.md  ← IDs de estado, MCP, convenções do tracker
├── .agents/
│   ├── docs/                 ← padrões técnicos (ler sob demanda)
│   │   ├── architecture.md
│   │   ├── patterns.md
│   │   ├── testing.md
│   │   ├── security.md
│   │   └── … (por stack)
│   └── skills/
│       ├── implement/SKILL.md
│       ├── to-commit/SKILL.md
│       ├── to-pr/SKILL.md
│       ├── to-tickets/SKILL.md
│       └── code-review/SKILL.md
└── .github/
    ├── PULL_REQUEST_TEMPLATE.md
    └── REVIEW.md             ← critérios de review (humano + bot)
```

**Harness / adaptadores** (`.cursor/`, `.claude/`, etc.) são **ponte** — não dupliquem regras que já estão em `AGENTS.md` e `.agents/`.

Templates prontos: [templates/](./templates/).

---

## AGENTS.md — o que conter

Use [templates/AGENTS.md.template.md](./templates/AGENTS.md.template.md) como base.

| Seção | Conteúdo |
|-------|----------|
| **Sources of truth** | Ordem: pedido explícito → PRD → código/testes → `.agents/docs/` |
| **Task-based reading** | Tabela “tarefa → qual doc abrir” — evita ler tudo sempre |
| **Regras essenciais** | 10–20 bullets do que é inegociável na stack |
| **Review e arquivos gerados** | O que não editar (`dist/`, client gerado, etc.) |
| **Validation** | Comandos de check (= CI local) |

**Não** coloque o PRD inteiro no `AGENTS.md`. **Não** invente endpoints ou permissões — aponte para `docs/PRD.md`.

---

## `.agents/docs/` — padrões técnicos

Um arquivo por tema. A IA abre **só o relevante** à tarefa.

| Arquivo típico | Conteúdo |
|----------------|----------|
| `architecture.md` | Camadas, módulos, DI, composição |
| `patterns.md` | DTOs, validação, erros, paginação, convenções de nome |
| `testing.md` | Unit vs e2e, fixtures, teardown, descrições em PT-BR |
| `security.md` | Auth, RBAC, secrets, o que nunca logar/persistir |
| `prisma.md` / `data.md` | ORM, migrations, queries (API) |
| `routes.md` / `components.md` | Rotas, loaders, UI (frontend) |

Regra: se uma convenção vale para **todo** o repo, vai em `.agents/docs/`. Se é regra de **produto**, vai no PRD.

---

## `.agents/skills/` — skills operacionais

Skills são **fluxos padronizados**, não dicas soltas. Servem para **manter um padrão único** entre humanos e agentes de IA (código, docs, commits, PRs, UI).

**Regra para agentes:** ler [`read-standards`](../.agents/skills/read-standards/SKILL.md) **no início de toda tarefa**, depois a skill específica da ação. Ver [`AGENTS.md`](../AGENTS.md) na raiz do produto.

Cada skill tem `SKILL.md` com frontmatter (`name`, `description`).

### Skills universais (API e frontend)

| Skill | Quando usar | O que **não** faz |
|-------|-------------|-------------------|
| `implement` | Implementar **1 ticket** aprovado | commit, push, PR, merge |
| `to-commit` | Usuário pediu commit | push, PR |
| `to-pr` | Usuário pediu abrir PR | merge |
| `to-tickets` | Quebrar Feature em subtickets | implementar código |
| `code-review` | Review de diff/branch | alterar código |

### Skills de documentação (repo de docs ou monorepo)

| Skill | Quando usar |
|-------|-------------|
| `to-us` | Criar user story versionada |
| `to-spec` | Criar Feature no tracker (após Approve) |

### Skills de stack (opcional)

- API NestJS: `nestjs-best-practices`
- Frontend shadcn: `shadcn`

**Regra de ouro:** skills operacionais só rodam quando o usuário **pede explicitamente**. Não encadear `implement → to-commit → to-pr` automaticamente.

Catálogo detalhado: [templates/skills-catalogo.md](./templates/skills-catalogo.md).

---

## Workspace com vários repos (API + frontend)

No workspace raiz (fora dos repos), use regras que:

1. Dizem **qual repo** usar por tarefa (API vs frontend).
2. Apontam skills em `.agents/skills/` **de cada repo** — não inventar skills no workspace.
3. Reforçam: **1 PR = 1 ticket**; não misturar módulos na mesma branch.

Exemplo de regra workspace: “Antes de alterar código, leia `AGENTS.md` do repo afetado.”

---

## Checklist — novo repo com IA

- [ ] `AGENTS.md` preenchido a partir do template
- [ ] `.agents/docs/` com pelo menos `architecture`, `patterns`, `testing`
- [ ] Skills `implement`, `to-commit`, `to-pr`, `code-review` copiadas e adaptadas
- [ ] `docs/agents/issue-tracker.md` com estados e IDs do tracker
- [ ] `docs/PRD.md` com escopo do release (sem módulos futuros misturados)
- [ ] CI mínimo = mesmos comandos do `AGENTS.md` (Validation)
- [ ] Módulo/tela **referência** definido para novos domínios
- [ ] Regra workspace (se multi-repo) apontando fontes de verdade

---

## Relação com outros documentos

| Fase | Documento |
|------|-----------|
| Discovery | [01](./01-Playbook-Metodologia-Projetos.md)–[05](./05-Template-Escopo-Negocio.md) |
| Fluxo ticket → PR | [06](./06-Fluxo-Desenvolvimento-Codigo.md) |
| Testes e2e | [08](./08-Padroes-Testes-E2E.md) |
| Escopo e PRs empilhadas | [09](./09-Governanca-Escopo-e-PRs-Empilhadas.md) |
| Definition of Done | [11](./11-Definition-of-Done.md) |
| Qualidade de código | [03](./03-Praticas-Proibidas.md) |
