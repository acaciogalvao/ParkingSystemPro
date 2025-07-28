# 🚀 Guia de Instalação - ParkSystem Pro

Este guia fornece instruções detalhadas para instalar e configurar o ParkSystem Pro em diferentes ambientes.

## 📋 Índice

1. [Requisitos Mínimos](#requisitos-mínimos)
2. [Instalação Rápida](#instalação-rápida)
3. [Instalação Manual](#instalação-manual)
4. [Instalação via Docker](#instalação-via-docker)
5. [Configuração](#configuração)
6. [Solução de Problemas](#solução-de-problemas)
7. [Produção](#produção)

## 🔧 Requisitos Mínimos

### Sistema Operacional
- **Linux**: Ubuntu 20.04+, CentOS 8+, Debian 11+
- **macOS**: 12.0+ (Monterey)
- **Windows**: 10+ (com WSL2 recomendado)

### Software Necessário
- **Node.js**: 18.0+ ([Download](https://nodejs.org/))
- **MongoDB**: 7.0+ ([Download](https://www.mongodb.com/try/download/community))
- **Yarn**: 1.22+ ([Instalação](https://yarnpkg.com/getting-started/install))
- **Git**: Para clonar o repositório

### Recursos de Hardware
- **RAM**: Mínimo 2GB, recomendado 4GB+
- **Storage**: Mínimo 5GB livres
- **CPU**: Qualquer processador moderno
- **Rede**: Conexão à internet para instalação de dependências

## 🚀 Instalação Rápida

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/parksystem-pro.git
cd parksystem-pro
```

### 2. Execute a Instalação Automatizada
```bash
chmod +x install.sh
./install.sh
```

### 3. Inicie o Sistema
```bash
./start.sh
```

### 4. Acesse o Sistema
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8001
- **Health Check**: http://localhost:8001/api/health

## 📖 Instalação Manual

### 1. Preparar o Ambiente

#### Linux (Ubuntu/Debian)
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Instalar Yarn
npm install -g yarn

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### macOS
```bash
# Instalar Homebrew (se não tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar dependências
brew install node mongodb-community@7.0 yarn

# Iniciar MongoDB
brew services start mongodb-community@7.0
```

#### Windows (com WSL2)
```bash
# No WSL2 Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g yarn

# MongoDB via Docker (recomendado)
docker run -d --name parksystem-mongo -p 27017:27017 mongo:7.0
```

### 2. Clonar e Configurar

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/parksystem-pro.git
cd parksystem-pro

# Instalar dependências do backend
cd backend
npm install
cd ..

# Instalar dependências do frontend
cd parking-system
yarn install
cd ..
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivos de exemplo
cp .env.example backend/.env
cp .env.example parking-system/.env

# Editar arquivos conforme necessário
nano backend/.env
nano parking-system/.env
```

### 4. Inicializar Banco de Dados

```bash
# Conectar ao MongoDB e criar banco
mongosh
use parkingsystempro
db.createUser({
  user: "admin",
  pwd: "password123",
  roles: ["readWrite", "dbAdmin"]
})
exit
```

### 5. Iniciar Serviços

```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend
cd parking-system
yarn dev
```

## 🐳 Instalação via Docker

### 1. Instalar Docker

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### macOS
```bash
# Instalar Docker Desktop
brew install --cask docker
```

#### Windows
Baixe e instale o [Docker Desktop](https://www.docker.com/products/docker-desktop)

### 2. Executar com Docker

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/parksystem-pro.git
cd parksystem-pro

# Iniciar serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 3. Comandos Úteis do Docker

```bash
# Parar serviços
docker-compose down

# Rebuildar imagens
docker-compose up -d --build

# Limpar volumes
docker-compose down -v

# Acessar container
docker-compose exec backend bash
docker-compose exec frontend sh
```

## ⚙️ Configuração

### Configuração do Backend

#### Arquivo `backend/.env`
```env
# MongoDB
MONGO_URL=mongodb://localhost:27017/parkingsystempro

# Servidor
PORT=8001
NODE_ENV=development

# MercadoPago (obrigatório para pagamentos)
MP_ACCESS_TOKEN=seu_token_aqui
MP_PUBLIC_KEY=sua_public_key_aqui

# Webhook
WEBHOOK_URL=http://localhost:8001

# Segurança
JWT_SECRET=sua_chave_secreta_jwt
```

### Configuração do Frontend

#### Arquivo `parking-system/.env`
```env
# Backend API
VITE_BACKEND_URL=http://localhost:8001/api

# MercadoPago
VITE_MP_PUBLIC_KEY=sua_public_key_aqui

# Ambiente
VITE_NODE_ENV=development
```

### Configuração do MercadoPago

1. Acesse [MercadoPago Developers](https://www.mercadopago.com.br/developers/)
2. Crie uma aplicação
3. Copie as chaves:
   - **Access Token** → `MP_ACCESS_TOKEN`
   - **Public Key** → `MP_PUBLIC_KEY` e `VITE_MP_PUBLIC_KEY`

### Configuração do MongoDB

#### Conexão Local
```env
MONGO_URL=mongodb://localhost:27017/parkingsystempro
```

#### MongoDB Atlas (Cloud)
```env
MONGO_URL=mongodb+srv://usuario:senha@cluster.mongodb.net/parkingsystempro
```

## 🔧 Solução de Problemas

### Problemas Comuns

#### MongoDB não conecta
```bash
# Verificar se está rodando
sudo systemctl status mongod

# Iniciar se parado
sudo systemctl start mongod

# Ver logs
sudo tail -f /var/log/mongodb/mongod.log
```

#### Porta ocupada
```bash
# Ver processo na porta
lsof -i :8001
lsof -i :3000

# Matar processo
kill -9 <PID>
```

#### Dependências quebradas
```bash
# Limpar cache npm
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Frontend
rm -rf node_modules yarn.lock
yarn install
```

#### Erro de permissão
```bash
# Corrigir propriedade
sudo chown -R $USER:$USER .

# Dar permissão aos scripts
chmod +x *.sh
```

### Logs de Debug

```bash
# Backend logs
tail -f backend.log

# Frontend logs  
tail -f frontend.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Testes de Conectividade

```bash
# Testar backend
curl http://localhost:8001/api/health

# Testar MongoDB
mongosh --eval "db.runCommand('ping')"

# Script de verificação
./health-check.sh
```

## 🚀 Produção

### 1. Preparação para Produção

```bash
# Build do frontend
cd parking-system
yarn build

# Configurar variáveis de produção
cp backend/.env backend/.env.production
nano backend/.env.production
```

### 2. Configurações de Produção

#### Backend `.env.production`
```env
NODE_ENV=production
PORT=8001
MONGO_URL=mongodb://localhost:27017/parkingsystempro

# Segurança
HELMET_ENABLED=true
CORS_ORIGIN=https://seu-dominio.com
RATE_LIMIT_ENABLED=true

# SSL
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Logs
LOG_LEVEL=warn
```

### 3. Proxy Reverso (Nginx)

```nginx
# /etc/nginx/sites-available/parksystem
server {
    listen 80;
    server_name seu-dominio.com;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Systemd Services

```ini
# /etc/systemd/system/parksystem-backend.service
[Unit]
Description=ParkSystem Pro Backend
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/parksystem-pro/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 5. SSL/HTTPS

```bash
# Certbot (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

### 6. Monitoramento

```bash
# PM2 para gerenciamento de processos
npm install -g pm2

# Iniciar com PM2
pm2 start backend/server.js --name parksystem-backend
pm2 startup
pm2 save
```

## 📞 Suporte

Se encontrar problemas durante a instalação:

1. **Verifique os logs**: `./logs.sh`
2. **Execute diagnóstico**: `./health-check.sh`
3. **Consulte a documentação**: [README.md](README.md)
4. **Abra uma issue**: [GitHub Issues](https://github.com/seu-usuario/parksystem-pro/issues)

---

**Boa instalação! 🚗💨**