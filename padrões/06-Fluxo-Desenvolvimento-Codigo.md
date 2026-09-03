# Fluxo de desenvolvimento — do documento ao código

Continuação do [01-Playbook-Metodologia-Projetos.md](./01-Playbook-Metodologia-Projetos.md) (**Passo 10 em diante**).

Guia **genérico** para times que usam: repositório de docs + issue tracker (Plane, Jira, Linear, etc.) + Git + agentes/skills de IA.

---

## Visão geral

```text
Discovery (passos 1–9 do playbook)
    ↓
PRD estável + mockups aprovados
    ↓
/to-us  →  User Story no Git (repo de docs)
    ↓
/to-spec  →  Feature no issue tracker (após Approve)
    ↓
/to-tickets  →  Subtickets BACK-END / FRONT-END (após Approve)
    ↓
/implement  →  código + testes + to-commit + to-pr
    ↓
Review (humano + CI)  →  merge na branch estável
```

**Regra de ouro (código):** não implementar sem ticket rastreável. Não publicar no tracker/Git sem **Approve** explícito nas etapas de documentação.

---

## Passo 10 — Estrutura de repositórios

Separação recomendada (ajuste nomes por projeto):

| Repo | Conteúdo |
|------|----------|
| `*-docs` ou `docs/` no monorepo | PRD, user stories, escopo |
| `*-api` ou `backend/` | API, schema, migrations, testes |
| `*-frontend` ou `frontend/` | SPA, rotas, testes |

Cada repo de código deve ter:

- `AGENTS.md` — regras para IAs
- `.agents/skills/` — skills operacionais (`implement`, `to-commit`, `to-pr`, …)
- `.agents/docs/` — padrões técnicos (patterns, security, testing)
- `README.md` — setup local (não duplicar o PRD inteiro)
- `.github/PULL_REQUEST_TEMPLATE.md` (ou equivalente)

**Harness (Claude / Cursor / Pi):** regras em `AGENTS.md`; skills em `.agents/skills/`; adaptadores (`.cursor/`) só como ponte. Detalhes: [07](./07-Setup-Repositorio-IA.md) e [templates/](./templates/).

---

## Passo 11 — Fontes de verdade (em código)

| Artefato | Onde | Uso |
|----------|------|-----|
| **PRD** | `PRD.md` | Escopo do **release atual** — sem módulos futuros |
| **User Story** | `users-stories/US-XXX-slug.md` | Persona, critérios, regras — **sem** detalhe de API/schema |
| **Issue tracker** | Plane / Jira / etc. | Features + subtickets |
| **Mockups** | `mockups/` | UI — em divergência com doc, **mockup vence** |
| **Issue tracker local** | `docs/agents/issue-tracker.md` | IDs de estado, bloqueios, convenções MCP |

---

## Passo 12 — Planejamento com skills (Git + issue tracker)

Fluxo em **etapas separadas**, com aprovação humana antes de publicar.

### 12.1 `/to-us` (repo de documentação)

**Entrada:** necessidade + `@PRD.md`  
**Saída:** `users-stories/US-<número>-<slug>.md` → commit + push

- Numeração sequencial (`001`, `002`, …)
- **Não** cria item no issue tracker
- **Não** inclui subtarefas técnicas ou detalhe de implementação

**Approve:** autoriza arquivo, commit e push.

### 12.2 `/to-spec`

**Entrada:**

```text
/to-spec

Module: <nome do módulo>
User Story: users-stories/US-003-exemplo.md
```

**Fluxo:**

1. Agente lê `PRD.md` + US (no branch principal do repo de docs)
2. Agente apresenta **rascunho** da Feature
3. Humano aprova criação no tracker
4. Cria Feature: estado inicial acordado, label `FEATURE`, link da US na descrição

**Corpo da Feature (fiel à US):** não resumir nem inventar critérios.

### 12.3 `/to-tickets`

**Entrada:** Feature criada pelo `/to-spec`

```text
/to-tickets

Parent: <ID ou link da FEATURE>
```

**Saída (após Approve):**

```text
[BACK-END] <ação verificável>
[FRONT-END] <ação verificável>
[FULL-STACK] <quando inseparável>
```

Preflight: não duplicar se já existem filhos.

---

## Passo 13 — Implementação (`implement`)

Ao **pegar ticket** no tracker:

1. Buscar ticket pelo identificador
2. Mover → **Em andamento** (nome do estado conforme projeto)
3. Implementar — seguir módulo **referência** do repo (ex.: `auth`, `users`)
4. Checks locais (= CI): lint, typecheck, testes
5. **1 ticket = 1 branch = 1 PR** (exceto tickets inseparáveis)
6. **`to-commit`** — commits atômicos, Conventional Commits
7. **`to-pr`** — push + abrir PR
8. Ticket → **Em revisão** + link da PR

Só pegar tickets **sem bloqueadores**.

### Skills auxiliares

| Skill | Função |
|-------|--------|
| `to-commit` | Commit — **não** faz push |
| `to-pr` | Push + PR |
| `to-tickets` | Quebra Feature em subtickets |
| `code-review` | Review automatizado |
| Boas práticas da stack | Referência técnica |

**Não encadear skills** (`implement` → `to-commit` → `to-pr`) sem pedido explícito do usuário. Catálogo: [templates/skills-catalogo.md](./templates/skills-catalogo.md).

### PRs empilhadas

