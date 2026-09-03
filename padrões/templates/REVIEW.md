# Critérios de code review

Copie para `.github/REVIEW.md` (ou equivalente) no repositório do produto.  
Adapte checklists e paths à stack.

**Objetivo:** review consistente — segurança, contrato, convenções, testes.

---

## Como usar

1. Revisor (humano ou bot) lê o **diff da PR**, não só a descrição.
2. Aplica os checklists abaixo que se encaixam no escopo da mudança.
3. Comentários **concretos** (arquivo + linha + o que corrigir).
4. `REQUEST_CHANGES` só para problema real; nit opcional sem bloquear.

Fontes de verdade do projeto: `AGENTS.md`, `docs/PRD.md`, `.agents/docs/`.

---

## Checklist universal (toda PR)

- [ ] Escopo fechado em **um ticket** — sem feature extra no mesmo diff
- [ ] Sem secrets, tokens, `.env` ou PII em log/código
- [ ] Validação de entrada nas bordas HTTP (DTO, schema, pipe)
- [ ] Erros com código estável e mensagem adequada ao cliente
- [ ] Testes cobrem comportamento novo ou alterado (não só happy path óbvio)
- [ ] Nomes e enums alinhados ao PRD e convenções do repo
- [ ] Sem `any` / escape de tipagem para “passar rápido”
- [ ] Sem `catch` vazio ou erro engolido

---

## API / backend

Aplicar quando mudar `src/modules/`, controllers, services, schema, auth:

- [ ] Controller fino; regra de negócio no service
- [ ] DTOs com validação; um arquivo por classe (ou padrão do repo)
- [ ] Erros do catálogo `errors/` do **próprio módulo**
- [ ] Rotas literais antes de rotas com `:id`
- [ ] `GET` → permissão `read`; `manage` só quando apropriado (CASL/RBAC)
- [ ] Paginação via helper compartilhado — não reimplementar skip/take
- [ ] Swagger/OpenAPI alinhado ao contrato real (PT-BR se for padrão do produto)
- [ ] Migration via CLI após `schema` — não migration manual (salvo exceção documentada)
- [ ] Sem SQL raw em `src/` sem exceção documentada
- [ ] Spec de controller/service para módulos novos ou alterados
- [ ] E2E: 401 sem auth, 403 sem permissão, 404/409 de negócio quando aplicável

---

## Frontend / SPA

Aplicar quando mudar rotas, páginas, formulários, HTTP:

- [ ] Dados via loader + `queryOptions` — sem `fetch` em `useEffect` para dado de tela
- [ ] Mesma `queryOptions` no loader e no componente
- [ ] `validateSearch` com Zod; UUID em params de URL
- [ ] `encodeURIComponent` em segmentos de path na camada HTTP
- [ ] Estados: loading, vazio, erro e retry
- [ ] Formulários: `mutateAsync` em try/catch com feedback — não engolir erro
- [ ] Testes HTTP com MSW na fronteira — não mockar service por spy se o padrão for MSW
- [ ] UI: tokens do design system — sem cor/spacing solto ([04](../04-Padroes-UI.md))
- [ ] Não editar arquivos gerados pelo router (ex.: `routeTree.gen.ts`)

---

## Segurança

Aplicar quando tocar auth, guards, env, permissões:

- [ ] Auth não pode ser substituída só por esconder botão na UI
- [ ] Senhas, tokens, TOTP, cartão: nunca logar ou persistir em claro
- [ ] Variáveis sensíveis só em env validado
- [ ] Rate limit / throttling onde o repo já exige
- [ ] Persona de negócio ≠ role de login (ver [09](../09-Governanca-Escopo-e-PRs-Empilhadas.md))

---

## Testes

- [ ] Unit: SUT direto com mocks — sem subir DI inteiro sem necessidade
- [ ] E2E: `bootstrap` espelha `main.ts`; teardown com helper central ([08](../08-Padroes-Testes-E2E.md))
- [ ] Descrições `it(...)` em PT-BR

---

## Resultado da review

| Resultado | Quando |
|-----------|--------|
| **Approve** | Checklists aplicáveis ok; sem bloqueio real |
| **Request changes** | Bug, segurança, contrato quebrado, convenção clara violada |
| **Comment** | Dúvida, sugestão não bloqueante, elogio |

Após o autor corrigir e pushar: **nova review** no commit atual — `CHANGES_REQUESTED` antigo não conta sozinho.

---

## Definition of Done

Critérios completos de ticket, PR e release: [11-Definition-of-Done.md](../11-Definition-of-Done.md).
