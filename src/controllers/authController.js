const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailService = require('../utils/emailService');
const { createInternalNotification } = require('./notificationController');

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register a new user – if the email already exists we auto‑login them
exports.register = async (req, res) => {
    try {
        const { fullName, email, password, phone, institution, roles } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            // User exists – inform client to login instead of auto‑login
            return res.status(409).json({
                message: 'User already exists. Please log in.',
                // Optionally, you could include a flag to indicate the need to navigate to login page
                needLogin: true
            });
        }

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        const userRoles = email === process.env.EMAIL_USER ? ['Individual Personality', 'Admin'] : (roles || ['Individual Personality']);
        user = new User({
            name: fullName,
            email,
            password,
            phone,
            institution,
            roles: userRoles,
            otp,
            otpExpires,
            isVerified: false,
        });
        await user.save();
        // Send OTP – if it fails we clean up the created user
        try {
            await emailService.sendOTP(email, otp);
        } catch (emailError) {
            console.error('Failed to send OTP during registration:', emailError.message);
            await User.deleteOne({ _id: user._id });
            return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
        }
        res.status(201).json({
            message: 'Registration successful. Please verify your email.',
            email: user.email,
            // Indicate client to navigate to login page after registration
            nextStep: 'login',
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Sync Admin role if email matches
        if (user.email === 'belloharuna211@gmail.com' && !user.roles.includes('Admin')) {
            user.roles.push('Admin');
            await user.save();
        }

        // Check if verified
        if (!user.isVerified) {
            // Send another OTP if expired
            if (!user.otpExpires || user.otpExpires < new Date()) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                user.otp = otp;
                user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                await user.save();
                try {
                    await emailService.sendOTP(email, otp);
                } catch (e) {
                    console.error("Failed to send OTP on login attempt", e);
                }
            }
            return res.status(403).json({
                message: 'Please verify your email address. A new OTP has been sent if the previous one expired.',
                unverified: true
            });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                roles: user.roles,
                avatar: user.avatar,
                phone: user.phone,
                institution: user.institution,
                totalSaving: user.totalSaving || 0,
                totalDonated: user.totalDonated || 0,
                hasPin: !!user.pin
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userObj = user.toObject();
        userObj.hasPin = !!user.pin;
        delete userObj.password;
        delete userObj.pin;
        delete userObj.otp;
        delete userObj.otpExpires;
        res.json(userObj);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { roles, phone, institution, name, avatar, totalSaving, totalDonated } = req.body;
        const user = await User.findById(req.user._id);

        if (roles) user.roles = roles;
        if (phone) user.phone = phone;
        if (institution) user.institution = institution;
        if (name) user.name = name;
        if (avatar) user.avatar = avatar;
        if (totalSaving !== undefined) user.totalSaving = totalSaving;
        if (totalDonated !== undefined) user.totalDonated = totalDonated;
        if (req.body.notificationPreferences) {
            user.notificationPreferences = { ...user.notificationPreferences, ...req.body.notificationPreferences };
        }

        await user.save();
        const userObj = user.toObject();
        userObj.hasPin = !!user.pin;
        delete userObj.password;
        delete userObj.pin;
        res.json({ message: 'Profile updated successfully', user: userObj });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.setupPin = async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || pin.toString().length < 4) {
            return res.status(400).json({ success: false, message: 'PIN must be at least 4 digits' });
        }
        const user = await User.findById(req.user._id);
        const hashedPin = await bcrypt.hash(pin.toString(), 10);
        user.pin = hashedPin;
        await user.save();
        res.json({ success: true, message: 'PIN setup successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.verifyPin = async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin) {
            return res.status(400).json({ success: false, message: 'PIN is required' });
        }
        const user = await User.findById(req.user._id);
        if (!user.pin) {
            return res.status(400).json({ success: false, message: 'PIN not set. Please setup a PIN first.' });
        }
        const isMatch = await bcrypt.compare(pin.toString(), user.pin);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid PIN' });
        }
        res.json({ success: true, message: 'PIN verified successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({
            email,
            otp,
            otpExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                roles: user.roles,
                totalDonated: user.totalDonated || 0,
                totalSaving: user.totalSaving || 0,
                hasPin: !!user.pin
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email already verified' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await user.save();
        await emailService.sendOTP(email, otp);

        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = exports;
