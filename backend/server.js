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

// PIX payment schema for reservations
const reservationPixPaymentSchema = Joi.object({
    payerEmail: Joi.string().email().required().description('Payer email'),
    payerName: Joi.string().required().description('Payer full name'),
    payerCPF: Joi.string().required().description('Payer CPF'),
    payerPhone: Joi.string().optional().description('Payer phone')
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

// PIX Payment Helper Functions - REAL MODE ONLY
async function createPixPayment(amount, payerData, vehicleId) {
    try {
        console.log('Creating REAL PIX payment for vehicle:', vehicleId, 'amount:', amount);
        
        // Real MercadoPago integration
        const paymentData = {
            transaction_amount: parseFloat(amount.toFixed(2)),
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

        console.log('Sending payment request to MercadoPago:', JSON.stringify(paymentData, null, 2));

        const payment = await paymentClient.create({
            body: paymentData,
            requestOptions: {
                idempotencyKey: uuidv4()
            }
        });

        console.log('PIX Payment created successfully:', payment);
        
        // Validate that we have QR code data
        if (!payment.point_of_interaction?.transaction_data?.qr_code) {
            throw new Error('QR Code não foi gerado pelo Mercado Pago');
        }

        return payment;
    } catch (error) {
        console.error('Error creating PIX payment:', error);
        console.error('Error details:', error.response?.data || error.message);
        throw new Error(`Erro ao criar pagamento PIX: ${error.message}`);
    }
}

// Credit/Debit Card Payment Helper Functions
async function createCardPayment(amount, payerData, cardData, vehicleId) {
    try {
        console.log('Creating REAL card payment for vehicle:', vehicleId, 'amount:', amount);

        // Real MercadoPago integration
        const paymentData = {
            transaction_amount: parseFloat(amount.toFixed(2)),
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

// RESERVATION ENDPOINTS

// Get all reservations
app.get('/api/reservations', async (req, res) => {
    try {
        const reservationsCollection = db.collection('reservations');
        const reservations = await reservationsCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        const formattedReservations = reservations.map(reservation => {
            const startDateTime = new Date(reservation.reservationDateTime);
            const endDateTime = new Date(startDateTime.getTime() + (reservation.duration * 60 * 60 * 1000));
            
            return {
                id: reservation.id,
                vehicleType: reservation.vehicleType,
                plate: reservation.plate,
                ownerName: reservation.ownerName,
                ownerPhone: reservation.ownerPhone,
                reservationDateTime: reservation.reservationDateTime,
                duration: reservation.duration,
                fee: reservation.fee,
                formattedFee: `R$ ${formatBrazilianCurrency(reservation.fee)}`,
                status: reservation.status,
                createdAt: reservation.createdAt,
                expiresAt: reservation.expiresAt,
                formattedDateTime: startDateTime.toLocaleString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                endDateTime: endDateTime.toISOString(),
                formattedEndDateTime: endDateTime.toLocaleString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                paymentId: reservation.paymentId,
                vehicleId: reservation.vehicleId,
                spot: reservation.spot
            };
        });
        
        res.json({
            success: true,
            data: formattedReservations
        });
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar reservas'
        });
    }
});

// Create new reservation
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

        const reservation = value;

        // Validate plate
        const plateValidation = validateBrazilianPlate(reservation.plate);
        if (!plateValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: plateValidation.error
            });
        }

        // Create reservation datetime
        const reservationDateTime = new Date(`${reservation.reservationDate}T${reservation.reservationTime}:00`);
        
        // Check if reservation is for future time
        if (reservationDateTime <= new Date()) {
            return res.status(400).json({
                success: false,
                error: 'A reserva deve ser para uma data e hora futura'
            });
        }

        // Calculate fee
        const hourlyRate = reservation.vehicleType === 'car' ? 10 : 7;
        const fee = hourlyRate * reservation.duration;

        // Create reservation
        const reservationId = uuidv4();
        const currentTime = new Date();
        const expiresAt = new Date(currentTime.getTime() + 30 * 60 * 1000); // 30 minutes to pay

        const reservationData = {
            id: reservationId,
            vehicleType: reservation.vehicleType,
            plate: reservation.plate.toUpperCase(),
            ownerName: reservation.ownerName,
            ownerPhone: reservation.ownerPhone,
            reservationDateTime: reservationDateTime.toISOString(),
            duration: reservation.duration,
            fee: fee,
            status: 'pending_payment',
            createdAt: currentTime.toISOString(),
            expiresAt: expiresAt.toISOString(),
            payerEmail: reservation.payerEmail,
            payerCPF: reservation.payerCPF,
            paymentId: null,
            vehicleId: null,
            spot: null
        };

        // Insert reservation
        const reservationsCollection = db.collection('reservations');
        await reservationsCollection.insertOne(reservationData);

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'reservation_created',
            vehicleId: null,
            plate: reservation.plate.toUpperCase(),
            spot: null,
            timestamp: currentTime.toISOString(),
            data: reservationData
        });

        res.json({
            success: true,
            message: 'Reserva criada com sucesso! Realize o pagamento para confirmar.',
            data: {
                reservationId: reservationId,
                amount: fee,
                formattedAmount: `R$ ${formatBrazilianCurrency(fee)}`,
                expiresAt: expiresAt.toISOString(),
                vehicle: {
                    plate: reservation.plate.toUpperCase(),
                    type: reservation.vehicleType,
                    owner: reservation.ownerName
                }
            }
        });

    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar reserva'
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

        // Check if reservation can be cancelled
        if (reservation.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'Reserva já foi cancelada'
            });
        }

        if (reservation.status === 'active') {
            return res.status(400).json({
                success: false,
                error: 'Não é possível cancelar uma reserva ativa'
            });
        }

        // Update reservation status
        await reservationsCollection.updateOne(
            { id: reservationId },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: new Date().toISOString()
                }
            }
        );

        // Free reserved spot if any
        if (reservation.spot) {
            const spotsCollection = db.collection('parking_spots');
            await spotsCollection.updateOne(
                { id: reservation.spot },
                {
                    $set: {
                        isReserved: false,
                        reservationId: null
                    }
                }
            );
        }

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'reservation_cancelled',
            vehicleId: reservation.vehicleId,
            plate: reservation.plate,
            spot: reservation.spot,
            timestamp: new Date().toISOString(),
            data: { reservationId: reservationId, reason: 'user_cancelled' }
        });

        res.json({
            success: true,
            message: 'Reserva cancelada com sucesso'
        });

    } catch (error) {
        console.error('Error cancelling reservation:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao cancelar reserva'
        });
    }
});

