# Governança de escopo e PRs empilhadas

Complementa [06](./06-Fluxo-Desenvolvimento-Codigo.md).  
Evita “Frankenstein”: muito código aberto, fora do sprint, ou empilhado sem ordem.

---

## Regra central

> **Ticket aprovado → 1 branch → 1 PR → escopo fechado.**  
> IA acelera execução; **não** define prioridade nem amplia escopo.

Antes de abrir nova fatia ou aceitar sugestão da IA:

1. Existe ticket no tracker?
2. A fatia está no **release atual** do PRD?
3. Alguém do time (ponto focal de arquitetura) validou se é o momento?

Em dúvida → **levantar a mão** antes de codar.

---

## Persona ≠ role de login

Erro comum em SaaS multi-portal:

| Conceito | O que é | Onde vive |
|----------|---------|-----------|
| **Role de login** | Enum fixo no auth (`ADMIN`, `OPERATOR`, …) | Schema / JWT |
| **Persona de negócio** | Financeiro, Operador, Vendas — experiência e permissões | Perfil de acesso, shell UI, PRD |
| **Perfil de acesso** | Conjunto configurável de permissões por módulo | Tabela `profiles` + vínculo usuário |

**Não** criar role Prisma/JWT para cada persona de negócio se o produto prevê perfis configuráveis.

Documente no PRD e em `.agents/docs/security.md`.

---

## Controle de escopo com IA

| Faça | Não faça |
|------|----------|
| Colar ticket + PRD + mockup no contexto | Aceitar “implemente também X” sem ticket |
| Pedir **uma** skill por vez (`implement`, depois `to-pr` se pedido) | Encadear commit + PR + merge sozinho |
| Reutilizar módulo/tela referência do repo | Deixar IA criar componente novo igual ao existente |
| Registrar decisão fora do MVP no PRD ou adiar com registro | Codar “já que está fácil” |

Sugestão da IA que não está no ticket → **parar** e validar com gestão/arquitetura.

---

## PRs empilhadas (stacked)

Quando fatias dependem umas das outras (fundação → listagem → criar → editar):

```text
main
 └── feat/A-fundacao          → PR #1 (base)
      └── feat/B-listagem     → PR #2 (base = A)
           └── feat/C-criar   → PR #3 (base = B)
```

### Regras

| Regra | Detalhe |
|-------|---------|
| **1 ticket = 1 PR** | Mesmo empilhada, cada PR é uma fatia reviewável |
| **Ordem de merge** | Base primeiro (#1 → #2 → #3) |
| **Rebase em cascata** | Ao corrigir #1, rebase #2 sobre #1, #3 sobre #2, … |
| **Push** | `#1` push normal; filhas com `--force-with-lease` após rebase |
| **CI** | Cada PR deve ficar verde na **ponta** da sua branch |
| **Não mergear** | Filha antes da base — exceto política explícita do time |

### Comandos típicos

```bash
# Corrigiu a base
git checkout feat/B-listagem
git rebase feat/A-fundacao
git push --force-with-lease origin feat/B-listagem

# Lease explícito se remote-tracking estiver desatualizado
git ls-remote origin refs/heads/feat/B-listagem
git push --force-with-lease=feat/B-listagem:<sha-remoto> origin feat/B-listagem
```

### Tracker local (opcional)

Para muitas PRs abertas, mantenha `docs/pr-correction-tracker.md` **no workspace** (não precisa ir pro git):

- lista PR → branch → HEAD
- checklist de review / CI
- bloqueios (conflito entre autores, merge proibido)

---

## Sincronização com pontos focais

| Momento | Quem |
|---------|------|
| Nova feature / módulo | Arquitetura (definiu padrões do repo) |
| Dúvida UI / componente | Quem mantém design system |
| Prioridade do sprint | Gestão / PO |
| Conflito de schema entre devs | Time + donos das branches |

**Não** acumular dezenas de PRs “quase prontas” sem review humano — CI verde ≠ aprovado.

---

## Review e merge

| Estado | Significado |
|--------|-------------|
| CI verde | Técnico ok |
| `CHANGES_REQUESTED` | Precisa correção ou re-review após push novo |
| `APPROVED` | Pode mergear **se** política do time permitir |
| Merge bloqueado | Decisão de gestão — respeitar até liberar |

Após push de correções: pedir **re-review** explícito (comentário na PR ou @reviewer).

---

## Conflitos entre features paralelas

Dois devs (ou duas linhas de PR) tocando a mesma tabela/módulo:

1. **Não** mergear branch de PR aberta de outro — esperar cair na estável
2. Decidir qual fundação prevalece **antes** de mergear qualquer uma
3. Documentar decisão no tracker ou ADR curto

---

## Checklist — antes de abrir mais uma PR

- [ ] Ticket existe e está no escopo do PRD atual
- [ ] Branch deriva da base correta (main ou PR anterior da stack)
- [ ] Módulo referência consultado — sem duplicar padrão existente
- [ ] Checks locais = CI
- [ ] Uma fatia por PR — sem “já incluí o próximo ticket”
- [ ] Pontos focais consultados se houve dúvida de escopo ou arquitetura

---

## Relação com outros documentos

| Tema | Documento |
|------|-----------|
| Fluxo ticket → implement | [06](./06-Fluxo-Desenvolvimento-Codigo.md) |
| Setup AGENTS/skills | [07](./07-Setup-Repositorio-IA.md) |
| Teardown e2e | [08](./08-Padroes-Testes-E2E.md) |
| Qualidade de código | [03](./03-Praticas-Proibidas.md) |
