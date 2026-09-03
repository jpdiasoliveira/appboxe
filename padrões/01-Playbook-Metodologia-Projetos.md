# Playbook de criação de sistemas — discovery e planejamento

Guia passo a passo **genérico** para qualquer projeto de software.

**Objetivo:** antes de escrever código definitivo, o sistema deve estar mapeado, validado e com arquitetura sólida.

---

## Regra de ouro

**Não comece pelo editor de código de produção.**  
Discovery (documentação, mockups e modelo de dados) evita semanas de refatoração.

**Regra de sincronização:**  
decisão aprovada nos **mockups** → refletir no **mesmo ciclo** em schema/ER, HUs, wireflows e modelo racional.

---

## Passo 1 — Personas e contexto (o “quem”)

1. Liste todos os tipos de usuário (multi-tenant / multi-portal, se aplicável).
2. Para cada um, registre a dor principal que o sistema resolve.
3. Separe **cliente externo** × **equipe interna** × **dispositivo/sistema** (se houver).

**Entregável:** seção de personas no backlog ou documento de escopo de negócio (`docs/escopo-negocio.md`).

---

## Passo 2 — Histórias de usuário — HUs (o “quê”)

1. Agrupe por épico e, se útil, por persona.
2. Formato: `Como <persona>, quero <ação> para <benefício>.`
3. Critérios de aceite objetivos (o que prova “pronto”).
4. Priorize: `Must` / `Should` / `Could` (e fatia MVP).

**Entregável:** `docs/backlog-hus.md` (e opcional `docs/hus-por-perfil.md`).

---

## Passo 3 — Wireflows e jornadas (o caminho)

1. Descreva a jornada clique a clique (Login → … → sucesso).
2. Marque bifurcações e fluxos alternativos.
3. Aponte o mockup correspondente quando existir.

**Entregável:** `docs/wireflows.md` (ou diagramas equivalentes).

---

## Passo 4 — Prototipação visual / mockups (a validação)

1. Alta fidelidade em HTML + framework de UI + tokens do design system.
2. Mockups são a **fonte da verdade funcional** de UI.
3. Quando doc e mockup divergirem → **mockup prevalece**; registre divergência no modelo racional.
4. Mantenha **uma pasta canônica** de mockups; se houver espelho para stakeholder, atualize os dois na mesma rodada.

**Entregável:** pasta `mockups/` (ou caminho definido no README do projeto).

---

## Passo 5 — Modelo racional e permissões (o compromisso)

1. Quebre o domínio em etapas/módulos.
2. Para cada entidade/tabela: compromisso, campos-chave, quem escreve/lê, regras invioláveis.
3. Matriz de permissões por perfil (✅ / ❌ / 👁️ / ⚠️).

**Entregável:** `docs/modelo-racional-permissoes.md`.

---

## Passo 6 — Modelagem de banco (a fundação)

1. Multi-tenant (se aplicável): isolamento por `tenant_id` / `organization_id` nas tabelas de negócio.
2. Enums e constraints que garantem regras críticas no banco.
3. Schema SQL + diagrama ER (relacionamentos + painéis de campos).
4. Após decisões de produto: **atualizar ER/schema na mesma rodada da doc**.

**Entregável:** `docs/schema.sql` + `docs/diagrama-er.md` (+ PNG/PDF se necessário).

---

## Passo 7 — Documentação técnica e algoritmos

1. Stack, integrações, filas, observabilidade, segurança e compliance.
2. Onde couber, estudo de algoritmos ou decisões de arquitetura não óbvias.

**Entregável:** `docs/documentacao-tecnica.md` (+ `docs/estudo-algoritmos.md` se necessário).

---

## Passo 8 — Pacote para stakeholder

1. Montar pasta enviável: ER (SQL + imagens) + PDFs + mockups + índice (`index.html` ou `LEIA-ME.md`).
2. Arquivo zip único com nome versionado (ex.: `pacote-v1.zip`).
3. Lista curta do que mudou desde o último envio.

**Entregável:** `docs/pacote-stakeholder/` (estrutura definida no [02](./02-Ciclo-Documentacao-Mockups-ER.md)).

---

## Passo 9 — Sinal verde para código

Só depois dos passos acima aprovados (ou explicitamente adiados com registro):

| Você terá | Origem |
|---|---|
| Regras claras | Backlog / HUs |
| Telas prontas | Mockups |
| Banco estruturado | Schema + ER |
| Caminhos definidos | Wireflows |
| Permissões | Modelo racional |
| Padrões de código | [03](./03-Praticas-Proibidas.md) + [04](./04-Padroes-UI.md) |

O desenvolvimento passa a ser **tradução** de regras claras para código.

---

## Ciclo de evolução (após o primeiro envio)

```text
Decisão do stakeholder
    → Atualizar mockups (se UI mudar)
    → Atualizar HUs / wireflows / modelo
    → Atualizar schema + regenerar ER
    → Regenerar PDFs
    → Remontar pacote + lista do que mudou
```

Detalhes operacionais: [02-Ciclo-Documentacao-Mockups-ER.md](./02-Ciclo-Documentacao-Mockups-ER.md).

---

## Passo 10 em diante — desenvolvimento com código

Após o sinal verde do Passo 9:

→ **[06-Fluxo-Desenvolvimento-Codigo.md](./06-Fluxo-Desenvolvimento-Codigo.md)** — tickets, implementação, PR  
→ **[07-Setup-Repositorio-IA.md](./07-Setup-Repositorio-IA.md)** — AGENTS.md, skills, templates
