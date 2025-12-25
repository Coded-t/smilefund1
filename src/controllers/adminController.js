const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Goal = require('../models/Goal');

exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalCampaigns = await Campaign.countDocuments();
        const totalGoals = await Goal.countDocuments();

        const allUsers = await User.find();
        const totalSavings = allUsers.reduce((sum, user) => sum + (user.totalSaving || 0), 0);
        const totalDonated = allUsers.reduce((sum, user) => sum + (user.totalDonated || 0), 0);

        res.json({
            totalUsers,
            totalCampaigns,
            totalGoals,
            totalSavings,
            totalDonated
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({}, '-password -otp -otpExpires').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
