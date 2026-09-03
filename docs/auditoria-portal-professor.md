# Auditoria & Plano de Implementação — Portal Academia · PROFESSOR

**Versão:** 2.3  
**Data:** 02/09/2026  
**Status:** auditoria professor **concluída em código** (v2.3) — validação: smoke script + roteiro manual §9

---

## 0. Para que serve este documento

Este arquivo é a **fonte única** para o portal do professor. Use-o em três momentos:

| Momento | Seção |
|---------|--------|
| Validar se está no padrão | §4 Checklist por módulo |
| Decidir **se** dá para fazer | §5 Gaps consolidados (com severidade) |
| Saber **como** encaixar no código e no banco | §6 Princípios + §7 Fichas de implementação |

**Regra de ouro:** regra de negócio e escopo **no banco (RLS/RPC)** → API fina → UI só reflete permissões. Nunca duplicar escopo só no React.

**Usuário de teste:** `professor@academia-teste.dev` · `RingPro@dev123` · academia `academia-teste`.

**Referências:** [`PRD.md`](./PRD.md) §8.3.1 · [`modelo-racional-permissoes.md`](./modelo-racional-permissoes.md) · `20260831320000_professor_scope_rls.sql`.

---

## 1. Decisão de produto (fonte da verdade)

| Conceito | Regra |
|----------|--------|
| **Professor puro** | `PROFESSOR` **sem** `SCHOOL_OWNER` na mesma academia |
| **Escopo** | Modalidades em `instructor_training_categories` |
| **Financeiro** | **Bloqueado** — rotas owner, KPI receita, faturas, planos |
| **Inadimplência** | Badge/contagem operacional — **sem** valores ou baixa de pagamento |
| **Dono que dá aula** | `SCHOOL_OWNER` → visão completa; **não** usa escopo restrito |
| **Sub-professor** | `ASSISTANT` → todos os alunos da academia; sem financeiro; edição limitada na UI |
| **Status experimental** | Enum interno `TRIAL` · UI **Experimental** · config pelo dono (UP-303) |

---

## 2. Arquitetura em camadas (como encaixar sem bagunça)

```text
┌─────────────────────────────────────────────────────────────┐
│  UI (React)                                                  │
│  academy-permissions.ts · useAcademyContext · guards         │
│  → esconde menu/rota; NÃO é barreira de segurança            │
├─────────────────────────────────────────────────────────────┤
│  API (academy-api.ts · schedule-api.ts)                      │
│  → queries Supabase; sem reimplementar escopo em JS          │
├─────────────────────────────────────────────────────────────┤
│  RLS + RPC (PostgreSQL)                                      │
│  is_scoped_professor · student_in_instructor_scope           │
│  → barreira real; professor não vê linha fora do escopo      │
├─────────────────────────────────────────────────────────────┤
│  Edge Functions (service role)                               │
│  create-student · create-student-invite · complete-invite    │
│  → validar papel antes de bypass RLS                         │
└─────────────────────────────────────────────────────────────┘
```

### Onde colocar cada tipo de mudança

| Tipo de mudança | Onde | Exemplo |
|-----------------|------|---------|
| Escopo de leitura/escrita | **Migration** RLS ou RPC | Filtrar KPI por modalidade |
| Regra que envolve secret/service role | **Edge Function** | Convite de aluno |
| Label amigável, layout, feedback | **Frontend** | `formatStudentStatus()` |
| Permissão de rota/menu | **`academy-permissions.ts`** + `AcademyOwnerGuard` | Bloquear `/financeiro` |
| Constante de negócio compartilhada | **`frontend/src/lib/`** | Status operacionais na chamada |

### Anti-padrões (não fazer)

- Filtrar alunos por modalidade **só** no `.filter()` do React quando RLS já deveria aplicar.
- Criar segunda tabela de “professor_alunos” — usar `student_categories` + `instructor_training_categories`.
- Colocar lógica de trial/experimental só no onboarding — centralizar em config da academia + `students.status` / `trial_ends_at`.
- Misturar tickets: 1 passo = 1 migration + 1 fatia de feature (ver [`PLANO-ATUALIZACOES.md`](./PLANO-ATUALIZACOES.md)).

