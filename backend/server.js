import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Helper function to format Brazilian currency values
function formatBrazilianCurrency(value) {
    return value.toFixed(2).replace('.', ',');
}

// Helper function to format Brazilian decimal values  
function formatBrazilianDecimal(value, decimals = 1) {
    return value.toFixed(decimals).replace('.', ',');
}

// MongoDB connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/parksystem';
const client = new MongoClient(MONGO_URL);
let db;

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        await client.connect();
        db = client.db('parkingsystempro');
        console.log('Connected to MongoDB');
        console.log('Using database: parkingsystempro');
        console.log('MongoDB connection string:', MONGO_URL.replace(/\/\/.*@/, '//***:***@'));
        await initializeParkingSpots();
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

const app = express();

// Middleware
app.use(cors({
    origin: [
        "*",
        "http://localhost:3000",
        /\.preview\.emergentagent\.com$/
    ],
    credentials: true,
    methods: ["*"],
    allowedHeaders: ["*"]
}));

app.use(express.json());

// Joi validation schemas
const vehicleEntrySchema = Joi.object({
    plate: Joi.string().required().description('License plate'),
    type: Joi.string().valid('car', 'motorcycle').required().description('Vehicle type'),
    model: Joi.string().required().description('Vehicle model'),
    color: Joi.string().required().description('Vehicle color'),
    ownerName: Joi.string().required().description('Owner name'),
    ownerPhone: Joi.string().optional().allow('').description('Owner phone')
});

const vehicleExitSchema = Joi.object({
    vehicleId: Joi.string().required().description('Vehicle ID'),
    exitTime: Joi.string().optional().description('Exit time')
});

// Helper functions
function validateBrazilianPlate(plate) {
    if (!plate) {
        return { isValid: false, type: null, error: 'Placa é obrigatória' };
    }

    const cleanPlate = plate.trim().replace(/\s/g, '').toUpperCase();

    // Old format: ABC-1234
    const oldFormatRegex = /^[A-Z]{3}-\d{4}$/;
    // Mercosul format: ABC1A12
    const mercosulRegex = /^[A-Z]{3}\d[A-Z]\d{2}$/;

    if (oldFormatRegex.test(cleanPlate)) {
        return { isValid: true, type: 'antigo', error: null };
    }

    if (mercosulRegex.test(cleanPlate)) {
        return { isValid: true, type: 'mercosul', error: null };
    }

    return {
        isValid: false,
        type: null,
        error: 'Formato inválido. Use ABC-1234 (antigo) ou ABC1A12 (Mercosul)'
    };
}

async function generateSpot(vehicleType) {
    const spotsCollection = db.collection('parking_spots');

    // Get occupied spots
    const occupiedSpots = await spotsCollection.find({ isOccupied: true }).toArray();
    const occupiedIds = occupiedSpots.map(spot => spot.id);

    if (vehicleType === 'car') {
        for (let i = 1; i <= 50; i++) {
            const spotId = `A-${i.toString().padStart(2, '0')}`;
            if (!occupiedIds.includes(spotId)) {
                return spotId;
            }
        }
    } else { // motorcycle
        for (let i = 1; i <= 20; i++) {
            const spotId = `M-${i.toString().padStart(2, '0')}`;
            if (!occupiedIds.includes(spotId)) {
                return spotId;
            }
        }
    }

    throw new Error('Não há vagas disponíveis');
}

async function initializeParkingSpots() {
    const spotsCollection = db.collection('parking_spots');

    // Check if spots already exist
    const count = await spotsCollection.countDocuments();
    if (count > 0) {
        // Synchronize existing spots with vehicles
        await synchronizeParkingSpots();
        return;
    }

    const spots = [];

    // Car spots A-01 to A-50
    for (let i = 1; i <= 50; i++) {
        spots.push({
            id: `A-${i.toString().padStart(2, '0')}`,
            type: 'car',
            isOccupied: false,
            isReserved: false,
            vehicleId: null
        });
    }

    // Motorcycle spots M-01 to M-20
    for (let i = 1; i <= 20; i++) {
        spots.push({
            id: `M-${i.toString().padStart(2, '0')}`,
            type: 'motorcycle',
            isOccupied: false,
            isReserved: false,
            vehicleId: null
        });
    }

    await spotsCollection.insertMany(spots);
    console.log('Parking spots initialized');
}

