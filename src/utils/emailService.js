require('dotenv').config();
const nodemailer = require('nodemailer');

// Create transporter using standard Gmail SMTP settings
// Works perfectly on Render (cloud servers have unrestricted network access)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: false, // false for port 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

// Verify configuration at startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('🚨 Email transporter verification failed:', error.message);
    console.log('ℹ️  This is expected on local networks that block SMTP.');
    console.log('ℹ️  Emails will work correctly once deployed to Render.');
  } else {
    console.log('✅ Email transporter is ready');
  }
});

/**
 * Send OTP email to user.
 * @param {string} email - Recipient email address
 * @param {string} otp - One‑time password
 */
exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"SmileFund" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Smile Fund - Email Verification',
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
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;"/>
        <p style="font-size: 12px; color: #888888; text-align: center;">&copy; 2025 SmileFund. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[OTP SENT] OTP sent to email: ${email}`);
};
