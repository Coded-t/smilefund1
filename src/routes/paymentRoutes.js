const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.post('/initialize', auth, paymentController.initializeTransaction);
router.get('/verify/:reference', auth, paymentController.verifyTransaction);
router.get('/dedicated-account', auth, paymentController.getOrCreateDedicatedAccount);
router.get('/history', auth, paymentController.getTransactionHistory);
router.post('/webhook', paymentController.handleWebhook);


module.exports = router;
