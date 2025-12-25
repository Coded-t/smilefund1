const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

exports.sendOTP = async (email, otp) => {
    const mailOptions = {
        from: `"SmileFund" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Wave of Care - Email Verification',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #104E8B; text-align: center;">Welcome to SmileFund!</h2>
                <p>Hello,</p>
                <p>Thank you for signing up for SmileFund. Please use the following One-Time Password (OTP) to verify your email address:</p>
                <div style="background-color: #f4f8ff; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <span style="font-size: 24px; font-weight: bold; color: #104E8B; letter-spacing: 5px;">${otp}</span>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888888; text-align: center;">&copy; 2025 SmileFund. All rights reserved.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}`);
    } catch (error) {
        console.error('Email sending error:', error);
        throw new Error('Failed to send verification email');
    }
};
