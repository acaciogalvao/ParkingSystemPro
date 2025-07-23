# 🚀 Guia de Configuração Local

Este guia te ajudará a rodar a aplicação full-stack (React + FastAPI + MongoDB) em sua máquina local.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

### 1. Python 3.11+
```bash
# Verificar versão
python --version
# ou
python3 --version
```

### 2. Node.js 18+ e Yarn
```bash
# Verificar versão do Node.js
node --version

# Instalar Yarn (se não tiver)
npm install -g yarn

# Verificar versão do Yarn
yarn --version
```

### 3. MongoDB
**Opção A: MongoDB local**
- Baixe e instale: https://www.mongodb.com/try/download/community
- Inicie o serviço MongoDB

**Opção B: MongoDB Atlas (nuvem - gratuito)**
- Crie uma conta em: https://www.mongodb.com/atlas
- Crie um cluster gratuito
- Obtenha a string de conexão

## 🛠 Configuração do Projeto

### 1. Clone/Baixe o projeto
```bash
# Se você tem o código em um repositório Git
git clone <seu-repositorio>
cd <nome-do-projeto>

# OU baixe os arquivos manualmente e extraia
```

### 2. Configuração do Backend

#### a) Criar ambiente virtual Python
```bash
cd backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# No Windows:
venv\Scripts\activate
# No macOS/Linux:
source venv/bin/activate
```

#### b) Instalar dependências Python
```bash
pip install -r requirements.txt
```

#### c) Configurar variáveis de ambiente
Crie o arquivo `backend/.env`:

**Para este projeto específico (usando MongoDB Atlas):**
```env
MONGO_URL="mongodb+srv://parkingsystempro:parkingsystempro271182@parkingsystempro.q2hda0p.mongodb.net/?retryWrites=true&w=majority&appName=parkingsystempro"
DB_NAME="parkingsystempro"
```

**OU para MongoDB local:**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
```

**OU se usando outro MongoDB Atlas:**
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=seu_database
```

### 3. Configuração do Frontend

#### a) Instalar dependências
```bash
cd ../frontend
yarn install
```

#### b) Configurar variáveis de ambiente
Crie o arquivo `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 🚀 Executando a Aplicação

### 1. Iniciar MongoDB
```bash
# Se instalado localmente
mongod

# OU iniciar o serviço do sistema
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### 2. Iniciar o Backend
```bash
cd backend

# Ativar ambiente virtual (se não estiver ativo)
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Rodar o servidor
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

O backend estará rodando em: `http://localhost:8001`

### 3. Iniciar o Frontend
Em um novo terminal:
```bash
cd frontend
yarn start
```

O frontend estará rodando em: `http://localhost:3000`

## 🌐 Testando no Navegador

1. Abra seu navegador
2. Acesse: `http://localhost:3000`
3. Você deve ver a página com o logo da Emergent e a mensagem "Building something incredible ~!"

### Testando a API
- API Base: `http://localhost:8001`
- Documentação da API: `http://localhost:8001/docs`
- Endpoints disponíveis:
  - `GET http://localhost:8001/api/` - Hello World
  - `POST http://localhost:8001/api/status` - Criar status check
  - `GET http://localhost:8001/api/status` - Listar status checks

## 🔧 Resolução de Problemas

### Backend não inicia
```bash
# Verificar se MongoDB está rodando
# No terminal:
mongo
# ou
mongosh

# Verificar logs de erro
python server.py
```

### Frontend não inicia
```bash
# Limpar cache
yarn cache clean

# Reinstalar dependências
rm -rf node_modules package-lock.json
yarn install
```

### Erro de CORS
Certifique-se de que:
- Backend está rodando na porta 8001
- Frontend está configurado para `REACT_APP_BACKEND_URL=http://localhost:8001`

### Erro de conexão com MongoDB
- Verifique se MongoDB está rodando
- Confirme a string de conexão no arquivo `.env`
- Para MongoDB Atlas, verifique credenciais e whitelist de IP

## 📁 Estrutura do Projeto

```
projeto/
├── backend/                 # API FastAPI
│   ├── server.py           # Servidor principal
│   ├── requirements.txt    # Dependências Python
│   ├── .env               # Variáveis de ambiente
│   └── venv/              # Ambiente virtual
├── frontend/               # App React
│   ├── src/
│   │   ├── App.js         # Componente principal
│   │   └── index.js       # Ponto de entrada
│   ├── package.json       # Dependências Node.js
│   ├── .env              # Variáveis de ambiente
│   └── node_modules/     # Dependências instaladas
└── SETUP_LOCAL.md        # Este guia
```

## ✅ Checklist de Verificação

- [ ] Python 3.11+ instalado
- [ ] Node.js 18+ instalado
- [ ] Yarn instalado
- [ ] MongoDB instalado/configurado
- [ ] Dependências do backend instaladas
- [ ] Dependências do frontend instaladas
- [ ] Arquivo `.env` do backend criado
- [ ] Arquivo `.env` do frontend criado
- [ ] MongoDB rodando
- [ ] Backend rodando na porta 8001
- [ ] Frontend rodando na porta 3000
- [ ] Aplicação acessível em `http://localhost:3000`

## 🆘 Precisa de Ajuda?

Se encontrar problemas:
1. Leia as mensagens de erro cuidadosamente
2. Verifique se todos os serviços estão rodando
3. Confirme se as portas não estão sendo usadas por outros programas
4. Verifique os logs do console no navegador (F12)

---

🎉 **Parabéns!** Sua aplicação deve estar rodando localmente agora!