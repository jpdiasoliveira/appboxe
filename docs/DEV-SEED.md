# Seed de desenvolvimento — RingPro

## Senha dev (todos os usuários)

`RingPro@dev123`

## Usuários

| E-mail | Role | Portal |
|--------|------|--------|
| `platform@ringpro.dev` | PLATFORM_OWNER | `/platform/dashboard` |
| `owner@academia-teste.dev` | SCHOOL_OWNER | `/academy/dashboard` |
| `professor@academia-teste.dev` | PROFESSOR | `/academy/dashboard` |
| `assistant@academia-teste.dev` | ASSISTANT | `/academy/dashboard` (sem financeiro) |
| `aluno@academia-teste.dev` | STUDENT | `/student/dashboard` |

## Passo a passo (primeira vez)

### 1. Aplicar migrations no Supabase remoto

```bash
cd c:\Users\João Paulo\Desktop\sistemas\boxe
npx supabase login
npx supabase link --project-ref iqqmcvrwysoqoondbnbh
npx supabase db push
```

Isso aplica também a limpeza do sistema legado (`boxers`, `members`, `gyms`, `ktech`, `schema_migrations`).

**Atalho (login + push + functions + seed):**

```bash
node scripts/apply-db-remote.mjs --seed
```

Opcional: adicione `SUPABASE_DB_PASSWORD` no `.env` (senha do Postgres no Dashboard) para o script usar `db push --db-url` sem depender do link.

### 2. Criar usuários de teste

```bash
cd frontend
node ../scripts/seed-dev-users.mjs
```

(Requer `SUPABASE_SERVICE_ROLE_KEY` no `.env` da **raiz** do repo.)

### 3. Subir o frontend

```bash
cd frontend
npm run dev
```

Abrir http://localhost:5173/login

## Checklist manual Wave 1

- [ ] Login PLATFORM_OWNER → `/platform/dashboard`
- [ ] Login SCHOOL_OWNER → `/academy/dashboard`
- [ ] Login ASSISTANT → sem menu Financeiro
- [ ] Login STUDENT → `/student/dashboard`
- [ ] Logout limpa sessão
- [ ] Esqueci senha dispara e-mail Supabase

### Checkpoint Fase 1 automatizado (UP-112)

