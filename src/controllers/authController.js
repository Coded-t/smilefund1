const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailService = require('../utils/emailService');

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
    console.log('Register attempt for:', req.body.email);
    try {
        const { fullName, email, password, phone, institution, roles } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        const userRoles = email === 'belloharuna211@gmail.com'
            ? ["Individual Personality", "Admin"]
            : (roles || ["Individual Personality"]);

        user = new User({
            name: fullName,
            email,
            password,
            phone,
            institution,
            roles: userRoles,
            otp,
            otpExpires,
            isVerified: false
        });

        await user.save();

        try {
            await emailService.sendOTP(email, otp);
        } catch (emailError) {
            console.error('Failed to send initial OTP:', emailError.message);
            // We still created the user, they can request a resend later
        }

        res.status(201).json({
            message: 'Registration successful. Please verify your email.',
            email: user.email
        });

        // Notifications
        await createInternalNotification(
            user._id,
            'Welcome to SmileFund!',
            'Thank you for joining our community.',
            'system'
        );

        // Notify Admins
        const admins = await User.find({ roles: 'Admin' });
        for (const admin of admins) {
            await createInternalNotification(
                admin._id,
                'New User Registered',
                `${user.name} (${user.email}) just joined SmileFund.`,
                'system'
            );
        }
    } catch (error) {
        console.error('Registration ERROR:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
                totalDonated: user.totalDonated || 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    res.json(req.user);
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
        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.setupPin = async (req, res) => {
    try {
        const { pin } = req.body;
        const hashedPin = await bcrypt.hash(pin, 10);
        req.user.pin = hashedPin;
        await req.user.save();
        res.json({ message: 'PIN setup successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyPin = async (req, res) => {
    try {
        const { pin } = req.body;
        if (!req.user.pin) {
            return res.status(400).json({ message: 'PIN not set' });
        }
        const isMatch = await bcrypt.compare(pin, req.user.pin);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }
        res.json({ message: 'PIN verified' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
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
                totalSaving: user.totalSaving || 0
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
