const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5000;

// Enable cross-origin resource sharing and JSON body translation
app.use(cors());
app.use(express.json());

// Initialize SQLite database connection
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Database connection error:', err.message);
    else console.log('Connected to the unified travel SQL database.');
});

// Setup unified schema tables for inventory and user bookings
db.serialize(() => {
    // Inventory table tracking travel modes
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT CHECK(type IN ('flight', 'bus', 'train', 'car', 'bike', 'taxi', 'ecycle')),
        provider TEXT,
        origin TEXT,
        destination TEXT,
        price REAL,
        availability_status TEXT
    )`);

    // Unified booking ledger
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventory_id INTEGER,
        passenger_name TEXT,
        booking_date TEXT,
        FOREIGN KEY(inventory_id) REFERENCES inventory(id)
    )`);

    // Inject foundational mock search records if empty
    db.get("SELECT COUNT(*) as count FROM inventory", [], (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO inventory (type, provider, origin, destination, price, availability_status) VALUES (?, ?, ?, ?, ?, ?)");
            stmt.run("flight", "Skyline Airways", "New York", "London", 450.00, "Available");
            stmt.run("train", "Express Rail", "Paris", "Amsterdam", 85.00, "Available");
            stmt.run("bus", "Metro Transit", "Boston", "New York", 30.00, "Available");
            stmt.run("car", "Drive Rent", "Airport Station", "Downtown", 65.00, "Available");
            stmt.run("bike", "City Wheel Co", "Zone A", "Zone B", 12.00, "Available");
            stmt.run("taxi", "Yellow Cab", "Terminal 1", "Hotel District", 45.00, "Available");
            stmt.run("ecycle", "EcoVolt Loops", "Station 4", "Station 9", 5.50, "Available");
            stmt.finalize();
        }
    });
});

// ROUTE 1: Global inventory search filter across all types
app.get('/api/search', (req, requireResponse) => {
    const { type, origin } = req.query;
    let query = "SELECT * FROM inventory WHERE availability_status = 'Available'";
    let params = [];

    if (type) {
        query += " AND type = ?";
        params.push(type);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            requireResponse.status(500).json({ error: err.message });
            return;
        }
        requireResponse.json(rows);
    });
});

// ROUTE 2: Unified secure transaction router
app.post('/api/book', (req, requireResponse) => {
    const { inventoryId, passengerName } = req.body;
    
    if (!inventoryId || !passengerName) {
        return requireResponse.status(400).json({ error: "Missing identity credentials or target schedule index." });
    }

    const today = new Date().toISOString().split('T')[0];
    const insertStmt = db.prepare("INSERT INTO bookings (inventory_id, passenger_name, booking_date) VALUES (?, ?, ?)");
    
    insertStmt.run(inventoryId, passengerName, today, function(err) {
        if (err) {
            return requireResponse.status(500).json({ error: err.message });
        }
        requireResponse.status(201).json({
            message: "Booking successfully locked and reserved.",
            bookingId: this.lastID
        });
    });
    insertStmt.finalize();
});

app.listen(PORT, () => console.log(`Travel API engine live on http://localhost:${PORT}`));
