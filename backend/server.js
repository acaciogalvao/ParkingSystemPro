import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Load environment variables
dotenv.config();

// Mercado Pago configuration
const mercadoPagoClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});
const paymentClient = new Payment(mercadoPagoClient);

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

// PIX payment schemas
const pixPaymentSchema = Joi.object({
    vehicleId: Joi.string().required().description('Vehicle ID'),
    payerEmail: Joi.string().email().required().description('Payer email'),
    payerName: Joi.string().required().description('Payer full name'),
    payerCPF: Joi.string().required().description('Payer CPF'),
    payerPhone: Joi.string().optional().description('Payer phone')
});

const paymentConfirmationSchema = Joi.object({
    paymentId: Joi.string().required().description('Payment ID'),
    vehicleId: Joi.string().required().description('Vehicle ID')
});

// Reservation schemas
const reservationSchema = Joi.object({
    vehicleType: Joi.string().valid('car', 'motorcycle').required().description('Vehicle type'),
    plate: Joi.string().required().description('License plate'),
    ownerName: Joi.string().required().description('Owner name'),
    ownerPhone: Joi.string().required().description('Owner phone'),
    reservationDate: Joi.string().required().description('Reservation date'),
    reservationTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().description('Reservation time (HH:MM)'),
    duration: Joi.number().integer().min(1).max(12).required().description('Duration in hours'),
    payerEmail: Joi.string().email().required().description('Payer email'),
    payerCPF: Joi.string().required().description('Payer CPF')
});

const reservationCancelSchema = Joi.object({
    reservationId: Joi.string().required().description('Reservation ID')
});

// Credit/Debit card payment schemas
const cardPaymentSchema = Joi.object({
    vehicleId: Joi.string().required().description('Vehicle ID'),
    payerEmail: Joi.string().email().required().description('Payer email'),
    payerName: Joi.string().required().description('Payer full name'),
    payerCPF: Joi.string().required().description('Payer CPF'),
    payerPhone: Joi.string().optional().description('Payer phone'),
    cardToken: Joi.string().required().description('Card token from frontend'),
    cardBrand: Joi.string().required().description('Card brand (visa, mastercard, etc)'),
    cardLastFourDigits: Joi.string().length(4).required().description('Last 4 digits of card'),
    paymentType: Joi.string().valid('credit', 'debit').required().description('Payment type'),
    installments: Joi.number().integer().min(1).max(12).default(1).description('Number of installments (credit only)')
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

// PIX Payment Helper Functions
async function createPixPayment(amount, payerData, vehicleId) {
    try {
        const paymentData = {
            transaction_amount: amount,
            payment_method_id: 'pix',
            payer: {
                first_name: payerData.name.split(' ')[0],
                last_name: payerData.name.split(' ').slice(1).join(' ') || payerData.name.split(' ')[0],
                email: payerData.email,
                identification: {
                    type: 'CPF',
                    number: payerData.cpf.replace(/\D/g, '')
                },
                phone: {
                    area_code: payerData.phone ? payerData.phone.replace(/\D/g, '').slice(0, 2) : '11',
                    number: payerData.phone ? payerData.phone.replace(/\D/g, '').slice(2) : '999999999'
                }
            },
            external_reference: vehicleId,
            description: `Pagamento de estacionamento - Veículo ${vehicleId}`,
            notification_url: `${process.env.WEBHOOK_URL || 'https://your-domain.com'}/api/webhook/mercadopago`
        };

        const payment = await paymentClient.create({
            body: paymentData,
            requestOptions: {
                idempotencyKey: uuidv4()
            }
        });

        console.log('PIX Payment created:', payment);
        return payment;
    } catch (error) {
        console.error('Error creating PIX payment:', error);
        throw error;
    }
}

// Credit/Debit Card Payment Helper Functions
async function createCardPayment(amount, payerData, cardData, vehicleId) {
    try {
        // In demo mode, simulate payment response
        const isDemoMode = process.env.NODE_ENV !== 'production' || process.env.MP_ACCESS_TOKEN?.includes('TEST');
        
        if (isDemoMode) {
            // Simulate MercadoPago response for demo
            console.log('DEMO MODE: Simulating card payment approval');
            const simulatedPayment = {
                id: `demo_payment_${Date.now()}`,
                status: 'approved',
                status_detail: 'approved',
                transaction_amount: amount,
                payment_method_id: cardData.paymentType === 'credit' ? 'credit_card' : 'debit_card',
                payment_type_id: cardData.paymentType,
                date_approved: new Date().toISOString(),
                date_created: new Date().toISOString(),
                external_reference: vehicleId
            };
            
            console.log('Simulated Card Payment created:', simulatedPayment);
            return simulatedPayment;
        }

        // Real MercadoPago integration for production
        const paymentData = {
            transaction_amount: amount,
            token: cardData.cardToken,
            description: `Pagamento de estacionamento - Veículo ${vehicleId}`,
            installments: cardData.paymentType === 'credit' ? cardData.installments : 1,
            payment_method_id: cardData.paymentType === 'credit' ? 'credit_card' : 'debit_card',
            payer: {
                first_name: payerData.name.split(' ')[0],
                last_name: payerData.name.split(' ').slice(1).join(' ') || payerData.name.split(' ')[0],
                email: payerData.email,
                identification: {
                    type: 'CPF',
                    number: payerData.cpf.replace(/\D/g, '')
                },
                phone: {
                    area_code: payerData.phone ? payerData.phone.replace(/\D/g, '').slice(0, 2) : '11',
                    number: payerData.phone ? payerData.phone.replace(/\D/g, '').slice(2) : '999999999'
                }
            },
            external_reference: vehicleId,
            notification_url: `${process.env.WEBHOOK_URL || 'https://your-domain.com'}/api/webhook/mercadopago`
        };

        const payment = await paymentClient.create({
            body: paymentData,
            requestOptions: {
                idempotencyKey: uuidv4()
            }
        });

        console.log('Card Payment created:', payment);
        return payment;
    } catch (error) {
        console.error('Error creating card payment:', error);
        throw error;
    }
}

function validateCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
        return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit1 = (sum * 10) % 11;
    if (digit1 === 10) digit1 = 0;
    
    if (parseInt(cpf[9]) !== digit1) {
        return false;
    }
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf[i]) * (11 - i);
    }
    let digit2 = (sum * 10) % 11;
    if (digit2 === 10) digit2 = 0;
    
    return parseInt(cpf[10]) === digit2;
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
                    duration: durationHours,
                    paymentMethod: 'Dinheiro'
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
                fee: fee,
                paymentMethod: 'Dinheiro'
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
                estimatedFee: formatBrazilianCurrency(estimatedFee),
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
                            estimatedFee: formatBrazilianCurrency(estimatedFee)
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

