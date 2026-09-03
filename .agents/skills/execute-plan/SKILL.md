---
name: execute-plan
description: Executar PLANO-EXECUCAO.md em modo autônomo — passo a passo sem pedir permissão entre tarefas.
---

# execute-plan — modo maratona

## Quando usar

Usuário pediu:

- "execute o plano"
- "modo autônomo"
- "continue do RP-XXX"
- "codar sem parar"

## Pré-requisitos

1. [`read-standards`](../read-standards/SKILL.md)
2. [`ringpro-domain`](../ringpro-domain/SKILL.md)
3. [`implement`](../implement/SKILL.md)
4. Abrir [`docs/PLANO-EXECUCAO.md`](../../../docs/PLANO-EXECUCAO.md)

## Instruções

### 1. Identificar passo atual

- Ler seção **Progresso** no plano
- Primeiro passo com `[ ]` é o próximo
- Se usuário disse "do RP-031", começar ali (se dependências OK)

### 2. Loop autônomo

Para cada passo `RP-XXX`:

```text
1. Ler critério "Done quando" do passo
2. Implementar (migrations → hooks → UI)
3. Rodar typecheck/build se aplicável
4. Marcar [x] no PLANO-EXECUCAO.md
5. Ir ao próximo passo SEM perguntar ao usuário
```

### 3. O que NÃO pedir ao usuário

- "Posso continuar para o próximo passo?"
- "Posso criar este arquivo?"
- "Posso instalar este pacote?"
- Commit / PR (só se pedirem)

### 4. Quando parar

- Secret ausente não documentado no plano
- 3 falhas no mesmo passo → documentar erro no plano e parar
- Decisão fora do PRD

### 5. Ao parar (fim de sessão ou bloqueio)

Atualizar no chat (resumo para o humano revisar amanhã):

- Último passo concluído `RP-XXX`
- Próximo passo pendente
- Arquivos principais criados
- Comandos para testar (`npm run dev`, credenciais seed)
- Bloqueios se houver

### 6. Qualidade mínima por passo

- Sem `any` desnecessário
- RLS em toda tabela nova
- ASSISTANT bloqueado em financeiro (Wave 3+)
- Tokens UI RingPro
- Não commitar `.env`

### 7. Testes

- Obrigatório nos passos que dizem "Testes" ou "Checkpoint"
- Demais passos: typecheck + build se existir
- Não atrasar wave inteira por cobertura 100%

## Comando tipo do usuário

```text
Execute docs/PLANO-EXECUCAO.md do RP-001 em diante, modo autônomo.
Não commitar. Marque [x] cada passo. Pare só em bloqueio crítico.
```
