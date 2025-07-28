// MongoDB Initialization Script
print('🚗 Initializing ParkSystem Pro Database...');

// Switch to the target database
db = db.getSiblingDB('parkingsystempro');

// Create collections with validation
db.createCollection('vehicles', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["id", "plate", "type", "model", "color", "ownerName", "entryTime", "spot", "status"],
         properties: {
            id: { bsonType: "string" },
            plate: { bsonType: "string" },
            type: { enum: ["car", "motorcycle"] },
            model: { bsonType: "string" },
            color: { bsonType: "string" },
            ownerName: { bsonType: "string" },
            ownerPhone: { bsonType: ["string", "null"] },
            entryTime: { bsonType: "string" },
            exitTime: { bsonType: ["string", "null"] },
            spot: { bsonType: "string" },
            status: { enum: ["parked", "exited"] },
            fee: { bsonType: ["number", "null"] },
            duration: { bsonType: ["number", "null"] },
            paymentMethod: { bsonType: ["string", "null"] },
            paymentId: { bsonType: ["string", "null"] }
         }
      }
   }
});

db.createCollection('parking_spots', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["id", "type", "isOccupied", "isReserved"],
         properties: {
            id: { bsonType: "string" },
            type: { enum: ["car", "motorcycle"] },
            isOccupied: { bsonType: "bool" },
            isReserved: { bsonType: "bool" },
            vehicleId: { bsonType: ["string", "null"] }
         }
      }
   }
});

db.createCollection('operations_history', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["id", "type", "vehicleId", "plate", "timestamp"],
         properties: {
            id: { bsonType: "string" },
            type: { enum: ["entry", "exit"] },
            vehicleId: { bsonType: "string" },
            plate: { bsonType: "string" },
            spot: { bsonType: ["string", "null"] },
            timestamp: { bsonType: "string" },
            data: { bsonType: "object" }
         }
      }
   }
});

db.createCollection('payments', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["id", "vehicleId", "amount", "status", "createdAt"],
         properties: {
            id: { bsonType: "string" },
            paymentId: { bsonType: ["string", "null"] },
            vehicleId: { bsonType: "string" },
            plate: { bsonType: "string" },
            amount: { bsonType: "number" },
            status: { enum: ["pending", "completed", "failed", "cancelled"] },
            paymentMethod: { enum: ["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH"] },
            createdAt: { bsonType: "string" },
            completedAt: { bsonType: ["string", "null"] },
            expiresAt: { bsonType: ["string", "null"] }
         }
      }
   }
});

db.createCollection('reservations', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["id", "vehicleType", "plate", "ownerName", "reservationDate", "status", "createdAt"],
         properties: {
            id: { bsonType: "string" },
            vehicleType: { enum: ["car", "motorcycle"] },
            plate: { bsonType: "string" },
            ownerName: { bsonType: "string" },
            ownerPhone: { bsonType: "string" },
            reservationDate: { bsonType: "string" },
            reservationTime: { bsonType: "string" },
            duration: { bsonType: "number" },
            spot: { bsonType: ["string", "null"] },
            status: { enum: ["pending", "confirmed", "active", "completed", "cancelled"] },
            paymentId: { bsonType: ["string", "null"] },
            amount: { bsonType: ["number", "null"] },
            createdAt: { bsonType: "string" },
            updatedAt: { bsonType: ["string", "null"] }
         }
      }
   }
});

// Create indexes for better performance
db.vehicles.createIndex({ "plate": 1 }, { unique: false });
db.vehicles.createIndex({ "status": 1 });
db.vehicles.createIndex({ "entryTime": 1 });
db.vehicles.createIndex({ "exitTime": 1 });

db.parking_spots.createIndex({ "id": 1 }, { unique: true });
db.parking_spots.createIndex({ "type": 1 });
db.parking_spots.createIndex({ "isOccupied": 1 });
db.parking_spots.createIndex({ "isReserved": 1 });

db.operations_history.createIndex({ "timestamp": -1 });
db.operations_history.createIndex({ "type": 1 });
db.operations_history.createIndex({ "plate": 1 });

db.payments.createIndex({ "vehicleId": 1 });
db.payments.createIndex({ "status": 1 });
db.payments.createIndex({ "createdAt": -1 });

db.reservations.createIndex({ "reservationDate": 1 });
db.reservations.createIndex({ "status": 1 });
db.reservations.createIndex({ "plate": 1 });

print('✅ Database initialization completed!');
print('📊 Collections created: vehicles, parking_spots, operations_history, payments, reservations');
print('🔍 Indexes created for optimal performance');