---

## 3. Modelo de dados do escopo professor

```text
academies
  └── training_categories (modalidades)
        └── instructor_training_categories
              └── user_id (= professor)
        └── student_categories
              └── student_id → students

Escopo de um professor P:
  Categorias(P) = instructor_training_categories WHERE user_id = auth.uid()
  Alunos(P)     = students WHERE
                    ∃ student_categories em Categorias(P)
                  (aluno sem modalidade → só owner/assistant — UP-321)
```

**Funções SQL (já existem):**

| Função | Arquivo |
|--------|---------|
| `is_scoped_professor(academy_id)` | `20260831320000_professor_scope_rls.sql` |
| `instructor_category_ids(academy_id)` | idem |
| `student_in_instructor_scope(student_id, academy_id)` | idem |
| `can_view_academy_finance(academy_id)` | idem — só owner |
| `get_academy_dashboard_charts(academy_id)` | idem — já filtra professor |
| `get_academy_category_overview(academy_id)` | idem — já filtra professor |

**Regra UP-321 (opção A — implementada):** professor só vê aluno com **ao menos uma** modalidade em comum. Aluno sem `student_categories` fica visível só para owner/assistant. No cadastro, professor **deve** escolher modalidade (`NewStudentForm`).

---

## 4. Mapa de acesso

### 4.1 Rotas permitidas (professor puro)

| Rota | Componente | Flag | Guard |
|------|------------|------|-------|
| `/academy/dashboard` | `AcademyDashboardPage` | — | `RoleRoute` |
| `/academy/alunos` | `StudentsListPage` | — | `RoleRoute` |
| `/academy/alunos/novo` | `NewStudentPage` | — | `RoleRoute` |
| `/academy/alunos/:id` | `StudentDetailPage` | — | `RoleRoute` |
| `/academy/categorias` | `CategoriesPage` | — | `RoleRoute` |
| `/academy/presenca` | `AttendancePage` | `module_attendance` | `RoleRoute` |
| `/academy/relatorios/presenca` | `AttendanceReportPage` | `module_attendance` | `RoleRoute` |
| `/academy/agenda` | `AcademySchedulePage` | `module_class_schedule` | `RoleRoute` |
| `/academy/notificacoes` | `AcademyNotificationsPage` | — | `RoleRoute` |

### 4.2 Rotas bloqueadas (owner only)

`AcademyOwnerGuard` + `OWNER_ONLY_ROUTES` em `academy-permissions.ts`:

`professores` · `planos` · `financeiro` · `configuracoes` · `landing` · `leads` · `alunos/convites`

### 4.3 Menu (`nav-config.tsx` → `getAcademyNav`)

Professor vê: Dashboard, Alunos, Categorias, Presença*, Relatório presença*, Agenda*, Notificações.  
\* se feature flag `module_attendance` / `module_class_schedule` ativa.

---

## 5. Estado verificado no código (02/09/2026)

Legenda checklist: ✅ · ⚠️ · ❌ · ⬜

### 5.1 O que **já funciona** (não reimplementar)

| Área | Mecanismo | Evidência |
|------|-----------|-----------|
| Lista de alunos escopada | RLS `students_professor_select` | `fetchStudents` → query simples; RLS filtra |
| KPIs alunos ativos / inadimplentes | Mesmo RLS em `count` head | `fetchAcademyKpis` L27-37 |
| Presenças hoje | RLS `attendance_professor` | `fetchAcademyKpis` L52-57 |
| Gráfico matrículas / inadimplência % | RPC com `v_scoped_professor` | `professor_scope_rls` L423-480 |
| Categorias overview | RPC `get_academy_category_overview` | Filtra `instructor_category_ids` |
| Categorias no select (presença/agenda) | RLS `categories_professor_read` | `fetchCategories` |
| Agenda CRUD no escopo | Policies `*_professor` | `schedule-api.ts` |
| Bloqueio financeiro UI | `canAccessFinanceiro` só owner | `auth-utils.ts` |
| Cadastro aluno pelo professor | Edge `create-student` + `students_professor_insert` | `STAFF_ROLES` inclui PROFESSOR |
| Plano de aula | `lesson_plan` migration | `ClassSessionPlanModal` |

