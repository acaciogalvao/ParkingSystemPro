from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pymongo import MongoClient
import uuid
import re

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/parksystem")
client = MongoClient(MONGO_URL)
db = client.parksystem

app = FastAPI(title="ParkSystem Pro API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class VehicleEntry(BaseModel):
    plate: str = Field(..., description="License plate")
    type: str = Field(..., description="Vehicle type: car or motorcycle")
    model: str = Field(..., description="Vehicle model")
    color: str = Field(..., description="Vehicle color")
    ownerName: str = Field(..., description="Owner name")
    ownerPhone: Optional[str] = Field(None, description="Owner phone")

class VehicleResponse(BaseModel):
    id: str
    plate: str
    type: str
    model: str
    color: str
    ownerName: str
    ownerPhone: Optional[str]
    entryTime: str
    spot: str
    status: str

class VehicleExit(BaseModel):
    vehicleId: str = Field(..., description="Vehicle ID")
    exitTime: Optional[str] = Field(None, description="Exit time")

class ParkingSpot(BaseModel):
    id: str
    type: str
    isOccupied: bool
    isReserved: bool
    vehicleId: Optional[str] = None

class DashboardStats(BaseModel):
    totalCarsParked: int
    totalMotorcyclesParked: int
    availableSpots: int
    todayRevenue: float
    occupancyRate: float

# Helper functions
def validate_brazilian_plate(plate: str) -> dict:
    """Validate Brazilian license plate format"""
    if not plate:
        return {"isValid": False, "type": None, "error": "Placa é obrigatória"}
    
    clean_plate = plate.strip().replace(" ", "").upper()
    
    # Old format: ABC-1234
    old_format_regex = r'^[A-Z]{3}-\d{4}$'
    # Mercosul format: ABC1A12
    mercosul_regex = r'^[A-Z]{3}\d[A-Z]\d{2}$'
    
    if re.match(old_format_regex, clean_plate):
        return {"isValid": True, "type": "antigo", "error": None}
    
    if re.match(mercosul_regex, clean_plate):
        return {"isValid": True, "type": "mercosul", "error": None}
    
    return {
        "isValid": False, 
        "type": None, 
        "error": "Formato inválido. Use ABC-1234 (antigo) ou ABC1A12 (Mercosul)"
    }

def generate_spot(vehicle_type: str) -> str:
    """Generate available parking spot"""
    spots_collection = db.parking_spots
    
    # Get occupied spots
    occupied_spots = list(spots_collection.find({"isOccupied": True}))
    occupied_ids = [spot["id"] for spot in occupied_spots]
    
    if vehicle_type == "car":
        for i in range(1, 51):  # A-01 to A-50
            spot_id = f"A-{i:02d}"
            if spot_id not in occupied_ids:
                return spot_id
    else:  # motorcycle
        for i in range(1, 21):  # M-01 to M-20
            spot_id = f"M-{i:02d}"
            if spot_id not in occupied_ids:
                return spot_id
    
    raise HTTPException(status_code=400, detail="Não há vagas disponíveis")

def initialize_parking_spots():
    """Initialize parking spots if not exists"""
    spots_collection = db.parking_spots
    
    # Check if spots already exist
    if spots_collection.count_documents({}) > 0:
        return
    
    spots = []
    
    # Car spots A-01 to A-50
    for i in range(1, 51):
        spots.append({
            "id": f"A-{i:02d}",
            "type": "car",
            "isOccupied": False,
            "isReserved": False,
            "vehicleId": None
        })
    
    # Motorcycle spots M-01 to M-20
    for i in range(1, 21):
        spots.append({
            "id": f"M-{i:02d}",
            "type": "motorcycle",
            "isOccupied": False,
            "isReserved": False,
            "vehicleId": None
        })
    
    spots_collection.insert_many(spots)

# Initialize spots on startup
initialize_parking_spots()

# API Routes
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/api/vehicles/entry", response_model=dict)
async def register_vehicle_entry(vehicle: VehicleEntry):
    """Register a new vehicle entry"""
    try:
        # Validate plate
        plate_validation = validate_brazilian_plate(vehicle.plate)
        if not plate_validation["isValid"]:
            raise HTTPException(
                status_code=400, 
                detail=plate_validation["error"]
            )
        
        # Check if vehicle already exists and is parked
        vehicles_collection = db.vehicles
        existing_vehicle = vehicles_collection.find_one({
            "plate": vehicle.plate.upper(),
            "status": "parked"
        })
        
        if existing_vehicle:
            raise HTTPException(
                status_code=400, 
                detail="Veículo já está estacionado"
            )
        
        # Generate spot
        spot = generate_spot(vehicle.type)
        
        # Create vehicle entry
        vehicle_id = str(uuid.uuid4())
        entry_time = datetime.now(timezone.utc)
        
        vehicle_data = {
            "id": vehicle_id,
            "plate": vehicle.plate.upper(),
            "type": vehicle.type,
            "model": vehicle.model,
            "color": vehicle.color,
            "ownerName": vehicle.ownerName,
            "ownerPhone": vehicle.ownerPhone,
            "entryTime": entry_time.isoformat(),
            "spot": spot,
            "status": "parked"
        }
        
        # Insert vehicle
        vehicles_collection.insert_one(vehicle_data)
        
        # Update parking spot
        spots_collection = db.parking_spots
        spots_collection.update_one(
            {"id": spot},
            {
                "$set": {
                    "isOccupied": True,
                    "vehicleId": vehicle_id
                }
            }
        )
        
        # Log operation
        operations_collection = db.operations_history
        operations_collection.insert_one({
            "id": str(uuid.uuid4()),
            "type": "entry",
            "vehicleId": vehicle_id,
            "plate": vehicle.plate.upper(),
            "spot": spot,
            "timestamp": entry_time.isoformat(),
            "data": vehicle_data
        })
        
        return {
            "success": True,
            "message": f"Veículo {vehicle.plate.upper()} registrado com sucesso!",
            "data": {
                "vehicleId": vehicle_id,
                "spot": spot,
                "entryTime": entry_time.strftime("%H:%M")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.get("/api/vehicles", response_model=List[VehicleResponse])
async def get_vehicles():
    """Get all parked vehicles"""
    try:
        vehicles_collection = db.vehicles
        vehicles = list(vehicles_collection.find({"status": "parked"}))
        
        result = []
        for vehicle in vehicles:
            entry_time = datetime.fromisoformat(vehicle["entryTime"].replace('Z', '+00:00'))
            result.append(VehicleResponse(
                id=vehicle["id"],
                plate=vehicle["plate"],
                type=vehicle["type"],
                model=vehicle["model"],
                color=vehicle["color"],
                ownerName=vehicle["ownerName"],
                ownerPhone=vehicle.get("ownerPhone"),
                entryTime=entry_time.strftime("%H:%M"),
                spot=vehicle["spot"],
                status=vehicle["status"]
            ))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar veículos: {str(e)}")

@app.get("/api/vehicles/search")
async def search_vehicles(plate: Optional[str] = None, owner: Optional[str] = None):
    """Search vehicles by plate or owner name"""
    try:
        vehicles_collection = db.vehicles
        query = {"status": "parked"}
        
        if plate:
            query["plate"] = {"$regex": plate.upper(), "$options": "i"}
        
        if owner:
            query["ownerName"] = {"$regex": owner, "$options": "i"}
        
        vehicles = list(vehicles_collection.find(query))
        
        result = []
        for vehicle in vehicles:
            entry_time = datetime.fromisoformat(vehicle["entryTime"].replace('Z', '+00:00'))
            result.append({
                "id": vehicle["id"],
                "plate": vehicle["plate"],
                "type": vehicle["type"],
                "model": vehicle["model"],
                "color": vehicle["color"],
                "ownerName": vehicle["ownerName"],
                "ownerPhone": vehicle.get("ownerPhone"),
                "entryTime": entry_time.strftime("%H:%M"),
                "spot": vehicle["spot"],
                "status": vehicle["status"]
            })
        
        return {"success": True, "data": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar veículos: {str(e)}")

@app.post("/api/vehicles/exit")
async def process_vehicle_exit(exit_data: VehicleExit):
    """Process vehicle exit"""
    try:
        vehicles_collection = db.vehicles
        vehicle = vehicles_collection.find_one({
            "id": exit_data.vehicleId,
            "status": "parked"
        })
        
        if not vehicle:
            raise HTTPException(status_code=404, detail="Veículo não encontrado")
        
        exit_time = datetime.now(timezone.utc)
        entry_time = datetime.fromisoformat(vehicle["entryTime"].replace('Z', '+00:00'))
        
        # Calculate duration and fee (simplified)
        duration_hours = (exit_time - entry_time).total_seconds() / 3600
        fee = max(5.0, duration_hours * 3.0)  # Minimum R$5, R$3 per hour
        
        # Update vehicle status
        vehicles_collection.update_one(
            {"id": exit_data.vehicleId},
            {
                "$set": {
                    "status": "exited",
                    "exitTime": exit_time.isoformat(),
                    "fee": fee,
                    "duration": duration_hours
                }
            }
        )
        
        # Free parking spot
        spots_collection = db.parking_spots
        spots_collection.update_one(
            {"id": vehicle["spot"]},
            {
                "$set": {
                    "isOccupied": False,
                    "vehicleId": None
                }
            }
        )
        
        # Log operation
        operations_collection = db.operations_history
        operations_collection.insert_one({
            "id": str(uuid.uuid4()),
            "type": "exit",
            "vehicleId": exit_data.vehicleId,
            "plate": vehicle["plate"],
            "spot": vehicle["spot"],
            "timestamp": exit_time.isoformat(),
            "data": {
                "entryTime": vehicle["entryTime"],
                "exitTime": exit_time.isoformat(),
                "duration": duration_hours,
                "fee": fee
            }
        })
        
        return {
            "success": True,
            "message": f"Saída processada para {vehicle['plate']}",
            "data": {
                "plate": vehicle["plate"],
                "spot": vehicle["spot"],
                "duration": f"{duration_hours:.1f}h",
                "fee": f"R$ {fee:.2f}",
                "exitTime": exit_time.strftime("%H:%M")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar saída: {str(e)}")

@app.get("/api/spots", response_model=List[ParkingSpot])
async def get_parking_spots():
    """Get all parking spots"""
    try:
        spots_collection = db.parking_spots
        spots = list(spots_collection.find({}, {"_id": 0}))
        
        return [ParkingSpot(**spot) for spot in spots]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar vagas: {str(e)}")

@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        vehicles_collection = db.vehicles
        spots_collection = db.parking_spots
        
        # Count parked vehicles
        total_cars = vehicles_collection.count_documents({
            "status": "parked",
            "type": "car"
        })
        
        total_motorcycles = vehicles_collection.count_documents({
            "status": "parked", 
            "type": "motorcycle"
        })
        
        # Count available spots
        available_spots = spots_collection.count_documents({"isOccupied": False})
        
        # Calculate today's revenue (simplified)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_exits = list(vehicles_collection.find({
            "status": "exited",
            "exitTime": {"$gte": today_start.isoformat()}
        }))
        
        today_revenue = sum(exit.get("fee", 0) for exit in today_exits)
        
        # Calculate occupancy rate
        total_spots = 70  # 50 cars + 20 motorcycles
        occupied_spots = total_spots - available_spots
        occupancy_rate = (occupied_spots / total_spots) * 100
        
        return DashboardStats(
            totalCarsParked=total_cars,
            totalMotorcyclesParked=total_motorcycles,
            availableSpots=available_spots,
            todayRevenue=today_revenue,
            occupancyRate=occupancy_rate
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar estatísticas: {str(e)}")

@app.get("/api/reports/monthly")
async def get_monthly_report():
    """Get monthly report data"""
    try:
        operations_collection = db.operations_history
        
        # Get operations from last 30 days
        thirty_days_ago = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = thirty_days_ago.replace(day=1)  # Start of month
        
        operations = list(operations_collection.find({
            "timestamp": {"$gte": thirty_days_ago.isoformat()}
        }))
        
        # Process data for charts
        daily_entries = {}
        daily_revenue = {}
        
        for op in operations:
            op_date = datetime.fromisoformat(op["timestamp"].replace('Z', '+00:00')).date()
            day_key = op_date.strftime("%Y-%m-%d")
            
            if op["type"] == "entry":
                daily_entries[day_key] = daily_entries.get(day_key, 0) + 1
            elif op["type"] == "exit":
                fee = op.get("data", {}).get("fee", 0)
                daily_revenue[day_key] = daily_revenue.get(day_key, 0) + fee
        
        return {
            "success": True,
            "data": {
                "dailyEntries": daily_entries,
                "dailyRevenue": daily_revenue,
                "totalOperations": len(operations)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")

@app.get("/api/history")
async def get_operations_history(limit: int = 50):
    """Get operations history"""
    try:
        operations_collection = db.operations_history
        
        operations = list(operations_collection.find(
            {},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit))
        
        # Format for frontend
        formatted_operations = []
        for op in operations:
            op_time = datetime.fromisoformat(op["timestamp"].replace('Z', '+00:00'))
            formatted_operations.append({
                "id": op["id"],
                "type": op["type"],
                "plate": op["plate"],
                "spot": op["spot"],
                "time": op_time.strftime("%d/%m/%Y %H:%M"),
                "timestamp": op["timestamp"]
            })
        
        return {
            "success": True,
            "data": formatted_operations
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar histórico: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)