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
