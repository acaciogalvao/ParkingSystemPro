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
