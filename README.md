# RingPro

Plataforma SaaS multi-tenant para gestão de academias de artes marciais (boxe, Muay Thai, Jiu-Jitsu, MMA, etc.).

## Quick start (desenvolvimento)

### 1. Pré-requisitos

- Node.js 20+
- Conta [Supabase](https://supabase.com) (project ref: `iqqmcvrwysoqoondbnbh`)

### 2. Variáveis de ambiente

Na **raiz** do repositório, crie `.env`:

```env
VITE_SUPABASE_URL=https://iqqmcvrwysoqoondbnbh.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

Copie também para `frontend/.env` (apenas as variáveis `VITE_*`).

**Nunca** commite `.env` nem exponha `service_role` no frontend.

### 3. Banco de dados

```bash
npx supabase login
npx supabase link --project-ref iqqmcvrwysoqoondbnbh
npx supabase db push
```

**Banco remoto (02/09/2026):** schema higienizado — 32 tabelas RingPro, sem legado POS. Ver [`docs/schema-snapshot.md`](docs/schema-snapshot.md).

```bash
# Opção A — com senha do banco no .env (SUPABASE_DB_PASSWORD)
node scripts/apply-db-remote.mjs

# Opção B — manual
npx supabase db push
node scripts/seed-dev-users.mjs   # opcional

# Verificar schema
npx supabase db query --linked -f scripts/sql/verify-ringpro-schema.sql
```

Migrations `20260831220000` e `20260831500000` removem objetos legados (boxers/ktech e POS).

### 4. Edge Functions (deploy)

```bash
supabase functions deploy create-academy-with-owner
supabase functions deploy create-student
supabase functions deploy apply-dunning
supabase functions deploy simulate-payment
supabase functions deploy create-payment-charge
supabase functions deploy charge-recurring-invoices
supabase functions deploy pagarme-webhook
supabase functions deploy complete-student-invite
supabase functions deploy public-student-register
supabase functions deploy create-student-invite
supabase functions deploy complete-student-invite
supabase functions deploy create-staff-invite
supabase functions deploy complete-staff-invite
supabase functions deploy create-platform-staff-invite
supabase functions deploy complete-platform-staff-invite
supabase functions deploy public-student-register
supabase functions deploy send-student-invite-email
```

**Secrets das Edge Functions** (Dashboard → Edge Functions → Secrets, ou `supabase secrets set`):

| Variável | Obrigatório | Uso |
|----------|-------------|-----|
| `RESEND_API_KEY` | Não (dev) | E-mail de convite de matrícula ([Resend](https://resend.com) — plano gratuito) |
| `RESEND_FROM_EMAIL` | Não | Remetente, ex.: `RingPro <onboarding@resend.dev>` |
| `APP_PUBLIC_URL` | Não | URL do app em produção, ex.: `https://app.seudominio.com` |
| `PAGARME_API_KEY` | Não (live) | Secret key Pagar.me — `create-payment-charge` |
| `PAGARME_WEBHOOK_SECRET` | Não (live) | Validação HMAC do webhook Pagar.me |
| `PAYMENTS_MODE` | Não | `mock` \| `live` — default: mock sem `PAGARME_API_KEY` |
| `CRON_SECRET` | Não | Bearer token para crons (`charge-recurring-invoices`, `notify-upcoming-invoices`) |

### Cron — cobrança recorrente cartão (UP-205)

Edge Function: `charge-recurring-invoices`

- Cria faturas quando `next_billing_date <= hoje` e há cartão default
- Cobra via Pagar.me (ou mock) com retry **D+1, D+3, D+7**
- Ao final, executa `apply_academy_dunning`

**Chamada manual (dev):**

Funções de cron usam `verify_jwt = false` no `config.toml` — o `Authorization` é o `CRON_SECRET`, não um JWT de usuário. Após alterar o config, **redeploy** a function.

```powershell
# PowerShell — use curl.exe e a anon key real do .env (VITE_SUPABASE_ANON_KEY)
curl.exe -X POST "https://iqqmcvrwysoqoondbnbh.supabase.co/functions/v1/charge-recurring-invoices" `
  -H "Authorization: Bearer seu_secret" `
  -H "apikey: eyJ...sua_anon_key..."
```

```bash
# bash
curl -X POST "https://iqqmcvrwysoqoondbnbh.supabase.co/functions/v1/charge-recurring-invoices" \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "apikey: SUA_ANON_KEY"
```

**pg_cron (Supabase Dashboard → Database → Extensions):** habilite `pg_cron` e agende via SQL (ajuste URL/secret):

```sql
SELECT cron.schedule(
  'ringpro-charge-recurring-invoices',
  '5 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://iqqmcvrwysoqoondbnbh.supabase.co/functions/v1/charge-recurring-invoices',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true),
      'apikey', current_setting('app.supabase_anon_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Configure `app.cron_secret` e `app.supabase_anon_key` no banco (ou use cron externo — GitHub Actions, etc.).

### Webhook Pagar.me (UP-204)

No [dashboard Pagar.me](https://dash.pagar.me/) → **Desenvolvedores → Webhooks**, configure o endpoint:

```text
https://iqqmcvrwysoqoondbnbh.supabase.co/functions/v1/pagarme-webhook
```

Eventos recomendados: `charge.paid`, `order.paid`.

A função roda com `verify_jwt = false` (ver `supabase/config.toml`) — a segurança vem da assinatura `PAGARME_WEBHOOK_SECRET` em modo live.

Sem `PAGARME_WEBHOOK_SECRET` em dev/mock, o webhook aceita payload para testes locais.

**Teste manual do webhook:**

```bash
node scripts/test-pagarme-webhook.mjs --invoice-id <uuid-da-fatura>
```

### Checkpoint Fase 1 — matrícula (UP-112)

```bash
node scripts/smoke-phase1-checkpoint.mjs
# ou
cd frontend && npm run test:smoke:phase1
```

Valida lead → convite → wizard → plano → pagamento mock. Ver [`docs/DEV-SEED.md`](docs/DEV-SEED.md).

### Checkpoint Fase 2 — pagamentos (UP-210)

```bash
node scripts/smoke-phase2-checkpoint.mjs
# ou
cd frontend && npm run test:smoke:phase2
```

Valida `create-payment-charge` (PIX + boleto), webhook assinado (se `PAGARME_WEBHOOK_SECRET` no `.env`) e idempotência. Ver [`docs/decisoes/001-gateway-pagamentos.md`](docs/decisoes/001-gateway-pagamentos.md).

Sem `RESEND_API_KEY`, o convite é criado e o link aparece na tela; o conteúdo do e-mail vai para o **log** da função `create-student-invite`.

### 5. Seed de usuários e dados de teste

```bash
node scripts/seed-dev-users.mjs
```

Senha dev para todos: `RingPro@dev123` — detalhes em [`docs/DEV-SEED.md`](docs/DEV-SEED.md).

### 6. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173/login

### 7. Validação

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build

# Smoke checkpoints (API — requer .env na raiz)
npm run test:smoke:phase1   # UP-112 matrícula
npm run test:smoke:phase2   # UP-210 pagamentos
npm run test:smoke:phase3   # UP-310 QR + graduação
npm run test:smoke          # portal academia (auditoria professor)
npm run test:smoke:rls      # UP-503 RLS
npm run test:e2e            # UP-502 E2E Playwright (browser)
npm run check:practices     # UP-507 práticas proibidas
```

### App aluno — Capacitor (UP-504)

```bash
cd frontend && npm run build:capacitor   # base ./ para assets nativos
cd apps/student-app && npm install && npm run add:android   # uma vez
npm run sync && npm run open:android
```

Deep link: `ringpro://convite/TOKEN` → `/convite/:token`. Ver [`apps/student-app/README.md`](apps/student-app/README.md).

```

---

## Portais

| Portal | Rota | Persona |
|--------|------|---------|
| Plataforma | `/platform/*` | Dono do SaaS |
| Academia | `/academy/*` | Owner, Professor, Assistant |
| Aluno | `/student/*` | Aluno |
| Landing | `/a/{slug}` | Visitante (público) |

---

## Estrutura do monorepo

```text
boxe/
├── frontend/          # React + Vite + TypeScript + Tailwind
├── supabase/
│   ├── migrations/    # Schema + RLS
│   └── functions/     # Edge Functions
├── scripts/
│   ├── seed-dev-users.mjs
│   ├── apply-db-remote.mjs
│   ├── smoke-phase1-checkpoint.mjs   # UP-112 matrícula
│   ├── smoke-phase2-checkpoint.mjs   # UP-210 pagamentos
│   ├── smoke-phase3-checkpoint.mjs   # UP-310 QR + graduação
│   ├── smoke-rls-checkpoint.mjs      # UP-503 RLS
│   ├── smoke-academy-portal.mjs      # auditoria professor
│   ├── test-pagarme-webhook.mjs      # webhook manual
│   └── smoke/                        # helpers (lib, enrollment, payments, rls)
├── frontend/e2e/      # UP-502 Playwright E2E
├── apps/student-app/  # UP-504 Capacitor portal aluno
├── docs/              # PRD, plano de execução, wireflows
├── mockups/           # Referência UI
└── .agents/skills/    # Padrões para agentes de IA
```

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [`AGENTS.md`](./AGENTS.md) | Regras para agentes de IA |
| [`docs/PRD.md`](./docs/PRD.md) | Requisitos de produto |
| [`docs/PLANO-EXECUCAO.md`](./docs/PLANO-EXECUCAO.md) | Passos RP-001 … RP-105 (MVP) |
| [`docs/PLANO-ATUALIZACOES.md`](./docs/PLANO-ATUALIZACOES.md) | Passos UP-101 … pós-MVP |
| [`docs/decisoes/`](./docs/decisoes/) | ADRs — ex.: gateway **Pagar.me** (ADR-001) |
| [`docs/DEV-SEED.md`](./docs/DEV-SEED.md) | Usuários e checklist de teste |
| [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) | Operação: deploy, crons, Pagar.me, incidentes |
| [`docs/RELEASE.md`](./docs/RELEASE.md) | Release notes por fase (UP-510) |
| [`docs/padroes-ui.md`](./docs/padroes-ui.md) | Design system |

---

## Stack

- **Backend:** Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions)
- **Frontend:** React 19, Vite, TypeScript, Tailwind 4
- **Pagamentos:** **Pagar.me** em produção ([ADR-001](docs/decisoes/001-gateway-pagamentos.md)); mock + `simulate-payment` em dev sem API key

---

## Agentes de IA

Antes de codar, ler [`AGENTS.md`](./AGENTS.md) e a skill `read-standards` em [`.agents/skills/`](./.agents/skills/).

Para continuar implementação autônoma:

```text
# MVP (waves 0–6)
Execute docs/PLANO-EXECUCAO.md do passo RP-XXX em diante, modo autônomo.

# Melhorias pós-MVP (uma por uma)
Execute docs/PLANO-ATUALIZACOES.md do passo UP-XXX em diante, modo autônomo.
```

---

## Status MVP

Waves 0–6 implementadas em código. Aplicar `db push`, deploy das functions e seed no Supabase remoto para teste ponta a ponta.
