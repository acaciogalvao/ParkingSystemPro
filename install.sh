#!/bin/bash

# ParkSystem Pro - Instalação Automatizada
# Autor: ParkSystem Pro Team
# Versão: 1.0

set -e

echo "🚗 ParkSystem Pro - Instalação Automatizada"
echo "=========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como root para comandos sudo
check_sudo() {
    if ! sudo -n true 2>/dev/null; then
        log_warning "Alguns comandos precisam de privilégios sudo"
        echo "Digite sua senha quando solicitado:"
    fi
}

# Verificar dependências do sistema
check_dependencies() {
    log_info "Verificando dependências do sistema..."
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado! Instalando..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        node_version=$(node --version)
        log_success "Node.js encontrado: $node_version"
    fi
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        log_error "npm não encontrado!"
        exit 1
    else
        npm_version=$(npm --version)
        log_success "npm encontrado: $npm_version"
    fi
    
    # Verificar yarn
    if ! command -v yarn &> /dev/null; then
        log_info "Yarn não encontrado. Instalando..."
        npm install -g yarn
    else
        yarn_version=$(yarn --version)
        log_success "Yarn encontrado: $yarn_version"
    fi
    
    # Verificar MongoDB
    if ! command -v mongod &> /dev/null; then
        log_warning "MongoDB não encontrado localmente"
        log_info "O sistema usará MongoDB via Docker ou conexão externa"
    else
        log_success "MongoDB encontrado"
    fi
    
    # Verificar Docker (opcional)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker não encontrado. Instalação manual do MongoDB necessária"
    else
        docker_version=$(docker --version)
        log_success "Docker encontrado: $docker_version"
    fi
}

# Instalar dependências do backend
install_backend() {
    log_info "Instalando dependências do backend..."
    cd backend
    
    if [ ! -f "package.json" ]; then
        log_error "package.json não encontrado no backend!"
        exit 1
    fi
    
    npm install
    log_success "Dependências do backend instaladas!"
    cd ..
}

# Instalar dependências do frontend
install_frontend() {
    log_info "Instalando dependências do frontend..."
    cd parking-system
    
    if [ ! -f "package.json" ]; then
        log_error "package.json não encontrado no frontend!"
        exit 1
    fi
    
    yarn install
    log_success "Dependências do frontend instaladas!"
    cd ..
}

# Configurar variáveis de ambiente
setup_environment() {
    log_info "Configurando variáveis de ambiente..."
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        log_info "Criando arquivo .env para o backend..."
        cat > backend/.env << EOF
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017/parkingsystempro

# Server Configuration
PORT=8001

# MercadoPago Configuration (Opcional)
MP_ACCESS_TOKEN=your_mercadopago_token_here

# Webhook URL (Opcional)
WEBHOOK_URL=http://localhost:8001

# Environment
NODE_ENV=development
EOF
        log_success "Arquivo backend/.env criado!"
    else
        log_success "Arquivo backend/.env já existe!"
    fi
    
    # Frontend .env
    if [ ! -f "parking-system/.env" ]; then
        log_info "Criando arquivo .env para o frontend..."
        cat > parking-system/.env << EOF
# Backend API Configuration
VITE_BACKEND_URL=http://localhost:8001/api

# Development Configuration
VITE_NODE_ENV=development
EOF
        log_success "Arquivo frontend/.env criado!"
    else
        log_success "Arquivo frontend/.env já existe!"
    fi
}

# Verificar MongoDB
setup_mongodb() {
    log_info "Verificando MongoDB..."
    
    # Tentar conectar ao MongoDB local
    if mongosh --eval "db.runCommand('ping')" --quiet 2>/dev/null; then
        log_success "MongoDB local está rodando!"
        return 0
    fi
    
    # Se Docker está disponível, usar MongoDB via Docker
    if command -v docker &> /dev/null; then
        log_info "Iniciando MongoDB via Docker..."
        docker run -d \
            --name parksystem-mongo \
            -p 27017:27017 \
            -v parksystem_mongo_data:/data/db \
            mongo:latest
        
        log_info "Aguardando MongoDB inicializar..."
        sleep 10
        
        if docker ps | grep parksystem-mongo > /dev/null; then
            log_success "MongoDB iniciado via Docker!"
        else
            log_error "Falha ao iniciar MongoDB via Docker"
            exit 1
        fi
    else
        log_warning "MongoDB não encontrado e Docker não disponível"
        log_info "Por favor, instale MongoDB manualmente ou configure MONGO_URL no .env"
    fi
}

# Testar conexões
test_connections() {
    log_info "Testando conexões..."
    
    # Testar backend
    cd backend
    timeout 30 node -e "
        import('./server.js').then(() => {
            console.log('Backend conectado com sucesso!');
            process.exit(0);
        }).catch(err => {
            console.error('Erro ao conectar backend:', err.message);
            process.exit(1);
        });
    " && log_success "Backend funcional!" || log_error "Problema no backend"
    cd ..
}

