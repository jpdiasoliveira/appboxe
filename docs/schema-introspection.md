# Introspecção do schema (Supabase)

Scripts SQL para auditar o banco remoto e manter [`schema-snapshot.md`](./schema-snapshot.md) atualizado.

## Arquivos (`scripts/sql/`)

| Script | Uso |
|--------|-----|
| [`introspect-ringpro-schema.sql`](../scripts/sql/introspect-ringpro-schema.sql) | Completo: colunas, PK, FK, índices, enums, RPC, RLS, contagem de linhas, markdown |
| [`introspect-columns-only.sql`](../scripts/sql/introspect-columns-only.sql) | Só tabelas + colunas (`public`) |
| [`verify-ringpro-schema.sql`](../scripts/sql/verify-ringpro-schema.sql) | Verificação rápida: legado POS, tabelas críticas, total, RPCs |

Migrations versionadas: `supabase/migrations/` — fonte de verdade para **criar** schema; introspecção confirma o **remoto**.

## Como rodar

### SQL Editor (Dashboard)

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Cole o script → **Run**
3. Exporte CSV ou copie o resultado para documentação

### CLI (projeto linkado)

```bash
npx supabase login
npx supabase link --project-ref iqqmcvrwysoqoondbnbh
npx supabase db query --linked -f scripts/sql/verify-ringpro-schema.sql
```

## Workflow sugerido

1. `verify-ringpro-schema.sql` — sanity check rápido
2. `introspect-ringpro-schema.sql` — export completo (salvar com data, ex. `schema-2026-09-02/`)
3. Comparar com [`diagrama-er.md`](./diagrama-er.md) e [`schema-snapshot.md`](./schema-snapshot.md)
4. Divergências → nova migration em `supabase/migrations/` (não editar migrations já aplicadas)

## O que o script completo retorna

| # | Conteúdo |
|---|----------|
| 1 | Resumo por schema (`public`, `auth`, `storage`) |
| 2 | Catálogo de colunas |
| 3 | Primary keys |
| 4 | Foreign keys |
| 5 | UNIQUE / CHECK |
| 6 | Índices |
| 7 | Enums |
| 8 | Funções RPC `public` |
| 9 | Policies RLS |
| 10 | Tabelas sem RLS |
| 11 | Contagem de linhas por tabela |
| 12 | Linhas markdown para colar em doc |

## Estado atual (02/09/2026)

| Check | Remoto |
|-------|--------|
| Tabelas `public` | 32 (só RingPro) |
| Legado POS | 0 |
| `platform_staff_invites` / `academy_branches` | ✅ |

Snapshot: [`schema-snapshot.md`](./schema-snapshot.md).  
Hardening: [`PLANO-SCHEMA-HARDENING.md`](./PLANO-SCHEMA-HARDENING.md) (Onda A: enums + gateway).
