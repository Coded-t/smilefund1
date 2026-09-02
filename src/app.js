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

// Trust reverse proxies (Render, Heroku, Cloudflare, Nginx)
app.set('trust proxy', 1);

// Security Headers
if (helmet) {
    app.use(helmet());
}

// CORS Policy
app.use(cors());

// Global Rate Limiter (300 requests per 1 minute per IP)
if (rateLimit) {
    const globalLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        validate: { xForwardedForHeader: false },
        message: { message: 'Too many requests from this IP, please try again after 1 minute.' }
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
