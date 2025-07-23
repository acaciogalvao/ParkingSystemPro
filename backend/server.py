from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="ParkingSystemPro API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class VehicleType(str, Enum):
    CARRO = "carro"
    MOTO = "moto"
    CAMINHAO = "caminhao"

class SpotStatus(str, Enum):
    LIVRE = "livre"
    OCUPADO = "ocupado"
    MANUTENCAO = "manutencao"

class SessionStatus(str, Enum):
    ATIVO = "ativo"
    FINALIZADO = "finalizado"

# Models
class ParkingSpot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    andar: str
    tipo_veiculo: VehicleType
    status: SpotStatus = SpotStatus.LIVRE
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ParkingSpotCreate(BaseModel):
    numero: str
    andar: str
    tipo_veiculo: VehicleType

class ParkingSpotUpdate(BaseModel):
    status: Optional[SpotStatus] = None

class Vehicle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    placa: str
    modelo: str
    cor: str
    tipo: VehicleType
    proprietario: str
    telefone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VehicleCreate(BaseModel):
    placa: str
    modelo: str
    cor: str
    tipo: VehicleType
    proprietario: str
    telefone: Optional[str] = None

class ParkingSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    veiculo_id: str
    vaga_id: str
    entrada: datetime = Field(default_factory=datetime.utcnow)
    saida: Optional[datetime] = None
    valor_hora: float = 5.0  # R$ 5.00 por hora
    valor_total: Optional[float] = None
    status: SessionStatus = SessionStatus.ATIVO
    observacoes: Optional[str] = None

class ParkingSessionCreate(BaseModel):
    veiculo_id: str
    vaga_id: str
    observacoes: Optional[str] = None

class ParkingSessionEnd(BaseModel):
    observacoes: Optional[str] = None

class DashboardStats(BaseModel):
    total_vagas: int
    vagas_ocupadas: int
    vagas_livres: int
    vagas_manutencao: int
    sessoes_ativas: int
    receita_hoje: float

# Utility functions
def calcular_valor_sessao(entrada: datetime, saida: datetime, valor_hora: float) -> float:
    duracao = saida - entrada
    horas = duracao.total_seconds() / 3600
    # Cobra pelo menos 1 hora, depois por hora cheia ou fração
    if horas <= 1:
        return valor_hora
    else:
        return valor_hora * int(horas) if horas == int(horas) else valor_hora * (int(horas) + 1)

# Routes - Dashboard
@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    # Contar vagas por status
    total_vagas = await db.parking_spots.count_documents({})
    vagas_ocupadas = await db.parking_spots.count_documents({"status": "ocupado"})
    vagas_livres = await db.parking_spots.count_documents({"status": "livre"})
    vagas_manutencao = await db.parking_spots.count_documents({"status": "manutencao"})
    
    # Contar sessões ativas
    sessoes_ativas = await db.parking_sessions.count_documents({"status": "ativo"})
    
    # Calcular receita de hoje
    hoje_inicio = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    hoje_fim = hoje_inicio + timedelta(days=1)
    
    cursor = db.parking_sessions.find({
        "status": "finalizado",
        "saida": {"$gte": hoje_inicio, "$lt": hoje_fim}
    })
    
    receita_hoje = 0.0
    async for session in cursor:
        if session.get("valor_total"):
            receita_hoje += session["valor_total"]
    
    return DashboardStats(
        total_vagas=total_vagas,
        vagas_ocupadas=vagas_ocupadas,
        vagas_livres=vagas_livres,
        vagas_manutencao=vagas_manutencao,
        sessoes_ativas=sessoes_ativas,
        receita_hoje=receita_hoje
    )

# Routes - Parking Spots
@api_router.post("/vagas", response_model=ParkingSpot)
async def create_parking_spot(spot: ParkingSpotCreate):
    # Verificar se já existe uma vaga com mesmo número e andar
    existing = await db.parking_spots.find_one({
        "numero": spot.numero,
        "andar": spot.andar
    })
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma vaga com este número neste andar")
    
    spot_obj = ParkingSpot(**spot.dict())
    await db.parking_spots.insert_one(spot_obj.dict())
    return spot_obj

@api_router.get("/vagas", response_model=List[ParkingSpot])
async def get_parking_spots():
    spots = await db.parking_spots.find().to_list(1000)
    return [ParkingSpot(**spot) for spot in spots]

@api_router.get("/vagas/{spot_id}", response_model=ParkingSpot)
async def get_parking_spot(spot_id: str):
    spot = await db.parking_spots.find_one({"id": spot_id})
    if not spot:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    return ParkingSpot(**spot)

