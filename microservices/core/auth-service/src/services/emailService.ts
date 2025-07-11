import nodemailer from 'nodemailer';
import { logger } from '@ultramarket/shared/logging/logger';

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private getEmailTemplate(templateName: string, data: Record<string, any>): EmailTemplate {
    const templates: Record<string, EmailTemplate> = {
      'email-verification': {
        subject: 'UltraMarket - Verify Your Email',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Verify Your Email</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #007bff; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to UltraMarket!</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.firstName},</h2>
                <p>Thank you for registering with UltraMarket. To complete your registration, please verify your email address by clicking the button below:</p>
                <p style="text-align: center;">
                  <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
                </p>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p>${data.verificationUrl}</p>
                <p>This verification link will expire in 24 hours.</p>
                <p>If you didn't create an account with UltraMarket, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 UltraMarket. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Welcome to UltraMarket!
          
          Hello ${data.firstName},
          
          Thank you for registering with UltraMarket. To complete your registration, please verify your email address by visiting this link:
          
          ${data.verificationUrl}
          
          This verification link will expire in 24 hours.
          
          If you didn't create an account with UltraMarket, you can safely ignore this email.
          
          Best regards,
          The UltraMarket Team
        `
      },
      'password-reset': {
        subject: 'UltraMarket - Password Reset Request',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Password Reset</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.firstName},</h2>
                <p>We received a request to reset your password for your UltraMarket account. Click the button below to reset your password:</p>
                <p style="text-align: center;">
                  <a href="${data.resetUrl}" class="button">Reset Password</a>
                </p>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p>${data.resetUrl}</p>
                <p>This reset link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 UltraMarket. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Password Reset Request
          
          Hello ${data.firstName},
          
          We received a request to reset your password for your UltraMarket account. Please visit this link to reset your password:
          
          ${data.resetUrl}
          
          This reset link will expire in 1 hour.
          
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          
          Best regards,
          The UltraMarket Team
        `
      }
    };

    return templates[templateName] || {
      subject: 'UltraMarket Notification',
      html: '<p>No template found</p>',
      text: 'No template found'
    };
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      const template = this.getEmailTemplate(emailData.template, emailData.data);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@ultramarket.com',
        to: emailData.to,
        subject: emailData.subject || template.subject,
        html: template.html,
        text: template.text
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: emailData.to,
        template: emailData.template
      });
    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        to: emailData.to,
        template: emailData.template
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error: error.message });
      return false;
    }
  }
}

export const emailService = new EmailService();

export const sendEmail = (emailData: EmailData): Promise<void> => {
  return emailService.sendEmail(emailData);
};