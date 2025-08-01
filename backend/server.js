// server.js

// --- 1. IMPORTS ---
// We're using Express to create our server, Mongoose to connect to our MongoDB database,
// and CORS to allow our frontend (which will be on a different URL) to talk to this backend.
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// --- 2. INITIAL SETUP ---
// Create an instance of our express application.
const app = express();
// Define the port we want our server to run on.
const PORT = process.env.PORT || 5000;

// --- 3. MIDDLEWARE ---
// These are functions that run for every request that comes into our server.
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(express.json()); // Allows our server to understand JSON data sent in request bodies

// --- 4. DATABASE CONNECTION ---
// IMPORTANT: Replace this with your own MongoDB connection string.
// You can get a free one from MongoDB Atlas (cloud.mongodb.com)
const MONGO_URI = "mongodb+srv://viistackcode:<db_password>@cluster.x3dzeus.mongodb.net/?retryWrites=true&w=majority&appName=cluster";

mongoose.connect(MONGO_URI, {
    // These options are no longer needed in recent versions of Mongoose but don't hurt to have
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
})
.then(() => console.log("Successfully connected to MongoDB!"))
.catch(err => console.error("Error connecting to MongoDB:", err));

// --- 5. DATABASE SCHEMA (THE BLUEPRINT FOR OUR DATA) ---
// This defines what a "Medicine" looks like in our database.
const medicineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true // Removes any whitespace from the beginning and end
    },
    totalQuantity: {
        type: Number,
        required: true,
        min: 0 // Quantity can't be negative
    },
    dosagePerDay: {
        type: Number,
        required: true,
        min: 1 // Must take at least 1 per day
    },
    // We will use this to calculate the current stock
    startDate: {
        type: Date,
        default: Date.now
    },
    // To track when the medicine was last restocked
    lastRestockedAt: {
        type: Date,
        default: Date.now
    },
    // We'll add user association here later
});

// Create a "Medicine" model from the schema. This is what we'll use to interact with the 'medicines' collection in MongoDB.
const Medicine = mongoose.model('Medicine', medicineSchema);


// --- 6. API ROUTES (THE ENDPOINTS OUR FRONTEND WILL CALL) ---

// A simple test route to make sure our server is running
app.get('/', (req, res) => {
    res.send('Hello from the Medicine Tracker API!');
});

/**
 * @route   POST /api/medicines
 * @desc    Add a new medicine to the tracker
 * @access  Public (for now)
 */
app.post('/api/medicines', async (req, res) => {
    try {
        // Create a new medicine instance using the data sent from the frontend (req.body)
        const newMedicine = new Medicine({
            name: req.body.name,
            totalQuantity: req.body.totalQuantity,
            dosagePerDay: req.body.dosagePerDay,
        });

        // Save the new medicine to the database
        const savedMedicine = await newMedicine.save();
        
        // Send the newly created medicine back to the frontend
        res.status(201).json(savedMedicine);

    } catch (error) {
        console.error("Error adding medicine:", error);
        res.status(500).json({ message: "Server error while adding medicine." });
    }
});

/**
 * @route   GET /api/medicines
 * @desc    Get all medicines and their current stock
 * @access  Public (for now)
 */
app.get('/api/medicines', async (req, res) => {
    try {
        const medicines = await Medicine.find(); // Fetch all medicines from DB

        // Calculate the current stock for each medicine
        const medicinesWithStock = medicines.map(med => {
            const today = new Date();
            // Use the later of the start date or the last restock date for calculation
            const calculationStartDate = new Date(Math.max(med.startDate, med.lastRestockedAt));
            
            // Calculate how many days have passed since the start/restock date
            const timeDiff = today.getTime() - calculationStartDate.getTime();
            // Round down to the nearest whole number of days
            const daysPassed = Math.floor(timeDiff / (1000 * 3600 * 24));
            
            // Calculate how many pills have been consumed
            const consumedQuantity = daysPassed * med.dosagePerDay;
            
            // Calculate the remaining stock
            const currentStock = med.totalQuantity - consumedQuantity;

            // Return a new object combining the original medicine data with the calculated stock
            // .toObject() converts the Mongoose document into a plain JavaScript object
            return {
                ...med.toObject(),
                currentStock: currentStock > 0 ? currentStock : 0, // Ensure stock doesn't go below 0
                daysLeft: currentStock > 0 ? Math.floor(currentStock / med.dosagePerDay) : 0,
            };
        });

        res.json(medicinesWithStock);

    } catch (error) {
        console.error("Error fetching medicines:", error);
        res.status(500).json({ message: "Server error while fetching medicines." });
    }
});

/**
 * @route   DELETE /api/medicines/:id
 * @desc    Delete a medicine
 * @access  Public (for now)
 */
app.delete('/api/medicines/:id', async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        await medicine.deleteOne(); // Use deleteOne() instead of remove() which is deprecated
        res.json({ message: 'Medicine removed successfully' });

    } catch (error) {
        console.error("Error deleting medicine:", error);
        res.status(500).json({ message: "Server error while deleting medicine." });
    }
});


// --- 7. START THE SERVER ---
// This command tells our app to listen on the specified port and logs a message once it's running.
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
