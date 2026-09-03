# RingPro — Runbook de Operação

Guia operacional para deploy, crons, pagamentos, backup e incidentes. Complementa [`README.md`](../README.md), [`DEV-SEED.md`](./DEV-SEED.md) e [ADR-001](./decisoes/001-gateway-pagamentos.md).

**Projeto Supabase (dev):** `iqqmcvrwysoqoondbnbh`  
**URL base:** `https://iqqmcvrwysoqoondbnbh.supabase.co`

---

## 1. Matriz de ambientes

| Item | Desenvolvimento | Produção |
|------|-----------------|----------|
| Frontend | `npm run dev` (Vite) | Build estático + CDN/hosting |
| Pagamentos | `PAYMENTS_MODE=mock` (default) | `PAYMENTS_MODE=live` + chaves Pagar.me |
| E-mail convite | stub / Resend sandbox | Resend com domínio verificado |
| Crons | chamada manual `curl` | `pg_cron` ou cron externo |
| Smoke / E2E | `.env` local | secrets CI + projeto staging |

### Variáveis — raiz `.env` (nunca commitar)

| Variável | Onde usar | Notas |
|----------|-----------|-------|
| `VITE_SUPABASE_URL` | Frontend, scripts | Público |
| `VITE_SUPABASE_ANON_KEY` | Frontend, `apikey` em crons | Público — RLS protege dados |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts smoke, **nunca** no frontend | Bypass RLS |
| `SUPABASE_DB_PASSWORD` | `apply-db-remote.mjs` | Dashboard → Database |
| `PAGARME_WEBHOOK_SECRET` | Smoke Fase 2, teste webhook local | Deve coincidir com Dashboard Pagar.me |

### Secrets — Supabase Edge Functions

```bash
supabase secrets set PAGARME_API_KEY=sk_test_...
supabase secrets set PAGARME_WEBHOOK_SECRET=whsec_...
supabase secrets set PAYMENTS_MODE=live
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM_EMAIL="RingPro <noreply@seudominio.com>"
supabase secrets set APP_PUBLIC_URL=https://app.seudominio.com
supabase secrets set FCM_SERVER_KEY=AAAA...   # Firebase Console → Cloud Messaging (legacy server key)
```

`FCM_SERVER_KEY` é opcional: sem ela, push é no-op (notificações in-app continuam). Ative a flag `module_notifications_push` por academia na plataforma.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente no runtime das Edge Functions.

### Variáveis — frontend (produção)

| Variável | Uso |
|----------|-----|
| `VITE_PAYMENTS_MODE` | `mock` \| `live` — alinhar com `PAYMENTS_MODE` |
| `VITE_PAGARME_PUBLIC_KEY` | Tokenização de cartão no browser (`pk_test_` / `pk_`) |

---

## 2. Deploy e release

### Checklist pós-alteração

```bash
# 1. Migrations (se houver)
npx supabase login
npx supabase link --project-ref iqqmcvrwysoqoondbnbh
npx supabase db push

# 2. Verificar schema
npx supabase db query --linked -f scripts/sql/verify-ringpro-schema.sql

# 3. Edge Functions (uma ou todas)
supabase functions deploy <nome>
# ou
node scripts/apply-db-remote.mjs          # push + deploy lista completa
node scripts/apply-db-remote.mjs --seed   # + usuários dev (só ambiente dev)

# 4. Secrets (se alterados)
supabase secrets set NOME=valor

# 5. Validação mínima
cd frontend && npm run typecheck && npm run test && npm run build
```

### Lista completa de Edge Functions

Deployadas por `scripts/apply-db-remote.mjs`:

`create-student-invite`, `resend-student-invite`, `complete-student-invite`, `send-student-invite-email`, `create-staff-invite`, `complete-staff-invite`, `create-platform-staff-invite`, `complete-platform-staff-invite`, `public-student-register`, `create-student`, `create-academy-with-owner`, `apply-dunning`, `notify-upcoming-invoices`, `register-push-token`, `notify-physical-assessment-due`, `public-invite-contract-url`, `simulate-payment`, `create-payment-charge`, `charge-recurring-invoices`, `pagarme-webhook`

**Após alterar `supabase/config.toml` (`verify_jwt`):** redeploy obrigatório da function afetada.

### Smoke tests por área