### 5.2 Gaps consolidados

| ID | Gap | Sev. | Camada | Ticket |
|----|-----|------|--------|--------|
| G-P1 | ~~`NewStudentForm` mostra “Link de matrícula” ao professor → **403**~~ | — | — | **Revertido** — PRD v1.5: professor gera link; RLS `invites_staff` |
| G-P2 | Empty state alunos genérico para professor sem vínculo | P2 | UI | UP-323 ✅ |
| G-P3 | `FeedbackMessage` não padronizado em várias telas academy | P2 | UI | UP-317 ✅ |
| G-P4 | Aluno sem modalidade visível para todos os professores | P2 | DB/regra | UP-321 ✅ |
| G-P5 | Chamada só busca alunos `ATIVO` — falta `TRIAL`/Experimental | P2 | API/UI | UP-319 ✅ |
| G-P6 | Status `TRIAL` cru na UI | P2 | UI/lib | UP-318 ✅ |
| G-P7 | Filtro alunos sem opção Experimental | P3 | UI | UP-318 ✅ |
| G-P8 | `categories_student_read` no remoto | P0 | DB | migration `20260831390000` ✅ com `db push` |
| G-P9 | Trial/experimental configurável pelo dono | P2 | DB+UI | UP-303 ✅ |
| G-P10 | Notificações stub | P3 | Feature | UP-099 ✅ |
| G-P11 | Mockup dashboard professor | P3 | Design | UP-320 ✅ |
| G-P12 | `StudentDetailPage` 403 — UX ao abrir aluno fora do escopo | P2 | UI | UP-324 |

---

## 6. Checklist por módulo (validação)

Marque `[x]` ao testar com `professor@academia-teste.dev`.

### ACAD-P1 — Dashboard

| # | Critério | Status | Notas |
|---|----------|--------|-------|
| P1.1 | Sem KPI receita | ✅ | `showFinance` false |
| P1.2 | KPI inadimplentes | ✅ | RLS escopa count |
| P1.3 | KPI alunos ativos escopado | ✅ | RLS escopa count |
| P1.4 | Gráfico sem receita | ✅ | RPC + `showFinance={false}` |
| P1.5 | Aniversários escopados | ✅ | `fetchStudentBirthdays` + RLS students |
| P1.6 | Calendário aulas escopado | ✅ | RLS `class_sessions_professor` |
| P1.7 | Texto contextual professor | ✅ | |
| P1.8 | `FeedbackMessage` em erro | ✅ | UP-317 |
| P1.10 | Status badge amigável | ✅ | UP-318 |

### ACAD-P2 — Alunos lista

| # | Critério | Status | Notas |
|---|----------|--------|-------|
| P2.1 | RLS escopo | ✅ | |
| P2.2 | Empty state professor | ✅ | UP-323 |
| P2.3 | Mobile `ResponsiveDataList` | ✅ | |
| P2.4 | `RowActionsMenu` | ✅ | |
| P2.5–P2.6 | Editar / inativar | ✅ | |
| P2.7 | Badge status amigável | ✅ | UP-318 |
| P2.9 | `FeedbackMessage` | ✅ | UP-317 |

### ACAD-P3 — Aluno detalhe

| # | Critério | Status | Notas |
|---|----------|--------|-------|
| P3.1 | Sem aba faturas | ✅ | |
| P3.2 | Edição no escopo | ✅ | |
| P3.5 | Feedback salvar | ✅ | |
| P3.6 | Erro amigável fora do escopo | ✅ | UP-324 |

### ACAD-P4 — Novo aluno

| # | Critério | Status | Notas |
|---|----------|--------|-------|
| P4.1 | Professor cria via `create-student` | ✅ | |
| P4.2 | Link convite para professor | ✅ | PRD v1.5 — `canCreateStudentInvite` |
| P4.3 | Status inicial por política experimental | ✅ | UP-303 |
| P4.4 | `FeedbackMessage` no form | ✅ | UP-317 |

### ACAD-P5 — Categorias

| # | Critério | Status | Notas |
|---|----------|--------|-------|
| P5.1–P5.5 | Leitura escopada, sem CRUD | ✅ | |
| P5.6 | Métricas RPC escopadas | ✅ | |
| P5.7 | `FeedbackMessage` | ✅ | UP-317 |

