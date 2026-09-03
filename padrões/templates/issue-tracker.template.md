# Template — docs/agents/issue-tracker.md

Copie para `docs/agents/issue-tracker.md` no repo do produto.

---

```markdown
# Issue tracker — convenções

Ferramenta: <!-- Plane / Jira / Linear / … -->

## Projeto / workspace

- **Workspace ID:** <!-- preencher -->
- **Project ID:** <!-- preencher -->

## Estados (workflow)

| Estado (nome) | ID | Quando usar |
|---------------|-----|-------------|
| Backlog | | Ticket criado, não iniciado |
| Em andamento | | Dev pegou o ticket |
| Em revisão | | PR aberta — incluir link na descrição |
| Concluído | | Mergeado / entregue |
| Bloqueado | | Dependência externa |

## Labels / tipos

| Label | Uso |
|-------|-----|
| `FEATURE` | Epic / feature do `/to-spec` |
| `BACK-END` | Subticket API |
| `FRONT-END` | Subticket UI |

## Convenções de branch

```text
feat/<ticket-id-kebab>-<slug-curto>
fix/<ticket-id-kebab>-<slug-curto>
```

Exemplo: `feat/ringpro-001-auth-login`

## Convenções de commit

Conventional Commits, escopo opcional:

```text
feat(modulo): descrição curta

fix(e2e): descrição
docs(PRD): descrição
```

## MCP / integração IDE

<!-- Se usar MCP do tracker na IDE, documentar namespace e auth aqui -->

## Bloqueios conhecidos

<!-- Ex.: merge proibido até alinhamento; conflito entre PRs de autores diferentes -->
```