async function synchronizeParkingSpots() {
    const spotsCollection = db.collection('parking_spots');
    const vehiclesCollection = db.collection('vehicles');

    console.log('Starting parking spots synchronization...');

    try {
        // Get all currently parked vehicles
        const parkedVehicles = await vehiclesCollection.find({ status: 'parked' }).toArray();
        const occupiedSpots = parkedVehicles.map(vehicle => ({
            spotId: vehicle.spot,
            vehicleId: vehicle.id
        }));

        // First, mark all spots as available
        await spotsCollection.updateMany(
            {},
            {
                $set: {
                    isOccupied: false,
                    vehicleId: null
                }
            }
        );

        // Then mark only the spots that actually have parked vehicles
        for (const occupiedSpot of occupiedSpots) {
            await spotsCollection.updateOne(
                { id: occupiedSpot.spotId },
                {
                    $set: {
                        isOccupied: true,
                        vehicleId: occupiedSpot.vehicleId
                    }
                }
            );
        }

        console.log(`Synchronized ${occupiedSpots.length} occupied spots with parked vehicles`);
        
        // Log any inconsistencies found
        const totalSpots = await spotsCollection.countDocuments();
        const occupiedCount = await spotsCollection.countDocuments({ isOccupied: true });
        const parkedCount = parkedVehicles.length;
        
        console.log(`Total spots: ${totalSpots}, Occupied: ${occupiedCount}, Parked vehicles: ${parkedCount}`);
        
        if (occupiedCount !== parkedCount) {
            console.warn(`Warning: Inconsistency detected! Occupied spots: ${occupiedCount}, Parked vehicles: ${parkedCount}`);
        } else {
            console.log('✅ Parking spots and vehicles are now synchronized');
        }

    } catch (error) {
        console.error('Error synchronizing parking spots:', error);
        throw error;
    }
}

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Register vehicle entry
app.post('/api/vehicles/entry', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = vehicleEntrySchema.validate(req.body);
        if (error) {
            return res.status(400).json({ detail: error.details[0].message });
        }

        const vehicle = value;

        // Validate plate
        const plateValidation = validateBrazilianPlate(vehicle.plate);
        if (!plateValidation.isValid) {
            return res.status(400).json({ detail: plateValidation.error });
        }

        // Check if vehicle already exists and is parked
        const vehiclesCollection = db.collection('vehicles');
        const existingVehicle = await vehiclesCollection.findOne({
            plate: vehicle.plate.toUpperCase(),
            status: 'parked'
        });

        if (existingVehicle) {
            return res.status(400).json({ detail: 'Veículo já está estacionado' });
        }

        // Generate spot
        const spot = await generateSpot(vehicle.type);

        // Create vehicle entry
        const vehicleId = uuidv4();
        const entryTime = new Date();
        
        // Convert to Brazil timezone (GMT-3)
        const brazilTime = new Date(entryTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

        const vehicleData = {
            id: vehicleId,
            plate: vehicle.plate.toUpperCase(),
            type: vehicle.type,
            model: vehicle.model,
            color: vehicle.color,
            ownerName: vehicle.ownerName,
            ownerPhone: vehicle.ownerPhone || null,
            entryTime: entryTime.toISOString(),
            spot: spot,
            status: 'parked'
        };

        // Insert vehicle
        await vehiclesCollection.insertOne(vehicleData);

        // Update parking spot
        const spotsCollection = db.collection('parking_spots');
        await spotsCollection.updateOne(
            { id: spot },
            {
                $set: {
                    isOccupied: true,
                    vehicleId: vehicleId
                }
            }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'entry',
            vehicleId: vehicleId,
            plate: vehicle.plate.toUpperCase(),
            spot: spot,
            timestamp: entryTime.toISOString(),
            data: vehicleData
        });

        res.json({
            success: true,
            message: `Veículo ${vehicle.plate.toUpperCase()} registrado com sucesso!`,
            data: {
                vehicleId: vehicleId,
                spot: spot,
                entryTime: entryTime.toLocaleTimeString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            }
        });

    } catch (error) {
        console.error('Error in vehicle entry:', error);
        if (error.message === 'Não há vagas disponíveis') {
            return res.status(400).json({ detail: error.message });
        }
        res.status(500).json({ detail: `Erro interno: ${error.message}` });
    }
});