### ACAD-P6 — Presença

| # | Critério | Status | Notas |
|---|----------|--------|-------|
| P6.1–P6.3 | Flag, RLS, categorias | ✅ | |
| P6.4 | Alunos experimental na chamada | ✅ | UP-319 |
| P6.5 | `FeedbackMessage` | ✅ | |

### ACAD-P7 — Agenda

| # | Critério | Status | Notas |
|---|----------|--------|-------|
| P7.1–P7.5 | Flags, RLS, plano aula, feedback | ✅ | |
| P7.6 | Categorias filtradas | ✅ | RLS |

### ACAD-P8 — Notificações

| # | Critério | Status | Notas |
|---|----------|--------|-------|
| P8.1 | Menu | ✅ | |
| P8.2 | Funcional | ✅ | UP-099 |

### ACAD-P9 — Relatório presença (UP-304)

| # | Critério | Status | Notas |
|---|----------|--------|-------|
| P9.1 | Rota `/academy/relatorios/presenca` | ✅ | `AttendanceReportPage` |
| P9.2 | % frequência por turma | ✅ | `computeCategoryStats` |
| P9.3 | Faltas consecutivas por aluno/turma | ✅ | `computeConsecutiveAbsences` |
| P9.4 | Filtros período / turma / mínimo faltas | ✅ | |
| P9.5 | Escopo RLS (professor só suas turmas) | ✅ | policies `attendance_*` |
| P9.6 | ASSISTANT pode ver | ✅ | `attendance_owner_assistant` |
| P9.7 | Sem financeiro | ✅ | só `attendance_records` |
| P9.8 | Menu + atalho dashboard | ✅ | `nav-config` + `DashboardQuickLinks` |

---

## 7. Ordem de execução (histórico)

**Fases A–D — concluídas no código (02/09/2026):**

```text
Fase A — Fundação
  UP-318  formatStudentStatus() + filtros                    ✅
  UP-317  FeedbackMessage nas páginas academy                ✅

Fase B — Correções professor
  UP-322  Link convite — professor/assistant (PRD v1.5)         ✅
  UP-323  Empty states professor                             ✅
  UP-319  Presença: status operacionais (ATIVO + TRIAL)      ✅
  UP-324  Erro amigável detalhe aluno                        ✅

Fase C — Banco
  UP-321  Escopo aluno exige modalidade compartilhada        ✅ (migration local)
  UP-303  Config experimental + trial_ends_at                ✅ (migration local)

Fase D — Polish professor
  UP-099  Notificações in-app (página lista)                 ✅
  UP-320  Mockup dashboard professor                         ✅
  UP-304  Relatório presença                                 ✅
  UP-316  KPIs — verificação RLS documentada (§9.2)          ✅ doc
```

**Pendente operacional (não é código):**

```text
P0  Aplicar migrations no remoto (§9.0)
    Deploy edge functions create-student + complete-student-invite (UP-303)
P1  Executar roteiro de teste manual §9.1–9.5
P3  UP-316 RPC única get_academy_dashboard_kpis (opcional)
Futuro  Cron expiração experimental · UP-304 export CSV · filtros avançados alunos
```

---

## 8. Fichas de implementação

### UP-318 — Labels de status aluno (`formatStudentStatus`)

**Problema:** enum `TRIAL` aparece cru em badges e selects.

**Decisão:** manter enum no banco; traduzir só na UI.

**Arquivos:**

```text
frontend/src/lib/student-status.ts          ← CRIAR
frontend/src/lib/student-status.test.ts     ← CRIAR (opcional, 2 casos)
```

**Implementação:**

```ts
// student-status.ts
export const STUDENT_STATUS_LABELS = {
  ATIVO: 'Ativo',
  INADIMPLENTE: 'Inadimplente',
  INATIVO: 'Inativo',
  TRIAL: 'Experimental',
} as const

export function formatStudentStatus(status: string): string {
  return STUDENT_STATUS_LABELS[status as keyof typeof STUDENT_STATUS_LABELS] ?? status
}

export const STUDENT_ATTENDANCE_STATUSES = ['ATIVO', 'TRIAL'] as const
```

