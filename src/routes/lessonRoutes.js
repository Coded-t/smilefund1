const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', lessonController.getAllLessons);
router.get('/:id', lessonController.getLessonById);
router.post('/', auth, admin, lessonController.createLesson);

module.exports = router;
