# Patterns — RingPro

## UI

- Componentes em `components/ui/` — sem regra de negócio
- Features em `features/<portal>/` — páginas
- Dados: contexts + chamadas Supabase (hooks finos depois)

## Erros

- Auth: mensagem em português para o usuário
- Log técnico: `console.error` com contexto (remover em prod com logger)

## Enums

Inglês no banco: `ATIVO`, `INADIMPLENTE`, `PLATFORM_OWNER`, etc.

## Nomenclatura

Produto: **RingPro** apenas. Ver práticas proibidas §10.
