# Plano de execução autônoma — RingPro MVP

**Versão:** 1.0  
**Data:** 31/08/2026  
**Objetivo:** guia passo a passo para o agente implementar o MVP **sem parar para pedir permissão** entre tarefas.

---

## Como usar (humano)

Cole no chat do agente:

```text
Execute o PLANO-EXECUCAO.md do passo RP-XXX em diante, modo autônomo.
Marque [x] cada passo concluído. Não pare entre passos salvo bloqueio crítico.
Não peça commit/PR até eu pedir — só implemente.
```

Para revisar amanhã: abra este arquivo e veja o que está `[x]`.

---

## Modo autônomo (agente — OBRIGATÓRIO)

### Antes de começar

1. Ler [`AGENTS.md`](../AGENTS.md) + [`read-standards`](../.agents/skills/read-standards/SKILL.md) + [`ringpro-domain`](../.agents/skills/ringpro-domain/SKILL.md)
2. Ler [`execute-plan`](../.agents/skills/execute-plan/SKILL.md)
3. Confirmar `.env` existe (Supabase) — se faltar, **parar** e avisar

### Regras de execução contínua

| Fazer | Não fazer |
|-------|-----------|
| Executar passos na ordem `RP-001` → `RP-099` | Pular wave ou passo com dependência aberta |
| Marcar `[x]` no passo ao concluir | Pedir "posso continuar?" entre passos |
| Seguir mockups + PRD + skills | Inventar escopo fora do PRD |
| Commitar só se usuário pedir | Abrir PR automaticamente |
| Em erro: tentar 2–3 abordagens, documentar no passo | Desistir no primeiro erro |
| Testes: rodar quando o passo pedir; senão seguir | Bloquear wave inteira por teste opcional |

### Quando PARAR e avisar o humano

- Secret faltando (`.env`, Pagar.me não configurado na Wave 4)
- Decisão de produto **não** coberta no PRD
- Migration Supabase falha e não há rollback claro
- 3 tentativas falharam no mesmo passo

### Estrutura de pastas alvo (monorepo)

```text
boxe/
├── frontend/                 # Vite + React + TS + Tailwind
│   └── src/
│       ├── lib/              # supabase client, utils
│       ├── features/         # auth, platform, academy, student, landing
│       ├── components/       # ui compartilhados
│       ├── layouts/          # shells por portal
│       └── routes/           # react-router
├── supabase/
│   ├── migrations/
│   ├── functions/            # Edge Functions
│   └── seed.sql
├── docs/
└── mockups/
```

### Credenciais

- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Edge Functions: `SUPABASE_SERVICE_ROLE_KEY` (nunca no browser)
- Pagar.me (Wave 4): stub/mock se `.env` sem chave — implementar interface, webhook real depois

### Progresso

| Wave | Passos | Status |
|------|--------|--------|
| 0 — Setup | RP-001 … RP-010 | ✅ |
| 1 — Auth | RP-011 … RP-030 | 🟡 migrations criadas — falta `db push` + seed |
| 2 — Plataforma | RP-031 … RP-050 | ✅ código pronto — falta `db push` + deploy functions |
| 3 — Academia | RP-051 … RP-075 | ✅ código — falta `db push` + testes |
| 4 — Aluno | RP-076 … RP-090 | ✅ código — falta deploy functions |
| 5 — Landing | RP-091 … RP-098 | ✅ código — falta `db push` + seed |
| 6 — Polish | RP-099 … RP-105 | ✅ código |

---

# WAVE 0 — Setup do projeto

## RP-001 — Inicializar frontend Vite

- [x] `npm create vite@latest frontend -- --template react-ts`
- [x] Instalar: `react-router-dom`, `@supabase/supabase-js`, `tailwindcss`, `@heroicons/react`
- [x] Configurar Tailwind com tokens de `mockups/_shared/base.css`
- [x] Scripts: `dev`, `build`, `lint`, `typecheck`

**Done quando:** `npm run dev` sobe sem erro.

---

## RP-002 — Cliente Supabase

- [x] `frontend/src/lib/supabase.ts` — client com env vars
- [x] `frontend/src/vite-env.d.ts` — tipos `VITE_SUPABASE_*`
- [x] Garantir que **não** importa service role no frontend

**Done quando:** client exportado e typecheck OK.

---

## RP-003 — Supabase CLI e link

- [x] `supabase init` (se ainda não)
- [x] `supabase/config.toml` básico
- [x] Documentar em README: `supabase link --project-ref iqqmcvrwysoqoondbnbh`
- [ ] `supabase link` + `db push` no projeto remoto (ação manual — ver `docs/DEV-SEED.md`)

