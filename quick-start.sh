#!/bin/bash

# ParkSystem Pro - Quick Start
# Este script inicia o sistema rapidamente para demonstração

echo "🚗 ParkSystem Pro - Quick Start"
echo "==============================="

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está na pasta correta
if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "parking-system" ]; then
    log_error "Execute este script na pasta raiz do ParkSystem Pro"
    exit 1
fi

# Matar processos existentes nas portas
log_info "Limpando processos existentes..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Verificar e iniciar MongoDB
log_info "Verificando MongoDB..."
if ! mongosh --eval "db.runCommand('ping')" --quiet 2>/dev/null; then
    if command -v docker &> /dev/null; then
        log_info "Iniciando MongoDB via Docker..."
        
        # Parar container se existir
        docker stop parksystem-mongo 2>/dev/null || true
        docker rm parksystem-mongo 2>/dev/null || true
        
        # Iniciar novo container
        docker run -d \
            --name parksystem-mongo \
            -p 27017:27017 \
            mongo:latest
        
        log_info "Aguardando MongoDB inicializar..."
        sleep 10
        
        if docker ps | grep parksystem-mongo; then
            log_success "MongoDB iniciado!"
        else
            log_error "Falha ao iniciar MongoDB"
            exit 1
        fi
    else
        log_error "MongoDB não encontrado e Docker não disponível"
        log_info "Instale MongoDB ou Docker para continuar"
        exit 1
    fi
else
    log_success "MongoDB já está rodando!"
fi

# Verificar se dependências estão instaladas
log_info "Verificando dependências..."

# Backend
if [ ! -d "backend/node_modules" ]; then
    log_info "Instalando dependências do backend..."
    cd backend && npm install --silent && cd ..
fi

# Frontend
if [ ! -d "parking-system/node_modules" ]; then
    log_info "Instalando dependências do frontend..."
    cd parking-system && yarn install --silent && cd ..
fi

# Criar arquivos .env se não existirem
if [ ! -f "backend/.env" ]; then
    log_info "Criando backend/.env..."
    cat > backend/.env << EOF
MONGO_URL=mongodb://localhost:27017/parkingsystempro
PORT=8001
MP_ACCESS_TOKEN=your_token_here
NODE_ENV=development
EOF
fi

if [ ! -f "parking-system/.env" ]; then
    log_info "Criando frontend/.env..."
    cat > parking-system/.env << EOF
VITE_BACKEND_URL=http://localhost:8001/api
VITE_NODE_ENV=development
EOF
fi

# Iniciar backend
log_info "Iniciando backend..."
cd backend
node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Aguardar backend inicializar
log_info "Aguardando backend inicializar..."
for i in {1..30}; do
    if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
        log_success "Backend online!"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        log_error "Backend falhou ao inicializar"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
done

# Iniciar frontend
log_info "Iniciando frontend..."
cd parking-system
yarn dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Aguardar frontend inicializar
log_info "Aguardando frontend inicializar..."
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend online!"
        break
    fi
    sleep 1
    if [ $i -eq 60 ]; then
        log_error "Frontend falhou ao inicializar"
        kill $FRONTEND_PID 2>/dev/null
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
done

# Salvar PIDs
echo $BACKEND_PID > .backend_pid
echo $FRONTEND_PID > .frontend_pid

# Testar sistema
log_info "Testando sistema..."
if curl -s http://localhost:8001/api/health | grep -q "healthy"; then
    log_success "API funcionando!"
else
    log_error "API com problemas"
fi

echo ""
echo "🎉 ============================================"
echo "   PARKSYSTEM PRO INICIADO COM SUCESSO!"
echo "============================================ 🎉"
echo ""
echo "📱 Acesse o sistema:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8001"
echo "   Health:   http://localhost:8001/api/health"
echo ""
echo "🔧 Para parar o sistema:"
echo "   ./stop.sh"
echo ""
echo "📋 Para ver logs:"
echo "   tail -f backend.log frontend.log"
echo ""
echo "Pressione Ctrl+C para parar ou deixe rodando em background"

# Manter script rodando
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# Monitorar processos
while kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; do
    sleep 5
done

log_error "Um dos processos parou inesperadamente"
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null