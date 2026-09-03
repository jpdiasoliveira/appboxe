# Supabase — RingPro

Padrões técnicos alinhados ao modelo multi-tenant do RingPro.

---

## Stack

| Componente | Uso |
|------------|-----|
| PostgreSQL | Dados relacionais |
| Supabase Auth | `auth.users` — identidade |
| RLS | Isolamento por `academy_id` + role |
| Storage | `academy-logos`, `instructor-photos`, `landing-assets` |
| Edge Functions | Webhooks Pagar.me, cron dunning, operações service role |

**Frontend:** `@supabase/supabase-js` com **anon key** apenas.

---

## Identidade e perfil

```text
auth.users          → e-mail, senha, MFA (Supabase Auth)
public.profiles     → name, avatar_url, must_change_password
user_academy_roles  → user_id + academy_id + role (RBAC)
```

- Um user pode ter várias linhas em `user_academy_roles` (multi-academia).
- Role enum: `PLATFORM_OWNER` | `SCHOOL_OWNER` | `PROFESSOR` | `ASSISTANT` | `STUDENT`.

---

## RLS — padrão obrigatório

Toda tabela de negócio:

1. `ENABLE ROW LEVEL SECURITY`
2. Coluna `academy_id UUID NOT NULL REFERENCES academies(id)` (exceto tabelas globais SaaS)
3. Policies usando função helper, ex.: `get_user_role(academy_id)`, `is_platform_owner()`

### Regras por role (resumo)

| Role | Leitura | Escrita financeira |
|------|---------|-------------------|
| PLATFORM_OWNER | Global (bypass controlado) | Global SaaS |
| SCHOOL_OWNER | Própria academia | Sim |
| PROFESSOR | Própria academia | Sim |
| ASSISTANT | Própria academia | **Não** — policy negada em `invoices`, `payments`, KPIs financeiros |
| STUDENT | Próprios registros (`user_id`) | Próprio cartão/token |

**ASSISTANT:** negar SELECT/INSERT/UPDATE em tabelas financeiras — não só esconder no React.

---

## Migrations

- Caminho: `supabase/migrations/`
- Nomenclatura: `YYYYMMDDHHMMSS_descricao.sql`
- Toda migration com tabela nova → incluir RLS na mesma migration
- Enums em inglês: `ATIVO`, `INADIMPLENTE`, `PENDENTE`, `PAGO`

---

## Edge Functions (service role)

Usar quando:

- Webhook Pagar.me (confirmar PIX/boleto/cartão)
- Cron de inadimplência (grace period 3 dias)
- Cobrança recorrente cartão
- E-mail transacional que precisa de dados cross-tenant (raro)

**Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.

---

## Storage buckets

| Bucket | Quem escreve | Público |
|--------|--------------|---------|
| `academy-logos` | SCHOOL_OWNER | Sim (landing) |
| `instructor-photos` | SCHOOL_OWNER | Sim |
| `landing-assets` | SCHOOL_OWNER | Sim |
| `student-documents` | STUDENT (próprio) | Não |

Policies por `academy_id` no path ou metadata.

---

## Auth flows (Wave 1)

| Fluxo | Supabase |
|-------|----------|
| Login | `signInWithPassword` |
| Logout | `signOut` |
| Refresh | automático via client |
| Reset senha | `resetPasswordForEmail` |
| Verificação e-mail | `email_confirmed_at` — bloquear app até confirmar |
| 2FA PLATFORM_OWNER | Auth MFA TOTP |
| Senha provisória | `profiles.must_change_password` → redirect `/auth/trocar-senha` |

---

## Feature flags

Tabela `academy_feature_flags (academy_id, flag_key, enabled)`.

No frontend: hook `useFeatureFlag('module_attendance')` — oculta UI.

No backend: RLS ou Edge Function retorna 404/403 se flag desligada — **não confiar só no hide**.

---

## Checklist implementação Supabase

- [ ] Migration com `academy_id` onde aplicável
- [ ] RLS habilitado + policies por role
- [ ] ASSISTANT bloqueado em financeiro
- [ ] STUDENT só acessa próprios dados
- [ ] Seed de dev com 1 academia + roles de teste
- [ ] Edge Function para webhook se tocar pagamento

Referência ER: [`docs/diagrama-er.md`](../../docs/diagrama-er.md)