Ver seção **[Testes automatizados → Smoke tests](#smoke-tests-api-sem-browser)** abaixo (`npm run test:smoke:phase1`).

Checklist manual complementar (browser): WhatsApp no convite (UP-102), e-mail Resend (UP-101), agenda UP-113.

## Migrations no remoto (atualizado 02/09/2026)

Schema **alinhado** — legado POS removido; Fase 4 (`platform_staff_invites`, `academy_branches`, RPCs) aplicada.

Verificação rápida:

```bash
npx supabase db query --linked -f scripts/sql/verify-ringpro-schema.sql
```

Deploy das Edge Functions (se ainda não fez):

```bash
node scripts/apply-db-remote.mjs
```

| Migration | Ticket | O que muda |
|-----------|--------|------------|
| `20260831390000_categories_student_read.sql` | P0 | Aluno vê modalidades no onboarding |
| `20260831400000_student_scope_requires_category.sql` | UP-321 | Professor só vê aluno com turma em comum |
| `20260831410000_student_experimental_period.sql` | UP-303 | Coluna `students.trial_ends_at` |
| `20260831460000` … `20260831500000` | UP-403…407 | KPIs plataforma, equipe, filiais, flags públicas, DROP POS |
| `20260831810000` | UP-311 | `student_documents` + bucket Storage |
| `20260831820000` | UP-312 | `class_makeup_credits`, `class_makeup_redemptions` |
| `20260831830000` | UP-313 | `class_groups`, `class_group_members` |
| `20260831840000` | UP-301 | `attendance_qr_sessions` + RPCs check-in |
| `20260831850000` | UP-302 | `belt_levels`, `student_belt_history` + RPC `promote_student_belt` |
| `20260831860000` | UP-305 | `body_assessment_cycles` + RPC `notify_physical_assessment_due` |
| `20260831870000` | UP-306 | `academy_contract_documents` + bucket `academy-documents` |
| `20260831880000` | UP-310 | fix `create_attendance_qr_session` (`gen_random_bytes` / extensions) |
| `20260831890000` | UP-205 | cobrança recorrente cartão + retry |
| `20260831900000` … `31910000` | UP-205 | fixes recurring (`flag_key`, casts RPC) |
| `20260831920000` | UP-208 | `platform_network_stats` — churn, receita mês |

**Seed opcional** após deploy:

```bash
node scripts/apply-db-remote.mjs --seed
```

## Checklist manual — Portal Professor

Roteiro completo (14 passos + KPIs + experimental + relatório): **[`auditoria-portal-professor.md` §9](./auditoria-portal-professor.md#9-roteiro-de-teste-manual)**.

Resumo rápido com `professor@academia-teste.dev`:

- [ ] Dashboard sem receita; KPIs escopados (§9.2)
- [ ] Menu sem Financeiro / Planos / Config / Professores
- [ ] Alunos só do escopo; empty state se sem turma
- [ ] Novo aluno sem link de convite; modalidade obrigatória
- [ ] Presença com alunos Experimental; relatório de frequência
- [ ] Badges mostram **Experimental**, não `TRIAL`
- [ ] `/academy/financeiro` bloqueado

Mockup de referência: [`mockups/academy/00-Dashboard-Professor.html`](../mockups/academy/00-Dashboard-Professor.html)

## Academia teste

- Nome: Academia Teste
- Slug: `academia-teste`
- Landing (Wave 5): `/a/academia-teste`

## Checklist manual — fluxo MVP completo (RP-102)

1. **Plataforma** — `platform@ringpro.dev` → criar academia ou usar seed
2. **Academia** — `owner@academia-teste.dev` → cadastrar aluno em Alunos → Novo
3. **Aluno** — `aluno@academia-teste.dev` → Meu plano → Modalidades → Pagamento → Simular pagamento (dev)
4. **Landing** — abrir `/a/academia-teste` sem login → enviar lead → owner vê em Leads + sino de notificação
5. **Assistant** — `assistant@academia-teste.dev` → confirmar que Financeiro não aparece
6. **Convite aluno** — Alunos → Novo aluno → Link de matrícula → aluno completa `/convite/{token}` → no 1º login passa pelo wizard em `/student/onboarding`

## Checklist manual — Fase 3 (UP-301, UP-302, UP-311, UP-312, UP-313)

Ativar flags em **Plataforma → Academias → Feature flags** antes de testar cada módulo.

| Flag | Teste rápido |
|------|--------------|
| `module_student_documents` | Academia → Aluno → aba **Documentos** → upload PDF |
| `module_class_makeup` | Presença → marcar falta + crédito → Aluno → aba **Reposições** → agendar |
| `module_class_groups` | Academia → **Turmas** → Boxe Manhã / Boxe Noite (seed) → editar horário no detalhe |
| `module_attendance` | Presença → **Check-in QR** → aluno abre `/student/check-in/{token}` |
| `module_graduation` | Academia → **Graduação** → faixas padrão Boxe → Aluno → aba **Graduação** → promoção → aluno em `/student/graduacao` |
| `module_physical_assessment` | Config → intervalo 6 meses → cron `notify-physical-assessment-due` → aluno/staff recebem notificação → aluno atualiza perfil |
| UP-306 contrato PDF | Configurações → enviar PDF → convite aluno exibe **Abrir contrato (PDF)** |

**Usuários:** `owner@academia-teste.dev` / `professor@academia-teste.dev` / `aluno@academia-teste.dev` — senha `RingPro@dev123`

## Link de matrícula do aluno

1. Academia: **Alunos → Novo aluno → Link de matrícula** (ou **Leads → Link matrícula**)
2. O sistema envia e-mail automaticamente se `RESEND_API_KEY` estiver configurada nas Edge Functions; senão, copie o link exibido na tela
3. Aluno abre `/convite/{token}` (válido 7 dias)
4. Preenche dados físicos, emergência e senha → entra no portal aluno

## Testes automatizados

```bash
cd frontend && npm run test        # unitários (96 testes)
cd frontend && npm run typecheck
cd frontend && npm run build
```

| Arquivo | Escopo |
|---------|--------|
| `auth-utils.test.ts` | RBAC, `canAccessFinanceiro` |
| `student-status.test.ts` | Labels Experimental (UP-318) |
| `trial-policy.test.ts` | Política período experimental (UP-303) |
| `attendance-report.test.ts` | Relatório presença (UP-304) |
| `finance-report.test.ts` | Relatório financeiro academia (UP-207) |
| `platform-finance-report.test.ts` | Relatório plataforma (UP-208) |
| `payments/*.test.ts` | Gateway mock/Pagar.me, webhook, recurring, QR PIX (UP-201…209) |
| `charge-display.test.ts` | QR imagem + labels copia-cola (UP-209) |

### Smoke tests (API, sem browser) {#smoke-tests-api-sem-browser}

| Comando | Ticket | O que valida |
|---------|--------|--------------|
| `npm run test:smoke` | Auditoria professor | RLS, KPIs, presença, escopo UP-321/303/304 |
| `npm run test:smoke:phase1` | UP-112 | Lead → convite → wizard → plano → pagamento mock |
| `npm run test:smoke:phase2` | UP-210 | `create-payment-charge` PIX/boleto + webhook/idempotência |
| `npm run test:smoke:phase3` | UP-310 | QR check-in + promoção de faixa |
| `npm run test:smoke:rls` | UP-503 | ASSISTANT/professor sem financeiro + isolamento tenant |
| `npm run test:e2e` | UP-502 | Browser: owner → convite → onboarding → pagamento mock → Ativo |
| `npm run check:practices` | UP-507 | service_role, `any`, nomenclatura §10 |

Todos exigem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` da raiz (exceto `check:practices`, que não precisa de `.env`).

**E2E (UP-502):** sobe o Vite em `localhost:5173` automaticamente. Requer `npm run dev` compatível (modo dev para botão “Simular pagamento”). `SUPABASE_SERVICE_ROLE_KEY` recomendado para limpar o aluno criado ao final.

**Opcionais no `.env`:**

| Variável | Usado em |
|----------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Limpeza smoke Fase 1; fatura pendente Fase 2; UP-321 isolado; INSERT negado UP-503; limpeza E2E UP-502 |
| `PAGARME_WEBHOOK_SECRET` | Assinatura HMAC no smoke Fase 2 e `test-pagarme-webhook.mjs` |

**Helpers reutilizáveis:** `scripts/smoke/lib.mjs`, `enrollment.mjs`, `payments.mjs`, `rls.mjs`. E2E: `frontend/e2e/`.

**Operação (produção):** [`RUNBOOK.md`](./RUNBOOK.md) — deploy, crons, Pagar.me, backup, incidentes.  
**Release notes:** [`RELEASE.md`](./RELEASE.md) — histórico por fase (UP-510).  
**App aluno (Capacitor):** [`apps/student-app/README.md`](../apps/student-app/README.md) — UP-504.

**Webhook manual:** `node scripts/test-pagarme-webhook.mjs --invoice-id <uuid>`

### Detalhes por checkpoint

#### Fase 1 (UP-112)

```bash
node scripts/smoke-phase1-checkpoint.mjs
```

#### Fase 2 (UP-210)

```bash
node scripts/smoke-phase2-checkpoint.mjs
```

Sem `PAGARME_WEBHOOK_SECRET`, usa fallback `simulate-payment` se o remoto exigir assinatura no webhook.

#### Fase 3 (UP-310)

```bash
node scripts/smoke-phase3-checkpoint.mjs
```

Requer flags Fase 3 ativas (`node scripts/seed-dev-users.mjs` após deploy).

#### Portal Academia (auditoria professor)

```bash
node scripts/smoke-academy-portal.mjs
```

Cobre escopo por persona, KPIs, RPC gráficos, financeiro/convites, presença, relatório %, categorias/agenda/notificações, onboarding aluno, `trial_ends_at`.

### Checklist manual — pagamento aluno (UP-209)

Com `aluno@academia-teste.dev` em `/student/pagamento`:

- [ ] **Gerar PIX** → QR em imagem + botão copiar código
- [ ] **Gerar boleto** → linha digitável (+ link PDF em modo live Pagar.me)
- [ ] Dev: **Simular pagamento** → fatura PAGO, status ATIVO

`scripts/smoke-professor-portal.mjs` redireciona para o smoke completo da academia.
