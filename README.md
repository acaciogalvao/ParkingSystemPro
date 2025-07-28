# 🚗 ParkSystem Pro - Sistema de Gestão de Estacionamento

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-green.svg)](https://mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sistema completo de gestão de estacionamento com interface moderna, pagamentos integrados e gestão em tempo real.

## 🚀 Instalação Rápida

### Opção 1: Instalação Automatizada (Recomendada)

```bash
# Clone o repositório
git clone <seu-repositorio>
cd parksystem-pro

# Execute a instalação automatizada
chmod +x install.sh
./install.sh

# Inicie o sistema
./start.sh
```

### Opção 2: Docker (Mais Simples)

```bash
# Inicie com Docker Compose
docker-compose up -d

# Verifique o status
docker-compose ps
```

### Opção 3: Instalação Manual

```bash
# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do frontend
cd ../parking-system
yarn install

# Configurar variáveis de ambiente
cp backend/.env.example backend/.env
cp parking-system/.env.example parking-system/.env

# Iniciar MongoDB (se não usando Docker)
mongod

# Iniciar backend
cd backend && node server.js &

# Iniciar frontend
cd parking-system && yarn dev
```

## 📋 Pré-requisitos

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** 7.0+ ([Download](https://www.mongodb.com/try/download/community))
- **Yarn** ([Instalação](https://yarnpkg.com/getting-started/install))
- **Docker** (Opcional - [Download](https://www.docker.com/get-started))

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend (`backend/.env`)
```env
# MongoDB
MONGO_URL=mongodb://localhost:27017/parkingsystempro

# Servidor
PORT=8001

# MercadoPago (Opcional)
MP_ACCESS_TOKEN=seu_token_aqui

# Webhook URL (Opcional)
WEBHOOK_URL=http://localhost:8001

# Ambiente
NODE_ENV=development
```

#### Frontend (`parking-system/.env`)
```env
# Backend API
VITE_BACKEND_URL=http://localhost:8001/api

# Ambiente
VITE_NODE_ENV=development
```

## 🎯 Funcionalidades

### ✅ Gestão de Veículos
- ✅ Entrada e saída de veículos
- ✅ Validação de placas brasileiras (ABC-1234 e ABC1A12)
- ✅ Auto-formatação de placas
- ✅ Busca por placa e proprietário

### ✅ Gestão de Vagas
- ✅ 50 vagas para carros (A-01 a A-50)
- ✅ 20 vagas para motos (M-01 a M-20)
- ✅ Visualização em tempo real
- ✅ Alocação automática

### ✅ Sistema de Pagamentos
- ✅ PIX via MercadoPago
- ✅ Cartão de crédito/débito
- ✅ Cálculo automático de taxas
- ✅ Comprovantes digitais

### ✅ Dashboard e Relatórios
- ✅ Estatísticas em tempo real
- ✅ Exportação (PDF, Excel, CSV)
- ✅ Histórico de operações
- ✅ Relatórios mensais

### ✅ Sistema de Reservas
- ✅ Reserva de vagas
- ✅ Pagamento antecipado
- ✅ Gestão de horários

## 🎮 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `./start.sh` | Inicia o sistema completo |
| `./stop.sh` | Para o sistema |
| `./health-check.sh` | Verifica saúde do sistema |
| `./logs.sh` | Mostra logs do sistema |
| `./install.sh` | Instalação automatizada |

## 📱 URLs de Acesso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Health Check**: http://localhost:8001/api/health
- **MongoDB**: mongodb://localhost:27017

## 🔗 API Endpoints

### Principais Endpoints

```
GET    /api/health              - Health check
POST   /api/vehicles/entry      - Registrar entrada
POST   /api/vehicles/exit       - Processar saída
GET    /api/vehicles            - Listar veículos
GET    /api/vehicles/search     - Buscar veículos
GET    /api/spots               - Listar vagas
GET    /api/dashboard/stats     - Estatísticas
GET    /api/reports/export      - Exportar relatórios
POST   /api/payments/pix/create - Criar pagamento PIX
```

[📋 Documentação completa da API](API.md)

## 🐳 Docker

### Comandos Úteis

```bash
# Iniciar serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Rebuild
docker-compose up -d --build

# Limpar volumes
docker-compose down -v
```

## 🧪 Testes

```bash
# Testar backend
cd backend
npm test

# Testar frontend
cd parking-system
yarn test

# Teste de saúde do sistema
./health-check.sh
```

## 🔍 Solução de Problemas

### MongoDB não conecta
```bash
# Verificar se MongoDB está rodando
sudo systemctl status mongod

# Ou via Docker
docker ps | grep mongo
```

### Porta em uso
```bash
# Verificar processos na porta
lsof -i :8001
lsof -i :3000

# Matar processo
kill -9 <PID>
```

### Dependências quebradas
```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install

# Frontend
rm -rf node_modules yarn.lock
yarn install
```

## 📊 Estrutura do Projeto

```
parksystem-pro/
├── backend/              # API Express.js
│   ├── server.js        # Servidor principal
│   ├── package.json     # Dependências
│   └── .env             # Configurações
├── parking-system/       # Frontend React
│   ├── src/             # Código fonte
│   ├── package.json     # Dependências
│   └── .env             # Configurações
├── scripts/             # Scripts utilitários
├── docker-compose.yml   # Docker setup
├── install.sh          # Instalação automatizada
├── start.sh            # Inicialização
├── stop.sh             # Parada
└── README.md           # Documentação
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- **Email**: suporte@parksystem.pro
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/parksystem-pro/issues)
- **Documentação**: [Wiki do Projeto](https://github.com/seu-usuario/parksystem-pro/wiki)

## 🎉 Agradecimentos

Obrigado por usar o ParkSystem Pro! 

---

**Feito com ❤️ pela equipe ParkSystem Pro**