#!/bin/bash

# ParkSystem Pro - Teste de Instalação
# Verifica se o sistema foi instalado corretamente

echo "🧪 ParkSystem Pro - Teste de Instalação"
echo "======================================="

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✅ PASS]${NC} $1"
}

log_error() {
    echo -e "${RED}[❌ FAIL]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠️ WARN]${NC} $1"
}

# Contadores
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Função para executar teste
run_test() {
    local test_name="$1"
    local command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log_info "Testando: $test_name"
    
    if eval "$command" > /dev/null 2>&1; then
        log_success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo ""
log_info "Iniciando testes de instalação..."
echo ""

# Teste 1: Verificar estrutura de arquivos
log_info "==== TESTE 1: Estrutura de Arquivos ===="
run_test "Arquivo install.sh existe" "[ -f install.sh ]"
run_test "Arquivo start.sh existe" "[ -f start.sh ]"
run_test "Arquivo stop.sh existe" "[ -f stop.sh ]"
run_test "Arquivo quick-start.sh existe" "[ -f quick-start.sh ]"
run_test "Arquivo health-check.sh existe" "[ -f health-check.sh ]"
run_test "Arquivo docker-compose.yml existe" "[ -f docker-compose.yml ]"
run_test "Pasta backend existe" "[ -d backend ]"
run_test "Pasta parking-system existe" "[ -d parking-system ]"
run_test "Backend package.json existe" "[ -f backend/package.json ]"
run_test "Frontend package.json existe" "[ -f parking-system/package.json ]"

echo ""
log_info "==== TESTE 2: Scripts Executáveis ===="
run_test "install.sh é executável" "[ -x install.sh ]"
run_test "start.sh é executável" "[ -x start.sh ]"
run_test "stop.sh é executável" "[ -x stop.sh ]"
run_test "quick-start.sh é executável" "[ -x quick-start.sh ]"
run_test "health-check.sh é executável" "[ -x health-check.sh ]"

echo ""
log_info "==== TESTE 3: Dependências do Sistema ===="
run_test "Node.js instalado" "command -v node"
run_test "NPM instalado" "command -v npm"
run_test "Yarn instalado" "command -v yarn"

# Verificar versões
if command -v node > /dev/null; then
    NODE_VERSION=$(node --version)
    log_success "Node.js versão: $NODE_VERSION"
fi

if command -v npm > /dev/null; then
    NPM_VERSION=$(npm --version)
    log_success "NPM versão: $NPM_VERSION"
fi

if command -v yarn > /dev/null; then
    YARN_VERSION=$(yarn --version)
    log_success "Yarn versão: $YARN_VERSION"
fi

echo ""
log_info "==== TESTE 4: Dependências do Projeto ===="
run_test "Backend node_modules existe" "[ -d backend/node_modules ]"
run_test "Frontend node_modules existe" "[ -d parking-system/node_modules ]"

echo ""
log_info "==== TESTE 5: Conectividade (se rodando) ===="

# Verificar se serviços estão rodando
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    log_success "Backend respondendo na porta 8001"
    
    # Testar endpoints específicos
    run_test "Health check endpoint" "curl -s http://localhost:8001/api/health | grep -q healthy"
    run_test "Dashboard stats endpoint" "curl -s http://localhost:8001/api/dashboard/stats > /dev/null"
    run_test "Vehicles endpoint" "curl -s http://localhost:8001/api/vehicles > /dev/null"
    run_test "Spots endpoint" "curl -s http://localhost:8001/api/spots > /dev/null"
else
    log_warning "Backend não está rodando (isso é normal se você não iniciou o sistema)"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    log_success "Frontend respondendo na porta 3000"
else
    log_warning "Frontend não está rodando (isso é normal se você não iniciou o sistema)"
fi

echo ""
log_info "==== TESTE 6: MongoDB ===="
if command -v mongosh > /dev/null 2>&1; then
    if mongosh --eval "db.runCommand('ping')" --quiet 2>/dev/null; then
        log_success "MongoDB está rodando e acessível"
    else
        log_warning "MongoDB não está rodando ou não acessível"
    fi
elif command -v mongo > /dev/null 2>&1; then
    if mongo --eval "db.runCommand('ping')" --quiet 2>/dev/null; then
        log_success "MongoDB está rodando e acessível (versão legacy)"
    else
        log_warning "MongoDB não está rodando ou não acessível"
    fi
else
    log_warning "MongoDB client não encontrado"
fi

# Verificar Docker como alternativa
if command -v docker > /dev/null 2>&1; then
    if docker ps | grep -q mongo; then
        log_success "MongoDB rodando via Docker"
    else
        log_info "MongoDB não encontrado via Docker (normal se usando instalação local)"
    fi
else
    log_info "Docker não encontrado (normal se usando instalação local)"
fi

echo ""
log_info "==== TESTE 7: Configuração ===="
if [ -f "backend/.env" ]; then
    log_success "Backend .env existe"
    if grep -q "MONGO_URL" backend/.env; then
        log_success "MONGO_URL configurado no backend"
    else
        log_error "MONGO_URL não encontrado no backend/.env"
    fi
else
    log_warning "Backend .env não existe (será criado na primeira execução)"
fi

if [ -f "parking-system/.env" ]; then
    log_success "Frontend .env existe"
    if grep -q "VITE_BACKEND_URL" parking-system/.env; then
        log_success "VITE_BACKEND_URL configurado no frontend"
    else
        log_error "VITE_BACKEND_URL não encontrado no frontend/.env"
    fi
else
    log_warning "Frontend .env não existe (será criado na primeira execução)"
fi

# Resultado final
echo ""
echo "📊 ============================================="
echo "           RESULTADO DOS TESTES"
echo "============================================= 📊"
echo ""
echo "Total de testes: $TOTAL_TESTS"
echo -e "Testes passaram: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Testes falharam: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo "🎉 TODOS OS TESTES PASSARAM!"
    echo "   O sistema está pronto para uso."
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Execute: ./start.sh (para iniciar o sistema)"
    echo "   2. Execute: ./quick-start.sh (para start rápido)"
    echo "   3. Acesse: http://localhost:3000"
    echo ""
    exit 0
else
    echo ""
    echo "⚠️  ALGUNS TESTES FALHARAM"
    echo "   Verifique os erros acima e execute:"
    echo "   ./install.sh para instalar dependências"
    echo ""
    echo "💡 Dicas:"
    echo "   - Certifique-se de ter Node.js 18+ instalado"
    echo "   - Execute 'yarn install' nas pastas se necessário"
    echo "   - Verifique se MongoDB está rodando"
    echo ""
    exit 1
fi