// Get detailed vehicle times report
app.get('/api/reports/vehicle-times', async (req, res) => {
    try {
        const { startDate, endDate, vehicleType, status, limit } = req.query;
        
        // Default date range: last 7 days
        let start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        
        let end = new Date();
        end.setHours(23, 59, 59, 999);
        
        if (startDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
        }
        
        if (endDate) {
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }

        const vehiclesCollection = db.collection('vehicles');
        
        // Build query
        let query = {
            entryTime: { 
                $gte: start.toISOString(),
                $lte: end.toISOString()
            }
        };
        
        // Add vehicle type filter
        if (vehicleType && vehicleType !== 'all') {
            query.type = vehicleType;
        }
        
        // Add status filter
        if (status && status !== 'all') {
            query.status = status;
        }

        // Get vehicles with pagination
        const maxLimit = parseInt(limit) || 100;
        const vehicles = await vehiclesCollection
            .find(query, { projection: { _id: 0 } })
            .sort({ entryTime: -1 })
            .limit(maxLimit)
            .toArray();

        // Format data for frontend
        const formattedVehicles = vehicles.map(vehicle => {
            const entryTime = new Date(vehicle.entryTime);
            const exitTime = vehicle.exitTime ? new Date(vehicle.exitTime) : null;
            const currentTime = new Date();
            
            // Calculate duration
            let duration = null;
            let durationFormatted = null;
            let estimatedFee = null;
            
            if (vehicle.status === 'parked') {
                // Still parked - calculate current duration
                const durationMs = currentTime - entryTime;
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                duration = { hours, minutes, totalMinutes: Math.floor(durationMs / (1000 * 60)) };
                durationFormatted = `${hours}h ${minutes}m`;
                
                // Calculate estimated current fee
                const durationMinutes = durationMs / (1000 * 60);
                const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
                estimatedFee = durationMinutes * ratePerMinute;
            } else if (vehicle.status === 'exited' && exitTime) {
                // Already exited - use stored duration or calculate
                if (vehicle.duration) {
                    const hours = Math.floor(vehicle.duration);
                    const minutes = Math.floor((vehicle.duration % 1) * 60);
                    duration = { hours, minutes, totalMinutes: Math.floor(vehicle.duration * 60) };
                    durationFormatted = `${hours}h ${minutes}m`;
                } else {
                    const durationMs = exitTime - entryTime;
                    const hours = Math.floor(durationMs / (1000 * 60 * 60));
                    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                    duration = { hours, minutes, totalMinutes: Math.floor(durationMs / (1000 * 60)) };
                    durationFormatted = `${hours}h ${minutes}m`;
                }
                estimatedFee = vehicle.fee || 0;
            }
            
            return {
                id: vehicle.id,
                plate: vehicle.plate,
                type: vehicle.type,
                model: vehicle.model,
                color: vehicle.color,
                ownerName: vehicle.ownerName,
                ownerPhone: vehicle.ownerPhone || '',
                spot: vehicle.spot,
                status: vehicle.status,
                entryTime: entryTime.toLocaleString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                exitTime: exitTime ? exitTime.toLocaleString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : null,
                entryTimestamp: vehicle.entryTime,
                exitTimestamp: vehicle.exitTime || null,
                duration: duration,
                durationFormatted: durationFormatted,
                fee: vehicle.fee || 0,
                estimatedFee: estimatedFee,
                formattedFee: `R$ ${formatBrazilianCurrency(estimatedFee || 0)}`,
                paymentMethod: vehicle.paymentMethod || 'Pendente'
            };
        });

        // Get summary statistics
        const totalVehicles = formattedVehicles.length;
        const parkedVehicles = formattedVehicles.filter(v => v.status === 'parked').length;
        const exitedVehicles = formattedVehicles.filter(v => v.status === 'exited').length;
        const totalRevenue = formattedVehicles
            .filter(v => v.status === 'exited')
            .reduce((sum, v) => sum + (v.fee || 0), 0);
        
        const summary = {
            totalVehicles,
            parkedVehicles,
            exitedVehicles,
            totalRevenue,
            formattedRevenue: `R$ ${formatBrazilianCurrency(totalRevenue)}`,
            period: {
                start: start.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                end: end.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            }
        };

        res.json({
            success: true,
            data: {
                vehicles: formattedVehicles,
                summary: summary,
                pagination: {
                    total: totalVehicles,
                    limit: maxLimit,
                    hasMore: totalVehicles === maxLimit
                }
            }
        });

    } catch (error) {
        console.error('Error getting vehicle times report:', error);
        res.status(500).json({ 
            success: false,
            detail: `Erro ao gerar relatório de horários: ${error.message}` 
        });
    }
});

