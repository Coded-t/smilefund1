const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

const authRoutes = require('./authRoutes');
const lessonRoutes = require('./lessonRoutes');
const goalRoutes = require('./goalRoutes');
const campaignRoutes = require('./campaignRoutes');
const paymentRoutes = require('./paymentRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');

// Health check
router.get('/health', healthController.check);

router.use('/auth', authRoutes);
router.use('/lessons', lessonRoutes);
router.use('/goals', goalRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);


module.exports = router;
