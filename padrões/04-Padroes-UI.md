# Padrões de UI

Guia genérico para manter consistência visual entre mockups e aplicação.

---

## Fonte canônica do projeto

Cada projeto deve definir **um** documento de design system, por exemplo:

→ `docs/padroes-ui.md`

Leia **antes** de criar ou estilizar qualquer componente.

Se o projeto ainda não tiver esse arquivo, crie-o na primeira sprint de UI com: tipografia, cores, espaçamento, radius, sombras e exemplos de componentes.

---

## Mockups como referência

| Recurso | Onde (sugestão) |
|---|---|
| Tokens / tema compartilhado | `mockups/_shared/` (config Tailwind, CSS base, ícones) |
| Telas por módulo ou portal | `mockups/<modulo>/` |
| Auth / onboarding | `mockups/auth/` |

### Regras rápidas

1. **Uma família tipográfica** definida no design system — não misturar sem decisão registrada.
2. Cores e espaçamentos via **tokens** — sem hex/radius solto em HTML/JSX novo.
3. Mockups são referência visual; o app de produção deve **convergir** para eles após aprovação.
4. Landing/marketing segue regras de composição do produto — não usar “dashboard genérico” onde o layout for outro.

### Checklist ao abrir uma tela nova

- [ ] Li `docs/padroes-ui.md` (ou equivalente)
- [ ] Usei tokens/`_shared` dos mockups (ou equivalente no app)
- [ ] Não inventei cor/sombra/radius fora do DS
- [ ] Lógica de negócio não está no arquivo da UI
