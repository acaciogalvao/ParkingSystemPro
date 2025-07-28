# 🎯 GUIA DE USO RÁPIDO - ParkSystem Pro

## 🚀 Como Instalar e Usar

### 📥 1. Instalação Ultra-Rápida (1 comando)

```bash
# Clone o repositório (substitua pela URL real)
git clone https://github.com/seu-usuario/parksystem-pro.git
cd parksystem-pro

# Execute a instalação automática
./install.sh
```

### ⚡ 2. Inicialização Rápida

```bash
# Opção 1: Inicialização inteligente (recomendada)
./quick-start.sh

# Opção 2: Inicialização padrão
./start.sh
```

### 🌐 3. Acessar o Sistema

- **Interface Principal**: http://localhost:3000
- **API Backend**: http://localhost:8001
- **Status da API**: http://localhost:8001/api/health

### 🛑 4. Parar o Sistema

```bash
./stop.sh
```

## 📋 Scripts Principais

| Script | Função | Uso |
|--------|--------|-----|
| `./install.sh` | Instalação completa | Uma vez apenas |
| `./quick-start.sh` | Start inteligente | Para demonstrações |
| `./start.sh` | Start padrão | Uso diário |
| `./stop.sh` | Parar sistema | Quando necessário |
| `./health-check.sh` | Verificar saúde | Diagnóstico |
| `./test-installation.sh` | Testar instalação | Verificação |

## 🔧 Comandos de Manutenção

```bash
# Verificar se tudo está funcionando
./health-check.sh

# Testar a instalação
./test-installation.sh

# Ver logs do sistema
tail -f backend.log frontend.log

# Reiniciar apenas o backend
cd backend && node server.js

# Reiniciar apenas o frontend
cd parking-system && yarn dev
```

## 🐳 Usando Docker (Alternativa)

```bash
# Iniciar com Docker
docker-compose up -d

# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

## ⚙️ Configuração Rápida do MercadoPago

1. **Obter chaves**: Acesse https://www.mercadopago.com.br/developers/
2. **Configurar backend**: Edite `backend/.env`
   ```env
   MP_ACCESS_TOKEN=seu_access_token_aqui
   ```
3. **Configurar frontend**: Edite `parking-system/.env`
   ```env
   VITE_MP_PUBLIC_KEY=sua_public_key_aqui
   ```
4. **Reiniciar**: `./stop.sh && ./start.sh`

## 🚨 Solução Rápida de Problemas

### MongoDB não conecta
```bash
# Verificar se está rodando
sudo systemctl status mongod

# Se não estiver, iniciar
sudo systemctl start mongod

# Alternativa com Docker
docker run -d --name parksystem-mongo -p 27017:27017 mongo:7.0
```

### Porta ocupada
```bash
# Verificar processo
lsof -i :8001  # Backend
lsof -i :3000  # Frontend

# Matar processo
kill -9 <PID>

# Ou usar o script de parada
./stop.sh
```

### Dependências corrompidas
```bash
# Limpar e reinstalar tudo
rm -rf backend/node_modules parking-system/node_modules
rm -f backend/package-lock.json parking-system/yarn.lock
./install.sh
```

### Sistema não responde
```bash
# Diagnóstico completo
./health-check.sh

# Verificar instalação
./test-installation.sh

# Restart completo
./stop.sh
./quick-start.sh
```

## 📊 URLs Importantes

- **Frontend**: http://localhost:3000
- **API Health**: http://localhost:8001/api/health
- **API Docs**: http://localhost:8001/api/vehicles
- **Dashboard Stats**: http://localhost:8001/api/dashboard/stats

## 🎯 Funcionalidades Principais

### ✅ Dashboard
- Estatísticas em tempo real
- Resumo de vagas disponíveis
- Veículos estacionados
- Receita do dia

### ✅ Entrada de Veículos
- Validação automática de placas brasileiras
- Formatos: ABC-1234 (antigo) e ABC1A12 (Mercosul)
- Alocação automática de vagas
- Suporte a carros e motos

### ✅ Gestão de Vagas
- 50 vagas para carros (A-01 a A-50)
- 20 vagas para motos (M-01 a M-20)
- Visualização em tempo real
- Status: livre, ocupada, reservada

### ✅ Pagamentos
- PIX via MercadoPago
- Cartão de crédito/débito
- Cálculo automático (R$10/h carros, R$7/h motos)
- Comprovantes digitais

### ✅ Relatórios
- Exportação em PDF, Excel, CSV
- Dados diários, mensais
- Histórico completo de operações

### ✅ Sistema de Reservas
- Reserva antecipada de vagas
- Pagamento integrado
- Gestão de horários

## 🎮 Como Usar a Interface

1. **Dashboard**: Visão geral do estacionamento
2. **Entrada**: Registrar novo veículo
3. **Veículos**: Buscar e gerenciar veículos estacionados
4. **Vagas**: Visualizar mapa de vagas em tempo real
5. **Relatórios**: Gerar relatórios de operações
6. **Reservas**: Gerenciar reservas de vagas
7. **Histórico**: Ver histórico de operações

## 💰 Configuração de Preços

Edite `backend/server.js` para alterar preços:

```javascript
// Linhas aproximadas 862-863
const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
// Carros: R$10/hora, Motos: R$7/hora
```

## 📞 Suporte

- **Logs**: `tail -f backend.log frontend.log`
- **Teste**: `./test-installation.sh`
- **Saúde**: `./health-check.sh`
- **Documentação**: Veja `README.md` e `INSTALACAO.md`

---

**✨ ParkSystem Pro - Gestão Inteligente de Estacionamento**

*Instalação em 1 minuto, funcionando em 2 minutos!*