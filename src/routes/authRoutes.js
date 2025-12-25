const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.get('/profile', auth, authController.getProfile);
router.post('/profile/update', auth, authController.updateProfile);
router.post('/pin/setup', auth, authController.setupPin);
router.post('/pin/verify', auth, authController.verifyPin);
router.post('/change-password', auth, authController.changePassword);

module.exports = router;