**Done quando:** pasta `supabase/migrations/` pronta.

---

## RP-004 — Router e layouts base

- [x] `react-router` com rotas placeholder:
  - `/login`, `/auth/*`
  - `/platform/*`
  - `/academy/*`
  - `/student/*`
  - `/a/:slug`
- [x] `layouts/AuthLayout`, `DashboardLayout` (sidebar + topbar)
- [x] Página 404

**Done quando:** navegação entre rotas placeholder funciona.

---

## RP-005 — Componentes UI base

- [x] `Button`, `Input`, `Label`, `Card`, `Badge`, `KpiCard`
- [x] `Sidebar`, `Topbar`
- [ ] `FilterDrawer` (Limpar/Aplicar) — Wave 3
- [x] Usar tokens RingPro (vermelho/dourado/preto)

**Done quando:** componentes renderizam em página `/dev/ui` ou story interna.

---

## RP-006 — Hooks de auth (esqueleto)

- [x] `useAuth()` — session Supabase
- [x] `useUserRoles()` — busca `user_academy_roles`
- [x] `useAcademyContext()` — academy_id ativo

**Done quando:** hooks compilam (dados vêm na Wave 1).

---

## RP-007 — Proteção de rotas (esqueleto)

- [x] `ProtectedRoute` — exige session
- [x] `RoleRoute` — exige role mínima
- [x] Redirect não autenticado → `/login`

**Done quando:** rotas protegidas redirecionam.

---

## RP-008 — ESLint + TypeScript strict

- [x] `strict: true` no tsconfig
- [x] ESLint configurado (oxlint)
- [x] Script `npm run typecheck`

**Done quando:** `npm run typecheck` passa.

---

## RP-009 — Estrutura `.agents/docs` técnica

- [x] Criar `architecture.md`, `patterns.md`, `testing.md`, `security.md` (conteúdo inicial RingPro)

**Done quando:** arquivos existem com convenções do repo.

---

## RP-010 — Checkpoint Wave 0

- [x] `npm run build` passa
- [x] Marcar Wave 0 ✅ no topo deste arquivo

---

# WAVE 1 — Auth + RBAC + Multi-tenant

## RP-011 — Migration: enums e extensões

- [x] `supabase/migrations/20260831120000_enums.sql`
- [x] Enums: `user_role`, `academy_status`, `student_status`, etc.

**Done quando:** migration aplica sem erro.

---

## RP-012 — Migration: profiles

- [x] Tabela `profiles` (user_id FK auth.users, name, avatar_url, must_change_password)
- [x] Trigger `on_auth_user_created` → insert profile

**Done quando:** signup cria profile.

---

## RP-013 — Migration: academies

- [x] Tabela `academies` (name, slug UNIQUE, status, settings jsonb)
- [x] RLS habilitado

**Done quando:** tabela criada.

---

## RP-014 — Migration: user_academy_roles

- [x] Tabela `user_academy_roles` (user_id, academy_id, role, status)
- [x] UNIQUE (user_id, academy_id, role)

**Done quando:** RBAC base no banco.

---

## RP-015 — Migration: audit_logs

- [x] Tabela append-only `audit_logs`

**Done quando:** tabela criada.

---

## RP-016 — Functions SQL helpers RLS

- [x] `is_platform_owner()`
- [x] `has_academy_role()`
- [x] `user_academy_ids()`

**Done quando:** functions testáveis no SQL editor.

---

## RP-017 — RLS: academies

- [x] PLATFORM_OWNER: all
- [x] Demais: SELECT onde tem role na academia

**Done quando:** isolamento básico funciona.

---

## RP-018 — RLS: user_academy_roles

- [x] Usuário vê próprias roles
- [x] SCHOOL_OWNER / PLATFORM_OWNER policies

**Done quando:** policies aplicadas.

---

## RP-019 — RLS: profiles

- [x] Usuário edita próprio profile

**Done quando:** policies aplicadas.

---

## RP-020 — Seed desenvolvimento

- [x] `supabase/seed.sql` (academia teste)
- [x] `scripts/seed-dev-users.mjs` + `docs/DEV-SEED.md`
- [ ] Executar após `db push`: `node scripts/seed-dev-users.mjs`

**Done quando:** `supabase db reset` popula dados.

---

## RP-021 — Tela Login

- [x] `features/auth/LoginPage.tsx` — espelhar `mockups/auth/00-Login.html`
- [x] `signInWithPassword`
- [x] Mensagem erro credenciais inválidas

**Done quando:** login funciona com seed.

---

## RP-022 — Redirect pós-login por role

