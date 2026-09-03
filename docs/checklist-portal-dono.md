# Checklist — Portal Dono da Academia (RingPro)

**Versão:** 1.1  
**Data:** 02/09/2026  
**Persona:** `SCHOOL_OWNER` · portal `/academy/*`  
**Objetivo:** melhorias pós-MVP do dono — **um item por vez** (1 branch / 1 PR quando for código).

**Relacionado:** [`PRD.md`](./PRD.md) · [`PLANO-ATUALIZACOES.md`](./PLANO-ATUALIZACOES.md) · [`auditoria-portal-professor.md`](./auditoria-portal-professor.md) · [`DEV-SEED.md`](./DEV-SEED.md)

---

## Como usar

1. Escolha o **próximo item desmarcado** (ordem sugerida abaixo).
2. Leia a skill `implement` + [`supabase.md`](../.agents/docs/supabase.md) se tiver banco/auth.
3. Implemente o escopo **só daquele item**.
4. Marque `[x]` aqui quando estiver em produção/dev validado.
5. **Não** misturar escopos no mesmo PR.

**Login de teste:** `owner@academia-teste.dev` · senha `RingPro@dev123` · slug `academia-teste`

**Validação mínima por item:** `npm run typecheck` · `npm run lint` · smoke manual no portal dono (e professor se o item afetar RBAC).

---

## Estado atual (MVP dono — já entregue)

O dono já tem superset do professor + gestão:

- [x] Dashboard, Agenda, Alunos, Categorias, Presença, Relatório presença
- [x] Professores, Planos, Financeiro, Configurações
- [x] Landing editável (seções, visibilidade, galeria, faixa inferior, modal `#matricula`)
- [x] Leads, Notificações
- [x] Convite de equipe (professor / sub-professor)
- [x] Convite de aluno — submenu **Alunos → Convites** + atalho na lista
- [x] Upload logo e fotos (Supabase Storage) — UP-OWN-04
- [x] Submenus sidebar: Presença, Site & leads, Alunos (UP-OWN-01…03)
- [x] Layouts 60/40: Professores, Configurações, editor Landing
- [x] Professor/assistant também geram **link de matrícula** no modal Novo aluno (lista de pendentes continua dono-only)

---

## Fila de trabalho (fazer nesta ordem)

### P0 — Navegação (menu mais curto no mobile)

