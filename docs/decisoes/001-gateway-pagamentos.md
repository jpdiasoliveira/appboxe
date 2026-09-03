# ADR-001 — Gateway de pagamentos



**Status:** Aceito (revisão 3 — checkpoint Fase 2)  

**Data:** 02/09/2026  

**Contexto:** Fase 2 do [`PLANO-ATUALIZACOES.md`](../PLANO-ATUALIZACOES.md) (UP-201 … UP-210)



---



## Decisão



**Adotar [Pagar.me](https://pagar.me) como gateway padrão** do RingPro para cartão tokenizado, PIX e boleto.



- **Produção:** API Pagar.me (conta da academia ou split — ver abaixo).

- **Desenvolvimento:** sem credenciais → `MockPaymentService` + `simulate-payment` (comportamento atual).

- **Código:** Edge Functions `create-payment-charge`, `pagarme-webhook`, `charge-recurring-invoices`; abstração em `lib/payments/` (frontend) e `_shared/payments/` (edge).



---



## Histórico (revisão 1 — 31/08/2026)



Na primeira versão deste ADR, Pagar.me foi **adiado** enquanto o provedor não estivesse formalmente escolhido na UP-200, priorizando custo fixo zero para o RingPro. A avaliação foi concluída em 02/09/2026 com escolha do Pagar.me por API madura no Brasil, sandbox e suporte a PIX + cartão tokenizado.



**Revisão 3 (02/09/2026):** Fase 2 concluída (UP-210) — cobrança recorrente, relatórios, portal aluno com QR PIX, smoke automatizado e webhook assinado.



---



## Motivação (Pagar.me)



| Critério | Atendimento |

|----------|-------------|

| API PIX + cartão tokenizado (Brasil) | Sim |

| Sandbox / ambiente de teste | Sim |

| Webhooks | Sim (`charge.paid`, `order.paid`, etc.) |

| PCI delegada | Tokenização no gateway; sem PAN no RingPro |

| Edge Functions (Deno) | REST API; sem bloqueio de SDK no servidor |



**Custos:** taxas por transação na conta **recebedora** (academia). O RingPro não armazena cartão nem processa pagamento diretamente.



---



## O que permanece inalterado (regras de produto)



| Regra | Detalhe |

|-------|---------|

| **PCI** | Cartão **tokenizado** no Pagar.me; número completo **nunca** no servidor RingPro nem coletado por professor/assistant |

| **Canal** | Cadastro de cartão **somente** no portal do aluno (web/app) — tokenização Pagar.me no browser |

| **PIX / boleto** | Geração via Pagar.me; webhook confirma pagamento e atualiza fatura + status do aluno |

| **Dev** | Sem `PAGARME_API_KEY` → mock + `simulate-payment` |



---



## Gateway escolhido



| Campo | Valor |

|-------|--------|

| **Provedor** | **Pagar.me** |

| **Data da escolha** | 02/09/2026 |

| **Conta recebedora** | Por academia (recomendado: recipient/split Pagar.me por `academy_id`) — evolução pós-MVP |

| **Ambiente sandbox** | Chaves `sk_test_…` / `pk_test_…` no [Dashboard Pagar.me](https://dash.pagar.me/) |

| **Edge Functions** | `create-payment-charge`, `pagarme-webhook`, `charge-recurring-invoices`, `simulate-payment` (somente dev) |



### Dashboard e documentação



| Recurso | URL |

|---------|-----|

| **Dashboard** (chaves, webhooks, transações) | https://dash.pagar.me/ |

| **Documentação API v5** | https://docs.pagar.me/ |

| **Webhook RingPro (remoto)** | `https://iqqmcvrwysoqoondbnbh.supabase.co/functions/v1/pagarme-webhook` |



No dashboard: **Desenvolvedores → Webhooks** — eventos `charge.paid`, `order.paid`. Copie o **signing secret** para `PAGARME_WEBHOOK_SECRET`.



---



## Variáveis de ambiente



### Supabase secrets (Edge Functions — nunca no frontend)



| Variável | Obrigatório | Uso |

|----------|-------------|-----|

| `PAGARME_API_KEY` | Live | Secret key (`sk_test_…` sandbox ou `sk_…` produção) |

| `PAGARME_WEBHOOK_SECRET` | Live (recomendado) | HMAC `x-pagarme-signature` no `pagarme-webhook` |

| `PAYMENTS_MODE` | Não | `mock` \| `live` — default: `mock` sem `PAGARME_API_KEY` |

| `CRON_SECRET` | Cron | Bearer em `charge-recurring-invoices` |

| `SUPABASE_SERVICE_ROLE_KEY` | Sim (edge) | Injetado pelo Supabase em runtime |



```bash

supabase secrets set PAGARME_API_KEY=sk_test_...

supabase secrets set PAGARME_WEBHOOK_SECRET=whsec_...

supabase secrets set PAYMENTS_MODE=live

supabase secrets set CRON_SECRET=seu_token_cron

```



### Frontend (Vite — `.env` / `frontend/.env`)



| Variável | Obrigatório | Uso |

|----------|-------------|-----|

| `VITE_PAYMENTS_MODE` | Não | `mock` \| `live` — alinha portal aluno com gateway |

| `VITE_PAGARME_PUBLIC_KEY` | Live (cartão) | `pk_test_…` / `pk_…` — tokenização no browser |



### Local / smoke (`.env` na raiz — não commitar)



| Variável | Uso |

|----------|-----|

| `VITE_SUPABASE_URL` | URL do projeto |

| `VITE_SUPABASE_ANON_KEY` | Chamadas edge + Supabase client |

| `SUPABASE_SERVICE_ROLE_KEY` | Smoke cria fatura pendente se necessário |

| `PAGARME_WEBHOOK_SECRET` | Smoke/teste envia webhook assinado (mesmo valor do Supabase secret) |



---



## Implementação (Fase 2)



| Ticket | Escopo | Status |

|--------|--------|--------|

| **UP-200** | Pagar.me registrado neste ADR | ✅ |

| **UP-201** | `PaymentService` + mock + Pagar.me (frontend + edge) | ✅ |

| **UP-202** | `gateway_charge_id`, `gateway_metadata`, `gateway_provider` | ✅ |

| **UP-203** | `create-payment-charge` live + tokenização cartão | ✅ |

| **UP-204** | `pagarme-webhook`: assinatura, idempotência, invoice + aluno | ✅ |

| **UP-205** | Cobrança recorrente cartão + retry D+1/D+3/D+7 | ✅ |

| **UP-206** | Lembretes e-mail | ⏸️ adiado (in-app + WhatsApp manual) |

| **UP-207** | Relatório financeiro academia | ✅ |

| **UP-208** | Relatório financeiro plataforma | ✅ |

| **UP-209** | Portal aluno: QR PIX + boleto (`PaymentChargePanel`, `charge-display.ts`) | ✅ |

| **UP-210** | Checkpoint: smoke + webhook CLI + este ADR | ✅ |



**Estado atual:** fluxo mock completo sem chaves; com `PAGARME_API_KEY` + chaves públicas Vite → PIX/boleto/cartão via API real.



---



## Validação (UP-210)



### Smoke automatizado (mock ou remoto)



```bash

node scripts/smoke-phase2-checkpoint.mjs

# ou

cd frontend && npm run test:smoke:phase2

```



Cobre: `create-payment-charge` (PIX + boleto), `pagarme-webhook` (`charge.paid`), idempotência, fatura `PAGO`, aluno `ATIVO`.



### Webhook manual (após gerar cobrança)



```bash

node scripts/test-pagarme-webhook.mjs --invoice-id <uuid-da-fatura>

```



Com `PAGARME_WEBHOOK_SECRET` no `.env`, envia `x-pagarme-signature` HMAC-SHA256.



### Sandbox ponta a ponta (humano)



1. Configurar secrets Supabase (`PAGARME_API_KEY`, `PAGARME_WEBHOOK_SECRET`, `PAYMENTS_MODE=live`).

2. `frontend/.env`: `VITE_PAYMENTS_MODE=live`, `VITE_PAGARME_PUBLIC_KEY=pk_test_…`.

3. Deploy: `create-payment-charge`, `pagarme-webhook`.

4. Aluno: `/student/pagamento` → **Gerar PIX** → pagar no app bancário (sandbox) ou simular no dashboard Pagar.me.

5. Webhook confirma → fatura `PAGO`, aluno `ATIVO`.



Helpers reutilizáveis: [`scripts/smoke/payments.mjs`](../../scripts/smoke/payments.mjs) · UI: [`PaymentChargePanel.tsx`](../../frontend/src/features/student/components/PaymentChargePanel.tsx).



---



## Impacto



- **PRD §10.4 e §14.2:** gateway = Pagar.me; regras PCI mantidas.

- **Commits:** não commitar secrets; usar Supabase secrets / `.env` local.

- **Professor/Assistant:** continua **proibido** coletar cartão.



---



## Referências



- [Documentação Pagar.me](https://docs.pagar.me/)

- [Dashboard Pagar.me](https://dash.pagar.me/)

- [`docs/PRD.md`](../PRD.md) — §10.4 Pagamentos, §14.2 Integrações

- [`docs/PLANO-ATUALIZACOES.md`](../PLANO-ATUALIZACOES.md) — Fase 2

- [`scripts/smoke-phase2-checkpoint.mjs`](../../scripts/smoke-phase2-checkpoint.mjs)

- [`padrões/03-Praticas-Proibidas.md`](../../padrões/03-Praticas-Proibidas.md) — PCI, secrets

