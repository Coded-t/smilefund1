const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    subtitle: {
        type: String,
    },
    image: {
        type: String,
        required: true,
    },
    content: {
        type: String, // Could be markdown or HTML
    },
    likes: {
        type: Number,
        default: 0,
    },
    comments: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);