| # | Item | Status |
|---|------|--------|
| 1 | [UP-OWN-01](#up-own-01--submenu-presença) Submenu Presença | ✅ |
| 2 | [UP-OWN-02](#up-own-02--submenu-site--leads) Submenu Site & Leads | ✅ |
| 3 | [UP-OWN-03](#up-own-03--convites-dentro-de-alunos) Convites dentro de Alunos | ✅ |

### P1 — Dia a dia do dono

| # | Item | Status |
|---|------|--------|
| 4 | [UP-OWN-04](#up-own-04--upload-logo-e-fotos-storage) Upload logo e fotos (Storage) | ✅ |
| 5 | [UP-309](../PLANO-ATUALIZACOES.md) Lead → aluno em 1 clique | ✅ |
| 6 | [UP-307](../PLANO-ATUALIZACOES.md) Filtro avançado alunos | ✅ |
| 7 | [UP-OWN-07](#up-own-07--export-csv-relatório-presença) Export CSV relatório presença | ✅ |

### P2 — Polish e onboarding

| # | Item | Status |
|---|------|--------|
| 8 | [UP-401](../PLANO-ATUALIZACOES.md) Wizard onboarding nova academia | ✅ |
| 9 | [UP-308](../PLANO-ATUALIZACOES.md) Edição em lote status aluno | ✅ |
| 10 | [UP-OWN-10](#up-own-10--e-mail-transacional-convites) E-mail transacional convites | ✅ |

### Fora deste ciclo (V2+ — só registrar)

| Item | Referência |
|------|------------|
| Multi-unidade / filiais | UP-405 ✅ |
| Subdomínio landing | UP-406 ✅ (ADR + helper) |
| Cadastro público aluno na landing | UP-407 ✅ |
| Termo PDF no convite | PLANO-ATUALIZACOES § convites |

---

## Detalhe dos itens

### UP-OWN-01 — Submenu Presença

- [x] Agrupar no menu:
  - **Presença** (pai)
    - Chamada → `/academy/presenca`
    - Relatório → `/academy/relatorios/presenca`
- [x] Sidebar com suporte a `children` em `NavItem` (`Sidebar.tsx`, `nav-config.tsx`)
- [x] Grupo expande/colapsa; item filho ativo destaca o pai
- [x] Funciona com sidebar colapsada (tooltip) e drawer mobile

**Done quando:** professor e dono veem um único grupo “Presença” em vez de dois itens soltos.

---

### UP-OWN-02 — Submenu Site & Leads

- [x] Agrupar (somente `SCHOOL_OWNER` + flag `module_landing`):
  - **Site & leads** (pai)
    - Landing → `/academy/landing`
    - Leads → `/academy/leads`
- [x] Professor/assistant **não** veem o grupo

**Done quando:** dono vê 2 itens de marketing dentro de 1 grupo; landing e leads continuam acessíveis por URL.

---

### UP-OWN-03 — Convites dentro de Alunos

- [x] Adicionar filho em **Alunos** (somente dono):
  - Lista → `/academy/alunos` (rota atual da lista)
  - Convites → `/academy/alunos/convites`
- [x] Manter botão na lista de alunos como atalho (opcional)
- [x] `AcademyOwnerGuard` / `OWNER_ONLY_ROUTES` inalterados

**Done quando:** dono acha convites de aluno pelo menu sem entrar só pela lista.

---

### UP-OWN-04 — Upload logo e fotos (Storage)

- [x] Buckets Supabase `academy-logos` e `landing-assets` com RLS por `academy_id` (owner escreve; público lê)
- [x] Configurações: upload **logo** da academia
- [x] Editor landing: upload para capa, sobre, galeria e faixa inferior (substituir ou complementar campo URL)
- [x] Landing pública usa URL do Storage

**Referência cruzada:** UP-402 em [`PLANO-ATUALIZACOES.md`](./PLANO-ATUALIZACOES.md)

**Done quando:** dono sobe imagem pelo sistema sem colar link externo.

---

### UP-309 — Lead → aluno em 1 clique

Ver spec completa em [`PLANO-ATUALIZACOES.md` § UP-309](./PLANO-ATUALIZACOES.md).

- [x] Botão **Converter em aluno** na lista/detalhe de lead
- [x] Chama fluxo de convite (`create-student-invite`) ou cadastro direto conforme PRD
- [x] Atualiza status do lead (ex.: `CONVITE_ENVIADO` → `CONVERTIDO` ao completar convite)
- [x] Owner-only (RLS + UI)

**Done quando:** lead da landing vira convite/cadastro sem copiar dados manualmente.

---

### UP-307 — Filtro avançado alunos

Ver spec em [`PLANO-ATUALIZACOES.md` § UP-307](./PLANO-ATUALIZACOES.md).

- [x] `FilterDrawer` (padrão UI: Limpar / Aplicar)
- [x] Filtros: status, plano, categoria, inadimplente
- [x] Dono vê todos os alunos; professor mantém escopo por modalidade (RLS)

**Done quando:** dono filtra lista sem perder paginação.

---

### UP-OWN-07 — Export CSV relatório presença

- [x] Botão **Exportar CSV** em `/academy/relatorios/presenca`
- [x] Exporta o conjunto filtrado (período, turma, faltas consecutivas)
- [x] Owner e professor (escopo RLS do relatório)

**Done quando:** arquivo CSV baixa com colunas legíveis (nome aluno, turma, datas, %).

---

### UP-401 — Wizard onboarding nova academia

Ver spec em [`PLANO-ATUALIZACOES.md` § UP-401](./PLANO-ATUALIZACOES.md).

- [x] Rota `/academy/onboarding` após primeiro login do owner
- [x] Passos: logo, categorias, plano, publicar landing
- [x] Flag `onboarding_completed` em `academies.settings`
- [x] Redireciona para dashboard ao concluir

**Done quando:** academia nova não cai em dashboard vazio sem orientação.

---

### UP-308 — Edição em lote status aluno

Ver spec em [`PLANO-ATUALIZACOES.md` § UP-308](./PLANO-ATUALIZACOES.md).

- [x] Seleção múltipla na lista de alunos
- [x] Ação **Marcar inativo** (owner)
- [x] Confirmação modal; RLS owner

**Done quando:** dono inativa vários alunos de uma vez.

---

### UP-OWN-10 — E-mail transacional convites

- [x] Edge Function envia e-mail ao gerar convite de aluno e de equipe (Resend ou stub dev)
- [x] Template com nome da academia e link
- [x] Respeitar flag `module_notifications_email`
- [x] UI: feedback “e-mail enviado” vs “copie o link” (convites aluno e equipe)

**Done quando:** owner gera convite e aluno/professor recebe e-mail em ambiente com API key configurada.

---

## Mapa do menu alvo (após P0)

```text
Dashboard
Agenda
Alunos
  ├ Lista
  └ Convites          (dono)
Categorias
Presença
  ├ Chamada
  └ Relatório
Planos                (dono)
Financeiro            (dono)
Site & leads          (dono)
  ├ Landing
  └ Leads
Professores           (dono)
Configurações         (dono)
Notificações
```

---

## Registro de progresso

| Data | Item | Observação |
|------|------|------------|
| 02/09/2026 | UP-OWN-01 a 03 | Submenus Sidebar + nav academia |
| 02/09/2026 | UP-OWN-04 | Storage `academy-logos` + `landing-assets`; `ImageUploadField` |
| 02/09/2026 | Convite professor | `canCreateStudentInvite`; RLS `invites_staff`; PRD v1.6 |
| 02/09/2026 | Schema remoto | **40 tabelas** RingPro; DROP POS; Fase 4 + UP-301/311/312/313 — [`schema-snapshot.md`](./schema-snapshot.md) |

---

## Notas

- **Dono = superset:** qualquer item que mude menu ou RLS deve ser testado também como `PROFESSOR` e `ASSISTANT` (sem vazar financeiro).
- **Convite aluno:** professor e assistant **geram link** no Novo aluno; **gerenciar pendentes** (`/academy/alunos/convites`) é só dono.
- **Feature flags:** respeitar `module_landing`, `module_attendance`, `module_finance` ao montar o menu.
- Itens `UP-3XX` / `UP-4XX` já descritos no [`PLANO-ATUALIZACOES.md`](./PLANO-ATUALIZACOES.md) — este checklist é a **fila operacional do dono**; não duplicar spec técnica lá dentro.