| Comando | Quando rodar |
|---------|--------------|
| `npm run test:smoke:phase1` | Auth, convite, onboarding, pagamento mock |
| `npm run test:smoke:phase2` | PIX/boleto, webhook Pagar.me |
| `npm run test:smoke:phase3` | QR check-in, graduação |
| `npm run test:smoke:rls` | ASSISTANT/professor sem financeiro, tenant |
| `npm run test:smoke` | Portal academia / professor |
| `npm run test:e2e` | Fluxo browser (Playwright) |

Requer `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` no `.env` da raiz. `SUPABASE_SERVICE_ROLE_KEY` recomendado para limpeza automática.

### CI

- **E2E:** `.github/workflows/e2e.yml` — `workflow_dispatch`, secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Crons e jobs agendados

### Registry

| Job | Edge Function | Schedule sugerido | Auth |
|-----|---------------|-------------------|------|
| Cobrança recorrente cartão | `charge-recurring-invoices` | `5 6 * * *` (06:05 UTC) | `Bearer CRON_SECRET` + header `apikey` (anon) |
| Lembretes de vencimento (D-3, D+0) | `notify-upcoming-invoices` | `0 7 * * *` (07:00 UTC) | idem |
| Avaliação física vencida | `notify-physical-assessment-due` | `0 8 * * 1` (segunda 08:00 UTC) | idem |
| Dunning manual (RPC) | `apply-dunning` | após cobrança ou diário | **sem auth hoje** — ver §7 |

Funções com `verify_jwt = false` em `supabase/config.toml`: `pagarme-webhook`, `complete-student-invite`, `public-student-register`, `charge-recurring-invoices`, `notify-upcoming-invoices`, `notify-physical-assessment-due`.

Alternativa ao `CRON_SECRET`: JWT de usuário `PLATFORM_OWNER` (aceito pelas functions de cron).

### Chamada manual (dev / incidente)

```powershell
# PowerShell
$secret = "SEU_CRON_SECRET"
$anon = "SUA_ANON_KEY"
curl.exe -X POST "https://iqqmcvrwysoqoondbnbh.supabase.co/functions/v1/charge-recurring-invoices" `
  -H "Authorization: Bearer $secret" `
  -H "apikey: $anon" `
  -H "Content-Type: application/json"
