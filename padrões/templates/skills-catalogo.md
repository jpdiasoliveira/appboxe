# Catálogo de skills — referência

Skills **não** ficam nesta pasta `padrões/` — cada repositório mantém as suas em `.agents/skills/`.  
Ao criar repo novo, **copie** de um repo referência e adapte.

Metodologia completa: [07-Setup-Repositorio-IA.md](../07-Setup-Repositorio-IA.md).

---

## Skills de documentação (repo de docs ou monorepo)

| Skill | Entrada típica | Saída | Precisa Approve? |
|-------|----------------|-------|------------------|
| `to-us` | Necessidade + `@PRD.md` | `users-stories/US-NNN-slug.md` | Sim, antes de push |
| `to-spec` | US + módulo | Feature no tracker | Sim, antes de criar |
| `to-tickets` | Feature criada | Subtickets BACK/FRONT | Sim, antes de criar |

---

## Skills de código (API e frontend)

| Skill | Entrada | Faz | Não faz |
|-------|---------|-----|---------|
| `implement` | 1 ticket aprovado | Código + testes na branch do ticket | commit, push, PR, merge |
| `to-commit` | Diff pronto | Commit(s) atômicos | push |
| `to-pr` | Branch pronta | Push + abrir PR | merge |
| `to-tickets` | Feature | Quebra em subtickets | implementar |
| `code-review` | Branch ou diff | Relatório de review | alterar código |

---

## Skills de stack (opcional)

| Stack | Skill | Quando |
|-------|-------|--------|
| NestJS API | `nestjs-best-practices` | Dúvida de DI, guards, módulos, e2e |
| React + shadcn | `shadcn` | Adicionar/estilizar componentes UI |

---

## Ordem recomendada (humano no controle)

```text
/to-us → Approve → push
/to-spec → Approve → Feature no tracker
/to-tickets → Approve → subtickets
/implement → (usuário pede) → código na branch
/to-commit → (usuário pede) → commit
/to-pr → (usuário pede) → PR
code-review → (usuário pede) → feedback
Review humano + CI → merge (se política permitir)
```

**Nunca** pular Approve nas etapas de documentação.  
**Nunca** rodar `implement` sem ticket rastreável.

---

## Onde copiar skills iniciais

Ao bootstrap de um produto novo, copie `.agents/skills/` de um repo maduro do mesmo stack e ajuste:

- paths de módulo referência no `implement/SKILL.md`
- comandos de validation no `to-pr/SKILL.md`
- links para `AGENTS.md` e `.agents/docs/`
