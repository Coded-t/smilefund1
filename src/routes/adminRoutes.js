const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/stats', auth, admin, adminController.getStats);
router.get('/users', auth, admin, adminController.getUsers);

module.exports = router;
