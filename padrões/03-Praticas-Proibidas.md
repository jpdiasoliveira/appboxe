# Práticas proibidas — tolerância zero

**Diretiva:** priorizar correções estruturais e arquitetura robusta. Código que violar estes pontos deve ser rejeitado em review. Sem atalhos para pular validações ou mascarar erros.

Aplique em qualquer stack; adapte exemplos ao seu projeto.

---

## 1. Tipagem estrita e validação de dados

- Proibido tipagem de escape (`any` em TypeScript, `interface{}` em Go para burlar regras).
- Payloads externos (API, webhook, banco) passam por validação ou type guards antes do uso.
- Nunca confiar cegamente no formato recebido.

## 2. Tratamento de erros explícito

- Proibido `catch` vazio ou só `console.log` / log sem contexto.
- Falhas de infra ou regra de negócio devem ser propagadas ou tratadas de forma visível.
- **Frontend:** feedback claro ao usuário (toast, banner, estado de erro).
- **Backend:** log estruturado + status HTTP correto (`400` regra, `401`/`403` auth, `500` interno).

## 3. Fim do N+1

- Proibido query, HTTP ou disco dentro de `for` / `map` / `while` sem batch.
- Usar batch, `IN (...)`, JOINs ou agregações no banco.

## 4. Zero hardcode

- Credenciais, URLs e portas → variáveis de ambiente.
- Cores e espaçamentos → tokens do design system (ver [04](./04-Padroes-UI.md)).

## 5. Estado e ciclo de vida

- Efeitos colaterais e processos em background devem ser determinísticos e testáveis.
- Em UI reativa: arrays de dependências completos — proibido omitir deps para “forçar” render.

## 6. UI vs lógica

- Proibido misturar regra de negócio complexa + chamadas de API no mesmo arquivo de tela.
- UI “burra”: exibe e captura interação. Lógica em services, hooks ou camada de domínio.

## 7. Anti-giant components

- Antes de mudar núcleo compartilhado: mapear rotas, permissões e fluxos impactados.
- Arquivos com muitas responsabilidades ou > ~200 linhas: quebrar em módulos.

## 8. UI/UX

- Antes de estilizar: ler o guia de UI do projeto ([04](./04-Padroes-UI.md) + `docs/padroes-ui.md` se existir).
- Usar tokens do design system; proibido inventar valores fora do padrão.

## 9. Escopo e IA

- Proibido implementar fora de ticket rastreável ou fora do PRD do release atual.
- Proibido aceitar sugestão da IA que amplie escopo sem validação humana.
- Em dúvida de arquitetura ou prioridade → alinhar com ponto focal antes de codar.
- Detalhes: [09](./09-Governanca-Escopo-e-PRs-Empilhadas.md).

## 10. Nomenclatura — produtos e empresas proibidos

**Proibido** referenciar, citar ou deixar registrado neste repositório (código, docs, commits, branches, exemplos, comentários):

- **KTech** (e variações: ktech, k-tech, ktech.mobi)
- **Join Club** / **JoinClub** (e variações: join-club, joinclub, JOINCLUBE)
- **Nex Clube** / **Next Club** (e variações: nexclub, nex-clube, nextclub)

**Regra:** este projeto é **RingPro**. Use apenas nomenclatura do produto atual em artefatos, tickets, branches e documentação.

- Exemplo de branch correto: `feat/ringpro-001-auth-login`
- Exemplo proibido: `feat/joinclub-353-criar-perfil`

Se encontrar referência legada → remover na mesma rodada, sem exceção.

## 11. Skills — padrão obrigatório para agentes

As skills em `.agents/skills/` (e [`AGENTS.md`](../AGENTS.md) na raiz do produto) existem para **manter um padrão único** de implementação, commits, PRs e UI.

**Regra para agentes de IA:**

1. **Sempre** ler `read-standards` no início de cada tarefa.
2. **Sempre** abrir a skill específica antes de agir (`implement`, `ui-standards`, `to-commit`, `to-pr`, `code-review`).
3. **Nunca** improvisar fluxo que já está descrito numa skill.
4. Improvisar fora das skills = fora do padrão = rejeitar em review.

Setup e catálogo: [07-Setup-Repositorio-IA.md](./07-Setup-Repositorio-IA.md) · [templates/skills-catalogo.md](./templates/skills-catalogo.md)
