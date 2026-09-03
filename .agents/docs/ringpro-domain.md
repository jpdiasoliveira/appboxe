# RingPro — modelo de negócio (referência para agentes)

Fonte detalhada: [`docs/PRD.md`](../../docs/PRD.md) · [`docs/escopo-negocio.md`](../../docs/escopo-negocio.md)

---

## O que é o RingPro

SaaS **multi-tenant** para academias de artes marciais (boxe, Muay Thai, Jiu-Jitsu, MMA, etc.).

**Loop de valor:** Dono SaaS cadastra academia → academia configura planos/modalidades → professor cadastra aluno → aluno paga mensalidade → sistema controla inadimplência.

---

## Personas e portais

| Role | Persona | Rota base | O que faz |
|------|---------|-----------|-----------|
| `PLATFORM_OWNER` | Dono do SaaS | `/platform/*` | Academias, plano SaaS, financeiro global, feature flags |
| `SCHOOL_OWNER` | Dono da academia | `/academy/*` | Tudo na escola, incluindo financeiro e landing |
| `PROFESSOR` | Professor | `/academy/*` | Alunos e turmas **nas modalidades vinculadas**, presença, agenda — **sem financeiro** |
| `ASSISTANT` | Sub-professor | `/academy/*` | Alunos, turmas, presença — **sem financeiro** |
| `STUDENT` | Aluno | `/student/*` | Plano, pagamento, modalidades, histórico |
| (público) | Visitante | `/a/{slug}` | Landing da academia, formulário de interesse |

**Redirect pós-login:** platform → `/platform/dashboard` · staff academia → `/academy/dashboard` · aluno → `/student/dashboard`

**Multi-academia:** mesmo `user` pode ter roles diferentes em academias diferentes (`user_academy_roles`).

---

## Dois níveis de “plano” (não confundir)

| Conceito | Quem paga | Quem define | Tabela (ER) |
|----------|-----------|-------------|-------------|
| **Plano SaaS** | Academia paga ao RingPro | PLATFORM_OWNER | `saas_plans` |
| **Plano de mensalidade** | Aluno paga à academia | SCHOOL_OWNER | `academy_plans` |

---

## Entidades principais

> **Turma** na UI pode ser **modalidade** (`training_categories`) ou **turma operacional** (`class_groups` + roster) quando flag `module_class_groups` está on. Ver PRD §3.1.

```text
academies (tenant)
  ├── academy_plans          → mensalidades locais
  ├── training_categories    → Boxe, Muay Thai, Jiu-Jitsu…
  ├── class_groups           → turmas com roster (UP-313, flag off default)
  │     └── class_group_members
  ├── students               → matrícula na academia
  │     ├── student_subscriptions
  │     ├── student_categories
  │     ├── student_documents (UP-311, flag off default)
  │     ├── class_makeup_credits (UP-312, flag off default)
  │     ├── belt_levels / student_belt_history (UP-302, flag module_graduation)
  │     └── student_payment_methods (token do gateway)
  ├── attendance_records
  ├── attendance_qr_sessions (UP-301, flag module_attendance)
  ├── invoices / payments
  ├── academy_feature_flags
  └── landing_page_config / leads
```

---

## Regras de negócio invioláveis

### Multi-tenant
- Toda tabela de negócio tem `academy_id` + **RLS**.
- `slug` da academia é único globalmente.
- Vazamento de dados entre academias = bug crítico.

### Status do aluno
| Status | Quando |
|--------|--------|
| `ATIVO` | Mensalidade em dia |
| `INADIMPLENTE` | Vencimento + 3 dias (grace period) |
| `INATIVO` | Desligado manualmente |
| `TRIAL` | Período experimental (UI: **Experimental**; config pelo dono — UP-303) |

### Mensalidades
- Vencimento default: dia 10 (configurável por academia).
- Cartão: retry D+1, D+3, D+7 → depois `INADIMPLENTE`.
- PIX/boleto: webhook confirma; até lá `PENDENTE`.
- Troca de plano: efeito no **próximo ciclo** (sem pro-rata no MVP).

### Pagamentos (PCI)
- Cartão: token no **Pagar.me** ([ADR-001](../../docs/decisoes/001-gateway-pagamentos.md)) — **somente** portal do aluno.
- Professor/Assistant: **proibido** coletar cartão.
- Service role só em Edge Functions (webhooks, cron).

### Academia SaaS
- Fatura plataforma 15+ dias atrasada → academia `SUSPENSA` (kill switch).

### Cadastro
- **Sem** self-register de aluno no MVP — Owner/Professor cadastra presencialmente.
- Senha provisória + e-mail async.

### Feature flags
Módulos ativáveis por academia — se flag off, API/UI não expõe o módulo:
`module_payments_card`, `module_payments_pix`, `module_payments_boleto`, `module_attendance` (UP-301), `module_graduation` (UP-302), `module_physical_assessment` (UP-305), `module_landing`, `module_trial`, `module_student_self_register`, `module_student_documents` (UP-311), `module_class_makeup` (UP-312), `module_class_groups` (UP-313), etc.

Ver lista completa: PRD §12.

---

## Waves (ordem obrigatória de implementação)

| Wave | Foco | Não pular |
|------|------|-----------|
| 1 | Auth, RBAC, RLS, multi-tenant | Fundação |
| 2 | Portal Plataforma + feature flags | Antes da academia |
| 3 | Portal Academia (Owner → Professor → Assistant) | Antes do aluno |
| 4 | Portal Aluno + pagamentos | Depois da academia |
| 5 | Landing `/a/{slug}` | Depois dos dados da academia |
| 6 | Notificações, relatórios, polish | Por último |

Detalhe: [`docs/roadmap-desenvolvimento.md`](../../docs/roadmap-desenvolvimento.md)

---

## Fora do MVP (não implementar sem pedido explícito)

App Store / Google Play (V2) · ~~QR check-in~~ (UP-301 ✅) · graduação/faixas · e-commerce · chat · WhatsApp · cadastro público aluno · pro-rata

**Multi-canal:** MVP = web responsiva + arquitetura app-ready; app nas lojas na V2 — [PRD §5.3](../../docs/PRD.md#53-estratégia-multi-canal--web-e-apps-nas-lojas).

---

## Mockups por portal

| Portal | Pasta |
|--------|-------|
| Auth | `mockups/auth/` |
| Plataforma | `mockups/platform/` |
| Academia | `mockups/academy/` |
| Aluno | `mockups/student/` |
| Landing | `mockups/landing/` |
