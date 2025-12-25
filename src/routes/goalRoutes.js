const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const auth = require('../middleware/auth');

router.get('/', auth, goalController.getGoals);
router.post('/', auth, goalController.createGoal);
router.get('/:id', auth, goalController.getGoalById);
router.put('/:id', auth, goalController.updateGoal);

module.exports = router;
