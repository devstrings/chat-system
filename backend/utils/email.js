// server/utils/email.js
import nodemailer from "nodemailer";
import config from "../config/index.js";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error(" Email configuration error:", error);
  } else {
    console.log(" Email service ready");
  }
});

export const sendPasswordResetEmail = async (email, resetUrl, username) => {
  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: "Password Reset Request - Chat System",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; 
                    color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1> Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${username}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <div class="warning">
              <strong> Security Notice:</strong>
              <ul>
                <li>This link will expire in <strong>${config.resetToken.expiryMinutes} minutes</strong></li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            
            <p>Thanks,<br>The Chat System Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(" Password reset email sent to:", email);
    return true;
  } catch (error) {
    console.error(" Email sending failed:", error);
    throw new Error("Failed to send reset email");
  }
};

export const sendPasswordSetConfirmation = async (email, username) => {
  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: "Password Set Successfully - Chat System",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1> Password Set Successfully</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${username}</strong>,</p>
            
            <div class="success">
              <strong>Great news!</strong> You've successfully set a password for your account.
            </div>
            
            <p>You can now login using:</p>
            <ul>
              <li>Email and Password</li>
              <li>Your social accounts (Google/Facebook)</li>
            </ul>
            
            <p>If you didn't make this change, please contact support immediately.</p>
            
            <p>Thanks,<br>The Chat System Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(" Password set confirmation sent to:", email);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};