// Get all parked vehicles
app.get('/api/vehicles', async (req, res) => {
    try {
        const vehiclesCollection = db.collection('vehicles');
        const vehicles = await vehiclesCollection.find({ status: 'parked' }).toArray();

        const result = vehicles.map(vehicle => {
            const entryTime = new Date(vehicle.entryTime);
            return {
                id: vehicle.id,
                plate: vehicle.plate,
                type: vehicle.type,
                model: vehicle.model,
                color: vehicle.color,
                ownerName: vehicle.ownerName,
                ownerPhone: vehicle.ownerPhone,
                entryTime: entryTime.toLocaleTimeString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                spot: vehicle.spot,
                status: vehicle.status
            };
        });

        res.json(result);

    } catch (error) {
        console.error('Error getting vehicles:', error);
        res.status(500).json({ detail: `Erro ao buscar veículos: ${error.message}` });
    }
});

// Search vehicles by plate or owner name
app.get('/api/vehicles/search', async (req, res) => {
    try {
        const { plate, owner } = req.query;
        const vehiclesCollection = db.collection('vehicles');
        const query = { status: 'parked' };

        if (plate) {
            query.plate = { $regex: plate.toUpperCase(), $options: 'i' };
        }

        if (owner) {
            query.ownerName = { $regex: owner, $options: 'i' };
        }

        const vehicles = await vehiclesCollection.find(query).toArray();

        const result = vehicles.map(vehicle => {
            const entryTime = new Date(vehicle.entryTime);
            return {
                id: vehicle.id,
                plate: vehicle.plate,
                type: vehicle.type,
                model: vehicle.model,
                color: vehicle.color,
                ownerName: vehicle.ownerName,
                ownerPhone: vehicle.ownerPhone,
                entryTime: entryTime.toLocaleTimeString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                spot: vehicle.spot,
                status: vehicle.status
            };
        });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error searching vehicles:', error);
        res.status(500).json({ detail: `Erro ao buscar veículos: ${error.message}` });
    }
});

// Process vehicle exit
app.post('/api/vehicles/exit', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = vehicleExitSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ detail: error.details[0].message });
        }

        const exitData = value;
        const vehiclesCollection = db.collection('vehicles');
        const vehicle = await vehiclesCollection.findOne({
            id: exitData.vehicleId,
            status: 'parked'
        });

        if (!vehicle) {
            return res.status(404).json({ detail: 'Veículo não encontrado' });
        }

        const exitTime = new Date();
        const entryTime = new Date(vehicle.entryTime);

        // Calculate duration and fee based on vehicle type (no minimum fee, starts from 0)
        const durationMinutes = (exitTime - entryTime) / (1000 * 60);
        const durationHours = durationMinutes / 60;
        // Cars: R$10/hour = R$0.1667/min, Motorcycles: R$7/hour = R$0.1167/min
        const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
        const fee = durationMinutes * ratePerMinute;

        // Update vehicle status
        await vehiclesCollection.updateOne(
            { id: exitData.vehicleId },
            {
                $set: {
                    status: 'exited',
                    exitTime: exitTime.toISOString(),
                    fee: fee,
                    duration: durationHours
                }
            }
        );

        // Free parking spot
        const spotsCollection = db.collection('parking_spots');
        await spotsCollection.updateOne(
            { id: vehicle.spot },
            {
                $set: {
                    isOccupied: false,
                    vehicleId: null
                }
            }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'exit',
            vehicleId: exitData.vehicleId,
            plate: vehicle.plate,
            spot: vehicle.spot,
            timestamp: exitTime.toISOString(),
            data: {
                entryTime: vehicle.entryTime,
                exitTime: exitTime.toISOString(),
                duration: durationHours,
                fee: fee
            }
        });

        res.json({
            success: true,
            message: `Saída processada para ${vehicle.plate}`,
            data: {
                plate: vehicle.plate,
                spot: vehicle.spot,
                duration: `${formatBrazilianDecimal(durationHours)}h`,
                fee: `R$ ${formatBrazilianCurrency(fee)}`,
                exitTime: exitTime.toLocaleTimeString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            }
        });

    } catch (error) {
        console.error('Error processing vehicle exit:', error);
        res.status(500).json({ detail: `Erro ao processar saída: ${error.message}` });
    }
});

