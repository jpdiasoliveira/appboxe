# Escopo de Negócio — RingPro

Plataforma **SaaS multi-tenant** para gestão de academias de artes marciais: boxe, Muay Thai, Jiu-Jitsu, MMA, kickboxing, wrestling e modalidades correlatas.

**Objetivos:** centralizar cadastro de alunos, automatizar mensalidades, controlar inadimplência, oferecer landing page por academia e escalar operação com feature flags.

---

## 1. Visão do produto

**Nome do produto:** RingPro (working title)

**Uma frase:** Plataforma que conecta donos de academias, professores e alunos para gestão completa de matrículas, mensalidades e presença — com site público por escola.

**Objetivos principais:**

- Operar múltiplas academias em um único SaaS (multi-tenant)
- Automatizar cobrança recorrente e identificar inadimplência
- Dar autonomia ao aluno para pagar e escolher modalidades
- Oferecer presença online (landing) para cada academia
- Permitir ativar/desativar módulos por escola

---

## 2. Personas

| Persona | Papel | Dor principal |
|---|---|---|
| **Dono do SaaS** | Operador da plataforma RingPro | Escalar sem perder controle financeiro e operacional das academias |
| **Dono da academia** | Proprietário da escola de luta | Planilhas, inadimplência invisível, falta de site profissional |
| **Professor** | Instrutor principal | Cadastrar alunos nas suas modalidades, ver quem está atrasado na turma, organizar presença e agenda |
| **Sub-professor** | Assistente/instrutor junior | Apoiar operação sem acesso a valores e financeiro |
| **Aluno** | Matriculado na academia | Pagar mensalidade, saber status, escolher modalidades |
| **Visitante** | Interessado em se matricular | Conhecer a academia, ver planos, entrar em contato |

Separação: **cliente externo** (aluno, visitante) · **equipe academia** (owner, professor, assistant) · **equipe plataforma** (platform owner).

---

## 3. Regras críticas (força bruta no backend/banco)

1. **Isolamento multi-tenant:** RLS (Supabase) em toda tabela de negócio filtra por `academy_id`; vazamento entre academias = bug crítico.
2. **ASSISTANT sem financeiro:** RLS policies + UI bloqueiam tabelas/rotas financeiras para role ASSISTANT — não só ocultar menu.
3. **PCI:** cartão tokenizado via **Pagar.me**; professor/assistant **nunca** coleta cartão. Ver [ADR-001](./decisoes/001-gateway-pagamentos.md).
4. **Inadimplência automática:** após grace period (3 dias), status aluno → INADIMPLENTE via job cron.
5. **Kill switch SaaS:** academia com fatura plataforma 15+ dias atrasada → SUSPENSA (bloqueio acesso).
6. **Slug único:** cada academia tem slug global único para landing e identificação.

---

## 4. Diretrizes de produto (já alinhadas)

**MVP inclui:**

- Auth multi-role com redirect por persona
- Portal Plataforma (donos SaaS)
- Portal Academia (owner, professor, assistant)
- Portal Aluno (planos, pagamento, categorias)
- Landing page por academia
- Mensalidades com cartão/PIX/boleto
- Feature flags por academia
- Controle inadimplência

**MVP não inclui:**

- Publicação na App Store / Google Play (entrega V2 — ver `docs/PRD.md` §5.3)
- Cadastro público self-service aluno
- Multi-unidade (filiais)
- Graduação/faixas
- E-commerce
- Chat

**Plataforma (decisão fechada):**

- **Supabase** — PostgreSQL, Auth, RLS multi-tenant, Storage, Edge Functions

**Integrações obrigatórias no beta:**

- Supabase Auth (login, reset, verificação e-mail)
- Gateway de pagamento (**Pagar.me** — PIX/cartão tokenizado); ver [ADR-001](./decisoes/001-gateway-pagamentos.md)
- Supabase Storage (logos, fotos)

**Segurança:**

- 2FA obrigatório PLATFORM_OWNER (Supabase Auth TOTP)
- JWT Supabase + refresh token nativo
- RLS em todas as tabelas de negócio
- Service role **apenas** em Edge Functions — nunca no frontend
- LGPD: dados mínimos necessários
- Audit log append-only

---

## 4.1 Multi-canal — web (MVP) e app nas lojas (V2)

O RingPro deve funcionar **na internet** (navegador responsivo) desde o MVP e estar **preparado** para virar app iOS/Android na V2 **sem refazer** Supabase, RLS ou regras de negócio.

| Canal | MVP | V2 |
|---|---|---|
| Web (desktop + mobile browser) | ✅ | ✅ |
| PWA (portal aluno) | Should | Evoluir |
| App Store / Google Play | ❌ | ✅ |

**Prioridade de app futuro:** portal **Aluno** (pagamento, plano, status). Portais Academia e Plataforma permanecem web-first.

**Detalhes e princípios técnicos:** [PRD §5.3](./PRD.md#53-estratégia-multi-canal--web-e-apps-nas-lojas).

---

## 5. Escalabilidade e restrições técnicas

| Aspecto | Expectativa MVP | Notas |
|---|---|---|
| Academias | 10–50 no beta | Multi-tenant desde dia 1 |
| Alunos por academia | 50–500 | Paginação obrigatória |
| Cobrança | Job diário (dunning) | BullMQ + Redis |
| Landing | CDN estática ou SSR leve | Slug-based routing |
| Retenção audit | 2 anos mínimo | Append-only |

---

## 6. Links para artefatos do projeto

| Artefato | Caminho |
|---|---|
| PRD | `docs/PRD.md` |
| Wireflows | `docs/wireflows.md` |
| Diagrama ER | `docs/diagrama-er.md` |
| Permissões | `docs/modelo-racional-permissoes.md` |
| Padrões UI | `docs/padroes-ui.md` |
| Mockups | `mockups/` |
| Migrations | `supabase/migrations/` (Wave 1) |