// Get export data for reports
app.get('/api/reports/export', async (req, res) => {
    try {
        const { startDate, endDate, format } = req.query;
        
        // Default date range: last 30 days
        let start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        
        let end = new Date();
        end.setHours(23, 59, 59, 999);
        
        if (startDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
        }
        
        if (endDate) {
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }

        const operationsCollection = db.collection('operations_history');
        const vehiclesCollection = db.collection('vehicles');
        const spotsCollection = db.collection('parking_spots');

        // Get operations in date range
        const operations = await operationsCollection.find({
            timestamp: { 
                $gte: start.toISOString(),
                $lte: end.toISOString()
            }
        }).sort({ timestamp: -1 }).toArray();

        // Get current statistics
        const stats = await getDashboardStats();
        
        // Get vehicles data
        const allVehicles = await vehiclesCollection.find({}).toArray();
        const parkedVehicles = await vehiclesCollection.find({ status: 'parked' }).toArray();
        const exitedVehicles = await vehiclesCollection.find({ 
            status: 'exited',
            exitTime: { 
                $gte: start.toISOString(),
                $lte: end.toISOString()
            }
        }).toArray();

        // Calculate revenue and other metrics
        const totalRevenue = exitedVehicles.reduce((sum, v) => sum + (v.fee || 0), 0);
        const totalEntries = operations.filter(op => op.type === 'entry').length;
        const totalExits = operations.filter(op => op.type === 'exit').length;
        
        // Payment methods analysis
        const paymentMethods = {
            cash: 0,
            pix: 0,
            credit_card: 0,
            debit_card: 0
        };
        
        exitedVehicles.forEach(v => {
            const method = v.paymentMethod || 'cash';
            if (method === 'cash' || method === 'Dinheiro') {
                paymentMethods.cash += (v.fee || 0);
            } else if (method === 'pix' || method === 'PIX') {
                paymentMethods.pix += (v.fee || 0);
            } else if (method === 'credit_card' || method === 'Cartão de Crédito') {
                paymentMethods.credit_card += (v.fee || 0);
            } else if (method === 'debit_card' || method === 'Cartão de Débito') {
                paymentMethods.debit_card += (v.fee || 0);
            }
        });
        
        // Count transactions by payment method
        const paymentMethodCounts = {
            cash: exitedVehicles.filter(v => !v.paymentMethod || v.paymentMethod === 'cash' || v.paymentMethod === 'Dinheiro').length,
            pix: exitedVehicles.filter(v => v.paymentMethod === 'pix' || v.paymentMethod === 'PIX').length,
            credit_card: exitedVehicles.filter(v => v.paymentMethod === 'credit_card' || v.paymentMethod === 'Cartão de Crédito').length,
            debit_card: exitedVehicles.filter(v => v.paymentMethod === 'debit_card' || v.paymentMethod === 'Cartão de Débito').length
        };
        
        // Group data by date
        const dailyData = {};
        operations.forEach(op => {
            const date = new Date(op.timestamp).toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = {
                    date: date,
                    entries: 0,
                    exits: 0,
                    revenue: 0
                };
            }
            
            if (op.type === 'entry') {
                dailyData[date].entries++;
            } else if (op.type === 'exit') {
                dailyData[date].exits++;
                dailyData[date].revenue += op.data?.fee || 0;
            }
        });

        // Vehicle type distribution
        const vehicleTypes = {
            cars: allVehicles.filter(v => v.type === 'car').length,
            motorcycles: allVehicles.filter(v => v.type === 'motorcycle').length
        };

        // Prepare export data
        const exportData = {
            summary: {
                periodStart: start.toISOString().split('T')[0],
                periodEnd: end.toISOString().split('T')[0],
                totalRevenue: totalRevenue,
                totalEntries: totalEntries,
                totalExits: totalExits,
                currentlyParked: parkedVehicles.length,
                averageRevenue: totalExits > 0 ? totalRevenue / totalExits : 0,
                vehicleTypes: vehicleTypes,
                occupancyRate: stats.occupancyRate,
                paymentMethods: {
                    cash: {
                        revenue: paymentMethods.cash,
                        count: paymentMethodCounts.cash,
                        percentage: totalRevenue > 0 ? (paymentMethods.cash / totalRevenue) * 100 : 0
                    },
                    pix: {
                        revenue: paymentMethods.pix,
                        count: paymentMethodCounts.pix,
                        percentage: totalRevenue > 0 ? (paymentMethods.pix / totalRevenue) * 100 : 0
                    },
                    credit_card: {
                        revenue: paymentMethods.credit_card,
                        count: paymentMethodCounts.credit_card,
                        percentage: totalRevenue > 0 ? (paymentMethods.credit_card / totalRevenue) * 100 : 0
                    },
                    debit_card: {
                        revenue: paymentMethods.debit_card,
                        count: paymentMethodCounts.debit_card,
                        percentage: totalRevenue > 0 ? (paymentMethods.debit_card / totalRevenue) * 100 : 0
                    }
                }
            },
            dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
            operations: operations.map(op => {
                const opTime = new Date(op.timestamp);
                return {
                    id: op.id,
                    type: op.type === 'entry' ? 'Entrada' : op.type === 'exit' ? 'Saída' : op.type,
                    plate: op.plate,
                    spot: op.spot,
                    date: opTime.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                    time: opTime.toLocaleTimeString('pt-BR', { 
                        timeZone: 'America/Sao_Paulo',
                        hour: '2-digit', 
                        minute: '2-digit' 
                    }),
                    fee: op.data?.fee || 0,
                    duration: op.data?.duration || 0,
                    paymentMethod: op.data?.paymentMethod || (op.type === 'exit' ? 'Dinheiro' : ''),
                    timestamp: op.timestamp
                };
            }),
            vehicles: {
                parked: parkedVehicles.map(v => ({
                    id: v.id,
                    plate: v.plate,
                    type: v.type === 'car' ? 'Carro' : 'Moto',
                    model: v.model,
                    color: v.color,
                    ownerName: v.ownerName,
                    ownerPhone: v.ownerPhone || '',
                    spot: v.spot,
                    entryTime: new Date(v.entryTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                    status: 'Estacionado'
                })),
                exited: exitedVehicles.map(v => ({
                    id: v.id,
                    plate: v.plate,
                    type: v.type === 'car' ? 'Carro' : 'Moto',
                    model: v.model,
                    color: v.color,
                    ownerName: v.ownerName,
                    ownerPhone: v.ownerPhone || '',
                    spot: v.spot,
                    entryTime: new Date(v.entryTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                    exitTime: new Date(v.exitTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                    duration: `${formatBrazilianDecimal(v.duration || 0)}h`,
                    fee: `R$ ${formatBrazilianCurrency(v.fee || 0)}`,
                    status: 'Saiu'
                }))
            }
        };

        res.json({
            success: true,
            data: exportData
        });

    } catch (error) {
        console.error('Error generating export data:', error);
        res.status(500).json({ detail: `Erro ao gerar dados de exportação: ${error.message}` });
    }
});

// Helper function to get dashboard stats
async function getDashboardStats() {
    try {
        await synchronizeParkingSpots();
        
        const vehiclesCollection = db.collection('vehicles');
        const spotsCollection = db.collection('parking_spots');

        const totalCars = await vehiclesCollection.countDocuments({
            status: 'parked',
            type: 'car'
        });

        const totalMotorcycles = await vehiclesCollection.countDocuments({
            status: 'parked',
            type: 'motorcycle'
        });

        const availableSpots = await spotsCollection.countDocuments({ isOccupied: false });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayExits = await vehiclesCollection.find({
            status: 'exited',
            exitTime: { $gte: todayStart.toISOString() }
        }).toArray();

        const todayRevenue = todayExits.reduce((sum, exit) => sum + (exit.fee || 0), 0);

        const totalSpots = 70;
        const occupiedSpots = totalSpots - availableSpots;
        const occupancyRate = (occupiedSpots / totalSpots) * 100;

        return {
            totalCarsParked: totalCars,
            totalMotorcyclesParked: totalMotorcycles,
            availableSpots: availableSpots,
            todayRevenue: todayRevenue,
            occupancyRate: occupancyRate
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        throw error;
    }
}

// PIX Payment Endpoints

// Create PIX payment for vehicle exit
app.post('/api/payments/pix/create', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = pixPaymentSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.details[0].message 
            });
        }

        const { vehicleId, payerEmail, payerName, payerCPF, payerPhone } = value;

        // Validate CPF
        if (!validateCPF(payerCPF)) {
            return res.status(400).json({ 
                success: false, 
                error: 'CPF inválido' 
            });
        }

        // Get vehicle details
        const vehiclesCollection = db.collection('vehicles');
        const vehicle = await vehiclesCollection.findOne({
            id: vehicleId,
            status: 'parked'
        });

        if (!vehicle) {
            return res.status(404).json({ 
                success: false, 
                error: 'Veículo não encontrado ou não está estacionado' 
            });
        }

        // Calculate fee
        const exitTime = new Date();
        const entryTime = new Date(vehicle.entryTime);
        const durationMinutes = (exitTime - entryTime) / (1000 * 60);
        const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
        const fee = Math.max(durationMinutes * ratePerMinute, 1); // Minimum R$1

        // Create PIX payment
        const payerData = {
            name: payerName,
            email: payerEmail,
            cpf: payerCPF,
            phone: payerPhone
        };

        const payment = await createPixPayment(fee, payerData, vehicleId);

        // Store payment info in database
        const paymentsCollection = db.collection('payments');
        const paymentRecord = {
            id: uuidv4(),
            paymentId: payment.id,
            vehicleId: vehicleId,
            plate: vehicle.plate,
            amount: fee,
            status: 'pending',
            pixCode: payment.point_of_interaction?.transaction_data?.qr_code,
            pixCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
            ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
            payerEmail: payerEmail,
            payerName: payerName,
            payerCPF: payerCPF,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        };

        await paymentsCollection.insertOne(paymentRecord);

        res.json({
            success: true,
            data: {
                paymentId: payment.id,
                amount: fee,
                formattedAmount: `R$ ${formatBrazilianCurrency(fee)}`,
                pixCode: payment.point_of_interaction?.transaction_data?.qr_code,
                pixCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
                ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
                expiresAt: paymentRecord.expiresAt,
                vehicle: {
                    plate: vehicle.plate,
                    spot: vehicle.spot,
                    type: vehicle.type
                }
            }
        });

    } catch (error) {
        console.error('Error creating PIX payment:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar pagamento PIX: ' + error.message 
        });
    }
});

