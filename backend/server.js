// server.js

// --- 1. IMPORTS ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Load environment variables from .env file
dotenv.config();

// --- 2. INITIAL SETUP ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- 4. DATABASE CONNECTION ---
const MONGO_URI = `mongodb+srv://viistackcode:${process.env.MONGO_PASS}@cluster.x3dzeus.mongodb.net/?retryWrites=true&w=majority&appName=cluster`;

// IMPORTANT: Let's also move your Mongo password to the .env file for better security.
// Add a line to your .env file: MONGO_PASS=your_mongodb_password
// Then replace the MONGO_URI string above with the one provided.

mongoose.connect(MONGO_URI)
.then(() => console.log("Successfully connected to MongoDB!"))
.catch(err => console.error("Error connecting to MongoDB:", err));

// --- 5. DATABASE SCHEMA (No changes here) ---
const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    totalQuantity: { type: Number, required: true, min: 0 },
    dosagePerDay: { type: Number, required: true, min: 1 },
    startDate: { type: Date, default: Date.now },
    lastRestockedAt: { type: Date, default: Date.now },
    notificationSent: { type: Boolean, default: false } // New field to track notifications
});
const Medicine = mongoose.model('Medicine', medicineSchema);

// --- 6. EMAIL TRANSPORTER SETUP ---
// This uses the credentials from your .env file to prepare for sending emails.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- 7. NOTIFICATION LOGIC ---
const checkStockAndSendAlerts = async () => {
    console.log('Running daily stock check...');
    try {
        const medicines = await Medicine.find();
        
        for (const med of medicines) {
            const today = new Date();
            const calculationStartDate = new Date(Math.max(med.startDate, med.lastRestockedAt));
            const timeDiff = today.getTime() - calculationStartDate.getTime();
            const daysPassed = Math.floor(timeDiff / (1000 * 3600 * 24));
            const consumedQuantity = daysPassed * med.dosagePerDay;
            const currentStock = med.totalQuantity - consumedQuantity;
            const daysLeft = currentStock > 0 ? Math.floor(currentStock / med.dosagePerDay) : 0;

            // Check if stock is low (5 days or less) AND a notification hasn't been sent yet
            if (daysLeft <= 5 && !med.notificationSent) {
                console.log(`Stock for ${med.name} is low (${daysLeft} days left). Sending email...`);
                
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: process.env.EMAIL_USER, // Sending email to yourself
                    subject: `Low Stock Alert: ${med.name}`,
                    html: `
                        <h1>Medicine Stock Alert</h1>
                        <p>Hi there,</p>
                        <p>This is an automated message from your Medicine Tracker app.</p>
                        <p>Your supply of <strong>${med.name}</strong> is running low.</p>
                        <ul>
                            <li>Current Stock: <strong>${currentStock} pills</strong></li>
                            <li>Days Left: <strong>Approximately ${daysLeft} days</strong></li>
                        </ul>
                        <p>Please remember to restock soon!</p>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log(`Email sent for ${med.name}.`);

                // Mark that a notification has been sent to avoid spamming
                await Medicine.findByIdAndUpdate(med._id, { notificationSent: true });
            }
        }
    } catch (error) {
        console.error('Error during stock check:', error);
    }
};

// --- 8. SCHEDULED TASK (CRON JOB) ---
// This will run the 'checkStockAndSendAlerts' function every day at 8:00 AM.
// The format is: 'minute hour * * *'
cron.schedule('* * * * *', checkStockAndSendAlerts, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

console.log("Cron job scheduled: Daily stock check will run at 8:00 AM IST.");


// --- 9. API ROUTES (with one small change) ---

// Add a new route to handle restocking, which resets the notification flag
app.post('/api/medicines/:id/restock', async (req, res) => {
    try {
        const { newQuantity } = req.body;
        if (!newQuantity || newQuantity <= 0) {
            return res.status(400).json({ message: 'Please provide a valid new quantity.' });
        }

        const updatedMedicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            {
                totalQuantity: newQuantity,
                lastRestockedAt: new Date(), // Update restock date
                notificationSent: false, // Reset notification flag
            },
            { new: true } // Return the updated document
        );

        if (!updatedMedicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }
        res.json(updatedMedicine);
    } catch (error) {
        console.error("Error restocking medicine:", error);
        res.status(500).json({ message: "Server error while restocking." });
    }
});


// GET, POST, DELETE routes remain the same as before...
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
        const newMedicine = new Medicine({
            name: req.body.name,
            totalQuantity: req.body.totalQuantity,
            dosagePerDay: req.body.dosagePerDay,
        });
        const savedMedicine = await newMedicine.save();
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
        const medicines = await Medicine.find();
        const medicinesWithStock = medicines.map(med => {
            const today = new Date();
            const calculationStartDate = new Date(Math.max(med.startDate, med.lastRestockedAt));
            const timeDiff = today.getTime() - calculationStartDate.getTime();
            const daysPassed = Math.floor(timeDiff / (1000 * 3600 * 24));
            const consumedQuantity = daysPassed * med.dosagePerDay;
            const currentStock = med.totalQuantity - consumedQuantity;
            return {
                ...med.toObject(),
                currentStock: currentStock > 0 ? currentStock : 0,
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
        await medicine.deleteOne();
        res.json({ message: 'Medicine removed successfully' });
    } catch (error) {
        console.error("Error deleting medicine:", error);
        res.status(500).json({ message: "Server error while deleting medicine." });
    }
});


// --- 10. START THE SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
