# ADR-NNN — <!-- Título curto da decisão -->

**Status:** <!-- Proposto | Aceito | Substituído por ADR-XXX | Obsoleto -->  
**Data:** <!-- YYYY-MM-DD -->  
**Autores:** <!-- nomes -->  
**Decisores:** <!-- quem aprovou (arquitetura, gestão) -->

---

## Contexto

<!-- Qual problema ou dúvida motivou esta decisão? 2–5 frases. -->

## Decisão

<!-- O que foi decidido, de forma direta. -->

## Alternativas consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| <!-- A --> | | |
| <!-- B --> | | |

## Consequências

### Positivas

- 

### Negativas / trade-offs

- 

### O que fica explícito no código/docs

- [ ] `docs/PRD.md` — seção: <!-- qual -->
- [ ] `.agents/docs/security.md` — se auth/permissão
- [ ] Outro: <!-- path -->

## Referências

- Ticket / Feature: <!-- link -->
- PR: <!-- link, se já existir -->
- Discussão: <!-- reunião, thread -->

---

## Instruções de uso

1. Salvar como `docs/adr/ADR-001-titulo-kebab.md` (numeração sequencial).
2. Uma decisão por ADR — não misturar temas.
3. Quando substituir decisão: marcar status **Substituído** e linkar o ADR novo.
4. Não duplicar o PRD inteiro — ADR é para **decisão técnica/produto** que o time precisa lembrar depois.

### Quando escrever um ADR

- Persona vs role de login
- Multi-tenant vs single-tenant
- Escolha de auth (JWT, sessão, OAuth)
- Estratégia de permissões (RBAC fixo vs perfis configuráveis)
- Integração externa com impacto arquitetural
- Qual fundação de schema prevalece (conflito entre PRs/devs)