// Check PIX payment status
app.get('/api/payments/pix/status/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;

        // Get payment from Mercado Pago
        const payment = await paymentClient.get({ id: paymentId });

        // Update local database
        const paymentsCollection = db.collection('payments');
        await paymentsCollection.updateOne(
            { paymentId: paymentId },
            { 
                $set: { 
                    status: payment.status,
                    updatedAt: new Date().toISOString()
                } 
            }
        );

        res.json({
            success: true,
            data: {
                paymentId: paymentId,
                status: payment.status,
                statusDetail: payment.status_detail,
                transactionAmount: payment.transaction_amount,
                paidAmount: payment.transaction_details?.net_received_amount || 0,
                paymentTypeId: payment.payment_type_id,
                dateApproved: payment.date_approved,
                dateCreated: payment.date_created
            }
        });

    } catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao verificar status do pagamento: ' + error.message 
        });
    }
});

// Confirm PIX payment and process vehicle exit
app.post('/api/payments/pix/confirm', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = paymentConfirmationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.details[0].message 
            });
        }

        const { paymentId, vehicleId } = value;

        // Get payment status from Mercado Pago
        const payment = await paymentClient.get({ id: paymentId });

        if (payment.status !== 'approved') {
            return res.status(400).json({ 
                success: false, 
                error: 'Pagamento não foi aprovado ainda',
                status: payment.status
            });
        }

        // Process vehicle exit
        const vehiclesCollection = db.collection('vehicles');
        const vehicle = await vehiclesCollection.findOne({
            id: vehicleId,
            status: 'parked'
        });

        if (!vehicle) {
            return res.status(404).json({ 
                success: false, 
                error: 'Veículo não encontrado' 
            });
        }

        const exitTime = new Date();
        const entryTime = new Date(vehicle.entryTime);
        const durationHours = (exitTime - entryTime) / (1000 * 60 * 60);
        const fee = payment.transaction_amount;

        // Update vehicle status
        await vehiclesCollection.updateOne(
            { id: vehicleId },
            {
                $set: {
                    status: 'exited',
                    exitTime: exitTime.toISOString(),
                    fee: fee,
                    duration: durationHours,
                    paymentId: paymentId,
                    paymentMethod: 'pix'
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

        // Update payment record
        const paymentsCollection = db.collection('payments');
        await paymentsCollection.updateOne(
            { paymentId: paymentId },
            { 
                $set: { 
                    status: 'confirmed',
                    confirmedAt: exitTime.toISOString()
                } 
            }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'exit_with_pix',
            vehicleId: vehicleId,
            plate: vehicle.plate,
            spot: vehicle.spot,
            timestamp: exitTime.toISOString(),
            data: {
                entryTime: vehicle.entryTime,
                exitTime: exitTime.toISOString(),
                duration: durationHours,
                fee: fee,
                paymentId: paymentId,
                paymentMethod: 'pix'
            }
        });

        res.json({
            success: true,
            message: `Pagamento PIX confirmado! Saída processada para ${vehicle.plate}`,
            data: {
                plate: vehicle.plate,
                spot: vehicle.spot,
                duration: `${formatBrazilianDecimal(durationHours)}h`,
                fee: `R$ ${formatBrazilianCurrency(fee)}`,
                exitTime: exitTime.toLocaleTimeString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                paymentId: paymentId,
                paymentMethod: 'PIX'
            }
        });

    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao confirmar pagamento: ' + error.message 
        });
    }
});

