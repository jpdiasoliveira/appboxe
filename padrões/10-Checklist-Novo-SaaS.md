# Checklist — novo SaaS (dia 1)

Uma página para bootstrap de produto novo. Marque na ordem; não pule discovery se o escopo ainda for nebuloso.

**Tempo estimado:** 1–3 dias (discovery mínimo) antes do primeiro commit de produção.

---

## Fase A — Negócio e escopo (sem código)

- [ ] Preencher [05-Template-Escopo-Negocio.md](./05-Template-Escopo-Negocio.md) → salvar como `docs/escopo-negocio.md` no repo
- [ ] Personas e dores principais definidas ([01](./01-Playbook-Metodologia-Projetos.md) passo 1)
- [ ] MVP explícito: **inclui** / **não inclui** (sem “depois a gente vê”)
- [ ] `PRD.md` só com escopo do **release atual** — sem módulos futuros misturados
- [ ] Mockup ou wireflow da jornada crítica (login → ação principal → sucesso)
- [ ] Stakeholder deu sinal verde ou adiou item com registro escrito

---

## Fase B — Repositórios e dados

- [ ] Decidir: monorepo vs API + frontend separados ([06](./06-Fluxo-Desenvolvimento-Codigo.md) passo 10)
- [ ] Repo(s) criados com README de setup (env, portas, comandos)
- [ ] Schema inicial + diagrama ER ([01](./01-Playbook-Metodologia-Projetos.md) passo 6)
- [ ] Multi-tenant definido (sim/não; campo `tenant_id` / `organization_id`)
- [ ] Issue tracker configurado (Plane, Jira, Linear, …)
- [ ] `docs/agents/issue-tracker.md` preenchido ([template](./templates/issue-tracker.template.md))

---

## Fase C — IA e padrões de código

- [ ] `AGENTS.md` na raiz ([template](./templates/AGENTS.md.template.md))
- [ ] `.agents/docs/` com pelo menos: `architecture`, `patterns`, `testing`, `security`
- [ ] Skills copiadas: `implement`, `to-commit`, `to-pr`, `code-review` ([catálogo](./templates/skills-catalogo.md))
- [ ] Módulo/tela **referência** escolhido (“copiar estrutura de X para domínios novos”)
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` e `REVIEW.md` ([templates](./templates/))
- [ ] CI mínimo = mesmos comandos do `AGENTS.md` (lint, typecheck, test)
- [ ] Pre-commit (husky/lint-staged) alinhado ao CI

---

## Fase D — Primeiro ticket

- [ ] User story versionada (`/to-us` + Approve) ou HU no backlog aprovada
- [ ] Feature + subtickets no tracker (`/to-spec` → `/to-tickets` + Approve)
- [ ] **1 ticket** implementado com skill `implement` — branch `feat/<id>-<slug>`
- [ ] Testes (unit + e2e se tocar HTTP/auth/banco) — [08](./08-Padroes-Testes-E2E.md)
- [ ] PR aberta; ticket em “Em revisão” com link
- [ ] Review humano + CI verde antes de merge

---

## Fase E — Time e governança

- [ ] Pontos focais definidos: arquitetura, UI/DS, gestão de escopo
- [ ] Regra comunicada: IA não amplia escopo; dúvida → alinhar antes de codar ([09](./09-Governanca-Escopo-e-PRs-Empilhadas.md))
- [ ] Personas de negócio ≠ roles de login documentado no PRD/security
- [ ] Política de merge e branch base acordada (`main` vs `develop`)

---

## Sinais de alerta (pare e alinhe)

| Sinal | Ação |
|-------|------|
| Mais de 5 PRs abertas sem review | Parar novas fatias; pedir review em lote |
| Ticket sem mockup/PRD | Não implementar |
| Componente novo igual a um existente | Reutilizar; revisar com arquitetura |
| Duas fundações no mesmo domínio (schema) | Decidir qual prevalece antes de merge |
| CI verde mas `CHANGES_REQUESTED` antigo | Pedir re-review após push |

---

## Mapa rápido dos documentos

| Momento | Ler |
|---------|-----|
| Início do produto | 01, 02, 05 |
| Criar repos | 07, templates |
| Codar | 06, 03, 08 |
| Muitas PRs / escopo | 09, 11 |
| UI | 04 |

---

## Próximo passo após este checklist

Primeira entrega mergeada na branch estável → repetir **Fase D** por ticket, sempre **1 PR = 1 ticket**, até fechar o MVP do PRD.
