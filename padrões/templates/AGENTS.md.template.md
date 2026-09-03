# Template — AGENTS.md

Copie para a raiz do repositório e preencha os trechos `<!-- ... -->`.

---

```markdown
# <!-- Nome do produto / repo -->

Regras para agentes de IA neste repositório. Aplica-se a todo o repo; evite `AGENTS.md` aninhados
enquanto for um pacote único.

## Sources of truth

1. Solicitação explícita do usuário.
2. [`docs/PRD.md`](docs/PRD.md) — produto, regras de negócio, escopo do release atual.
3. Código, testes e configurações — estado implementado.
4. [`.agents/docs/`](.agents/docs/) — convenções técnicas.

Não invente requisitos, endpoints, permissões ou fluxos fora dessas fontes.

## Task-based reading

Abra **somente** o guia relacionado à tarefa:

| Tarefa | Referência |
|--------|------------|
| Produto / regra de negócio | [`docs/PRD.md`](docs/PRD.md) |
| Arquitetura e módulos | [`.agents/docs/architecture.md`](.agents/docs/architecture.md) |
| Padrões de código (DTO, erros, API) | [`.agents/docs/patterns.md`](.agents/docs/patterns.md) |
| Segurança e auth | [`.agents/docs/security.md`](.agents/docs/security.md) |
| Persistência / ORM | [`.agents/docs/prisma.md`](.agents/docs/prisma.md) ou `data.md` |
| Testes | [`.agents/docs/testing.md`](.agents/docs/testing.md) |
| Tracker / domínio | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) |

## Regras essenciais

<!-- 10–20 bullets inegociáveis da stack, ex.: -->
<!-- - 1 ticket = 1 branch = 1 PR -->
<!-- - Controllers finos; regra de negócio no service -->
<!-- - Erros com code estável por módulo -->
<!-- - Validação de entrada em toda borda HTTP -->
<!-- - Enums de domínio em inglês (ACTIVE/INACTIVE) -->
<!-- - Não commitar .env -->

## Skills

Skills operacionais em `.agents/skills/`. **Leitura obrigatória** para agentes — mantêm o padrão do projeto.

| Ordem | Skill | Uso |
|-------|-------|-----|
| 1º | `read-standards` | **Sempre** — início de toda tarefa |
| 2º | `implement` / `ui-standards` / … | Conforme a ação |
| — | `to-commit` | Somente quando usuário pedir commit |
| — | `to-pr` | Somente quando usuário pedir PR |

Não encadear implement → commit → PR automaticamente.

## Review e arquivos gerados

- Critérios detalhados: [`.github/REVIEW.md`](.github/REVIEW.md)
- Não editar: `dist/`, `node_modules/`, clients gerados por ORM/OpenAPI
- Se alterar bootstrap global (`main.ts`), replicar em `test/support/test-app.ts` (ou equivalente e2e)

## Validation

Comandos mínimos (= CI):

```bash
<!-- npm run format:check -->
<!-- npm run lint:check -->
<!-- npm run typecheck -->
<!-- npm test -->
<!-- npm run test:e2e   # quando mudar API, auth ou persistência -->
```

Informe quais checks rodou e risco residual relevante.
```