// Credit/Debit Card Payment Endpoints

// Create card payment for vehicle exit
app.post('/api/payments/card/create', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = cardPaymentSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.details[0].message 
            });
        }

        const { 
            vehicleId, 
            payerEmail, 
            payerName, 
            payerCPF, 
            payerPhone,
            cardToken,
            cardBrand,
            cardLastFourDigits,
            paymentType,
            installments 
        } = value;

        // Validate CPF
        if (!validateCPF(payerCPF)) {
            return res.status(400).json({ 
                success: false, 
                error: 'CPF inválido' 
            });
        }

        // Get vehicle details
        const vehiclesCollection = db.collection('vehicles');
        const vehicle = await vehiclesCollection.findOne({
            id: vehicleId,
            status: 'parked'
        });

        if (!vehicle) {
            return res.status(404).json({ 
                success: false, 
                error: 'Veículo não encontrado ou não está estacionado' 
            });
        }

        // Calculate fee
        const exitTime = new Date();
        const entryTime = new Date(vehicle.entryTime);
        const durationMinutes = (exitTime - entryTime) / (1000 * 60);
        const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
        const fee = Math.max(durationMinutes * ratePerMinute, 1); // Minimum R$1

        // Create card payment
        const payerData = {
            name: payerName,
            email: payerEmail,
            cpf: payerCPF,
            phone: payerPhone
        };

        const cardData = {
            cardToken: cardToken,
            cardBrand: cardBrand,
            cardLastFourDigits: cardLastFourDigits,
            paymentType: paymentType,
            installments: installments || 1
        };

        const payment = await createCardPayment(fee, payerData, cardData, vehicleId);

        // Store payment info in database
        const paymentsCollection = db.collection('payments');
        const paymentRecord = {
            id: uuidv4(),
            paymentId: payment.id,
            vehicleId: vehicleId,
            plate: vehicle.plate,
            amount: fee,
            status: payment.status || 'pending',
            paymentMethod: paymentType === 'credit' ? 'credit_card' : 'debit_card',
            cardBrand: cardBrand,
            cardLastFourDigits: cardLastFourDigits,
            installments: paymentType === 'credit' ? installments : 1,
            payerEmail: payerEmail,
            payerName: payerName,
            payerCPF: payerCPF,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        };

        await paymentsCollection.insertOne(paymentRecord);

        // If payment is approved immediately, process vehicle exit
        if (payment.status === 'approved') {
            await processVehicleExitWithPayment(vehicleId, payment.id, fee, paymentType === 'credit' ? 'credit_card' : 'debit_card');
        }

        res.json({
            success: true,
            data: {
                paymentId: payment.id,
                amount: fee,
                formattedAmount: `R$ ${formatBrazilianCurrency(fee)}`,
                status: payment.status,
                paymentMethod: paymentType === 'credit' ? 'Cartão de Crédito' : 'Cartão de Débito',
                cardBrand: cardBrand.toUpperCase(),
                cardLastFourDigits: cardLastFourDigits,
                installments: paymentType === 'credit' ? installments : 1,
                vehicle: {
                    plate: vehicle.plate,
                    spot: vehicle.spot,
                    type: vehicle.type
                }
            }
        });

    } catch (error) {
        console.error('Error creating card payment:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao processar pagamento com cartão: ' + error.message 
        });
    }
});

// Get card payment status
app.get('/api/payments/card/status/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;

        // Get payment from Mercado Pago
        const payment = await paymentClient.get({ id: paymentId });

        // Update local database
        const paymentsCollection = db.collection('payments');
        await paymentsCollection.updateOne(
            { paymentId: paymentId },
            { 
                $set: { 
                    status: payment.status,
                    updatedAt: new Date().toISOString()
                } 
            }
        );

        res.json({
            success: true,
            data: {
                paymentId: paymentId,
                status: payment.status,
                statusDetail: payment.status_detail,
                transactionAmount: payment.transaction_amount,
                paidAmount: payment.transaction_details?.net_received_amount || 0,
                paymentTypeId: payment.payment_type_id,
                paymentMethodId: payment.payment_method_id,
                dateApproved: payment.date_approved,
                dateCreated: payment.date_created
            }
        });

    } catch (error) {
        console.error('Error checking card payment status:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao verificar status do pagamento: ' + error.message 
        });
    }
});