```

Substitua `charge-recurring-invoices` por `notify-upcoming-invoices` ou `notify-physical-assessment-due`.

### pg_cron (Supabase)

1. Dashboard → **Database → Extensions** → habilitar `pg_cron` e `pg_net`.
2. Configurar settings no Postgres (uma vez):

```sql
ALTER DATABASE postgres SET app.cron_secret = 'seu_cron_secret';
ALTER DATABASE postgres SET app.supabase_anon_key = 'sua_anon_key';
```

3. Agendar cobrança recorrente:

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

4. Lembretes de fatura (exemplo):

```sql
SELECT cron.schedule(
  'ringpro-notify-upcoming-invoices',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://iqqmcvrwysoqoondbnbh.supabase.co/functions/v1/notify-upcoming-invoices',
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

**Ver jobs:** `SELECT * FROM cron.job;`  
**Remover:** `SELECT cron.unschedule('ringpro-charge-recurring-invoices');`

### O que cada job faz

| RPC / lógica | Efeito |
|--------------|--------|
| `list_recurring_card_charge_jobs()` | Faturas com cartão default, retry D+1/D+3/D+7 |
| `apply_academy_dunning()` | Aluno `INADIMPLENTE` após 3 dias de grace (PRD §10.2) |
| `notify_upcoming_academy_invoices()` | Notificação in-app D-3 e no vencimento |
| `refresh_saas_invoice_status()` + `apply_saas_kill_switch()` | Academia `SUSPENSO` após 15 dias fatura SaaS atrasada — **RPC existe, cron não configurado** |

---

## 4. Pagar.me

### Configuração

1. Dashboard Pagar.me → **Desenvolvedores → Webhooks**
2. URL: `https://iqqmcvrwysoqoondbnbh.supabase.co/functions/v1/pagarme-webhook`
3. Eventos: `charge.paid`, `order.paid`
4. Copiar secret → `supabase secrets set PAGARME_WEBHOOK_SECRET=...`
5. `supabase secrets set PAGARME_API_KEY=sk_...` e `PAYMENTS_MODE=live`
6. Frontend: `VITE_PAYMENTS_MODE=live`, `VITE_PAGARME_PUBLIC_KEY=pk_...`
7. `supabase functions deploy pagarme-webhook create-payment-charge`

### Modos

| Modo | Comportamento |
|------|---------------|
| `mock` (default) | Sem API real; botão "Simular pagamento (dev)" no portal aluno |
| `live` | Cobrança real; webhook confirma fatura |

### Teste do webhook

```bash
node scripts/test-pagarme-webhook.mjs --invoice-id <uuid> [--charge-id ch_xxx]
cd frontend && npm run test:smoke:phase2
```

Sem `PAGARME_WEBHOOK_SECRET`, o smoke Fase 2 usa fallback `simulate-payment`.

### Segurança

- Em `live`, webhook valida HMAC (`x-pagarme-signature` / `x-hub-signature-256`).
- Cartão nunca passa pelo portal academia — só aluno (PCI).
- `simulate-payment` **não** deve estar acessível em produção (restrinja por ambiente ou remova deploy).

Detalhes: [ADR-001](./decisoes/001-gateway-pagamentos.md).

---

## 5. Backup e restore

### Backup (Supabase)

| Método | Quando usar |
|--------|-------------|
| **Backups automáticos** | Dashboard → Project Settings → Database — planos pagos incluem PITR |
| **Export lógico** | `pg_dump` via connection string (Session pooler) para snapshot manual |
| **Migrations** | Fonte de verdade do schema em `supabase/migrations/` |

```bash
# Export schema (exemplo — ajuste connection string)
pg_dump "postgresql://postgres:...@db.iqqmcvrwysoqoondbnbh.supabase.co:5432/postgres" \
  --schema-only --no-owner -f backup-schema-$(date +%Y%m%d).sql
```

### Storage

Buckets de contratos/documentos: exportar periodicamente via Dashboard → Storage ou API com service role. Documentar buckets por academia em inventário interno.

### Restore

1. **PITR:** Dashboard → Database → Backups → restore para ponto no tempo (plano Pro+).
2. **Schema:** `npx supabase db push` em ambiente limpo (não reverte dados).
3. **Dados:** restore a partir de dump SQL em janela de manutenção — testar em projeto staging primeiro.

`scripts/apply-db-remote.mjs` é **deploy forward-only**, não substitui restore de dados.

### RTO / RPO (sugestão para produção)

| Métrica | Alvo sugerido |
|---------|---------------|
| RPO | ≤ 24 h (backup diário) ou ≤ 1 h com PITR |
| RTO | ≤ 4 h para reestabelecer app + banco |

---

## 6. Rotação de chaves

Ordem recomendada para evitar downtime:

### 6.1 `CRON_SECRET`

1. Gerar novo secret: `openssl rand -hex 32`
2. `supabase secrets set CRON_SECRET=novo`
3. Atualizar `app.cron_secret` no Postgres (se usar pg_cron)
4. Atualizar cron externo (GitHub Actions, etc.)
5. Testar chamada manual com novo secret

### 6.2 Pagar.me (`PAGARME_API_KEY`, `PAGARME_WEBHOOK_SECRET`)

1. Criar nova chave/webhook secret no Dashboard Pagar.me
2. `supabase secrets set` com novos valores
3. Atualizar webhook URL se mudar projeto
4. `npm run test:smoke:phase2` ou `test-pagarme-webhook.mjs`
5. Revogar chave antiga no Pagar.me

### 6.3 Supabase anon key

1. Dashboard → Settings → API → Generate new anon key (se disponível) ou rotate JWT secret (invalida todas as sessões)
2. Atualizar `.env`, CI secrets, `app.supabase_anon_key` no banco
3. Redeploy frontend
4. Revalidar smokes

### 6.4 Service role key

1. Dashboard → Settings → API → Reset service role key
2. Atualizar `SUPABASE_SERVICE_ROLE_KEY` em secrets locais/CI — **nunca** no frontend
3. Edge Functions recebem automaticamente do Supabase runtime

### 6.5 JWT signing key (Supabase Auth)

Rotação invalida todas as sessões ativas. Agendar em janela de manutenção; avisar usuários. Ver [documentação Supabase Auth](https://supabase.com/docs/guides/auth/signing-keys).

---

## 7. Incidentes e resposta

### 7.1 Webhook Pagar.me parado

**Sintomas:** faturas ficam `PENDENTE` após pagamento real.

1. Dashboard Pagar.me → Webhooks → verificar entregas falhas
2. Logs: Supabase → Edge Functions → `pagarme-webhook`
3. Confirmar `PAGARME_WEBHOOK_SECRET` e `PAYMENTS_MODE=live`
4. Reenviar evento no Dashboard ou `node scripts/test-pagarme-webhook.mjs`
5. Conferir fatura: `academy_invoices.status` → `PAGO`

### 7.2 Cron de cobrança não rodou

**Sintomas:** `next_billing_date` passou, sem nova fatura/cobrança.

1. `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;`
2. Chamada manual à `charge-recurring-invoices` (§3)
3. Verificar `CRON_SECRET` e header `apikey`
4. Logs da Edge Function

### 7.3 Alunos indevidamente `INADIMPLENTE`

1. Verificar `academy_invoices` e `academy_payments` do aluno
2. Se pagamento confirmado mas status errado: `refresh_academy_invoice_status()` ou correção manual com auditoria
3. Executar `apply_academy_dunning` só após reconciliar pagamentos

### 7.4 Academia `SUSPENSO` (kill switch SaaS)

**Regra (PRD):** fatura SaaS (`saas_invoices`) com 15+ dias de atraso → `academies.status = SUSPENSO`.

**Efeito:** staff da academia não consegue login (exceto `PLATFORM_OWNER`); convites e cadastro público bloqueados.

**Reativar:**

1. Confirmar pagamento da fatura SaaS
2. Atualizar `saas_invoices.status`
3. `UPDATE academies SET status = 'ATIVO' WHERE id = '...';` (via service role ou portal plataforma)
4. Staff faz login novamente

**Nota:** `refresh_saas_invoice_status()` / `apply_saas_kill_switch()` existem no banco mas **não há cron configurado** — suspensão automática depende de agendar esse RPC ou processo manual.

### 7.5 `apply-dunning` exposta

A function `apply-dunning` não valida `CRON_SECRET` — qualquer caller com URL pública pode disparar o RPC (idempotente, mas indesejado). **Mitigação:** não divulgar URL; em produção considerar proteção por secret ou remover deploy e chamar só via `charge-recurring-invoices`.

### 7.6 Onde ver logs

| Local | Conteúdo |
|-------|----------|
| Supabase → Edge Functions → Logs | Erros HTTP, stack traces |
| Supabase → Database → Logs | Queries lentas, erros Postgres |
| Browser DevTools | Erros frontend (RLS 403, etc.) |
| `audit_logs` (tabela) | LOGIN e ações auditáveis |

---

## 8. Monitoramento (estado atual)

Não há APM (Sentry/Datadog) integrado no MVP. **Gate de saúde = smoke tests** após cada deploy.

Checklist pós-deploy produção:

- [ ] `npm run test:smoke:phase2` (se pagamentos alterados)
- [ ] `npm run test:smoke:rls` (se policies alteradas)
- [ ] `npm run check:practices` (UP-507 — sem .env necessário)
- [ ] Webhook teste no Pagar.me (evento sandbox)
- [ ] Login owner + aluno seed em staging
- [ ] Verificar último `cron.job_run_details` (se pg_cron ativo)

---

## 9. Dívida operacional conhecida

| Item | Status | Ação sugerida |
|------|--------|---------------|
| Kill switch SaaS automático | RPC sem cron | Agendar `refresh_saas_invoice_status` diário |
| `apply-dunning` sem auth | Aberto | Adicionar `CRON_SECRET` ou remover deploy público |
| `simulate-payment` em prod | Risco | Não deployar ou bloquear por `PAYMENTS_MODE` |
| Monitoramento 24/7 | Ausente | Uptime + alertas em V2 |
| UI suspender academia | Parcial | `updateAcademyStatus` existe; reforçar no portal plataforma |

---

## 10. Referências

| Documento | Conteúdo |
|-----------|----------|
| [`README.md`](../README.md) | Quick start, deploy, cron exemplo |
| [`DEV-SEED.md`](./DEV-SEED.md) | Usuários seed, smokes |
| [`PRD.md`](./PRD.md) §10.2 | Grace period, kill switch, dunning |
| [`wireflows.md`](./wireflows.md) | WF-6 cobrança recorrente |
| [ADR-001](./decisoes/001-gateway-pagamentos.md) | Gateway Pagar.me |
| [`PLANO-ATUALIZACOES.md`](./PLANO-ATUALIZACOES.md) | Tickets UP-XXX |
| [`RELEASE.md`](./RELEASE.md) | Release notes por fase |

---

*Runbook UP-506 — RingPro. Atualizar quando novos crons, secrets ou procedimentos forem adicionados.*