**Substituir em:** `StudentsListPage`, `StudentDetailPage`, `DashboardUpcomingBirthdays`, `DashboardDayPanel`, `CategoryCard`, `StudentDashboardPage`, `StudentEditForm` (select options).

**Critério de done:** nenhum badge visível ao usuário mostra `TRIAL`.

---

### UP-317 — `FeedbackMessage` no portal Academia

**Problema:** mensagens de sucesso/erro inconsistentes (`<p>` cinza ou vermelho solto).

**Decisão:** usar `components/ui/FeedbackMessage.tsx` (já existe).

**Arquivos a alterar (prioridade professor):**

| Arquivo | Variantes |
|---------|-----------|
| `AcademyDashboardPage.tsx` | error |
| `StudentsListPage.tsx` | error |
| `CategoriesPage.tsx` | error |
| `NewStudentForm.tsx` | success + error (form + convite) |
| `StudentEditModal.tsx` | error |

**Padrão:**

```tsx
{error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}
```

**Critério de done:** telas do professor sem `<p className="text-[var(--color-danger)]">` para feedback de ação.

---

### UP-322 — Link de matrícula para professor

**Estado atual (PRD v1.5):** professor e assistant **podem** gerar link no modal Novo aluno (`canCreateStudentInvite`). Gerenciar convites pendentes (`/academy/alunos/convites`) permanece **owner-only**.

**Histórico:** em 2026-08 o link foi ocultado (403 com policy `invites_owner`); revertido com migration `20260831440000_student_invites_staff.sql`.

**Arquivos:**

```text
frontend/src/features/academy/components/NewStudentForm.tsx
```

**Implementação:**

```tsx
import { canCreateStudentInvite } from '../../../lib/academy-permissions'
// ...
const canInviteStudent = canCreateStudentInvite(academyRoles)
// ...
{canInviteStudent ? <CollapsibleSection title="Link de matrícula" ...> : null}
```

**Banco:** migration `20260831440000_student_invites_staff.sql` — policy `invites_staff` (staff da academia).

**Critério de done:** professor não vê botão “Gerar link”; owner continua vendo.

---

### UP-323 — Empty state alunos (professor)

**Problema:** “Nenhum aluno encontrado.” não orienta quando professor não tem modalidade vinculada.

**Arquivos:**

```text
frontend/src/features/academy/StudentsListPage.tsx
```

**Implementação:**

```tsx
import { isScopedProfessor } from '../../lib/academy-permissions'

const scopedProfessor = activeRole ? isScopedProfessor([activeRole]) : false
const emptyMessage = scopedProfessor
  ? 'Nenhum aluno nas suas modalidades. Peça ao dono para vincular você a uma categoria.'
  : 'Nenhum aluno encontrado.'
```

**Critério de done:** professor sem alunos vê mensagem específica.

---

### UP-319 — Presença: alunos experimental na chamada

**Problema:** `AttendancePage` chama `fetchStudents(academyId, 'ATIVO')` — exclui `TRIAL`.

**Decisão:** status operacionais para chamada = `ATIVO` + `TRIAL` (futuro: constante `STUDENT_ATTENDANCE_STATUSES`).

**Arquivos:**

```text
frontend/src/lib/student-status.ts           ← STUDENT_ATTENDANCE_STATUSES
frontend/src/features/academy/AttendancePage.tsx
frontend/src/features/academy/academy-api.ts  ← fetchStudentsForAttendance() ou param multi-status
```

**API — opção mínima:**

```ts
export async function fetchStudentsForAttendance(academyId: string) {
  return fetchStudentsMultiStatus(academyId, ['ATIVO', 'TRIAL'])
}
```

**Banco:** nenhuma migration se RLS já permite SELECT desses status (✅).

**Critério de done:** aluno Experimental aparece na chamada da modalidade dele.

---

### UP-324 — Detalhe aluno fora do escopo

**Problema:** URL direta `/academy/alunos/:id` pode carregar vazio ou erro técnico.

**Arquivos:**

```text
frontend/src/features/academy/StudentDetailPage.tsx
frontend/src/features/academy/academy-api.ts  ← fetchStudentDetail retorna null se vazio
```

