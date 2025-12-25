const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', campaignController.getAllCampaigns);
router.post('/', auth, admin, campaignController.createCampaign);
router.post('/:id/donate', auth, campaignController.donateToCampaign);

module.exports = router;
