const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    subtitle: {
        type: String,
    },
    raised: {
        type: Number,
        default: 0,
    },
    needed: {
        type: Number,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
