# Padrões de UI — RingPro

Design system para mockups e aplicação. Leia **antes** de criar ou estilizar qualquer componente.

---

## Identidade visual

**Conceito:** força, disciplina, profissionalismo — academias de artes marciais.

### Paleta de cores (tokens)

| Token | Hex | Uso |
|---|---|---|
| `--color-primary` | `#B91C1C` | Vermelho — CTAs, destaques, marca |
| `--color-primary-dark` | `#7F1D1D` | Hover, headers |
| `--color-secondary` | `#CA8A04` | Dourado — badges premium, conquistas |
| `--color-accent` | `#1E293B` | Slate escuro — sidebar, footer |
| `--color-bg` | `#0F172A` | Background principal (dark mode default) |
| `--color-bg-card` | `#1E293B` | Cards, panels |
| `--color-bg-elevated` | `#334155` | Hover states, inputs |
| `--color-text` | `#F8FAFC` | Texto principal |
| `--color-text-muted` | `#94A3B8` | Texto secundário |
| `--color-success` | `#22C55E` | Ativo, pago |
| `--color-warning` | `#F59E0B` | Pendente, trial |
| `--color-danger` | `#EF4444` | Inadimplente, erro |
| `--color-border` | `#334155` | Bordas, divisores |

### Tipografia

| Token | Fonte | Uso |
|---|---|---|
| `--font-display` | **Bebas Neue** ou **Oswald** | Títulos, hero landing |
| `--font-body` | **Inter** | Corpo, formulários, dashboards |

### Espaçamento e radius

| Token | Valor |
|---|---|
| `--radius-sm` | 4px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
| `--radius-xl` | 16px |
| `--spacing-unit` | 4px (múltiplos: 4, 8, 12, 16, 24, 32, 48) |

### Sombras

| Token | Valor |
|---|---|
| `--shadow-card` | `0 4px 6px -1px rgb(0 0 0 / 0.3)` |
| `--shadow-elevated` | `0 10px 15px -3px rgb(0 0 0 / 0.4)` |

---

## Layouts por portal

### Dashboard (Plataforma, Academia, Aluno)

```text
┌─────────────────────────────────────────────────┐
│ Topbar: logo | breadcrumb | notif | avatar      │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │  Content area                        │
│ (nav)    │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│          │  │ KPI │ │ KPI │ │ KPI │ │ KPI │   │
│          │  └─────┘ └─────┘ └─────┘ └─────┘   │
│          │  ┌─────────────────────────────┐   │
│          │  │ Tabela / conteúdo principal │   │
│          │  └─────────────────────────────┘   │
└──────────┴──────────────────────────────────────┘
```

- Sidebar fixa 240px (colapsável em mobile)
- KPI cards: glass effect com `--color-bg-card`
- Dark mode como default

### Landing page (marketing)

```text
┌─────────────────────────────────────────────────┐
│ Navbar transparente → sólida no scroll          │
├─────────────────────────────────────────────────┤
│ HERO full-width: foto + overlay + CTA           │
├─────────────────────────────────────────────────┤
│ Sobre: 2 colunas (texto + imagem)               │
├─────────────────────────────────────────────────┤
│ Modalidades: grid cards com ícones              │
├─────────────────────────────────────────────────┤
│ Planos: 3 colunas pricing table                 │
├─────────────────────────────────────────────────┤
│ Contato: form + mapa                            │
├─────────────────────────────────────────────────┤
│ Footer: redes + copyright                       │
└─────────────────────────────────────────────────┘
```

- Layout claro (light) ou escuro conforme academia configurar
- Não usar sidebar de dashboard na landing

### Auth

- Centralizado, card max-width 420px
- Background com imagem desfocada (tatame/luvas)
- Logo RingPro no topo

---

## Componentes padrão

### KPI Card

```html
<!-- Estrutura referência -->
<div class="kpi-card">
  <span class="kpi-label">Alunos Ativos</span>
  <span class="kpi-value">127</span>
  <span class="kpi-trend positive">+12% vs mês anterior</span>
</div>
```

### Status Badge (aluno)

| Status | Cor | Label |
|---|---|---|
| ATIVO | `--color-success` | Ativo |
| INADIMPLENTE | `--color-danger` | Inadimplente |
| TRIAL | `--color-warning` | Trial |
| INATIVO | `--color-text-muted` | Inativo |

### Tabela de alunos

- Colunas: Nome, E-mail, Plano, Categorias, Status, Vencimento, Ações
- Filtros em drawer lateral (Limpar / Aplicar)
- Paginação bottom
- Linha inadimplente: borda esquerda vermelha

### Drawer de filtros (padrão global)

- Botões footer fixos: **Limpar** (ghost) · **Aplicar** (primary)
- Funcional, API-backed

---

## Ícones

**Biblioteca:** Hero Icons (outline para nav, solid para KPIs)

| Contexto | Ícone |
|---|---|
| Alunos | `users` |
| Financeiro | `currency-dollar` |
| Categorias | `fire` / `bolt` |
| Presença | `clipboard-document-check` |
| Planos | `credit-card` |
| Config | `cog-6-tooth` |
| Notificações | `bell` |

---

## Mockups — estrutura de pastas

```text
mockups/
├── _shared/           # tokens Tailwind, CSS base, componentes
├── auth/              # login, reset, 2FA, trocar senha
├── platform/          # portal dono SaaS
├── academy/           # portal academia (owner/professor/assistant)
├── student/           # portal aluno
└── landing/           # landing page template + editor
```

---

## Checklist ao abrir tela nova

- [ ] Li este documento
- [ ] Usei tokens de `mockups/_shared/`
- [ ] Não inventei cor/sombra/radius fora do DS
- [ ] Lógica de negócio não está no arquivo da UI
- [ ] Drawer filtros segue padrão Limpar/Aplicar
- [ ] ASSISTANT: versão sem KPIs financeiros quando aplicável

---

## Responsividade

| Breakpoint | Comportamento |
|---|---|
| `< 768px` | Sidebar vira hamburger; tabelas viram cards |
| `768–1024px` | Sidebar colapsada (ícones only) |
| `> 1024px` | Layout completo |

Landing: mobile-first.

**Portal aluno:** mobile-first (base para PWA e app V2 nas lojas — ver [PRD §5.3](./PRD.md#53-estratégia-multi-canal--web-e-apps-nas-lojas)).

**App-ready:** touch targets ≥ 44px; evitar hover-only; fluxos críticos (login, pagamento) testáveis em viewport 375px.
