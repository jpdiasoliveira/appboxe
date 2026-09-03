# Padrões de testes — unitários e e2e

Complementa [03](./03-Praticas-Proibidas.md) e [07](./07-Setup-Repositorio-IA.md).  
Guia **genérico** — adapte paths e comandos à stack (NestJS, Express, React, etc.).

---

## Duas suítes, dois propósitos

| Suíte | Padrão de arquivo | Comando típico | O que testa |
|-------|-------------------|----------------|-------------|
| **Unit** | `*.spec.ts` ao lado do código | `npm test` | Lógica isolada, mocks |
| **E2E** | `test/*.e2e-spec.ts` | `npm run test:e2e` | HTTP real, banco real, app bootada |

Não misturar: arquivo `*.e2e-spec.ts` **não** entra na suíte unitária (regex separado no Jest/Vitest).

---

## Unitários — regras

1. **Não** subir o container DI completo se só precisa testar uma classe — construir o SUT direto com mocks (`jest.fn()`).
2. Descrições `it('...')` em **PT-BR**; código do teste em inglês (mesmo padrão do prod).
3. Mock de libs externas no nível do módulo (`jest.mock('bcrypt')`), não wrapper desnecessário.
4. Testes que só repetem o compilador/typo — **não** adicionar.

Documente o padrão exato em `.agents/docs/testing.md` do repo.

---

## E2E — bootstrap espelha produção

O helper `bootstrapTestApp()` (ou equivalente) deve aplicar os **mesmos** pipes, filters e guards globais que `main.ts`.

**Se adicionar global em `main.ts` → replicar no bootstrap de teste.**  
Sem isso, e2e passa e produção diverge (ou o contrário).

---

## Fixtures — prefixo e isolamento

E2E usa banco **real** (dev/compartilhado). Regras:

| Regra | Por quê |
|-------|---------|
| Email/telefone via helper (`uniqueEmail()`) | Evita colisão entre runs paralelos |
| Prefixo fixo em todo fixture (`e2e-test`, `e2e-pf`, …) | Cleanup seletivo |
| **Nunca** `TRUNCATE` ou `deleteMany` sem filtro | Pode apagar dados de dev humano |
| **Nunca** email hardcoded literal em spec novo | Colide e flakya CI |

Registre o prefixo em `.agents/docs/testing.md`.

---

## Teardown — padrão obrigatório

### Errado

```typescript
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await app.close();
});
```

Usuários e2e frequentemente são `createdBy` de perfis, módulos, logs de auditoria — FK bloqueia o delete.

### Certo

```typescript
afterAll(async () => {
  // 1. Limpar artefatos específicos do teste (perfis criados neste describe, etc.)
  // 2. Sempre encerrar com o helper central:
  await cleanupE2eUsers(prisma);
  await app.close();
});
```

`cleanupE2eUsers(prisma)` (nome pode variar por repo):

1. Encontra usuários pelo prefixo de email e2e
2. Reatribui `updatedById` onde necessário (fallback admin)
3. Remove permissões → perfis → módulos criados por esses usuários
4. Remove os usuários e2e

**Todo spec e2e que cria usuário via helper oficial deve usar o cleanup oficial no `afterAll`.**

Se o teste cria entidades além de usuário (perfis com prefixo, módulos de seed), limpe na ordem inversa das FKs **antes** do cleanup de usuários, ou estenda o helper compartilhado.

---

## Seed em e2e

- Dados canônicos de domínio → `prisma/seed.ts` ou helper `runCanonicalSeed(prisma)` em `test/support/`
- **Não** colocar seed de negócio dentro de `migration.sql`
- Seed em `beforeAll` que referencia `createdById` do primeiro admin e2e → teardown **deve** remover módulos/perfis antes dos usuários

---

## Checklist — novo spec e2e

- [ ] Usa `bootstrapTestApp()` / equivalente
- [ ] Fixtures com prefixo documentado
- [ ] `afterAll` com cleanup central (`cleanupE2eUsers` ou equivalente)
- [ ] Estados cobertos: happy path, 401, 403, 404/409 de negócio (quando aplicável)
- [ ] Descrições `it` em PT-BR
- [ ] CI local = `lint` + `typecheck` + `test` + `test:e2e`

---

## Relação com CI

Os mesmos comandos do `AGENTS.md` (Validation) devem rodar no pipeline.  
Pre-commit hook pode rodar subset — **CI é a fonte final**.

Se Windows falhar `format:check` por CRLF mas Linux CI passa, documente no README; não desabilitar hook sem alinhar o time.