- [x] PLATFORM_OWNER → `/platform/dashboard`
- [x] SCHOOL_OWNER / PROFESSOR / ASSISTANT → `/academy/dashboard`
- [x] STUDENT → `/student/dashboard`
- [x] `must_change_password` → `/auth/trocar-senha`

**Done quando:** cada usuário seed vai ao portal certo.

---

## RP-023 — Logout

- [x] Botão logout no Topbar
- [x] `signOut` + redirect `/login`
- [x] Audit log login/logout (app)

**Done quando:** logout limpa session.

---

## RP-024 — Esqueci senha

- [x] `features/auth/ForgotPasswordPage.tsx`
- [x] `resetPasswordForEmail`
- [x] Tela confirmação "verifique seu e-mail"

**Done quando:** fluxo dispara e-mail (Supabase).

---

## RP-025 — Trocar senha

- [x] `features/auth/ChangePasswordPage.tsx`
- [x] Atualiza senha + `must_change_password = false`

**Done quando:** usuário seed com flag forçada consegue trocar.

---

## RP-026 — Verificação e-mail (gate)

- [x] Bloquear login se `email_confirmed_at` null
- [x] Tela `VerifyEmailPage` (rota `/auth/verificar-email`)

**Done quando:** gate funciona.

---

## RP-027 — Session persist + refresh

- [x] `onAuthStateChange` no provider
- [x] Loading state global

**Done quando:** refresh da página mantém login.

---

## RP-028 — Multi-academia selector (se >1 role)

- [x] Se usuário tem roles em 2+ academias, dropdown no topbar
- [x] `useAcademyContext` persiste escolha

**Done quando:** professor em 2 academias troca contexto.

---

## RP-029 — Testes auth (opcional mas recomendado)

- [ ] Teste integração: login + redirect por role (Playwright ou Vitest + mocks)
- [x] Checklist manual em `docs/DEV-SEED.md`

**Done quando:** pelo menos 1 teste e2e login verde OU checklist documentado.

---

## RP-030 — Checkpoint Wave 1

- [ ] Critérios `docs/roadmap-desenvolvimento.md` Wave 1 ✅
- [ ] Marcar Wave 1 ✅ no topo

---

# WAVE 2 — Portal Plataforma (Dono SaaS)

## RP-031 — Migration: saas_plans

- [x] Tabela planos SaaS (name, price_monthly, max_students, features jsonb)

---

## RP-032 — Migration: academy_feature_flags

- [x] (academy_id, flag_key, enabled) — flags do PRD §12

---

## RP-033 — Migration: saas_invoices (financeiro plataforma)

- [x] Faturas academia → RingPro, status, due_date

---

## RP-034 — RLS platform tables

- [x] Só PLATFORM_OWNER escreve em saas_plans, flags globais
- [x] PLATFORM_OWNER vê todas academias

---

## RP-035 — Shell `/platform`

- [x] Sidebar: Dashboard, Academias, Financeiro, Configurações, Auditoria
- [x] Layout dedicado

---

## RP-036 — Dashboard plataforma

- [x] KPIs: academias ativas, MRR, total alunos, inadimplência academias
- [ ] Mock: `mockups/platform/00-Dashboard.html`

---

## RP-037 — Lista academias

- [x] CRUD listagem + filtros
- [ ] Mock: `mockups/platform/01-Academias.html`

---

## RP-038 — Nova academia

- [x] Form: nome, slug, plano SaaS, e-mail owner
- [x] Valida slug único
- [x] Cria SCHOOL_OWNER (convite Auth + role)
- [ ] Mock: `mockups/platform/01.1-Nova-Academia.html`

---

## RP-039 — Feature flags UI

- [x] Tela toggles por academia
- [x] Salva `academy_feature_flags`

---

## RP-040 — Financeiro plataforma

- [x] Lista faturas SaaS, status PAGO/PENDENTE/ATRASADO
- [ ] Mock: `mockups/platform/02-Financeiro.html`

---

## RP-041 — Configurações plataforma

- [x] CRUD saas_plans
- [ ] Mock: `mockups/platform/03-Configuracoes.html`

---

## RP-042 — Auditoria plataforma

- [x] Timeline audit_logs, export CSV
- [ ] Mock: `mockups/platform/04-Auditoria.html`

---

## RP-043 — Kill switch academia SUSPENSA

- [x] Status SUSPENSO bloqueia login staff da academia
- [x] Job ou regra: 15 dias atraso fatura → SUSPENSO

---

## RP-044 — Hook useFeatureFlag

- [x] `useFeatureFlag('module_attendance')` — lê flags da academia ativa

---

## RP-045 — Seed Wave 2

