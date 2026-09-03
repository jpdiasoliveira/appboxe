# RingPro — Release notes

Histórico de entregas por **fase** do [`PLANO-ATUALIZACOES.md`](./PLANO-ATUALIZACOES.md). Cada bloco corresponde a um checkpoint ou conjunto de tickets UP-XXX.

**Como usar:** ao concluir uma fase ou release de produção, copie o [template](#template-nova-release) abaixo, preencha e adicione no topo da seção [Histórico](#histórico).

---

## Template — nova release

```markdown
## [vX.Y.Z] — YYYY-MM-DD — Título curto

**Fase:** N — Nome da fase  
**Checkpoint:** UP-XXX  
**Ambiente:** dev | staging | produção

### Destaques

- Bullet 1 (valor para o usuário)
- Bullet 2

### Entregas (tickets)

| Ticket | Escopo |
|--------|--------|
| UP-XXX | Descrição |

### Banco / Supabase

- Migrations: `20260831XXXXXX_...`
- Edge Functions novas ou alteradas: `nome-da-function`
- Secrets: `NOME` (se aplicável)

### Validação

- [ ] `npm run typecheck && npm run test && npm run build`
- [ ] `npm run test:smoke:phaseN` (ou comando específico)
- [ ] Smoke manual (persona): owner / professor / aluno

### Deploy

1. `npx supabase db push`
2. `supabase functions deploy ...`
3. `supabase secrets set ...` (se necessário)
4. Frontend build + deploy

### Riscos / rollback

- O que monitorar após deploy
- Como reverter (migration forward-only → corrigir forward)

### Documentação atualizada

- [ ] `PRD.md` (se requisito mudou)
- [ ] `DEV-SEED.md` / `RUNBOOK.md`
```

---

## Histórico

### Fase 5 — Qualidade & produto

**Período:** 2026-09 · **Status:** ✅ concluída

| Ticket | Entrega |
|--------|---------|
| UP-502 | E2E Playwright — owner → convite → onboarding → pagamento mock → Ativo (`npm run test:e2e`) |
| UP-503 | Smoke RLS — ASSISTANT/professor sem financeiro + isolamento tenant (`npm run test:smoke:rls`) |
| UP-506 | [`RUNBOOK.md`](./RUNBOOK.md) — deploy, crons, Pagar.me, backup, incidentes |
| UP-507 | `npm run check:practices` — service_role, `any`, nomenclatura §10 |
| UP-504 | Capacitor `apps/student-app` — deep link `ringpro://convite/:token` |
| UP-505 | Push FCM — `push_device_tokens`, `register-push-token`, vencimento + convite |
| UP-501 | Mockups HTML — todos os portais (`_shared/layout.css` + telas por persona) |
| UP-510 | Este arquivo |

**Pendente:** nenhum ticket aberto na Fase 5.

**Validação Fase 5:**

```bash
cd frontend && npm run check:practices
cd frontend && npm run test:e2e          # requer .env
cd frontend && npm run test:smoke:rls    # requer .env
```

---

### Fase 4 — Plataforma & escala

**Data:** 2026-09-02 · **Checkpoint:** UP-410 · **Status:** ✅

#### Destaques

- Onboarding guiado da academia (wizard pós-criação).
- Métricas e equipe no portal plataforma.
- Fundação multi-unidade (`academy_branches`).
- Landing com cadastro público opcional (`module_student_self_register`).
- Schema remoto higienizado — **44 tabelas** RingPro, sem legado POS.

#### Tickets principais

| Área | Tickets |
|------|---------|
| Plataforma | UP-401 … UP-404 — onboarding academia, métricas, equipe plataforma |
| Filiais | UP-405 — `academy_branches`, `/academy/filiais` |
| Landing V2 | UP-406 — ADR subdomínio + `landing-url.ts` |
| Cadastro público | UP-407 — `public-student-register` (flag off por default) |
| Checkpoint | UP-410 — schema verify, hardening Ondas A+B |

#### Migrations (referência)

`20260831460000` … `20260831490000`, `20260831500000` (cleanup legado), ondas hardening `161000`–`174000`.

#### Validação

- Schema: `npx supabase db query --linked -f scripts/sql/verify-ringpro-schema.sql`
- Smoke geral academia: `npm run test:smoke`

---

### Fase 3 — Academia avançada

**Data:** 2026-09-02 · **Checkpoint:** UP-310 · **Status:** ✅

#### Destaques

- Check-in por QR (professor gera → aluno confirma presença).
- Graduação / faixas por modalidade.
- Documentos do aluno (upload staff), reposição de aula, turmas com roster fixo.
- Contrato PDF no convite, avaliação física periódica, período experimental configurável.

#### Tickets principais

| Ticket | Funcionalidade |
|--------|----------------|
| UP-301 | QR check-in presença |
| UP-302 | Graduação / faixas |
| UP-303 | Período experimental |
| UP-305 | Avaliação física |
| UP-306 | Contrato PDF matrícula |
| UP-311 | Documentos do aluno |
| UP-312 | Reposição de aula |
| UP-313 | Turmas (`class_groups`) |
| UP-310 | Checkpoint smoke Fase 3 |

#### Validação

```bash
cd frontend && npm run test:smoke:phase3
```

Checklist manual: [`DEV-SEED.md`](./DEV-SEED.md) — Fase 3.

---

### Fase 2 — Financeiro real (Pagar.me)

**Data:** 2026-09-02 · **Checkpoint:** UP-210 · **Status:** ✅

#### Destaques

- Gateway **Pagar.me** ([ADR-001](./decisoes/001-gateway-pagamentos.md)) com modo mock em dev.
- PIX, boleto e cartão tokenizado no portal aluno.
- Webhook `pagarme-webhook` com HMAC e idempotência.
- Cobrança recorrente cartão + retry D+1/D+3/D+7.
- Relatórios financeiros academia e plataforma (CSV/PDF).
- Lembretes in-app D-3 e no vencimento (UP-111).

#### Tickets principais

| Ticket | Funcionalidade |
|--------|----------------|
| UP-200 … UP-204 | Gateway, abstração `lib/payments/`, webhook |
| UP-205 | `charge-recurring-invoices` |
| UP-207 / UP-208 | Relatórios financeiros |
| UP-209 | QR PIX + boleto no portal aluno |
| UP-210 | Checkpoint smoke Fase 2 |

#### Secrets (produção)

`PAGARME_API_KEY`, `PAGARME_WEBHOOK_SECRET`, `PAYMENTS_MODE=live`, `VITE_PAGARME_PUBLIC_KEY`.

#### Validação

```bash
cd frontend && npm run test:smoke:phase2
node scripts/test-pagarme-webhook.mjs --invoice-id <uuid>
```

---

### Fase 1 — Matrícula & experiência

**Data:** 2026-09-02 · **Checkpoint:** UP-112 · **Status:** ✅

#### Destaques

- Fluxo completo: lead → convite → cadastro aluno → wizard onboarding → plano → modalidades → pagamento.
- Convite por link (e-mail/WhatsApp), termo digital, contrato no convite.
- Agenda de aulas (grupo, individual, eventos) com feature flag.
- Portal professor com escopo por modalidade (sem financeiro para assistant).

#### Tickets principais

| Ticket | Funcionalidade |
|--------|----------------|
| UP-101 … UP-107 | Convite, onboarding, termo, detalhe aluno |
| UP-110 | Gráficos dashboard academia |
| UP-111 | Lembretes vencimento in-app |
| UP-112 | Checkpoint smoke Fase 1 |
| UP-113 | Agenda de aulas |

#### Validação

```bash
cd frontend && npm run test:smoke:phase1
cd frontend && npm run test:e2e    # UP-502 — mesmo fluxo no browser
```

Usuários seed: [`DEV-SEED.md`](./DEV-SEED.md).

---

## Versões futuras (planejado)

| Versão | Escopo | Ticket |
|--------|--------|--------|
| App aluno (lojas) | Capacitor + deep link convite | UP-504 ✅ |
| Push notifications | FCM — vencimento, convite | UP-505 ✅ |
| Mockups completos | Todos os portais HTML | UP-501 ✅ |

---

## Referências

| Documento | Uso |
|-----------|-----|
| [`PLANO-ATUALIZACOES.md`](./PLANO-ATUALIZACOES.md) | Tickets UP-XXX por fase |
| [`PRD.md`](./PRD.md) | Requisitos de produto |
| [`RUNBOOK.md`](./RUNBOOK.md) | Deploy e operação |
| [`DEV-SEED.md`](./DEV-SEED.md) | Seed e smokes |

---

*UP-510 — template e histórico por fase. Atualizar ao fechar cada release de produção.*
