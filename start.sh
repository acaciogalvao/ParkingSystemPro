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
