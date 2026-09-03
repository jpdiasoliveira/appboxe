---
name: ui-standards
description: UI RingPro por portal — Plataforma, Academia (Owner/Professor/Assistant), Aluno, Landing e Auth. Tokens e layouts do design system.
---

# ui-standards

## Pré-requisitos

- [ ] [`read-standards`](../read-standards/SKILL.md)
- [ ] [`ringpro-domain`](../ringpro-domain/SKILL.md) — identificar portal e persona

## Documentos

1. [`docs/padroes-ui.md`](../../../docs/padroes-ui.md)
2. [`mockups/_shared/base.css`](../../../mockups/_shared/base.css)
3. Mockup do portal em `mockups/<portal>/`

## Portais e layouts

### Auth — `mockups/auth/`
- Card centralizado, max 420px, fundo escuro
- Telas: login, esqueci senha, 2FA, trocar senha
- Sem sidebar

### Plataforma (Dono SaaS) — `mockups/platform/`
- Rota: `/platform/*`
- KPIs: academias ativas, MRR SaaS, alunos na rede, inadimplência academias
- Telas: dashboard, academias, financeiro SaaS, configurações, auditoria

### Academia — `mockups/academy/`
- Rota: `/academy/*`
- **SCHOOL_OWNER / PROFESSOR:** KPIs incluem receita e inadimplência
- **ASSISTANT:** usar `00-Dashboard-Assistant.html` — **sem** KPIs financeiros, sem menu financeiro
- Status aluno: badge `ATIVO` (verde) · `INADIMPLENTE` (vermelho) · `Experimental` (amarelo, enum `TRIAL`)
- Feedback após ação: `FeedbackMessage` — verde sucesso, vermelho erro
- Linha inadimplente: borda esquerda vermelha na tabela
- Telas: alunos, professores, categorias, planos, financeiro, presença, config, landing editor

### Aluno — `mockups/student/`
- Rota: `/student/*`
- Dashboard: plano atual, próximo vencimento, status pagamento
- Telas: meu plano, modalidades, pagamento (cartão/PIX/boleto), histórico, perfil
- **Nunca** UI para professor inserir cartão

### Landing — `mockups/landing/`
- Rota pública: `/a/{slug}`
- Layout marketing: hero, sobre, modalidades, planos, contato
- **Sem** sidebar de dashboard
- CTA: "Quero me matricular" → formulário lead

## Componentes RingPro

| Componente | Uso |
|------------|-----|
| KPI card | Dashboards platform/academy/student |
| Status badge | Aluno, fatura, academia |
| Feedback message | Confirmação/erro após salvar (`FeedbackMessage` — success/error/warning/info) |
| Drawer filtros | Listas (alunos, financeiro) — Limpar / Aplicar |
| Pricing table | Planos na landing e portal aluno |

## Cores de status (tokens)

| Status | Token |
|--------|-------|
| ATIVO / PAGO | `--color-success` |
| INADIMPLENTE / ATRASADO | `--color-danger` |
| TRIAL / PENDENTE | `--color-warning` |
| INATIVO | `--color-text-muted` |

## Regras

- Tokens only — sem hex solto
- UI burra — hooks/services para Supabase e regras
- Hero Icons
- Mobile: sidebar → hamburger; landing mobile-first

## Checklist

- [ ] Portal e persona corretos
- [ ] ASSISTANT sem financeiro (se academia)
- [ ] Mockup de referência existe ou foi criado na mesma Wave
- [ ] Feature flag: módulo oculto se desativado
