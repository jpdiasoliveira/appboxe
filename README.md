# Boxe School - Sistema Completo com Backend

Sistema de gerenciamento para escolas de boxe com backend Node.js e banco de dados SQLite.

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js instalado (versão 16 ou superior)

### Passo 1: Instalar Dependências

#### Frontend
```bash
npm install
```

#### Backend
```bash
cd backend
npm install
```

### Passo 2: Iniciar os Servidores

**Você precisa rodar DOIS terminais simultaneamente:**

#### Terminal 1 - Backend (Porta 3001)
```bash
cd backend
npm run dev
```

Você verá: `Server running on port 3001`

#### Terminal 2 - Frontend (Porta 5173)
```bash
npm run dev
```

Você verá: `Local: http://localhost:5173/`

### Passo 3: Acessar o Aplicativo

Abra seu navegador em: **http://localhost:5173**

## 📊 Banco de Dados

O banco de dados SQLite está localizado em:
```
backend/prisma/dev.db
```

**IMPORTANTE**: Agora os dados são PERSISTENTES! Mesmo se você recarregar a página ou fechar o navegador, os dados continuarão salvos.

## 🔐 Autenticação

### Cadastro de Aluno
1. Acesse a tela de login
2. Clique em "Cadastrar-se"
3. Preencha todos os campos
4. Faça login com usuário e senha criados

### Cadastro de Professor (Rota Secreta)
Acesse diretamente: **http://localhost:5173/register/professor/secret**

## 🎯 Funcionalidades

### Professor
- Criar e gerenciar treinos futuros
- Ver lista de presença por treino específico
- Gerenciar alunos (adicionar, editar, remover)

### Aluno
- Ver próximos treinos agendados
- Confirmar presença/ausência (até 3 dias antes)
- Ver status de pagamento
- Ver perfil e plano

## 🛠️ Tecnologias

### Frontend
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Axios (comunicação com API)

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- SQLite
- bcryptjs (hash de senhas)

## 📝 Estrutura do Projeto

```
boxe-school/
├── backend/              # Servidor Node.js
│   ├── prisma/          # Banco de dados SQLite
│   │   └── dev.db       # Arquivo do banco
│   └── src/
│       └── server.ts    # API REST
├── src/                 # Frontend React
│   ├── components/
│   ├── pages/
│   └── context/
└── package.json
```

## 🔄 Resetar o Banco de Dados

Se quiser começar do zero:
```bash
cd backend
rm prisma/dev.db
npx prisma db push
```

## 🚨 Problemas Comuns

### "Cannot connect to backend"
- Verifique se o backend está rodando na porta 3001
- Execute `cd backend && npm run dev`

### "Port already in use"
- Feche outros processos usando as portas 3001 ou 5173
- Ou o Vite escolherá outra porta automaticamente

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Ambos os servidores estão rodando?
2. As portas 3001 e 5173 estão livres?
3. Você instalou as dependências em ambas as pastas?

---

**Desenvolvido para facilitar a gestão de escolas de boxe 🥊**
