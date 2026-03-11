import nodemailer from "nodemailer";
import config from "#config/index";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

export const sendOTPEmail = async (email, otp) => {
  await transporter.sendMail({
    from: config.email.from,
    to: email,
    subject: "Email Verification OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Verify Your Email</h2>
        <p>Your OTP code is:</p>
        <h1 style="color: #4F46E5; font-size: 48px; letter-spacing: 8px;">${otp}</h1>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};