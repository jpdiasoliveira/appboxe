# Ciclo operacional — documentação, mockups, ER e pacote

Como executar **rodadas de alinhamento** com stakeholder mantendo tudo sincronizado.

Adapte os caminhos abaixo à estrutura do seu repositório (monorepo `docs/` ou repo dedicado).

---

## 1. Fontes da verdade

| Camada | Fonte | Caminho sugerido |
|---|---|---|
| UI / jornada | Mockups | `mockups/` |
| Escopo | Backlog / HUs | `docs/backlog-hus.md` |
| Negócio | Escopo e personas | `docs/escopo-negocio.md` |
| Dados | Schema SQL | `docs/schema.sql` |
| ER visual | Diagrama | `docs/diagrama-er.md` |
| Arquivo histórico | Material antigo | `legado/` ou branch/tag — não sobrescrever como fonte |

**Se mockup ≠ doc:** mockup vence; anote divergência no modelo racional (seção Divergências).

---

## 2. Passo a passo de uma rodada de mudanças

### A) Receber decisões

- Anote Must / fora do MVP / “manter cenário atual”.
- Separe o que é **óbvio de schema** (equipe implementa) do que **precisa confirmação** do stakeholder.

### B) Atualizar mockups (se a UI mudar)

1. Editar na pasta canônica `mockups/`.
2. Se existir cópia para envio externo, espelhar na mesma rodada.
3. Usar tokens do design system (`mockups/_shared/` ou equivalente) — sem inventar cores.

### C) Atualizar documentos (mesma rodada)

Ordem sugerida:

1. Backlog / HUs  
2. HUs por perfil (se usar)  
3. Wireflows  
4. Modelo racional (+ divergências)  
5. Documentação técnica (se impactar)  
6. Schema SQL  
7. Diagrama ER (MD + regenerar imagens)

### D) Regenerar PDFs (opcional)

Se o projeto exporta MD → PDF para stakeholder:

```bash
cd docs
npx --yes md-to-pdf backlog-hus.md
npx --yes md-to-pdf wireflows.md
npx --yes md-to-pdf modelo-racional-permissoes.md
npx --yes md-to-pdf diagrama-er.md
```

Ajuste a lista aos arquivos que o projeto mantém.

### E) Regenerar diagramas ER (quando o schema mudar)

Use a ferramenta do projeto (Mermaid CLI, script interno, etc.):

```bash
# Exemplo genérico
npx --yes @mermaid-js/mermaid-cli -i docs/diagrama-er.mmd -o docs/diagrama-er.png
```

### F) Remontar o pacote para stakeholder

Conteúdo mínimo de `docs/pacote-stakeholder/`:

- Schema SQL + imagens/PDF do ER  
- PDFs ou MD exportados da documentação  
- `mockups/` (ou link)  
- `index.html` ou `LEIA-ME.md` com índice  
- `CHANGELOG-pacote.md` (o que mudou nesta versão)

```bash
# Exemplo: zip (PowerShell)
Compress-Archive -Path docs\pacote-stakeholder\* -DestinationPath pacote-stakeholder-vN.zip -Force
```

### G) Mensagem ao stakeholder

Liste **só o que mudou desde o último envio** + perguntas “agora ou depois”.

---

## 3. Checklist rápido antes de enviar

- [ ] Nome do produto consistente em todo o material  
- [ ] Mockups e docs na mesma versão da decisão  
- [ ] Schema ↔ diagrama ER ↔ PDF sincronizados  
- [ ] Um único pacote versionado (sem pastas duplicadas)  
- [ ] Lista do delta para o stakeholder  

---

## 4. O que é óbvio vs o que perguntar

| Tipo | Exemplos | Ação |
|---|---|---|
| Óbvio | Campo que a tela já usa e falta no SQL; índice para filtro já desenhado | Equipe implementa |
| Decisão de produto | Integração externa, relatório formal, escopo de MVP, tabela nova | Perguntar stakeholder |
| Já decidido | Decisões registradas no PRD ou ata de reunião | Não reperguntar |
