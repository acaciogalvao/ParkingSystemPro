#!/bin/bash

# 🚀 Script para iniciar a aplicação completa
# Execute: chmod +x start_app.sh && ./start_app.sh

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🚀 Iniciando aplicação full-stack..."

# Verificar se MongoDB está rodando
echo "🔍 Verificando MongoDB..."
if pgrep -x "mongod" > /dev/null; then
    print_status "MongoDB já está rodando"
else
    print_warning "MongoDB não está rodando. Tentando iniciar..."
    
    # Tentar diferentes formas de iniciar MongoDB
    if command -v mongod &> /dev/null; then
        mongod --fork --logpath /tmp/mongodb.log --dbpath /tmp/mongodb-data || {
            print_error "Erro ao iniciar MongoDB. Inicie manualmente: mongod"
            exit 1
        }
    else
        print_error "MongoDB não encontrado. Instale o MongoDB primeiro."
        exit 1
    fi
fi

# Função para iniciar backend
start_backend() {
    echo "🔧 Iniciando Backend..."
    cd backend
    
    if [ ! -d "venv" ]; then
        print_error "Ambiente virtual não encontrado. Execute primeiro: ./setup_local.sh"
        exit 1
    fi
    
    source venv/bin/activate
    uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
    BACKEND_PID=$!
    
    print_status "Backend iniciado (PID: $BACKEND_PID)"
    cd ..
}

# Função para iniciar frontend
start_frontend() {
    echo "🎨 Iniciando Frontend..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        print_error "Dependências do frontend não encontradas. Execute primeiro: ./setup_local.sh"
        exit 1
    fi
    
    yarn start &
    FRONTEND_PID=$!
    
    print_status "Frontend iniciado (PID: $FRONTEND_PID)"
    cd ..
}

# Iniciar serviços
start_backend
sleep 3
start_frontend

echo ""
print_status "🎉 Aplicação iniciada com sucesso!"
echo ""
echo "📱 URLs importantes:"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔧 Backend API: http://localhost:8001"
echo "   📚 Documentação API: http://localhost:8001/docs"
echo ""
echo "⚠️  Para parar a aplicação, pressione Ctrl+C"
echo ""

# Aguardar interrupção
trap 'echo -e "\n🛑 Parando aplicação..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Manter script rodando
wait