**Implementação UI:**

```tsx
if (!loading && !student) {
  return (
    <FeedbackMessage variant="warning">
      Aluno não encontrado ou fora das suas modalidades.
    </FeedbackMessage>
  )
}
```

**Critério de done:** professor não vê tela quebrada ao colar UUID de outro professor.

---

### UP-321 — Aluno sem modalidade no escopo (decisão de produto)

**Problema:** `student_in_instructor_scope` linha 50-52 — aluno **sem** `student_categories` é visível para **todos** os professores.

**Opções:**

| Opção | Comportamento | Migration |
|-------|---------------|-----------|
| A (recomendada) | Só owner/assistant vê aluno sem modalidade; professor só após vínculo | Alterar função SQL |
| B | Professor que criou o aluno vê até assign modalidade | Coluna `created_by` em students |
| C | Manter atual | Nenhuma |

**Se opção A:**

```sql
-- Nova migration: 20260831400000_student_scope_no_category.sql
CREATE OR REPLACE FUNCTION public.student_in_instructor_scope(...)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_categories sc
    INNER JOIN public.instructor_training_categories itc ...
    WHERE sc.student_id = p_student_id
  );
$$;
```

**Impacto:** professor precisa assign modalidade no cadastro (já existe no form?) — validar `NewStudentForm` / `StudentEditForm`.

**Critério de done:** produto escolhe opção; código e RPC alinhados.

---

### UP-303 — Período experimental (config dono) ✅

**Problema:** status `TRIAL` fixo no invite; sem `trial_ends_at`; sem config.

**Implementado:**

| Camada | Arquivo |
|--------|---------|
| DB | `20260831410000_student_experimental_period.sql` |
| Lib | `frontend/src/lib/trial-policy.ts` + `supabase/functions/_shared/trial-policy.ts` |
| Edge | `create-student`, `complete-student-invite` |
| UI Owner | `AcademySettingsPage` — seção “Período experimental” |
| UI Cadastro | `NewStudentForm` — seletor manual quando `trial_mode === MANUAL` |
| UI Labels | `student-status.ts` → Experimental (UP-318) |

**Teste manual:** §9.4 · **Pendente:** apply migration remoto + deploy edges.

**Não misturar com** UP-318 (só label) — UP-303 é regra de negócio.

---

### UP-316 — KPIs dashboard (verificação + consolidação opcional)

**Estado:** escopo **já funciona** via RLS + RPC. Teste manual documentado em **§9.2**.

| Verificação | Como validar |
|-------------|--------------|
| Alunos ativos | KPI professor ≤ KPI owner; bate com contagem manual na lista Alunos (status Ativo) |
| Inadimplentes | Idem — só alunos no escopo do professor |
| Presenças hoje | Contagem de `attendance_records` de hoje nas turmas do professor |
| Gráfico matrículas | RPC `get_academy_dashboard_charts` — sem receita quando `showFinance=false` |
| Aniversários | `fetchStudentBirthdays` — RLS `students_professor_select` |

**Nota:** KPI “Alunos ativos” conta enum `ATIVO` apenas — alunos **Experimental** (`TRIAL`) entram na chamada (UP-319) mas não nesse KPI.

*(Opcional, não implementado)* Unificar `fetchAcademyKpis` em RPC `get_academy_dashboard_kpis`.

---

### UP-304 — Relatório presença

**Problema:** professor precisa ver frequência e faltas consecutivas sem exportar planilha.

**Arquivos:**

```text
frontend/src/lib/attendance-report.ts              ← cálculos puros + testes
frontend/src/features/academy/AttendanceReportPage.tsx
frontend/src/features/academy/academy-api.ts       ← fetchAttendanceReportRecords
frontend/src/App.tsx                               ← rota relatorios/presenca
frontend/src/routes/nav-config.tsx                 ← menu
```

**Critério de done:** % por turma + tabela faltas consecutivas; ASSISTANT e professor acessam; RLS filtra turmas.

**Teste manual:** §9.5

---

## 9. Roteiro de teste manual

Marque `[x]` ao validar. Credenciais: [`DEV-SEED.md`](./DEV-SEED.md).

