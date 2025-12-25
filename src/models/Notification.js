const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['transaction', 'campaign', 'lesson', 'security', 'system'],
        default: 'system',
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    metadata: {
        type: Object, // Link to related entity (e.g., transaction ID)
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
