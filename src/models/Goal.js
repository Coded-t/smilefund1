const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    saved: {
        type: Number,
        default: 0,
    },
    target: {
        type: Number,
        required: true,
    },
    dueDate: {
        type: Date,
    },
    isAutoSave: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