### 9.0 Pré-requisitos (antes de testar)

```bash
# Na raiz do repo — deploy functions + seed opcional
node scripts/apply-db-remote.mjs --seed

# Verificar schema remoto (opcional)
npx supabase db query --linked -f scripts/sql/verify-ringpro-schema.sql

# Frontend
cd frontend && npm run dev
```

**Migrations críticas — status remoto (02/09/2026):** ✅ aplicadas

| Arquivo | Ticket | Escopo |
|---------|--------|--------|
| `20260831390000_categories_student_read.sql` | P0 aluno | Onboarding modalidades |
| `20260831400000_student_scope_requires_category.sql` | UP-321 | Escopo professor estrito |
| `20260831410000_student_experimental_period.sql` | UP-303 | `trial_ends_at` |
| `20260831460000` … `20260831500000` | Fase 4 | KPIs, equipe plataforma, filiais, DROP POS |

---

### 9.1 Roteiro professor (`professor@academia-teste.dev`)

Login: `RingPro@dev123` · academia **Academia Teste**.

| # | Passo | Esperado |
|---|-------|----------|
| 1 | Dashboard | Sem KPI **Receita**; texto “Visão das suas turmas”; KPIs ≤ owner |
| 2 | Menu lateral | Dashboard, Alunos, Categorias, Presença, Relatório presença, Agenda, Notificações — **sem** Financeiro, Planos, Professores, Config, Landing, Leads |
| 3 | Alunos → lista | Só alunos com modalidade em comum; badges **Experimental** (não `TRIAL`) |
| 4 | Alunos → lista vazia | Empty state específico professor (sem vínculo de turma) |
| 5 | Alunos → Novo | Cadastro direto OK; **com** seção “Link de matrícula”; modalidade obrigatória |
| 6 | Alunos → editar (escopo) | Salvar → `FeedbackMessage` verde |
| 7 | URL `/academy/alunos/{id}` fora do escopo | `FeedbackMessage` warning amigável (não tela branca) |
| 8 | Categorias | Só modalidades vinculadas; sem botão criar (se UI oculta) |
| 9 | Presença | Alunos **Ativo** + **Experimental** na lista; salvar → banner verde |
| 10 | Relatório presença | % por turma + faltas consecutivas após chamadas no período |
| 11 | Agenda | Criar/editar aula na turma Boxe; plano da aula salva |
| 12 | Notificações | Lista in-app (pode estar vazia) |
| 13 | `/academy/financeiro` | Redirect / bloqueio owner guard |
| 14 | Mobile (opcional) | Hamburger + cards responsivos em Alunos |

---

### 9.2 UP-316 — Validação KPIs e gráficos (professor vs owner)

Execute com **dois logins** na mesma academia:

1. **Owner** (`owner@academia-teste.dev`) — anotar KPIs: Alunos ativos, Inadimplentes, Presenças hoje.
2. **Professor** — anotar os mesmos KPIs.
3. **Esperado:** valores do professor **≤** owner (igual se todo aluno está nas turmas do professor).
4. Abrir **Alunos** como professor — contar manualmente status Ativo e Inadimplente no escopo → deve bater com KPIs.
5. Gráfico “Alunos ativos por mês” — visível; **sem** gráfico de receita.
6. Sidebar: aniversários e aulas do calendário só do escopo.
7. **Assistant** (`assistant@academia-teste.dev`) — KPIs da academia inteira (exceto receita); sem menu Financeiro.

---

### 9.3 UP-321 — Escopo aluno sem modalidade

1. Como **owner**, cadastre aluno **sem** vincular modalidade.
2. Como **professor**, aluno **não** aparece na lista.
3. Como **owner**, vincule aluno à turma Boxe do professor.
4. Como **professor**, aluno passa a aparecer.

---

### 9.4 UP-303 — Período experimental

1. **Owner** → Configurações → Período experimental → **Por dias** (7) → salvar.
2. Cadastro via link de matrícula → aluno entra como **Experimental** com `trial_ends_at` (verificar no detalhe ou banco).
3. Modo **Manual** → cadastro direto mostra seletor Ativo/Experimental.
4. Modo **Desligado** → novos alunos entram como **Ativo**.

