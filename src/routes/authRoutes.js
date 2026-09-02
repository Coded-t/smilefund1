const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

let rateLimit;
try {
    rateLimit = require('express-rate-limit');
} catch (e) {
    // fallback
}

// Limiter for authentication & OTP (max 30 requests per 1 minute)
const authLimiter = rateLimit
    ? rateLimit({
        windowMs: 60 * 1000,
        max: 30,
        validate: { xForwardedForHeader: false },
        message: { message: 'Too many authentication attempts. Please try again in 1 minute.' }
    })
    : (req, res, next) => next();

// Limiter for PIN verification (max 10 attempts per 1 minute)
const pinLimiter = rateLimit
    ? rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        validate: { xForwardedForHeader: false },
        message: { message: 'Too many incorrect PIN attempts. Please try again in 1 minute.' }
    })
    : (req, res, next) => next();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/verify-otp', authLimiter, authController.verifyOTP);
router.post('/resend-otp', authLimiter, authController.resendOTP);
router.get('/profile', auth, authController.getProfile);
router.post('/profile/update', auth, authController.updateProfile);
router.post('/pin/setup', auth, authController.setupPin);
router.post('/pin/verify', auth, pinLimiter, authController.verifyPin);
router.post('/change-password', auth, authLimiter, authController.changePassword);

module.exports = router;