// Create PIX payment for reservation
app.post('/api/reservations/:reservationId/create-pix-payment', async (req, res) => {
    try {
        const { reservationId } = req.params;
        
        // Validate request body
        const { error, value } = reservationPixPaymentSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }

        const { payerEmail, payerName, payerCPF, payerPhone } = value;

        // Validate CPF
        if (!validateCPF(payerCPF)) {
            return res.status(400).json({
                success: false,
                error: 'CPF inválido'
            });
        }

        // Get reservation details
        const reservationsCollection = db.collection('reservations');
        const reservation = await reservationsCollection.findOne({ id: reservationId });

        if (!reservation) {
            return res.status(404).json({
                success: false,
                error: 'Reserva não encontrada'
            });
        }

        if (reservation.status !== 'pending_payment') {
            return res.status(400).json({
                success: false,
                error: 'Reserva não está pendente de pagamento'
            });
        }

        // Create PIX payment
        const payerData = {
            name: payerName,
            email: payerEmail,
            cpf: payerCPF,
            phone: payerPhone
        };

        const payment = await createPixPayment(reservation.fee, payerData, reservationId);

        // Store payment info in database
        const paymentsCollection = db.collection('payments');
        const paymentRecord = {
            id: uuidv4(),
            paymentId: payment.id,
            reservationId: reservationId,
            vehicleId: null,
            plate: reservation.plate,
            amount: reservation.fee,
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

        // Update reservation with payment ID
        await reservationsCollection.updateOne(
            { id: reservationId },
            {
                $set: {
                    paymentId: payment.id,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        res.json({
            success: true,
            data: {
                paymentId: payment.id,
                reservationId: reservationId,
                amount: reservation.fee,
                formattedAmount: `R$ ${formatBrazilianCurrency(reservation.fee)}`,
                pixCode: payment.point_of_interaction?.transaction_data?.qr_code,
                pixCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
                ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
                expiresAt: paymentRecord.expiresAt
            }
        });

    } catch (error) {
        console.error('Error creating PIX payment for reservation:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar pagamento PIX: ' + error.message
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
                error: 'Pagamento ainda não foi confirmado'
            });
        }

        // Get reservation
        const reservationsCollection = db.collection('reservations');
        const reservation = await reservationsCollection.findOne({ id: reservationId });

        if (!reservation) {
            return res.status(404).json({
                success: false,
                error: 'Reserva não encontrada'
            });
        }

        // Update reservation status
        await reservationsCollection.updateOne(
            { id: reservationId },
            {
                $set: {
                    status: 'confirmed',
                    paymentConfirmedAt: new Date().toISOString()
                }
            }
        );

        // Update payment status
        const paymentsCollection = db.collection('payments');
        await paymentsCollection.updateOne(
            { paymentId: paymentId },
            {
                $set: {
                    status: 'completed',
                    completedAt: new Date().toISOString()
                }
            }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'reservation_payment_confirmed',
            vehicleId: null,
            plate: reservation.plate,
            spot: null,
            timestamp: new Date().toISOString(),
            data: {
                reservationId: reservationId,
                paymentId: paymentId,
                amount: reservation.fee
            }
        });

        res.json({
            success: true,
            message: 'Pagamento confirmado! Reserva ativada com sucesso.',
            data: {
                reservationId: reservationId,
                status: 'confirmed',
                amount: reservation.fee,
                formattedAmount: `R$ ${formatBrazilianCurrency(reservation.fee)}`
            }
        });

    } catch (error) {
        console.error('Error confirming reservation payment:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao confirmar pagamento: ' + error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mercadoPagoConfigured: !!process.env.MP_ACCESS_TOKEN
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

// PIX Payment Endpoints

// Create PIX payment for vehicle exit
app.post('/api/payments/pix/create', async (req, res) => {
    try {
        console.log('PIX payment creation request received:', req.body);
        
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
        
        console.log('PIX Payment calculation:', {
            vehicleId,
            entryTime: vehicle.entryTime,
            exitTime: exitTime.toISOString(),
            durationMinutes,
            ratePerMinute,
            fee,
            feeRounded: parseFloat(fee.toFixed(2))
        });

        // Create PIX payment
        const payerData = {
            name: payerName,
            email: payerEmail,
            cpf: payerCPF,
            phone: payerPhone
        };

        const payment = await createPixPayment(parseFloat(fee.toFixed(2)), payerData, vehicleId);

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

        console.log('PIX payment created successfully, returning response...');

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
        console.log('Checking PIX payment status for:', paymentId);

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
                error: 'Pagamento ainda não foi confirmado' 
            });
        }

        // Get vehicle and payment data
        const vehiclesCollection = db.collection('vehicles');
        const paymentsCollection = db.collection('payments');
        
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

        const paymentRecord = await paymentsCollection.findOne({
            paymentId: paymentId,
            vehicleId: vehicleId
        });

        if (!paymentRecord) {
            return res.status(404).json({ 
                success: false, 
                error: 'Registro de pagamento não encontrado' 
            });
        }

        const exitTime = new Date();
        const entryTime = new Date(vehicle.entryTime);
        const durationMinutes = (exitTime - entryTime) / (1000 * 60);
        const durationHours = durationMinutes / 60;

        // Update vehicle status
        await vehiclesCollection.updateOne(
            { id: vehicleId },
            {
                $set: {
                    status: 'exited',
                    exitTime: exitTime.toISOString(),
                    fee: paymentRecord.amount,
                    duration: durationHours,
                    paymentMethod: 'PIX',
                    paymentId: paymentId
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

        // Update payment status
        await paymentsCollection.updateOne(
            { paymentId: paymentId },
            {
                $set: {
                    status: 'completed',
                    completedAt: exitTime.toISOString()
                }
            }
        );

        // Log operation
        const operationsCollection = db.collection('operations_history');
        await operationsCollection.insertOne({
            id: uuidv4(),
            type: 'exit',
            vehicleId: vehicleId,
            plate: vehicle.plate,
            spot: vehicle.spot,
            timestamp: exitTime.toISOString(),
            data: {
                entryTime: vehicle.entryTime,
                exitTime: exitTime.toISOString(),
                duration: durationHours,
                fee: paymentRecord.amount,
                paymentMethod: 'PIX',
                paymentId: paymentId
            }
        });

        res.json({
            success: true,
            message: `Pagamento PIX confirmado! Saída processada para ${vehicle.plate}`,
            data: {
                plate: vehicle.plate,
                spot: vehicle.spot,
                duration: `${formatBrazilianDecimal(durationHours)}h`,
                fee: `R$ ${formatBrazilianCurrency(paymentRecord.amount)}`,
                paymentMethod: 'PIX',
                exitTime: exitTime.toLocaleTimeString('pt-BR', { 
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            }
        });

    } catch (error) {
        console.error('Error confirming PIX payment:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao confirmar pagamento: ' + error.message 
        });
    }
});

// Process vehicle exit (manual exit without payment)
app.post('/api/vehicles/exit', async (req, res) => {
    try {
        // Validate request body
        const { error, value } = vehicleExitSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ detail: error.details[0].message });
        }

        const { vehicleId } = value;

        // Get vehicle details
        const vehiclesCollection = db.collection('vehicles');
        const vehicle = await vehiclesCollection.findOne({
            id: vehicleId,
            status: 'parked'
        });

        if (!vehicle) {
            return res.status(404).json({ detail: 'Veículo não encontrado ou não está estacionado' });
        }

        const exitTime = new Date();
        const entryTime = new Date(vehicle.entryTime);
        const durationMinutes = (exitTime - entryTime) / (1000 * 60);
        const durationHours = durationMinutes / 60;
        
        // Calculate fee based on vehicle type
        const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
        const fee = Math.max(durationMinutes * ratePerMinute, 1); // Minimum R$1

        console.log('Manual exit calculation:', {
            vehicleId,
            plate: vehicle.plate,
            entryTime: vehicle.entryTime,
            exitTime: exitTime.toISOString(),
            durationMinutes,
            durationHours,
            ratePerMinute,
            fee
        });
        
        // Update vehicle status
        await vehiclesCollection.updateOne(
            { id: vehicleId },
            {
                $set: {
                    status: 'exited',
                    exitTime: exitTime.toISOString(),
                    fee: fee,
                    duration: durationHours,
                    paymentMethod: 'CASH', // Default to cash for manual exits
                    paymentId: null
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
            vehicleId: vehicleId,
            plate: vehicle.plate,
            spot: vehicle.spot,
            timestamp: exitTime.toISOString(),
            data: {
                entryTime: vehicle.entryTime,
                exitTime: exitTime.toISOString(),
                duration: durationHours,
                fee: fee,
                paymentMethod: 'CASH'
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
                paymentMethod: 'CASH',
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

// Get dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
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

        res.json({
            totalCarsParked: totalCars,
            totalMotorcyclesParked: totalMotorcycles,
            availableSpots: availableSpots,
            todayRevenue: todayRevenue,
            occupancyRate: occupancyRate
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ detail: 'Erro ao buscar estatísticas do dashboard' });
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

// Get detailed vehicle times report
app.get('/api/reports/vehicle-times', async (req, res) => {
    try {
        const { 
            startDate, 
            endDate, 
            vehicleType, 
            status = 'all', 
            limit = 50 
        } = req.query;

        const vehiclesCollection = db.collection('vehicles');
        const query = {};

        // Apply filters
        if (vehicleType && vehicleType !== 'all') {
            query.type = vehicleType;
        }

        if (status && status !== 'all') {
            query.status = status;
        }

        // Date range filter
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) {
                dateFilter.$gte = new Date(startDate + 'T00:00:00.000Z').toISOString();
            }
            if (endDate) {
                dateFilter.$lte = new Date(endDate + 'T23:59:59.999Z').toISOString();
            }
            query.entryTime = dateFilter;
        }

        // Fetch vehicles with pagination
        const vehicles = await vehiclesCollection
            .find(query)
            .sort({ entryTime: -1 })
            .limit(parseInt(limit))
            .toArray();

        // Process vehicles data
        const processedVehicles = vehicles.map(vehicle => {
            const entryTime = new Date(vehicle.entryTime);
            const exitTime = vehicle.exitTime ? new Date(vehicle.exitTime) : null;
            const currentTime = new Date();
            
            let duration = null;
            let durationFormatted = null;
            let estimatedFee = null;
            
            if (vehicle.status === 'parked') {
                // Calculate current duration for parked vehicles
                const durationMs = currentTime - entryTime;
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                const totalMinutes = Math.floor(durationMs / (1000 * 60));
                
                duration = { hours, minutes, totalMinutes };
                durationFormatted = `${hours}h ${minutes}m`;
                
                // Calculate estimated fee
                const ratePerMinute = vehicle.type === 'car' ? (10 / 60) : (7 / 60);
                estimatedFee = Math.max(totalMinutes * ratePerMinute, 1);
            } else if (vehicle.status === 'exited' && exitTime) {
                // Calculate actual duration for exited vehicles
                const durationMs = exitTime - entryTime;
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                const totalMinutes = Math.floor(durationMs / (1000 * 60));
                
                duration = { hours, minutes, totalMinutes };
                durationFormatted = `${hours}h ${minutes}m`;
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
                formattedFee: vehicle.status === 'parked' && estimatedFee ? 
                    `R$ ${formatBrazilianCurrency(estimatedFee)} (estimado)` : 
                    `R$ ${formatBrazilianCurrency(vehicle.fee || 0)}`,
                paymentMethod: vehicle.paymentMethod || 'N/A'
            };
        });

        // Calculate summary
        const parkedVehicles = vehicles.filter(v => v.status === 'parked').length;
        const exitedVehicles = vehicles.filter(v => v.status === 'exited').length;
        const totalRevenue = vehicles
            .filter(v => v.status === 'exited')
            .reduce((sum, v) => sum + (v.fee || 0), 0);

        const summary = {
            totalVehicles: vehicles.length,
            parkedVehicles,
            exitedVehicles,
            totalRevenue,
            formattedRevenue: `R$ ${formatBrazilianCurrency(totalRevenue)}`,
            period: {
                start: startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início',
                end: endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Agora'
            }
        };

        res.json({
            success: true,
            data: {
                vehicles: processedVehicles,
                summary,
                pagination: {
                    total: vehicles.length,
                    limit: parseInt(limit),
                    hasMore: vehicles.length === parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching vehicle times report:', error);
        res.status(500).json({
            success: false,
            detail: 'Erro ao buscar relatório de horários'
        });
    }
});

// Start server
const PORT = process.env.PORT || 8001;

// Connect to MongoDB first, then start server
connectToMongoDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚗 ParkSystem Pro API running on port ${PORT}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
        console.log(`💳 MercadoPago configured: ${!!process.env.MP_ACCESS_TOKEN}`);
        console.log('🏁 Server ready to handle requests!');
    });
});

export default app;