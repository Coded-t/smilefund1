const express = require('express');
const cors = require('cors');
const routes = require('./routes');

let helmet;
try {
    helmet = require('helmet');
} catch (e) {
    console.log('Note: helmet not installed, proceeding with default headers');
}

let rateLimit;
try {
    rateLimit = require('express-rate-limit');
} catch (e) {
    console.log('Note: express-rate-limit not installed, proceeding without rate limiter');
}

const app = express();

// Security Headers
if (helmet) {
    app.use(helmet());
}

// CORS Policy
app.use(cors());

// Global Rate Limiter (100 requests per 15 minutes per IP)
if (rateLimit) {
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 150,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
    });
    app.use('/api', globalLimiter);
}

// Body parsers
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl.endsWith('/webhook')) {
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;
