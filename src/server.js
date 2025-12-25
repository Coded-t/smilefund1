require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smilefund';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');

        // Help user find their public IP for Paystack whitelisting
        const https = require('https');
        https.get('https://api.ipify.org', (res) => {
            res.on('data', (ip) => {
                console.log('--------------------------------------------------');
                console.log(`SERVER PUBLIC IP: ${ip}`);
                console.log('USE THIS IP FOR PAYSTACK WHITELISTING');
                console.log('--------------------------------------------------');
            });
        }).on('error', (err) => {
            console.log('Note: Could not fetch public IP for whitelisting advice.');
        });

        // Start server only after DB connection
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        // Start server anyway for now (optional, but good for testing without DB)
        console.log('Starting server without DB connection...');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} (No DB)`);
        });
    });
