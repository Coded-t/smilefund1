const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { createInternalNotification } = require('./notificationController');

exports.getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find();
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const campaign = new Campaign(req.body);
        await campaign.save();
        res.status(201).json(campaign);

        // Notify users about new campaign
        const users = await User.find({ "notificationPreferences.campaignReminders": { $ne: false } });
        for (const user of users) {
            await createInternalNotification(
                user._id,
                'New Campaign Started',
                `Help us with our new campaign: "${campaign.title}"`,
                'campaign',
                { campaignId: campaign._id }
            );
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.donateToCampaign = async (req, res) => {
    try {
        const { amount } = req.body;
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        campaign.raised += amount;
        await campaign.save();

        // Also update user's total donated
        req.user.totalDonated += amount;
        await req.user.save();

        res.json(campaign);

        // Notify user
        await createInternalNotification(
            req.user._id,
            'Donation Successful',
            `Thank you for donating Le ${amount.toLocaleString()} to "${campaign.title}"!`,
            'campaign'
        );

        // Notify admins
        const admins = await User.find({ roles: 'Admin' });
        for (const admin of admins) {
            await createInternalNotification(
                admin._id,
                'New Campaign Donation',
                `${req.user.name} donated Le ${amount.toLocaleString()} to "${campaign.title}".`,
                'campaign'
            );
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