// Helper function to process vehicle exit with payment
async function processVehicleExitWithPayment(vehicleId, paymentId, fee, paymentMethod) {
    try {
        const vehiclesCollection = db.collection('vehicles');
        const vehicle = await vehiclesCollection.findOne({
            id: vehicleId,
            status: 'parked'
        });

        if (!vehicle) {
            throw new Error('Veículo não encontrado');
        }

        const exitTime = new Date();
        const entryTime = new Date(vehicle.entryTime);
        const durationHours = (exitTime - entryTime) / (1000 * 60 * 60);

        // Update vehicle status
        await vehiclesCollection.updateOne(
            { id: vehicleId },
            {
                $set: {
                    status: 'exited',
                    exitTime: exitTime.toISOString(),
                    fee: fee,
                    duration: durationHours,
                    paymentId: paymentId,
                    paymentMethod: paymentMethod
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

        // Update payment record
        const paymentsCollection = db.collection('payments');
        await paymentsCollection.updateOne(
            { paymentId: paymentId },
            { 
                $set: { 
                    status: 'confirmed',
                    confirmedAt: exitTime.toISOString()
                } 
            }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'exit_with_card',
            vehicleId: vehicleId,
            plate: vehicle.plate,
            spot: vehicle.spot,
            timestamp: exitTime.toISOString(),
            data: {
                entryTime: vehicle.entryTime,
                exitTime: exitTime.toISOString(),
                duration: durationHours,
                fee: fee,
                paymentId: paymentId,
                paymentMethod: paymentMethod
            }
        });

    } catch (error) {
        console.error('Error processing vehicle exit with payment:', error);
        throw error;
    }
}

// Webhook for Mercado Pago notifications
app.post('/api/webhook/mercadopago', async (req, res) => {
    try {
        const { type, data } = req.body;

        console.log('Mercado Pago webhook received:', { type, data });

        if (type === 'payment') {
            const paymentId = data.id;
            
            // Get payment details
            const payment = await paymentClient.get({ id: paymentId });
            
            // Update payment in database
            const paymentsCollection = db.collection('payments');
            await paymentsCollection.updateOne(
                { paymentId: paymentId },
                { 
                    $set: { 
                        status: payment.status,
                        statusDetail: payment.status_detail,
                        webhookUpdatedAt: new Date().toISOString()
                    } 
                }
            );

            console.log(`Payment ${paymentId} updated to status: ${payment.status}`);
        }

        res.status(200).json({ received: true });

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Get payment history
app.get('/api/payments/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const paymentsCollection = db.collection('payments');

        const payments = await paymentsCollection
            .find({}, { projection: { _id: 0 } })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

        res.json({
            success: true,
            data: payments
        });

    } catch (error) {
        console.error('Error getting payment history:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar histórico: ' + error.message 
        });
    }
});

// ===== RESERVATION SYSTEM ENDPOINTS =====

// Helper function to calculate reservation fees
function calculateReservationFee(vehicleType, duration) {
    // Car: R$10/hour, Motorcycle: R$7/hour
    const hourlyRate = vehicleType === 'car' ? 10 : 7;
    return hourlyRate * duration;
}

// Helper function to check spot availability for reservation
async function checkReservationAvailability(vehicleType, reservationDateTime, duration) {
    const spotsCollection = db.collection('parking_spots');
    const reservationsCollection = db.collection('reservations');
    
    // Get spots of the requested type
    const spotsQuery = vehicleType === 'car' 
        ? { id: { $regex: '^A-' } }
        : { id: { $regex: '^M-' } };
    
    const totalSpots = await spotsCollection.countDocuments(spotsQuery);
    
    // Check reservations that overlap with the requested time
    const endDateTime = new Date(new Date(reservationDateTime).getTime() + duration * 60 * 60 * 1000);
    
    const overlappingReservations = await reservationsCollection.countDocuments({
        vehicleType: vehicleType,
        status: { $in: ['confirmed', 'active'] },
        $or: [
            {
                // Reservation starts during our time slot
                reservationDateTime: {
                    $gte: reservationDateTime,
                    $lt: endDateTime.toISOString()
                }
            },
            {
                // Reservation ends during our time slot
                $expr: {
                    $and: [
                        { $gte: ["$reservationDateTime", reservationDateTime] },
                        { $lt: [{ $dateAdd: { startDate: { $dateFromString: { dateString: "$reservationDateTime" } }, unit: "hour", amount: "$duration" } }, endDateTime] }
                    ]
                }
            },
            {
                // Our reservation is contained within an existing reservation
                $and: [
                    { reservationDateTime: { $lte: reservationDateTime } },
                    { $expr: { $gte: [{ $dateAdd: { startDate: { $dateFromString: { dateString: "$reservationDateTime" } }, unit: "hour", amount: "$duration" } }, endDateTime] } }
                ]
            }
        ]
    });
    
    // Also check currently occupied spots
    const occupiedSpots = await spotsCollection.countDocuments({
        ...spotsQuery,
        isOccupied: true
    });
    
    const availableSpots = totalSpots - overlappingReservations - occupiedSpots;
    return availableSpots > 0;
}

// Create reservation
app.post('/api/reservations/create', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = reservationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: error.details[0].message 
            });
        }

        const { vehicleType, plate, ownerName, ownerPhone, reservationDate, reservationTime, duration, payerEmail, payerCPF } = value;

        // Build reservation datetime
        const reservationDateTime = new Date(`${reservationDate}T${reservationTime}:00`);
        
        // Validate reservation is in the future
        const now = new Date();
        if (reservationDateTime <= now) {
            return res.status(400).json({ 
                success: false, 
                error: 'A reserva deve ser para uma data e hora futura' 
            });
        }

        // Validate CPF
        if (!validateCPF(payerCPF)) {
            return res.status(400).json({ 
                success: false, 
                error: 'CPF inválido' 
            });
        }

        // Validate plate
        const plateValidation = validateBrazilianPlate(plate);
        if (!plateValidation.isValid) {
            return res.status(400).json({ 
                success: false, 
                error: plateValidation.error 
            });
        }

        // Check availability
        const isAvailable = await checkReservationAvailability(vehicleType, reservationDateTime.toISOString(), duration);
        if (!isAvailable) {
            return res.status(400).json({ 
                success: false, 
                error: 'Não há vagas disponíveis para o horário solicitado' 
            });
        }

        // Calculate fee and create reservation
        const fee = calculateReservationFee(vehicleType, duration);
        const reservationId = uuidv4();
        
        const reservationData = {
            id: reservationId,
            vehicleType: vehicleType,
            plate: plate.toUpperCase(),
            ownerName: ownerName,
            ownerPhone: ownerPhone,
            reservationDateTime: reservationDateTime.toISOString(),
            duration: duration,
            fee: fee,
            payerEmail: payerEmail,
            payerCPF: payerCPF,
            status: 'pending_payment',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(reservationDateTime.getTime() + 15 * 60 * 1000).toISOString(), // 15 min tolerance
            paymentRequired: true
        };

        // Create payment for reservation
        const payerData = {
            name: ownerName,
            email: payerEmail,
            cpf: payerCPF,
            phone: ownerPhone
        };

        let payment;
        try {
            payment = await createPixPayment(fee, payerData, reservationId);
        } catch (paymentError) {
            console.error('Error creating reservation payment:', paymentError);
            return res.status(500).json({ 
                success: false, 
                error: 'Erro ao processar pagamento da reserva' 
            });
        }

        // Store reservation and payment
        const reservationsCollection = db.collection('reservations');
        const paymentsCollection = db.collection('payments');

        await reservationsCollection.insertOne(reservationData);

        const paymentRecord = {
            id: uuidv4(),
            paymentId: payment.id,
            reservationId: reservationId,
            type: 'reservation',
            amount: fee,
            status: 'pending',
            pixCode: payment.point_of_interaction?.transaction_data?.qr_code,
            pixCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
            ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
            payerEmail: payerEmail,
            payerName: ownerName,
            payerCPF: payerCPF,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes to pay
        };

        await paymentsCollection.insertOne(paymentRecord);

        res.json({
            success: true,
            data: {
                reservationId: reservationId,
                amount: fee,
                formattedAmount: `R$ ${formatBrazilianCurrency(fee)}`,
                pixCode: payment.point_of_interaction?.transaction_data?.qr_code,
                pixCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
                ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
                paymentId: payment.id,
                reservationDateTime: reservationDateTime.toISOString(),
                duration: duration,
                expiresAt: reservationData.expiresAt,
                vehicle: {
                    plate: plate.toUpperCase(),
                    type: vehicleType
                }
            }
        });

    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar reserva: ' + error.message 
        });
    }
});

