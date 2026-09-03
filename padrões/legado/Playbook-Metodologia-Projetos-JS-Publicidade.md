# LEGADO — Playbook v1 (JS Publicidade)

> **Substituído por:** [../01-Playbook-Metodologia-Projetos.md](../01-Playbook-Metodologia-Projetos.md)  
> Mantido apenas como referência histórica da metodologia Jaisson na fase JS Publicidade.

---

# Playbook de Criação de Sistemas (Metodologia Jaisson)

Este manual é um guia passo a passo de Engenharia de Software baseado na abordagem de "Discovery e Planejamento" utilizada na construção da Plataforma JS Publicidade. 
O objetivo é garantir que antes de escrever qualquer linha de código definitiva, o sistema esteja 100% mapeado, validado e com uma arquitetura sólida.

---

## 🛑 Regra de Ouro
**Nunca comece abrindo o editor de código.** A fase de Discovery (Papel, Caneta e Documentação) é o que garante que você construirá o sistema certo, economizando semanas de refatoração no futuro.

---

## Passo 1: Definição de Personas e Contexto (O "Quem")
Antes de pensar em telas, defina **quem** vai usar o sistema. Em sistemas SaaS modernos, geralmente temos múltiplos atores (Multi-Tenant).
1. Liste todos os tipos de usuários (Ex: Admin, Cliente, Fornecedor, Operador).
2. Para cada um, defina qual é a maior "dor" que o sistema vai resolver.
3. **Entregável:** Um documento simples listando os perfis de acesso.

## Passo 2: Histórias de Usuário - HUs (O "O Quê")
Transforme as necessidades das Personas em requisitos funcionais usando o padrão Ágil. Isso evita que o escopo saia do controle.
1. Separe as funcionalidades por Persona (Crie capítulos para cada uma).
2. Use o formato: `Como <Persona>, quero <Ação> para <Benefício/Objetivo>.`
3. Defina os **Critérios de Aceite** (O que define que a tarefa está pronta?).
4. **Entregável:** Arquivo `Backlog-HUs.md`.

## Passo 3: Wireflow e Jornadas (O Caminho)
Agora que você sabe *o que* o sistema faz, desenhe *como* o usuário navega por ele.
1. Escreva a jornada de forma textual (Tela de Login -> Dashboard -> Modal de Ação).
2. Mapeie como as personas interagem entre si (Ex: O "Criador" submete um formulário, e a tela vai para a fila do "Aprovador").
3. **Entregável:** Arquivo `Wireflows.md` ou um diagrama visual apontando as conexões das telas.

## Passo 4: Modelagem de Banco de Dados (A Fundação)
Com as jornadas prontas, você sabe exatamente quais dados precisam ser guardados e mostrados. Construa o banco *antes* do código Front-end.
1. Desenhe as tabelas pensando sempre no isolamento de dados (Multi-Tenant). Toda tabela principal deve ter um `organization_id` (ou `tenant_id`).
2. Defina os relacionamentos, chaves primárias e estrangeiras (PK/FK).
3. Pense nas colunas cruciais para os filtros que os usuários vão usar nas telas.
4. Gere um diagrama visual (Diagrama ER em Mermaid ou outro software) para validar o modelo mental.
5. **Entregável:** Arquivo `Schema.sql` e o `Diagrama-ER.md`.

## Passo 5: Prototipação Visual (A Validação)
O cliente (stakeholder) precisa ver a "cara" do sistema para dar o aceite final. Imagens falam mais que código.
1. **Baixa Fidelidade:** Esqueletos de tela, rabiscos no papel ou no Excalidraw apenas com caixas e textos para aprovar a disposição da informação.
2. **Alta Fidelidade:** Se não houver UI Designer, crie arquivos `HTML/Tailwind` estáticos rápidos com o tema do projeto (Dark Mode, cores, etc).
3. Tire prints, jogue no FigJam/Miro, puxe setas entre elas (baseado no Wireflow) e monte o fluxo de ponta a ponta.
4. **Entregável:** Um PDF visual do fluxo aprovado pelo cliente.

## Passo 6: Definição da Arquitetura (Regras do Jogo)
Antes de rodar `npx create-react-app`, defina como o código será organizado.
1. Crie manuais de arquitetura definindo: Estrutura de Pastas, Padrões de Nomenclatura, Gerenciamento de Estado e Convenções de CSS.
2. Isso garante que a IA (e outros desenvolvedores) sigam um padrão rigoroso e não criem código "espaguete".
3. **Entregável:** Documentos base de arquitetura (Ex: `Arquitetura.md`, `Convencoes.md`).

---

## 🟢 SINAL VERDE (Início do Código)
Apenas após o stakeholder aprovar os 6 passos acima, você deve rodar os comandos no terminal para iniciar o projeto real. 

Quando você começar a programar, você terá:
- **Regras claras** (HUs)
- **Telas prontas** (Mockups)
- **Banco estruturado** (Schema)
- **Caminhos definidos** (Wireflow)

Seguindo este playbook, o desenvolvimento se torna apenas um trabalho de tradução de regras claras para código, sem surpresas no meio do caminho.