- [x] 2–3 saas_plans, flags default, 2 academias exemplo

---

## RP-050 — Checkpoint Wave 2

- [ ] PLATFORM_OWNER cria academia end-to-end ✅ (após `db push` + deploy)

---

# WAVE 3 — Portal Academia

## RP-051 — Migrations: academy_plans, training_categories

- [x] Planos mensalidade locais + categorias (Boxe, Muay Thai…)

---

## RP-052 — Migrations: students, instructors

- [x] students (user_id, academy_id, cpf, phone, status)
- [x] instructors (profile estendido professor)

---

## RP-053 — Migrations: student_categories, attendance_records

- [x] Vínculos aluno ↔ categoria
- [x] Presença (se flag on)

---

## RP-054 — Migrations: invoices, payments (academia)

- [x] Financeiro local aluno

---

## RP-055 — RLS Wave 3 — regra ASSISTANT

- [x] ASSISTANT: **DENY** SELECT/INSERT/UPDATE em invoices, payments
- [x] PROFESSOR e SCHOOL_OWNER: allow
- [ ] Testar com usuário seed assistant

---

## RP-056 — Shell `/academy`

- [x] Sidebar: Dashboard, Alunos, Professores, Categorias, Planos, Financeiro, Presença, Config
- [x] **ASSISTANT:** ocultar Financeiro + KPIs financeiros no dashboard

---

## RP-057 — Dashboard academia (owner/professor)

- [x] KPIs: alunos ativos, inadimplência, receita mês
- [ ] Mock: `mockups/academy/00-Dashboard.html`

---

## RP-058 — Dashboard academia (assistant)

- [x] Variante sem financeiro
- [ ] Mock: `mockups/academy/00-Dashboard-Assistant.html`

---

## RP-059 — CRUD alunos — lista

- [x] Tabela com badge status, filtro inadimplente
- [ ] Mock: `mockups/academy/01-Alunos.html`

---

## RP-060 — CRUD alunos — novo

- [x] Form cadastro presencial
- [x] Cria Auth user + student + role STUDENT + senha provisória
- [ ] Mock: `mockups/academy/01.1-Novo-Aluno.html`

---

## RP-061 — CRUD professores

- [x] Convidar PROFESSOR e ASSISTANT (lista roles; convite e-mail futuro)
- [ ] Mock: `mockups/academy/02-Professores.html`

---

## RP-062 — CRUD categorias

- [x] Mock: `mockups/academy/03-Categorias.html` (UI básica)

---

## RP-063 — CRUD planos mensalidade

- [x] preço, period, max_categories
- [ ] Mock: `mockups/academy/04-Planos.html`

---

## RP-064 — Financeiro academia

- [x] Mensalidades, recebimentos, inadimplentes
- [x] **403/empty para ASSISTANT**
- [ ] Mock: `mockups/academy/05-Financeiro.html`

---

## RP-065 — Presença (feature flag)

- [x] Chamada turma por categoria/data
- [x] Se `module_attendance` off → rota 404
- [ ] Mock: `mockups/academy/06-Presenca.html`

---

## RP-066 — Configurações academia

- [x] Logo (Storage), endereço, horários (settings jsonb — logo Wave 6)
- [ ] Mock: `mockups/academy/07-Configuracoes.html`

---

## RP-067 — Edge Function: dunning cron (esqueleto)

- [x] Marca INADIMPLENTE após grace 3 dias
- [x] Pode ser pg_cron ou function agendada manualmente em dev (`apply-dunning`)

---

## RP-068 — Notificações academia (placeholder)

- [x] Lista vazia ou seed — polish na Wave 6
- [ ] Mock: `mockups/academy/08-Notificacoes.html`

---

## RP-075 — Checkpoint Wave 3

- [ ] Professor cadastra aluno ✅ (após `db push` + deploy `create-student`)
- [ ] ASSISTANT sem financeiro ✅

---

# WAVE 4 — Portal Aluno

## RP-076 — Migrations: student_subscriptions, student_payment_methods

- [x] `student_subscriptions` (wave3) + `student_payment_methods` (wave4)

---

## RP-077 — RLS: aluno só próprios dados

- [x] STUDENT SELECT/UPDATE apenas onde student.user_id = auth.uid()

---

## RP-078 — Shell `/student`

- [x] Sidebar: Dashboard, Meu Plano, Modalidades, Pagamento, Histórico, Perfil

---

## RP-079 — Dashboard aluno

- [x] Plano, vencimento, status
- [ ] Mock: `mockups/student/00-Dashboard.html`

---

## RP-080 — Meu plano