// List reservations
app.get('/api/reservations', async (req, res) => {
    try {
        const { status, vehicleType, startDate, endDate } = req.query;
        const reservationsCollection = db.collection('reservations');
        
        let query = {};
        
        if (status) {
            query.status = status;
        }
        
        if (vehicleType) {
            query.vehicleType = vehicleType;
        }
        
        if (startDate || endDate) {
            query.reservationDateTime = {};
            if (startDate) {
                query.reservationDateTime.$gte = new Date(startDate).toISOString();
            }
            if (endDate) {
                query.reservationDateTime.$lte = new Date(endDate).toISOString();
            }
        }

        const reservations = await reservationsCollection
            .find(query, { projection: { _id: 0 } })
            .sort({ reservationDateTime: -1 })
            .toArray();

        const formattedReservations = reservations.map(reservation => {
            const reservationTime = new Date(reservation.reservationDateTime);
            const endTime = new Date(reservationTime.getTime() + reservation.duration * 60 * 60 * 1000);
            
            return {
                ...reservation,
                formattedDateTime: reservationTime.toLocaleString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                endDateTime: endTime.toISOString(),
                formattedEndDateTime: endTime.toLocaleString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                formattedFee: `R$ ${formatBrazilianCurrency(reservation.fee)}`
            };
        });

        res.json({
            success: true,
            data: formattedReservations
        });

    } catch (error) {
        console.error('Error getting reservations:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar reservas: ' + error.message 
        });
    }
});

// Get reservation by ID
app.get('/api/reservations/:reservationId', async (req, res) => {
    try {
        const { reservationId } = req.params;
        const reservationsCollection = db.collection('reservations');
        
        const reservation = await reservationsCollection.findOne(
            { id: reservationId },
            { projection: { _id: 0 } }
        );

        if (!reservation) {
            return res.status(404).json({ 
                success: false, 
                error: 'Reserva não encontrada' 
            });
        }

        const reservationTime = new Date(reservation.reservationDateTime);
        const endTime = new Date(reservationTime.getTime() + reservation.duration * 60 * 60 * 1000);
        
        const formattedReservation = {
            ...reservation,
            formattedDateTime: reservationTime.toLocaleString('pt-BR', { 
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            endDateTime: endTime.toISOString(),
            formattedEndDateTime: endTime.toLocaleString('pt-BR', { 
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            formattedFee: `R$ ${formatBrazilianCurrency(reservation.fee)}`
        };

        res.json({
            success: true,
            data: formattedReservation
        });

    } catch (error) {
        console.error('Error getting reservation:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar reserva: ' + error.message 
        });
    }
});

// Cancel reservation
app.post('/api/reservations/:reservationId/cancel', async (req, res) => {
    try {
        const { reservationId } = req.params;
        const reservationsCollection = db.collection('reservations');
        
        const reservation = await reservationsCollection.findOne({ id: reservationId });

        if (!reservation) {
            return res.status(404).json({ 
                success: false, 
                error: 'Reserva não encontrada' 
            });
        }

        if (!['confirmed', 'pending_payment'].includes(reservation.status)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Reserva não pode ser cancelada neste status' 
            });
        }

        const now = new Date();
        const reservationTime = new Date(reservation.reservationDateTime);
        
        // Calculate cancellation fee (50% of 1 hour rate)
        const hourlyRate = reservation.vehicleType === 'car' ? 10 : 7;
        const cancellationFee = hourlyRate * 0.5; // 50% of 1 hour
        const refundAmount = reservation.fee - cancellationFee;

        // Update reservation status
        await reservationsCollection.updateOne(
            { id: reservationId },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: now.toISOString(),
                    cancellationFee: cancellationFee,
                    refundAmount: Math.max(refundAmount, 0) // No negative refunds
                }
            }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'reservation_cancelled',
            reservationId: reservationId,
            plate: reservation.plate,
            timestamp: now.toISOString(),
            data: {
                originalFee: reservation.fee,
                cancellationFee: cancellationFee,
                refundAmount: Math.max(refundAmount, 0),
                reservationDateTime: reservation.reservationDateTime,
                vehicleType: reservation.vehicleType
            }
        });

        res.json({
            success: true,
            message: 'Reserva cancelada com sucesso',
            data: {
                reservationId: reservationId,
                cancellationFee: cancellationFee,
                refundAmount: Math.max(refundAmount, 0),
                formattedCancellationFee: `R$ ${formatBrazilianCurrency(cancellationFee)}`,
                formattedRefundAmount: `R$ ${formatBrazilianCurrency(Math.max(refundAmount, 0))}`
            }
        });

    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao cancelar reserva: ' + error.message 
        });
    }
});

// Confirm reservation payment
app.post('/api/reservations/:reservationId/confirm-payment', async (req, res) => {
    try {
        const { reservationId } = req.params;
        const { paymentId } = req.body;

        if (!paymentId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Payment ID é obrigatório' 
            });
        }

        // Get payment status from Mercado Pago
        const payment = await paymentClient.get({ id: paymentId });

        if (payment.status !== 'approved') {
            return res.status(400).json({ 
                success: false, 
                error: 'Pagamento não foi aprovado ainda',
                status: payment.status
            });
        }

        const reservationsCollection = db.collection('reservations');
        const reservation = await reservationsCollection.findOne({ id: reservationId });

        if (!reservation) {
            return res.status(404).json({ 
                success: false, 
                error: 'Reserva não encontrada' 
            });
        }

        // Update reservation status to confirmed
        await reservationsCollection.updateOne(
            { id: reservationId },
            {
                $set: {
                    status: 'confirmed',
                    paymentId: paymentId,
                    paymentConfirmedAt: new Date().toISOString()
                }
            }
        );

        // Update payment record
        const paymentsCollection = db.collection('payments');
        await paymentsCollection.updateOne(
            { paymentId: paymentId },
            { 
                $set: { 
                    status: 'confirmed',
                    confirmedAt: new Date().toISOString()
                } 
            }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'reservation_confirmed',
            reservationId: reservationId,
            plate: reservation.plate,
            timestamp: new Date().toISOString(),
            data: {
                paymentId: paymentId,
                fee: reservation.fee,
                reservationDateTime: reservation.reservationDateTime,
                vehicleType: reservation.vehicleType
            }
        });

        res.json({
            success: true,
            message: 'Pagamento confirmado e reserva ativada',
            data: {
                reservationId: reservationId,
                paymentId: paymentId,
                status: 'confirmed'
            }
        });

    } catch (error) {
        console.error('Error confirming reservation payment:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao confirmar pagamento da reserva: ' + error.message 
        });
    }
});

