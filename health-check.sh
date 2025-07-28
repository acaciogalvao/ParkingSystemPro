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
