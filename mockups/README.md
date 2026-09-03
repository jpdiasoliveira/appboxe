# Mockups — RingPro

Referência visual do produto. **Mockup prevalece** sobre doc em caso de divergência.

## Estrutura

```text
mockups/
├── _shared/
│   ├── tailwind.config.js    # tokens do design system
│   ├── base.css              # variáveis CSS, reset, componentes base
│   ├── layout.css            # utilitários de página (títulos, feedback, landing, pricing)
│   └── components.html       # catálogo visual de componentes
├── auth/
│   ├── 00-Login.html
│   ├── 01-Esqueci-Senha.html
│   ├── 02-Verificacao-2FA.html
│   └── 03-Trocar-Senha.html
├── platform/
│   ├── 00-Dashboard.html
│   ├── 01-Academias.html
│   ├── 01.1-Nova-Academia.html
│   ├── 02-Financeiro.html
│   ├── 03-Configuracoes.html
│   └── 04-Auditoria.html
├── academy/
│   ├── 00-Dashboard.html
│   ├── 00-Dashboard-Assistant.html   # sem KPIs financeiros
│   ├── 00-Dashboard-Professor.html
│   ├── 01-Alunos.html
│   ├── 01.1-Novo-Aluno.html
│   ├── 02-Professores.html
│   ├── 03-Categorias.html
│   ├── 04-Planos.html
│   ├── 05-Financeiro.html
│   ├── 06-Presenca.html
│   ├── 07-Configuracoes.html
│   └── 08-Notificacoes.html
├── student/
│   ├── 00-Dashboard.html
│   ├── 01-Meu-Plano.html
│   ├── 02-Modalidades.html
│   ├── 03-Pagamento.html
│   ├── 04-Historico.html
│   └── 05-Perfil.html
└── landing/
    ├── 00-Template.html
    └── 01-Editor.html
```

## Como usar

1. Abrir HTML no browser (sem build)
2. Importar `../_shared/base.css` + `../_shared/layout.css` em cada mockup
3. Consultar `_shared/components.html` para KPI, badge, feedback, tabela, pricing, drawer
4. Seguir [docs/padroes-ui.md](../docs/padroes-ui.md)

## Status

| Pasta | Status |
|---|---|
| `_shared/` | ✅ `base.css`, `layout.css`, `components.html`, `tailwind.config.js` |
| `auth/` | ✅ `00`–`03` |
| `platform/` | ✅ completo |
| `academy/` | ✅ owner, assistant, professor + telas operacionais |
| `student/` | ✅ completo |
| `landing/` | ✅ template + editor |