// Get vehicle with real-time duration
app.get('/api/vehicles/:vehicleId/duration', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const vehiclesCollection = db.collection('vehicles');
        
        const vehicle = await vehiclesCollection.findOne({
            id: vehicleId,
            status: 'parked'
        });

        if (!vehicle) {
            return res.status(404).json({ detail: 'Veículo não encontrado' });
        }

        const entryTime = new Date(vehicle.entryTime);
        const currentTime = new Date();
        const durationMs = currentTime - entryTime;
        
        // Calculate hours, minutes, seconds
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
        
        // Calculate estimated fee based on vehicle type (no minimum fee, starts from 0)
        const durationMinutes = durationMs / (1000 * 60);
        // Cars: R$10/hour = R$0.1667/min, Motorcycles: R$7/hour = R$0.1167/min
        const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
        const estimatedFee = durationMinutes * ratePerMinute;

        res.json({
            vehicleId: vehicleId,
            plate: vehicle.plate,
            spot: vehicle.spot,
            entryTime: vehicle.entryTime,
            currentTime: currentTime.toISOString(),
            duration: {
                hours: hours,
                minutes: minutes,
                seconds: seconds,
                totalMinutes: Math.floor(durationMs / (1000 * 60)),
                totalSeconds: Math.floor(durationMs / 1000),
                formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            },
            estimatedFee: formatBrazilianCurrency(estimatedFee)
        });

    } catch (error) {
        console.error('Error getting vehicle duration:', error);
        res.status(500).json({ detail: 'Erro ao calcular tempo de permanência' });
    }
});

// Get all vehicles with real-time duration
app.get('/api/vehicles/with-duration', async (req, res) => {
    try {
        const vehiclesCollection = db.collection('vehicles');
        const vehicles = await vehiclesCollection.find({ status: 'parked' }).toArray();
        
        const vehiclesWithDuration = vehicles.map(vehicle => {
            const entryTime = new Date(vehicle.entryTime);
            const currentTime = new Date();
            const durationMs = currentTime - entryTime;
            
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
            
            const durationMinutes = durationMs / (1000 * 60);
            // Cars: R$10/hour = R$0.1667/min, Motorcycles: R$7/hour = R$0.1167/min
            const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
            const estimatedFee = durationMinutes * ratePerMinute;
            
            return {
                id: vehicle.id,
                plate: vehicle.plate,
                type: vehicle.type,
                model: vehicle.model,
                color: vehicle.color,
                ownerName: vehicle.ownerName,
                ownerPhone: vehicle.ownerPhone,
                entryTime: entryTime.toLocaleTimeString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                spot: vehicle.spot,
                status: vehicle.status,
                duration: {
                    hours: hours,
                    minutes: minutes,
                    seconds: seconds,
                    totalMinutes: Math.floor(durationMs / (1000 * 60)),
                    totalSeconds: Math.floor(durationMs / 1000),
                    formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                },
                estimatedFee: estimatedFee.toFixed(2),
                entryTimestamp: vehicle.entryTime
            };
        });

        res.json(vehiclesWithDuration);

    } catch (error) {
        console.error('Error getting vehicles with duration:', error);
        res.status(500).json({ detail: 'Erro ao buscar veículos com tempo de permanência' });
    }
});

