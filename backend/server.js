// server.js

// --- 1. IMPORTS ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

// --- 2. INITIAL SETUP ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- 4. DATABASE CONNECTION ---
const MONGO_URI = `mongodb+srv://viistackcode:${process.env.MONGO_PASS}@cluster.x3dzeus.mongodb.net/?retryWrites=true&w=majority&appName=cluster`;

mongoose.connect(MONGO_URI)
.then(() => console.log("Successfully connected to MongoDB!"))
.catch(err => console.error("Error connecting to MongoDB:", err));

// --- 5. DATABASE SCHEMA (UPDATED) ---
const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    totalQuantity: { type: Number, required: true, min: 0 },
    dosagePerDay: { type: Number, required: true, min: 1 },
    startDate: { type: Date, default: Date.now },
    lastRestockedAt: { type: Date, default: Date.now },
    // NEW: This field will store the date until which notifications are paused.
    snoozedUntil: { type: Date, default: null } 
});
const Medicine = mongoose.model('Medicine', medicineSchema);

// --- 6. EMAIL TRANSPORTER SETUP ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- 7. NOTIFICATION LOGIC (UPDATED) ---
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

            // NEW LOGIC: Check if stock is low AND if it is not currently snoozed.
            const isSnoozed = med.snoozedUntil && med.snoozedUntil > today;

            if (daysLeft <= 3 && !isSnoozed) {
                console.log(`Stock for ${med.name} is low (${daysLeft} days left). Sending reminder...`);
                
                // This is the unique "magic link" for snoozing
                const snoozeLink = `http://localhost:5000/api/medicines/snooze/${med._id}`;

                const mailOptions = {
                    from: `"Medicine Tracker" <${process.env.EMAIL_USER}>`,
                    to: process.env.EMAIL_USER,
                    subject: `Reminder: Your ${med.name} stock is low!`,
                    html: `
                        <h1>Medicine Reminder</h1>
                        <p>Hi there,</p>
                        <p>This is your daily reminder that your supply of <strong>${med.name}</strong> is running low.</p>
                        <ul>
                            <li>Current Stock: <strong>${currentStock} pills</strong></li>
                            <li>Days Left: <strong>Approximately ${daysLeft} days</strong></li>
                        </ul>
                        <p>Please remember to restock soon!</p>
                        <hr>
                        <p>Once you've seen this, you can stop these reminders for one week by clicking the link below:</p>
                        <a href="${snoozeLink}" style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Snooze Alerts for 7 Days
                        </a>
                        <p style="font-size: 12px; color: #777;">(You'll get reminders again in a week if you haven't restocked.)</p>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log(`Reminder sent for ${med.name}.`);
            }
        }
    } catch (error) {
        console.error('Error during stock check:', error);
    }
};

// --- 8. SCHEDULED TASK (CRON JOB) ---
cron.schedule('* * * * *', checkStockAndSendAlerts, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});
console.log("Cron job scheduled: Daily stock check will run at 8:00 AM IST.");


// --- 9. API ROUTES (UPDATED) ---

// NEW SNOOZE ROUTE: This is where the magic link in the email leads.
app.get('/api/medicines/snooze/:id', async (req, res) => {
    try {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        await Medicine.findByIdAndUpdate(req.params.id, { snoozedUntil: sevenDaysFromNow });

        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #28a745;">Success!</h1>
                <p>Reminders for this medicine have been snoozed for 7 days.</p>
                <p>You can now close this window.</p>
            </div>
        `);
    } catch (error) {
        res.status(500).send('An error occurred. Please try again.');
    }
});

// UPDATED RESTOCK ROUTE: Now it also resets the snooze date.
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
                lastRestockedAt: new Date(),
                snoozedUntil: null, // Reset the snooze date so alerts can be sent again
            },
            { new: true }
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

// --- Other routes (GET, POST, DELETE) remain the same ---
app.get('/', (req, res) => { res.send('Hello from the Medicine Tracker API!'); });
app.post('/api/medicines', async (req, res) => {
    try {
        const newMedicine = new Medicine({
            name: req.body.name,
            totalQuantity: req.body.totalQuantity,
            dosagePerDay: req.body.dosagePerDay,
        });
        const savedMedicine = await newMedicine.save();
        res.status(201).json(savedMedicine);
    } catch (error) { res.status(500).json({ message: "Server error while adding medicine." }); }
});
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
    } catch (error) { res.status(500).json({ message: "Server error while fetching medicines." }); }
});
app.delete('/api/medicines/:id', async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) { return res.status(404).json({ message: 'Medicine not found' }); }
        await medicine.deleteOne();
        res.json({ message: 'Medicine removed successfully' });
    } catch (error) { res.status(500).json({ message: "Server error while deleting medicine." }); }
});

// --- 10. START THE SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