@api_router.put("/vagas/{spot_id}", response_model=ParkingSpot)
async def update_parking_spot(spot_id: str, update: ParkingSpotUpdate):
    result = await db.parking_spots.update_one(
        {"id": spot_id},
        {"$set": update.dict(exclude_unset=True)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    updated_spot = await db.parking_spots.find_one({"id": spot_id})
    return ParkingSpot(**updated_spot)

@api_router.delete("/vagas/{spot_id}")
async def delete_parking_spot(spot_id: str):
    # Verificar se há sessões ativas nesta vaga
    active_session = await db.parking_sessions.find_one({
        "vaga_id": spot_id,
        "status": "ativo"
    })
    if active_session:
        raise HTTPException(status_code=400, detail="Não é possível excluir vaga com sessão ativa")
    
    result = await db.parking_spots.delete_one({"id": spot_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    return {"message": "Vaga excluída com sucesso"}

# Routes - Vehicles
@api_router.post("/veiculos", response_model=Vehicle)
async def create_vehicle(vehicle: VehicleCreate):
    # Verificar se já existe veículo com esta placa
    existing = await db.vehicles.find_one({"placa": vehicle.placa.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um veículo cadastrado com esta placa")
    
    vehicle_dict = vehicle.dict()
    vehicle_dict["placa"] = vehicle_dict["placa"].upper()
    vehicle_obj = Vehicle(**vehicle_dict)
    await db.vehicles.insert_one(vehicle_obj.dict())
    return vehicle_obj

@api_router.get("/veiculos", response_model=List[Vehicle])
async def get_vehicles():
    vehicles = await db.vehicles.find().to_list(1000)
    return [Vehicle(**vehicle) for vehicle in vehicles]

@api_router.get("/veiculos/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: str):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    return Vehicle(**vehicle)

@api_router.get("/veiculos/placa/{placa}", response_model=Vehicle)
async def get_vehicle_by_plate(placa: str):
    vehicle = await db.vehicles.find_one({"placa": placa.upper()})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    return Vehicle(**vehicle)

# Routes - Parking Sessions
@api_router.post("/sessoes", response_model=ParkingSession)
async def create_parking_session(session: ParkingSessionCreate):
    # Verificar se o veículo existe
    vehicle = await db.vehicles.find_one({"id": session.veiculo_id})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    # Verificar se a vaga existe e está livre
    spot = await db.parking_spots.find_one({"id": session.vaga_id})
    if not spot:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    if spot["status"] != "livre":
        raise HTTPException(status_code=400, detail="Vaga não está disponível")
    
    # Verificar se o veículo já tem uma sessão ativa
    active_session = await db.parking_sessions.find_one({
        "veiculo_id": session.veiculo_id,
        "status": "ativo"
    })
    if active_session:
        raise HTTPException(status_code=400, detail="Veículo já possui uma sessão ativa")
    
    # Criar sessão
    session_obj = ParkingSession(**session.dict())
    await db.parking_sessions.insert_one(session_obj.dict())
    
    # Marcar vaga como ocupada
    await db.parking_spots.update_one(
        {"id": session.vaga_id},
        {"$set": {"status": "ocupado"}}
    )
    
    return session_obj

@api_router.get("/sessoes", response_model=List[ParkingSession])
async def get_parking_sessions():
    sessions = await db.parking_sessions.find().sort("entrada", -1).to_list(1000)
    return [ParkingSession(**session) for session in sessions]

@api_router.get("/sessoes/ativas", response_model=List[ParkingSession])
async def get_active_sessions():
    sessions = await db.parking_sessions.find({"status": "ativo"}).sort("entrada", -1).to_list(1000)
    return [ParkingSession(**session) for session in sessions]

@api_router.post("/sessoes/{session_id}/finalizar", response_model=ParkingSession)
async def end_parking_session(session_id: str, end_data: ParkingSessionEnd):
    session = await db.parking_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    if session["status"] != "ativo":
        raise HTTPException(status_code=400, detail="Sessão já foi finalizada")
    
    # Calcular valor total
    saida = datetime.utcnow()
    valor_total = calcular_valor_sessao(session["entrada"], saida, session["valor_hora"])
    
    # Atualizar sessão
    update_data = {
        "saida": saida,
        "valor_total": valor_total,
        "status": "finalizado"
    }
    if end_data.observacoes:
        update_data["observacoes"] = end_data.observacoes
    
    await db.parking_sessions.update_one(
        {"id": session_id},
        {"$set": update_data}
    )
    
    # Liberar vaga
    await db.parking_spots.update_one(
        {"id": session["vaga_id"]},
        {"$set": {"status": "livre"}}
    )
    
    updated_session = await db.parking_sessions.find_one({"id": session_id})
    return ParkingSession(**updated_session)

# Health check
@api_router.get("/")
async def root():
    return {"message": "ParkingSystemPro API está funcionando!"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()