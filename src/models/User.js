const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
    },
    institution: {
        type: String,
    },
    roles: {
        type: [String],
        default: ["Individual Personality"]
    },
    avatar: {
        type: String,
        default: 'https://i.pravatar.cc/150?img=11'
    },
    totalDonated: {
        type: Number,
        default: 0
    },
    totalSaving: {
        type: Number,
        default: 0
    },
    pin: {
        type: String, // Hashed PIN
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String
    },
    otpExpires: {
        type: Date
    },
    dedicatedAccount: {
        bankName: String,
        accountNumber: String,
        accountName: String,
        customerCode: String,
        assignmentCode: String
    },
    notificationPreferences: {
        pushEnabled: { type: Boolean, default: true },
        donationUpdates: { type: Boolean, default: true },
        campaignReminders: { type: Boolean, default: true },
        monthlyDonationReminder: { type: Boolean, default: true },
        savingsGoalReminders: { type: Boolean, default: true },
        savingsProgress: { type: Boolean, default: true },
        goalDeadlineAlerts: { type: Boolean, default: true },
        newLessons: { type: Boolean, default: true },
        lessonReminders: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true },
        accountActivity: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true }
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to compare PIN
userSchema.methods.comparePin = async function (candidatePin) {
    if (!this.pin) return false;
    return await bcrypt.compare(candidatePin.toString(), this.pin);
};

module.exports = mongoose.model('User', userSchema);