---

### 9.5 UP-304 — Relatório presença

1. **Presença** → registrar 2–3 chamadas na turma Boxe (incluir faltas em sequência para um aluno).
2. **Relatório presença** → período cobrindo as datas → **Atualizar**.
3. Verificar % na turma Boxe e aluno com faltas consecutivas ≥ 2.
4. Filtro turma → só uma modalidade.
5. Como **assistant** → relatório da academia inteira (turmas com chamada).

---

### 9.6 Owner e assistant (sanidade rápida)

| Persona | Check |
|---------|-------|
| Owner | Vê receita, link matrícula, config experimental, todos os alunos |
| Assistant | Vê alunos e presença; **sem** Financeiro, Planos, Config |

---

## 10. Mapa arquivo → responsabilidade

| Arquivo | Papel no portal professor |
|---------|---------------------------|
| `lib/academy-permissions.ts` | Guards de rota e papel efetivo |
| `lib/auth-utils.ts` | `canAccessFinanceiro` (owner only) |
| `lib/student-status.ts` | Labels status (Experimental) |
| `lib/trial-policy.ts` | Política período experimental (UP-303) |
| `lib/attendance-report.ts` | Cálculos relatório presença (UP-304) |
| `routes/AcademyOwnerGuard.tsx` | Bloqueio URL owner |
| `routes/nav-config.tsx` | Itens de menu |
| `features/academy/academy-api.ts` | Queries (confiar no RLS) |
| `features/academy/AttendanceReportPage.tsx` | Relatório presença |
| `features/academy/AcademyNotificationsPage.tsx` | Notificações in-app |
| `features/schedule/schedule-api.ts` | Agenda |
| `hooks/useNotifications.ts` | API notificações |
| `mockups/academy/00-Dashboard-Professor.html` | Referência visual UP-320 |
| `supabase/migrations/20260831320000_professor_scope_rls.sql` | **Fonte RLS professor** |
| `supabase/migrations/20260831400000_student_scope_requires_category.sql` | UP-321 |
| `supabase/migrations/20260831410000_student_experimental_period.sql` | UP-303 |
| `supabase/functions/create-student/` | Cadastro + política experimental |
| `supabase/functions/complete-student-invite/` | Matrícula via link + política |

---

## 11. Backlog resumido

### Implementado (código)

| ID | Título |
|----|--------|
| UP-317 | FeedbackMessage academy |
| UP-318 | Labels status Experimental |
| UP-319 | Presença + experimental na chamada |
| UP-320 | Mockup dashboard professor |
| UP-321 | Escopo aluno exige modalidade |
| UP-322 | Link convite professor/assistant (PRD v1.5) |
| UP-323 | Empty state professor |
| UP-324 | UX aluno fora escopo |
| UP-303 | Config experimental dono |
| UP-099 | Notificações in-app |
| UP-304 | Relatório presença |
| UP-316 | KPIs — verificação documentada §9.2 |

### Pendente operacional

| ID | Título | Prioridade | Status |
|----|--------|------------|--------|
| — | Migrations §9.0 no remoto | P0 | ✅ após `apply-db-remote` |
| — | Deploy edge functions UP-303 | P0 | ✅ `create-student` + `complete-student-invite` |
| — | Smoke test automatizado | P1 | `node scripts/smoke-academy-portal.mjs` |
| — | Roteiro manual §9.1–9.6 no browser | P1 | ⬜ humano |
| UP-316 | RPC única `get_academy_dashboard_kpis` | P3 opcional | ⬜ não obrigatório |
| UP-303 | Cron expiração experimental | Futuro | ⬜ |

Detalhes operacionais: [`PLANO-ATUALIZACOES.md`](./PLANO-ATUALIZACOES.md).

---

## 12. Histórico

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 02/09/2026 | Checklist inicial |
| 2.0 | 02/09/2026 | Guia de implementação: arquitetura, gaps verificados, fichas UP-316–324 |
| 2.2 | 02/09/2026 | UP-321: escopo estrito + modalidade obrigatória no cadastro professor |
| 2.3 | 02/09/2026 | Fases A–D concluídas; UP-303/304/099/320; roteiro manual §9 expandido |
