# RingPro — regras para agentes de IA

Regras obrigatórias para **todo** agente (Cursor, Claude Code, etc.) que trabalhar neste repositório.

---

## Skills = padrão do projeto

As **skills** em [`.agents/skills/`](.agents/skills/) existem para **manter um padrão único** de código, documentação, commits e PRs. Não são opcionais.

### Regra obrigatória — ler skills antes de agir

1. **Início de sessão ou tarefa nova** → ler [`read-standards`](.agents/skills/read-standards/SKILL.md) **por completo**.
2. **Feature de produto** → ler [`ringpro-domain`](.agents/skills/ringpro-domain/SKILL.md) (personas, planos, waves).
3. **Antes de implementar código** → ler `implement` + [`supabase.md`](.agents/docs/supabase.md) se banco/auth.
4. **Antes de commit** → ler `to-commit` (somente quando o usuário pedir commit).
5. **Antes de abrir PR** → ler `to-pr` (somente quando o usuário pedir PR).
6. **Antes de UI/mockup** → ler `ui-standards`.
7. **Nunca** improvisar fluxo que já está descrito numa skill — seguir a skill.

Se a skill e outro documento divergirem → **skill do projeto prevalece** para processo; **PRD prevalece** para requisitos de produto.

---

## Sources of truth

1. Solicitação explícita do usuário.
2. [`docs/PRD.md`](docs/PRD.md) — produto, regras de negócio, escopo do release atual.
3. Skills em [`.agents/skills/`](.agents/skills/) — **como** executar (padrão de trabalho).
4. [`padrões/`](padrões/) — metodologia e práticas proibidas.
5. Código, testes e configurações — estado implementado.
6. [`.agents/docs/`](.agents/docs/) — convenções técnicas da stack (quando existirem).

Não invente requisitos, endpoints, permissões ou fluxos fora dessas fontes.

---

## Task-based reading

| Tarefa | Ler primeiro |
|--------|----------------|
| Qualquer tarefa | `read-standards` |
| Feature de produto | `ringpro-domain` + [`docs/PRD.md`](docs/PRD.md) |
| Implementar ticket | `implement` + [`.agents/docs/supabase.md`](.agents/docs/supabase.md) |
| Melhorias pós-MVP | [`docs/PLANO-ATUALIZACOES.md`](docs/PLANO-ATUALIZACOES.md) + `implement` |
| Decisões de produto | [`docs/decisoes/`](docs/decisoes/) — ex.: gateway pagamentos ADR-001 |
| UI / mockup | `ui-standards` + [`docs/padroes-ui.md`](docs/padroes-ui.md) |
| Modelo de negócio | [`.agents/docs/ringpro-domain.md`](.agents/docs/ringpro-domain.md) |
| Commit | `to-commit` |
| Pull request | `to-pr` |
| Review | `code-review` |
| Auditoria portal professor | [`docs/auditoria-portal-professor.md`](docs/auditoria-portal-professor.md) |
| Operação / deploy / crons | [`docs/RUNBOOK.md`](docs/RUNBOOK.md) |
| Release notes por fase | [`docs/RELEASE.md`](docs/RELEASE.md) |
| Práticas proibidas | [`padrões/03-Praticas-Proibidas.md`](padrões/03-Praticas-Proibidas.md) |

---

## Modelo de negócio (resumo)

SaaS multi-tenant para **academias de artes marciais**. Ver [`.agents/docs/ringpro-domain.md`](.agents/docs/ringpro-domain.md).

| Portal | Rota | Quem |
|--------|------|------|
| Plataforma | `/platform/*` | Dono do SaaS |
| Academia | `/academy/*` | Owner, Professor, Assistant (sem financeiro) |
| Aluno | `/student/*` | Aluno — paga e escolhe modalidades |
| Landing | `/a/{slug}` | Visitante |

**Waves:** Auth → Plataforma → Academia → Aluno → Landing → Polish

---

## Regras essenciais (RingPro)

- **1 ticket = 1 branch = 1 PR** — não misturar escopos.
- **Stack:** Supabase (Auth, PostgreSQL, RLS, Storage, Edge Functions) + React/Vite/TS/Tailwind.
- **Multi-tenant:** RLS por `academy_id` em toda tabela de negócio; service role só em Edge Functions.
- **RBAC:** ASSISTANT sem financeiro — policy RLS + 403, não só esconder menu.
- **PCI:** cartão tokenizado via gateway (**Pagar.me** — [ADR-001](docs/decisoes/001-gateway-pagamentos.md)); professor/assistant nunca coleta cartão.
- **Nomenclatura:** produto = **RingPro** — proibido KTech, Join Club, Nex/Next Club ([§10](padrões/03-Praticas-Proibidas.md)).
- **Backend-first:** regras no banco (RLS) e Edge Functions antes de confiar só na UI.
- **MVP completo:** sem telas mortas; fluxo wired de ponta a ponta.
- **Não commitar** `.env`, secrets, service role key.
- Seguir [`padrões/03-Praticas-Proibidas.md`](padrões/03-Praticas-Proibidas.md) — tolerância zero.

---

## Skills disponíveis

| Skill | Quando ler |
|-------|------------|
| [`execute-plan`](.agents/skills/execute-plan/SKILL.md) | Maratona — seguir `docs/PLANO-EXECUCAO.md` sem parar |
| [`read-standards`](.agents/skills/read-standards/SKILL.md) | **Sempre** — início de tarefa |
| [`ringpro-domain`](.agents/skills/ringpro-domain/SKILL.md) | Features de produto — personas, planos, waves |
| [`implement`](.agents/skills/implement/SKILL.md) | Antes de codar um ticket |
| [`ui-standards`](.agents/skills/ui-standards/SKILL.md) | Antes de UI ou mockup |
| [`to-commit`](.agents/skills/to-commit/SKILL.md) | Quando usuário pedir commit |
| [`to-pr`](.agents/skills/to-pr/SKILL.md) | Quando usuário pedir PR |
| [`code-review`](.agents/skills/code-review/SKILL.md) | Quando usuário pedir review |

**Não** encadear `implement → to-commit → to-pr` automaticamente — só quando o usuário pedir cada etapa.

---

## Review e arquivos gerados

- Não editar: `node_modules/`, `dist/`, `.env`, pastas geradas pelo Supabase CLI sem necessidade.
- Mockups: seguir tokens em [`mockups/_shared/base.css`](mockups/_shared/base.css).
- Critérios de review: [`padrões/templates/REVIEW.md`](padrões/templates/REVIEW.md).

---

## Validation

Comandos mínimos:

```bash
cd frontend && npm run lint && npm run typecheck && npm run test && npm run build
```

Smoke checkpoints (após mudanças em auth, matrícula, pagamentos ou academia):

```bash
cd frontend && npm run test:smoke:phase1   # UP-112
cd frontend && npm run test:smoke:phase2   # UP-210
cd frontend && npm run test:smoke:phase3   # UP-310
cd frontend && npm run test:smoke:rls      # UP-503
cd frontend && npm run test:e2e            # UP-502 Playwright
cd frontend && npm run check:practices     # UP-507 práticas proibidas
```

Documentação: [`docs/DEV-SEED.md`](docs/DEV-SEED.md) · [`docs/PLANO-ATUALIZACOES.md`](docs/PLANO-ATUALIZACOES.md).

Informe quais checks rodou e risco residual relevante.