// Get parking spots with real-time vehicle duration
app.get('/api/spots/with-duration', async (req, res) => {
    try {
        // Auto-sync spots with vehicles for consistency
        await synchronizeParkingSpots();
        
        const spotsCollection = db.collection('parking_spots');
        const vehiclesCollection = db.collection('vehicles');
        
        const spots = await spotsCollection.find({}, { projection: { _id: 0 } }).toArray();
        
        // For occupied spots, get vehicle details with duration
        const spotsWithDuration = await Promise.all(spots.map(async (spot) => {
            if (spot.isOccupied && spot.vehicleId) {
                const vehicle = await vehiclesCollection.findOne({
                    id: spot.vehicleId,
                    status: 'parked'
                });
                
                if (vehicle) {
                    const entryTime = new Date(vehicle.entryTime);
                    const currentTime = new Date();
                    const durationMs = currentTime - entryTime;
                    
                    const hours = Math.floor(durationMs / (1000 * 60 * 60));
                    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
                    
                    const durationMinutes = durationMs / (1000 * 60);
                    // Cars: R$10/hour = R$0.1667/min, Motorcycles: R$7/hour = R$0.1167/min
                    const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
                    const estimatedFee = durationMinutes * ratePerMinute;
                    
                    return {
                        ...spot,
                        vehicle: {
                            id: vehicle.id,
                            plate: vehicle.plate,
                            ownerName: vehicle.ownerName,
                            entryTime: vehicle.entryTime,
                            duration: {
                                hours: hours,
                                minutes: minutes,
                                seconds: seconds,
                                totalMinutes: Math.floor(durationMs / (1000 * 60)),
                                totalSeconds: Math.floor(durationMs / 1000),
                                formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                            },
                            estimatedFee: estimatedFee.toFixed(2)
                        }
                    };
                }
            }
            
            return spot;
        }));

        res.json(spotsWithDuration);

    } catch (error) {
        console.error('Error getting parking spots with duration:', error);
        res.status(500).json({ detail: `Erro ao buscar vagas com tempo de permanência: ${error.message}` });
    }
});

// Update vehicle information
app.put('/api/vehicles/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const updateData = req.body;

        // Validate required fields
        const allowedFields = ['ownerName', 'ownerPhone', 'model', 'color'];
        const updateFields = {};
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updateFields[field] = updateData[field];
            }
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ detail: 'Nenhum campo válido fornecido para atualização' });
        }

        // Check if vehicle exists and is parked
        const vehiclesCollection = db.collection('vehicles');
        const vehicle = await vehiclesCollection.findOne({
            id: vehicleId,
            status: 'parked'
        });

        if (!vehicle) {
            return res.status(404).json({ detail: 'Veículo não encontrado' });
        }

        // Update vehicle
        await vehiclesCollection.updateOne(
            { id: vehicleId },
            { $set: updateFields }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'update',
            vehicleId: vehicleId,
            plate: vehicle.plate,
            spot: vehicle.spot,
            timestamp: new Date().toISOString(),
            data: {
                updatedFields: updateFields,
                previousData: {
                    ownerName: vehicle.ownerName,
                    ownerPhone: vehicle.ownerPhone,
                    model: vehicle.model,
                    color: vehicle.color
                }
            }
        });

        res.json({
            success: true,
            message: `Dados do veículo ${vehicle.plate} atualizados com sucesso!`,
            data: {
                vehicleId: vehicleId,
                plate: vehicle.plate,
                updatedFields: updateFields
            }
        });

    } catch (error) {
        console.error('Error updating vehicle:', error);
        res.status(500).json({ detail: `Erro ao atualizar veículo: ${error.message}` });
    }
});

// Synchronize parking spots with actual parked vehicles
app.post('/api/spots/sync', async (req, res) => {
    try {
        await synchronizeParkingSpots();
        
        const spotsCollection = db.collection('parking_spots');
        const occupiedCount = await spotsCollection.countDocuments({ isOccupied: true });
        const availableCount = await spotsCollection.countDocuments({ isOccupied: false });
        
        res.json({
            success: true,
            message: 'Parking spots synchronized successfully',
            data: {
                occupiedSpots: occupiedCount,
                availableSpots: availableCount,
                totalSpots: occupiedCount + availableCount
            }
        });

    } catch (error) {
        console.error('Error synchronizing spots:', error);
        res.status(500).json({ detail: `Erro ao sincronizar vagas: ${error.message}` });
    }
});

