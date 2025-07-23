# 🍃 Configuração MongoDB Atlas

Este projeto está configurado para usar MongoDB Atlas (MongoDB na nuvem) em vez de uma instalação local.

## ✅ Configuração Atual

**String de Conexão:** 
```
mongodb+srv://parkingsystempro:parkingsystempro271182@parkingsystempro.q2hda0p.mongodb.net/?retryWrites=true&w=majority&appName=parkingsystempro
```

**Database:** `parkingsystempro`

## 🎯 Vantagens do MongoDB Atlas

- ✅ **Sem instalação local**: Não precisa instalar MongoDB na sua máquina
- ✅ **Sempre disponível**: Banco na nuvem 24/7
- ✅ **Backup automático**: Seus dados estão seguros
- ✅ **Performance**: Servidores otimizados
- ✅ **Fácil compartilhamento**: Qualquer pessoa pode acessar os mesmos dados

## 🚀 Como rodar localmente

Como está usando MongoDB Atlas, você **NÃO precisa instalar MongoDB local**:

### 1. Setup rápido
```bash
./setup_local.sh
./start_app.sh
```

### 2. Setup manual
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install

# Iniciar
cd ../backend && uvicorn server:app --host 0.0.0.0 --port 8001 --reload
cd ../frontend && yarn start
```

## 🔧 Verificar Conexão

Acesse: `http://localhost:8001/docs` para ver a documentação da API e testar os endpoints.

## 📊 Endpoints para Testar

1. **GET** `/api/` - Hello World
2. **POST** `/api/status` - Criar status check
   ```json
   {
     "client_name": "Teste Local"
   }
   ```
3. **GET** `/api/status` - Ver todos os status checks

## 🔍 Dados no MongoDB Atlas

Todos os dados ficam armazenados no MongoDB Atlas na collection `status_checks` dentro do database `parkingsystempro`.

## 🛠 Mudança de Database (se necessário)

Se quiser usar outro database ou configuração:

1. Edite o arquivo `backend/.env`
2. Modifique as variáveis:
   ```env
   MONGO_URL="sua_nova_connection_string"
   DB_NAME="seu_novo_database"
   ```
3. Reinicie o backend

## 📝 Próximos Passos

Agora que o sistema está funcionando, você pode:
- ✅ Testar localmente no navegador
- ✅ Fazer alterações no código
- ✅ Adicionar novas funcionalidades
- ✅ Verificar dados no MongoDB Atlas Dashboard

---

🚀 **Tudo pronto para rodar fora da plataforma!**