- [x] Escolher/trocar plano (efeito próximo ciclo)
- [ ] Mock: `mockups/student/01-Meu-Plano.html`

---

## RP-081 — Modalidades

- [x] Selecionar categorias dentro do limite do plano
- [ ] Mock: `mockups/student/02-Modalidades.html`

---

## RP-082 — Pagamento — UI cartão

- [x] Integração Pagar.me SDK **ou** mock token em dev se sem API key
- [x] **Nunca** professor cadastra cartão
- [ ] Mock: `mockups/student/03-Pagamento.html`

---

## RP-083 — Pagamento — PIX/boleto

- [x] Edge Function gera cobrança (ou stub dev)
- [x] Status PENDENTE até webhook

---

## RP-084 — Edge Function: webhook Pagar.me

- [x] Confirma pagamento → invoice PAGO → student ATIVO (stub)

---

## RP-085 — Histórico pagamentos

- [x] Lista faturas do aluno
- [ ] Mock: `mockups/student/04-Historico.html`

---

## RP-086 — Perfil aluno

- [x] Telefone editável
- [ ] Mock: `mockups/student/05-Perfil.html`

---

## RP-090 — Checkpoint Wave 4

- [ ] Aluno paga (mock ou real) → ATIVO ✅ (após `db push` + deploy functions)

---

# WAVE 5 — Landing Page

## RP-091 — Migration: landing_page_config, leads

- [x] Tabelas `landing_page_config` + `leads` com RLS anon/authenticated

---

## RP-092 — Rota pública `/a/:slug`

- [x] SPA com fetch público (RLS policy anon read se published)
- [ ] Mock: `mockups/landing/00-Template.html`

---

## RP-093 — Seções landing

- [x] hero, sobre, modalidades, planos, contato
- [x] Respeitar `module_landing`

---

## RP-094 — Formulário lead

- [x] Salva lead + listagem owner em `/academy/leads`

---

## RP-095 — Editor landing (owner)

- [x] `/academy/landing` editor básico json sections
- [x] Toggle publicar/despublicar
- [ ] Mock: `mockups/landing/01-Editor.html`

---

## RP-098 — Checkpoint Wave 5

- [ ] Landing pública + lead ✅ (após `db push` + seed)

---

# WAVE 6 — Polimento

## RP-099 — Notificações in-app (básico)

- [x] Tabela + sino no topbar
- [x] Trigger: novo lead → notifica SCHOOL_OWNER

---

## RP-100 — Export CSV financeiro

- [x] Plataforma financeiro + academia financeiro + auditoria (utilitário `csv-export`)

---

## RP-101 — 2FA PLATFORM_OWNER (Should)

- [x] Página `/platform/seguranca` — Supabase Auth MFA (TOTP)

---

## RP-102 — Testes e2e fluxo completo

- [x] Testes unitários Vitest (`auth-utils`)
- [x] Checklist manual MVP em `docs/DEV-SEED.md`

---

## RP-103 — README setup completo

- [x] Comandos dev, seed, migrations, deploy functions

---

## RP-104 — Revisão práticas proibidas

- [x] Sem `any` no frontend/src; sem service role no frontend; RLS em migrations

---

## RP-105 — MVP COMPLETO ✅

- [ ] Loop PRD §2.1 funciona ponta a ponta (validação humana após `db push`)
- [x] Código das waves 0–6 implementado

---

# Apêndice A — Mapa de mockups × passos

| Mockup | Passo |
|--------|-------|
| `auth/00-Login` | RP-021 |
| `auth/01-Esqueci-Senha` | RP-024 |
| `auth/03-Trocar-Senha` | RP-025 |
| `platform/00-Dashboard` | RP-036 |
| `platform/01-Academias` | RP-037 |
| `academy/01-Alunos` | RP-059 |
| `student/03-Pagamento` | RP-082 |
| `landing/00-Template` | RP-092 |

(Criar mockups faltantes durante a wave correspondente.)

---

# Apêndice B — Comandos úteis

```bash
# Frontend
cd frontend && npm run dev

# Supabase local (opcional)
supabase start
supabase db reset

# Aplicar migrations remoto
supabase db push

# Edge Functions
supabase functions serve
```

---

# Apêndice C — Bloqueios conhecidos e fallback

| Bloqueio | Fallback dev |
|----------|--------------|
| Pagar.me sem API key | Mock `PaymentService` + botão "simular pagamento" |
| E-mail não configurado | Log no console + tela sucesso |
| Supabase remoto only | `db push` sem `supabase start` local |

---

**Fim do plano.** Atualize os `[ ]` → `[x]` conforme executa. Última revisão humana: amanhã.