// Get all parking spots
app.get('/api/spots', async (req, res) => {
    try {
        // Auto-sync spots with vehicles for consistency
        await synchronizeParkingSpots();
        
        const spotsCollection = db.collection('parking_spots');
        const spots = await spotsCollection.find({}, { projection: { _id: 0 } }).toArray();

        res.json(spots);

    } catch (error) {
        console.error('Error getting parking spots:', error);
        res.status(500).json({ detail: `Erro ao buscar vagas: ${error.message}` });
    }
});

// Get dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        // Auto-sync spots with vehicles for accurate statistics
        await synchronizeParkingSpots();
        
        const vehiclesCollection = db.collection('vehicles');
        const spotsCollection = db.collection('parking_spots');

        // Count parked vehicles
        const totalCars = await vehiclesCollection.countDocuments({
            status: 'parked',
            type: 'car'
        });

        const totalMotorcycles = await vehiclesCollection.countDocuments({
            status: 'parked',
            type: 'motorcycle'
        });

        // Count available spots
        const availableSpots = await spotsCollection.countDocuments({ isOccupied: false });

        // Calculate today's revenue (simplified)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayExits = await vehiclesCollection.find({
            status: 'exited',
            exitTime: { $gte: todayStart.toISOString() }
        }).toArray();

        const todayRevenue = todayExits.reduce((sum, exit) => sum + (exit.fee || 0), 0);

        // Calculate occupancy rate
        const totalSpots = 70; // 50 cars + 20 motorcycles
        const occupiedSpots = totalSpots - availableSpots;
        const occupancyRate = (occupiedSpots / totalSpots) * 100;

        res.json({
            totalCarsParked: totalCars,
            totalMotorcyclesParked: totalMotorcycles,
            availableSpots: availableSpots,
            todayRevenue: todayRevenue,
            occupancyRate: occupancyRate
        });

    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ detail: `Erro ao buscar estatísticas: ${error.message}` });
    }
});

// Get monthly report data
app.get('/api/reports/monthly', async (req, res) => {
    try {
        const operationsCollection = db.collection('operations_history');

        // Get operations from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const operations = await operationsCollection.find({
            timestamp: { $gte: thirtyDaysAgo.toISOString() }
        }).toArray();

        // Process data for charts
        const dailyEntries = {};
        const dailyRevenue = {};

        operations.forEach(op => {
            const opDate = new Date(op.timestamp);
            const dayKey = opDate.toISOString().split('T')[0];

            if (op.type === 'entry') {
                dailyEntries[dayKey] = (dailyEntries[dayKey] || 0) + 1;
            } else if (op.type === 'exit') {
                const fee = op.data?.fee || 0;
                dailyRevenue[dayKey] = (dailyRevenue[dayKey] || 0) + fee;
            }
        });

        res.json({
            success: true,
            data: {
                dailyEntries: dailyEntries,
                dailyRevenue: dailyRevenue,
                totalOperations: operations.length
            }
        });

    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).json({ detail: `Erro ao gerar relatório: ${error.message}` });
    }
});

// Get operations history
app.get('/api/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const operationsCollection = db.collection('operations_history');

        const operations = await operationsCollection
            .find({}, { projection: { _id: 0 } })
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();

        // Format for frontend
        const formattedOperations = operations.map(op => {
            const opTime = new Date(op.timestamp);
            return {
                id: op.id,
                type: op.type,
                plate: op.plate,
                spot: op.spot,
                time: opTime.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' ' + 
                      opTime.toLocaleTimeString('pt-BR', { 
                          timeZone: 'America/Sao_Paulo',
                          hour: '2-digit', 
                          minute: '2-digit' 
                      }),
                timestamp: op.timestamp
            };
        });

        res.json({
            success: true,
            data: formattedOperations
        });

    } catch (error) {
        console.error('Error getting operations history:', error);
        res.status(500).json({ detail: `Erro ao buscar histórico: ${error.message}` });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ detail: 'Erro interno do servidor' });
});

// Start server
const PORT = process.env.PORT || 8001;

async function startServer() {
    await connectToMongoDB();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`ParkSystem Pro API running on http://0.0.0.0:${PORT}`);
    });
}

startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});