Quando tickets dependem em cadeia (fundação → listagem → CRUD), cada fatia continua sendo **1 PR**. Após corrigir a base, rebase em cascata e `git push --force-with-lease` nas filhas. Ver [09](./09-Governanca-Escopo-e-PRs-Empilhadas.md).

---

## Passo 14 — Git, branches e PRs

| Branch | Uso típico |
|--------|------------|
| `main` | Estável |
| `develop` | Integração (se o time usar) |
| `feat/...` / `fix/...` | Uma branch por PR |

**Regras:**

- PR **obrigatória**
- Base: `develop` se existir; senão `main`
- **Não** force-push em branch alheia
- **Não** `git add .` com WIP misturado
- Definir por projeto quem revisa/merge cada área (API, front, infra)

### Estados no tracker (exemplo)

| Momento | Estado |
|---------|--------|
| Começou a codar | Em andamento |
| PR aberta | Em revisão + link |
| Merge | Concluído (revisor/QA) |

Documente os UUIDs/nomes reais em `docs/agents/issue-tracker.md`.

---

## Passo 15 — Sincronização remoto-first (trabalho paralelo)

Várias pessoas no mesmo produto + sua feature local ainda não mergeada:

```bash
git fetch origin
git merge origin/main   # na sua branch feat/*
```

| Em conflito | Quem vence |
|-------------|------------|
| Infra compartilhada: auth, CI, schema base, configs | **Remoto (branch estável)** |
| Seu módulo de domínio | **Adaptar ao padrão do time** — não alterar remoto sem PR |

**Não mergear branch de PR aberta** de outro dev — espere cair na branch estável.

**Fetch:** se o remote só busca `main`, branches abertas ficam invisíveis até `git fetch` explícito de todas as heads.

### Feature local sem push

- Branch à frente da estável, commits só seus
- Sem push até alinhamento com gestão/time
- A cada merge na estável: fetch → merge → testes → adaptar

---

## Passo 16 — Review automático e CI

### CI local = CI remoto

```bash
npm run lint:check    # ou equivalente
npm run typecheck
npm test
```

Pre-commit hooks quando o repo tiver.

Testes e2e: fixtures com prefixo, teardown via helper central — ver [08](./08-Padroes-Testes-E2E.md).

### Checklist típico de API (adaptar à stack)

- Estrutura de módulo consistente (`dto/`, docs de API, `errors/`, `filters/`)
- Validação de entrada em todos os endpoints
- Paginação e filtros em helpers — não espalhados no service
- Enums e nomes de domínio consistentes (idioma acordado no PRD)
- Erros com código estável para o cliente
- Comentários só quando explicam **por quê**

Preferir **um push por subtarefa pronta** (review no primeiro push da PR).

---

## Passo 17 — O que NÃO fazer

- Codar sem ticket alinhado
- PR gigante ou várias features numa branch
- Colar texto cru do tracker na user story
- Script em lote no lugar de `/to-spec` com Approve
- Número de US duplicado no remoto
- Usuários/roles de seed fora do MVP acordado
- Push sem alinhamento do time

Detalhes de código: [03](./03-Praticas-Proibidas.md).

---

## Passo 18 — Exceção legada (código antes do fluxo formal)

Módulo começou **antes** de `/to-us` → `/to-spec` → `/to-tickets`:

| Item | Ação |
|------|------|
| Requisitos | PRD + plano local (`docs/plans/…`) + mockup |
| Tracker | Feature existente + subtickets alinhados |
| User Story | Não publicar retroativamente sem `/to-us` + Approve |
| Git remoto | Nada até branch sandbox + sinal do time |
| Código novo | Skill `implement` + módulo referência |
| Sync | Remoto-first — adaptar seu módulo à base compartilhada |

Registrar checkpoint: branch, testes, pendências, bloqueios.

---

## Checklist — novo projeto com este padrão

- [ ] Passos 1–9 do playbook concluídos ou adiados com registro
- [ ] `PRD.md` com escopo do release atual
- [ ] `docs/escopo-negocio.md` preenchido ([template](./05-Template-Escopo-Negocio.md))
- [ ] Repo(s) com `AGENTS.md` + `.agents/skills/`
- [ ] Issue tracker + MCP/integração na IDE (se usar agentes)
- [ ] Template de PR e CI mínimo
- [ ] Módulo referência definido para novos módulos
- [ ] Fluxo: `/to-us` → `/to-spec` → `/to-tickets` → `implement`
- [ ] Regra remoto-first comunicada ao time

---

## Mapa de skills por tipo de repo

| Repo | Skills típicas |
|------|----------------|
| Documentação | `to-us`, `to-spec`, `to-tickets` |
| API | `implement`, `to-commit`, `to-pr`, `to-tickets` |
| Frontend | `implement`, `to-commit`, `to-pr`, `to-tickets` |

---

## Relação com os outros documentos desta pasta

| Fase | Documento |
|------|-----------|
| Antes do código | [01](./01-Playbook-Metodologia-Projetos.md), [02](./02-Ciclo-Documentacao-Mockups-ER.md), [05](./05-Template-Escopo-Negocio.md) |
| Durante o código | **Este arquivo (06)**, [07](./07-Setup-Repositorio-IA.md), [08](./08-Padroes-Testes-E2E.md), [09](./09-Governanca-Escopo-e-PRs-Empilhadas.md) |
| Qualidade | [03](./03-Praticas-Proibidas.md), [04](./04-Padroes-UI.md) |

**Ordem mental:** discovery → escopo → mockups/schema → **US/tracker/tickets → implement → PR → merge**.
