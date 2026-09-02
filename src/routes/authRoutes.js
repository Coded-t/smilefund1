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

// Strict limiter for authentication & OTP (max 10 requests per 15 minutes)
const authLimiter = rateLimit
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' }
    })
    : (req, res, next) => next();

// Strict limiter for PIN verification (max 5 attempts per 5 minutes)
const pinLimiter = rateLimit
    ? rateLimit({
        windowMs: 5 * 60 * 1000,
        max: 5,
        message: { message: 'Too many incorrect PIN attempts. Locked for 5 minutes.' }
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