// Check in with reservation (convert reservation to vehicle entry)
app.post('/api/reservations/:reservationId/checkin', async (req, res) => {
    try {
        const { reservationId } = req.params;
        const { model, color } = req.body;

        if (!model || !color) {
            return res.status(400).json({ 
                success: false, 
                error: 'Modelo e cor do veículo são obrigatórios para o check-in' 
            });
        }

        const reservationsCollection = db.collection('reservations');
        const reservation = await reservationsCollection.findOne({ id: reservationId });

        if (!reservation) {
            return res.status(404).json({ 
                success: false, 
                error: 'Reserva não encontrada' 
            });
        }

        if (reservation.status !== 'confirmed') {
            return res.status(400).json({ 
                success: false, 
                error: 'Reserva deve estar confirmada para fazer check-in' 
            });
        }

        const now = new Date();
        const reservationTime = new Date(reservation.reservationDateTime);
        const expiresAt = new Date(reservation.expiresAt);

        // Check if within tolerance time (15 minutes after reservation time)
        if (now > expiresAt) {
            // Auto-cancel expired reservation
            await reservationsCollection.updateOne(
                { id: reservationId },
                {
                    $set: {
                        status: 'expired',
                        expiredAt: now.toISOString()
                    }
                }
            );

            return res.status(400).json({ 
                success: false, 
                error: 'Reserva expirou. Você tinha 15 minutos de tolerância após o horário reservado.' 
            });
        }

        // Check if too early (more than 15 minutes before reservation time)
        const earliestCheckin = new Date(reservationTime.getTime() - 15 * 60 * 1000);
        if (now < earliestCheckin) {
            return res.status(400).json({ 
                success: false, 
                error: 'Check-in muito cedo. Você pode fazer check-in a partir de 15 minutos antes do horário reservado.' 
            });
        }

        // Generate spot for the vehicle type
        const spot = await generateSpot(reservation.vehicleType);

        // Create vehicle entry
        const vehicleId = uuidv4();
        const entryTime = now;

        const vehicleData = {
            id: vehicleId,
            plate: reservation.plate,
            type: reservation.vehicleType,
            model: model,
            color: color,
            ownerName: reservation.ownerName,
            ownerPhone: reservation.ownerPhone,
            entryTime: entryTime.toISOString(),
            spot: spot,
            status: 'parked',
            reservationId: reservationId,
            isReservation: true
        };

        // Insert vehicle and update spot
        const vehiclesCollection = db.collection('vehicles');
        const spotsCollection = db.collection('parking_spots');

        await vehiclesCollection.insertOne(vehicleData);

        await spotsCollection.updateOne(
            { id: spot },
            {
                $set: {
                    isOccupied: true,
                    vehicleId: vehicleId,
                    reservationId: reservationId
                }
            }
        );

        // Update reservation status
        await reservationsCollection.updateOne(
            { id: reservationId },
            {
                $set: {
                    status: 'active',
                    vehicleId: vehicleId,
                    spot: spot,
                    checkedInAt: entryTime.toISOString()
                }
            }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'reservation_checkin',
            vehicleId: vehicleId,
            reservationId: reservationId,
            plate: reservation.plate,
            spot: spot,
            timestamp: entryTime.toISOString(),
            data: {
                reservationDateTime: reservation.reservationDateTime,
                actualEntryTime: entryTime.toISOString(),
                vehicleType: reservation.vehicleType,
                model: model,
                color: color
            }
        });

        res.json({
            success: true,
            message: `Check-in realizado com sucesso! Veículo ${reservation.plate} na vaga ${spot}`,
            data: {
                vehicleId: vehicleId,
                reservationId: reservationId,
                plate: reservation.plate,
                spot: spot,
                entryTime: entryTime.toLocaleTimeString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            }
        });

    } catch (error) {
        console.error('Error processing reservation check-in:', error);
        if (error.message === 'Não há vagas disponíveis') {
            return res.status(400).json({ 
                success: false, 
                error: 'Não há vagas disponíveis no momento' 
            });
        }
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao processar check-in: ' + error.message 
        });
    }
});

// Auto-cancel expired reservations (should be called periodically)
app.post('/api/reservations/cleanup-expired', async (req, res) => {
    try {
        const now = new Date();
        const reservationsCollection = db.collection('reservations');
        
        // Find reservations that are expired but still confirmed
        const expiredReservations = await reservationsCollection.find({
            status: 'confirmed',
            expiresAt: { $lt: now.toISOString() }
        }).toArray();

        let cancelledCount = 0;
        
        for (const reservation of expiredReservations) {
            // Cancel the reservation
            await reservationsCollection.updateOne(
                { id: reservation.id },
                {
                    $set: {
                        status: 'expired',
                        expiredAt: now.toISOString()
                    }
                }
            );

            // Log operation
            const operationsCollection = db.collection('operations_history');
            await operationsCollection.insertOne({
                id: uuidv4(),
                type: 'reservation_auto_expired',
                reservationId: reservation.id,
                plate: reservation.plate,
                timestamp: now.toISOString(),
                data: {
                    originalReservationDateTime: reservation.reservationDateTime,
                    expiresAt: reservation.expiresAt,
                    vehicleType: reservation.vehicleType
                }
            });

            cancelledCount++;
        }

        res.json({
            success: true,
            message: `${cancelledCount} reservas expiradas foram canceladas automaticamente`,
            data: {
                cancelledCount: cancelledCount
            }
        });

    } catch (error) {
        console.error('Error cleaning up expired reservations:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao limpar reservas expiradas: ' + error.message 
        });
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