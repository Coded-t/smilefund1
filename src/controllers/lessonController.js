const Lesson = require('../models/Lesson');
const User = require('../models/User');
const { createInternalNotification } = require('./notificationController');

exports.getAllLessons = async (req, res) => {
    try {
        const lessons = await Lesson.find();
        res.json(lessons);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getLessonById = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }
        res.json(lesson);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createLesson = async (req, res) => {
    try {
        const lesson = new Lesson(req.body);
        await lesson.save();
        res.status(201).json(lesson);

        // Notify all users about the new lesson
        const users = await User.find({ "notificationPreferences.newLessons": { $ne: false } });
        for (const user of users) {
            await createInternalNotification(
                user._id,
                'New Lesson Available',
                `A new lesson "${lesson.title}" has been published.`,
                'lesson',
                { lessonId: lesson._id }
            );
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