# Criar scripts de conveniência
create_scripts() {
    log_info "Criando scripts de conveniência..."
    
    # Script de inicialização
    cat > start.sh << 'EOF'
#!/bin/bash
echo "🚗 Iniciando ParkSystem Pro..."

# Função para verificar se porta está em uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null; then
        echo "Porta $1 em uso. Parando processo..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Parar processos nas portas se necessário
check_port 8001
check_port 3000

# Iniciar MongoDB se não estiver rodando
if ! mongosh --eval "db.runCommand('ping')" --quiet 2>/dev/null; then
    echo "Iniciando MongoDB..."
    if command -v docker &> /dev/null && docker ps -a | grep parksystem-mongo > /dev/null; then
        docker start parksystem-mongo
        sleep 5
    fi
fi

echo "Iniciando backend..."
cd backend && node server.js &
BACKEND_PID=$!

echo "Aguardando backend inicializar..."
sleep 5

echo "Iniciando frontend..."
cd ../parking-system && yarn dev &
FRONTEND_PID=$!

echo ""
echo "🎉 ParkSystem Pro iniciado com sucesso!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8001"
echo "📊 Health Check: http://localhost:8001/api/health"
echo ""
echo "Para parar o sistema, execute: ./stop.sh"
echo "Para ver logs: ./logs.sh"

# Salvar PIDs para parar depois
echo $BACKEND_PID > .backend_pid
echo $FRONTEND_PID > .frontend_pid

wait
EOF

    chmod +x start.sh
    log_success "Script start.sh criado!"
    
    # Script de parada
    cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Parando ParkSystem Pro..."

# Parar processos salvos
if [ -f .backend_pid ]; then
    BACKEND_PID=$(cat .backend_pid)
    kill $BACKEND_PID 2>/dev/null || true
    rm .backend_pid
fi

if [ -f .frontend_pid ]; then
    FRONTEND_PID=$(cat .frontend_pid)
    kill $FRONTEND_PID 2>/dev/null || true
    rm .frontend_pid
fi

# Parar qualquer processo nas portas
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "✅ ParkSystem Pro parado!"
EOF

    chmod +x stop.sh
    log_success "Script stop.sh criado!"
    
    # Script de logs
    cat > logs.sh << 'EOF'
#!/bin/bash
echo "📋 Logs do ParkSystem Pro"
echo "========================"

echo "Backend logs:"
echo "-------------"
cd backend && npm run logs 2>/dev/null || echo "Backend não está rodando"

echo ""
echo "Frontend logs:"
echo "--------------"
cd ../parking-system && yarn logs 2>/dev/null || echo "Frontend não está rodando"
EOF

    chmod +x logs.sh
    log_success "Script logs.sh criado!"
    
    # Script de verificação
    cat > health-check.sh << 'EOF'
#!/bin/bash
echo "🏥 Verificação de Saúde do Sistema"
echo "================================="

# Verificar backend
echo "Verificando backend..."
if curl -s http://localhost:8001/api/health > /dev/null; then
    echo "✅ Backend: OK"
    curl -s http://localhost:8001/api/health | jq '.' 2>/dev/null || curl -s http://localhost:8001/api/health
else
    echo "❌ Backend: FALHA"
fi

# Verificar frontend
echo ""
echo "Verificando frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: FALHA"
fi

# Verificar MongoDB
echo ""
echo "Verificando MongoDB..."
if mongosh --eval "db.runCommand('ping')" --quiet 2>/dev/null; then
    echo "✅ MongoDB: OK"
else
    echo "❌ MongoDB: FALHA"
fi
EOF

    chmod +x health-check.sh
    log_success "Script health-check.sh criado!"
}

# Função principal
main() {
    echo ""
    log_info "Iniciando instalação do ParkSystem Pro..."
    echo ""
    
    check_sudo
    check_dependencies
    install_backend
    install_frontend
    setup_environment
    setup_mongodb
    create_scripts
    
    echo ""
    echo "🎉 ============================================="
    echo "   INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
    echo "============================================= 🎉"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Configure suas chaves do MercadoPago em backend/.env (opcional)"
    echo "   2. Execute: ./start.sh para iniciar o sistema"
    echo "   3. Acesse: http://localhost:3000"
    echo ""
    echo "🔧 Scripts disponíveis:"
    echo "   ./start.sh       - Iniciar o sistema"
    echo "   ./stop.sh        - Parar o sistema"
    echo "   ./health-check.sh - Verificar saúde do sistema"
    echo "   ./logs.sh        - Ver logs do sistema"
    echo ""
    echo "📞 Em caso de problemas:"
    echo "   - Verifique os logs com ./logs.sh"
    echo "   - Execute ./health-check.sh para diagnóstico"
    echo "   - Consulte a documentação em README.md"
    echo ""
}

# Executar instalação
main "$@"