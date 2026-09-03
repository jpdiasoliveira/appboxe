# Plano — Schema Hardening RingPro

**Versão:** 1.0  
**Data:** 02/09/2026  
**Contexto:** banco remoto sem dados reais — momento ideal para endurecer o modelo antes de sair do “MVP improvisado”.

**Relacionado:** [`schema-snapshot.md`](./schema-snapshot.md) · [`PLANO-ATUALIZACOES.md`](./PLANO-ATUALIZACOES.md) · [`PRD.md`](./PRD.md)

---

## Objetivo

Manter o **mesmo domínio** RingPro (40 tabelas em 02/09/2026 — ver [`schema-snapshot.md`](./schema-snapshot.md)), reduzindo improviso:

- enums em vez de `text` solto
- colunas de gateway (Pagar.me) antes da Fase 2 financeira
- RLS da equipe plataforma (`PLATFORM_SUPPORT` / `PLATFORM_FINANCE`)
- índices e comentários para operação e onboarding de devs

**Não é** redesign do ER (sem renomear tabelas, sem squash de migrations históricas).

---

## Ondas

| Onda | Foco | Migrations | Status |
|------|------|------------|--------|
| **A** | Enums, gateway, RLS plataforma, índices, comments | `161000` … `164000` | ✅ aplicado |
| **B** | Modelo SaaS explícito (`platform_settings`, `cnpj`, `saas_payments`) | `171000` … `174000` | ✅ aplicado |
| **C** | Features futuras (QR, faixa, filial operacional) | por ticket UP-3xx | ⬜ quando entrar na fila |

---

## Onda A — detalhe (UP-SCH-01 … 04)

### UP-SCH-01 — Enums de domínio (`20260831610000_schema_enums.sql`)

| Enum | Valores | Tabelas |
|------|---------|---------|
| `invite_status` | PENDING, COMPLETED, EXPIRED, CANCELLED | `student_invites`, `staff_invites`, `platform_staff_invites` |
| `lead_status` | NOVO, CONVITE_ENVIADO, CONVERTIDO | `leads` |
| `subscription_status` | ATIVO, INATIVO, CANCELADO | `student_subscriptions` |
| `payment_record_status` | PENDENTE, PAGO, FALHOU, CANCELADO | `academy_payments` |
| `session_status` | SCHEDULED, CANCELLED, COMPLETED | `class_sessions` |

Conversões adicionais:

- `staff_invites.role` → `user_role` (PROFESSOR | ASSISTANT)
- `academy_plans.status` → `academy_status`
- `saas_plans.status` → `academy_status`

### UP-SCH-02 — Gateway (`20260831620000_schema_gateway.sql`)

| Tabela | Colunas novas |
|--------|----------------|
| `academy_invoices` | `gateway_provider`, `gateway_charge_id`, `gateway_metadata` |
| `academy_payments` | `gateway_payment_id`, `idempotency_key`, `gateway_metadata` |
| `saas_invoices` | `gateway_provider`, `gateway_charge_id`, `gateway_metadata` |

Índices: `gateway_charge_id`, `idempotency_key` (unique parcial).

### UP-SCH-03 — RLS equipe plataforma (`20260831630000_schema_platform_rls.sql`)

- Função `is_platform_finance()` (owner + PLATFORM_FINANCE)
- `saas_invoices`: leitura `is_platform_operator()`; update financeiro `is_platform_finance()`
- `saas_plans`: leitura equipe plataforma
- `academies`: leitura equipe plataforma (staff)

### UP-SCH-04 — Documentação no banco (`20260831640000_schema_comments.sql`)

`COMMENT ON TABLE` nas tabelas principais de cada domínio.

---

## Onda B — detalhe (UP-SCH-11 … 14)

### UP-SCH-11 — `platform_settings` (`20260831710000_platform_settings.sql`)

Tabela key/value com chaves fixas: `gateway`, `email`, `billing`.

- RLS: leitura `is_platform_operator()`; escrita `is_platform_owner()`
- Seed com defaults (Pagar.me sandbox, from_name RingPro, due_day 10)

### UP-SCH-12 — Billing academia (`20260831720000_academy_billing.sql`)

| Coluna | Tipo | Uso |
|--------|------|-----|
| `academies.cnpj` | TEXT | CNPJ fiscal |
| `academies.billing_email` | TEXT | E-mail de cobrança SaaS |

- Policy `academies_owner_update` — dono atualiza própria academia

### UP-SCH-13 — `saas_payments` (`20260831730000_saas_payments.sql`)

Espelha `academy_payments` para faturas SaaS:

- `invoice_id`, `amount`, `method`, `status`, `gateway_*`, `idempotency_key`
- RLS: owner plataforma (ALL), equipe (read), finance (insert), school owner (read próprias)

### UP-SCH-14 — Filial do aluno (`20260831740000_students_branch.sql`)

- `students.branch_id` → `academy_branches(id)`
- Trigger valida que filial pertence à mesma academia

---

## Como aplicar

```bash
# Windows (PowerShell)
npx.cmd supabase db push --yes

# Verificar
npx.cmd supabase db query --linked -f scripts/sql/verify-ringpro-schema.sql
```

**Frontend:** tipos TypeScript continuam como `string` nos status — compatível com enums Postgres via Supabase client.

---

## Critérios de pronto (Onda A)

- [x] Migrations `161000`–`164000` no repo
- [x] `db push` no remoto sem erro
- [ ] `npm run typecheck` no frontend
- [ ] Edge functions (pagarme-webhook, invites) continuam gravando status válidos

## Critérios de pronto (Onda B)

- [x] Migrations `171000`–`174000` no repo
- [x] `db push` no remoto sem erro
- [x] `npm run typecheck` no frontend

---

## Governança

- 1 onda = conjunto de migrations numeradas; não editar migrations já aplicadas no remoto
- Onda B só após validar A em dev/staging
- Features de produto novas (QR, faixa) → Onda C ou ticket UP-3xx, não antecipar tabela
