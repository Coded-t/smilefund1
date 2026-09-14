require('dotenv').config();
const https = require('https');
const nodemailer = require('nodemailer');

// Helper to send email via Brevo REST API (HTTPS port 443 - bypasses all SMTP blocks)
function sendBrevoEmail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender: {
        name: 'SmileFund',
        email: process.env.EMAIL_USER || 'myappsmilefund@gmail.com',
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    });

    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body || '{}'));
          } catch (e) {
            resolve({});
          }
        } else {
          reject(new Error(`Brevo HTTP API error (${res.statusCode}): ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

// Nodemailer SMTP Transporter Fallback
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

if (process.env.BREVO_API_KEY) {
  console.log('⚡ Brevo HTTP API is configured for sending transactional emails.');
} else {
  transporter.verify(function (error) {
    if (error) {
      console.warn('🚨 SMTP Transporter verification failed:', error.message);
      console.log('💡 Tip: Set BREVO_API_KEY in .env / Render environment variables to send via HTTPS!');
    } else {
      console.log('✅ SMTP Transporter is ready.');
    }
  });
}

/**
 * Send OTP email to user using Brevo HTTP API (or Nodemailer SMTP fallback).
 * @param {string} email - Recipient email address
 * @param {string} otp - One-time password
 */
exports.sendOTP = async (email, otp) => {
  console.log(`\n==================================================`);
  console.log(`🔑 [OTP CODE FOR ${email}]: ${otp}`);
  console.log(`==================================================\n`);

  const htmlContent = `
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
  `;

  // 1. Try Brevo HTTP API first if key exists
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await sendBrevoEmail({
        to: email,
        subject: 'Smile Fund - Email Verification',
        html: htmlContent,
      });
      console.log(`[OTP SENT via Brevo API] Delivered to ${email}:`, res);
      return;
    } catch (err) {
      console.error(`⚠️ Brevo API delivery failed for ${email}:`, err.message);
    }
  }

  // 2. Try Nodemailer SMTP fallback
  try {
    await transporter.sendMail({
      from: `"SmileFund" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Smile Fund - Email Verification',
      html: htmlContent,
    });
    console.log(`[OTP SENT via SMTP] Delivered to ${email}`);
  } catch (err) {
    console.error(`⚠️ SMTP delivery failed for ${email}:`, err.message);
    if (process.env.NODE_ENV === 'production' && process.env.REQUIRE_REAL_EMAIL === 'true') {
      throw err;
    } else {
      console.log(`ℹ️ Fallback active: Use the OTP printed in terminal above for testing.`);
    }
  }
};
