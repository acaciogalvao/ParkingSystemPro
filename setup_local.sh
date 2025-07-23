#!/bin/bash

# 🚀 Script de Setup Automático para Ambiente Local
# Execute: chmod +x setup_local.sh && ./setup_local.sh

echo "🚀 Configurando ambiente local..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para print colorido
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar pré-requisitos
echo "🔍 Verificando pré-requisitos..."

# Verificar Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    print_status "Python encontrado: v$PYTHON_VERSION"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2)
    print_status "Python encontrado: v$PYTHON_VERSION"
    PYTHON_CMD="python"
else
    print_error "Python não encontrado! Instale o Python 3.11+ antes de continuar."
    exit 1
fi

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js encontrado: $NODE_VERSION"
else
    print_error "Node.js não encontrado! Instale o Node.js 18+ antes de continuar."
    exit 1
fi

# Verificar Yarn
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    print_status "Yarn encontrado: v$YARN_VERSION"
else
    print_warning "Yarn não encontrado. Instalando..."
    npm install -g yarn
fi

echo ""
echo "🛠  Configurando Backend..."

# Setup Backend
cd backend

# Criar ambiente virtual se não existir
if [ ! -d "venv" ]; then
    print_status "Criando ambiente virtual Python..."
    $PYTHON_CMD -m venv venv
fi

# Ativar ambiente virtual
print_status "Ativando ambiente virtual..."
source venv/bin/activate

# Instalar dependências
print_status "Instalando dependências Python..."
pip install -r requirements.txt

# Criar .env se não existir
if [ ! -f ".env" ]; then
    print_status "Criando arquivo .env do backend..."
    cat << EOF > .env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
EOF
else
    print_warning "Arquivo .env do backend já existe."
fi

echo ""
echo "🎨 Configurando Frontend..."

# Setup Frontend
cd ../frontend

# Instalar dependências
print_status "Instalando dependências do frontend..."
yarn install

# Criar .env se não existir
if [ ! -f ".env" ]; then
    print_status "Criando arquivo .env do frontend..."
    cat << EOF > .env
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
else
    print_warning "Arquivo .env do frontend já existe."
fi

cd ..

echo ""
echo "🎉 Setup concluído!"
echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. 🍃 Inicie o MongoDB:"
echo "   mongod"
echo ""
echo "2. 🚀 Inicie o Backend (em um terminal):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
echo ""
echo "3. 🎨 Inicie o Frontend (em outro terminal):"
echo "   cd frontend"
echo "   yarn start"
echo ""
echo "4. 🌐 Acesse no navegador:"
echo "   http://localhost:3000"
echo ""
print_status "Setup completo! Boa sorte! 🚀"