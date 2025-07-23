# 🚀 Full-Stack App - React + FastAPI + MongoDB

Uma aplicação full-stack moderna com frontend React, backend FastAPI e banco de dados MongoDB.

## 🎯 Setup Rápido

### Opção 1: Setup Automático (Recomendado)
```bash
# 1. Baixe/clone o projeto
# 2. Execute o setup
./setup_local.sh

# 3. Inicie a aplicação
./start_app.sh
```

### Opção 2: Setup Manual
Consulte o arquivo [SETUP_LOCAL.md](SETUP_LOCAL.md) para instruções detalhadas.

## 🌐 Acessar a Aplicação

Após executar o setup:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Documentação API**: http://localhost:8001/docs

## 📁 Estrutura do Projeto

```
├── backend/                # API FastAPI
│   ├── server.py          # Servidor principal
│   ├── requirements.txt   # Dependências Python
│   └── .env              # Configurações
├── frontend/              # App React
│   ├── src/              # Código fonte
│   ├── package.json      # Dependências Node.js
│   └── .env             # Configurações
├── setup_local.sh        # Script de setup automático
├── start_app.sh          # Script para iniciar app
└── SETUP_LOCAL.md        # Guia detalhado
```

## 🛠 Comandos Úteis

```bash
# Setup inicial
./setup_local.sh

# Iniciar aplicação completa
./start_app.sh

# Apenas backend
cd backend && source venv/bin/activate && uvicorn server:app --reload

# Apenas frontend
cd frontend && yarn start
```

## 📚 API Endpoints

- `GET /api/` - Hello World
- `POST /api/status` - Criar status check
- `GET /api/status` - Listar status checks

## 🔧 Tecnologias

- **Frontend**: React 19, Tailwind CSS, Axios
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic
- **Database**: MongoDB
- **Others**: Python 3.11+, Node.js 18+, Yarn

## 📝 Próximas Funcionalidades

Depois de testar, você pode implementar:
- Sistema de autenticação
- Upload de arquivos
- Integração com APIs externas
- E muito mais!

---

🎉 **Divirta-se testando!**

# Project Template (Original)
