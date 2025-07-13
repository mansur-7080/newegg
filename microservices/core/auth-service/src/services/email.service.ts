/**
 * Email Service
 * Professional email sending with templates and queue management
 */

import { logger } from '../utils/logger';
import { JWTService } from './jwt.service';
import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

export class EmailService {
  private jwtService: JWTService;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.jwtService = new JWTService();
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (process.env.NODE_ENV === 'production') {
      // Production SMTP configuration
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    } else {
      // Development - use Ethereal for testing
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'ethereal.pass',
        },
      });
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, firstName: string): Promise<void> {
    try {
      const verificationToken = this.jwtService.generateEmailVerificationToken(email);
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      logger.info('Sending verification email', {
        email,
        firstName,
        verificationLink,
        userId: 'user_id_placeholder',
      });

      await this.sendEmail({
        to: email,
        subject: 'Email manzilingizni tasdiqlang - UltraMarket',
        template: 'email-verification',
        data: {
          firstName,
          verificationLink,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@ultramarket.uz',
        },
      });

      logger.info('Verification email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send verification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<void> {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      logger.info('Sending password reset email', {
        email,
        firstName,
        resetLink,
      });

      await this.sendEmail({
        to: email,
        subject: 'Parolni tiklash - UltraMarket',
        template: 'password-reset',
        data: {
          firstName,
          resetLink,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@ultramarket.uz',
        },
      });

      logger.info('Password reset email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send password reset email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      logger.info('Sending welcome email', {
        email,
        firstName,
      });

      await this.sendEmail({
        to: email,
        subject: 'Xush kelibsiz - UltraMarket',
        template: 'welcome',
        data: {
          firstName,
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@ultramarket.uz',
        },
      });

      logger.info('Welcome email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send welcome email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    email: string,
    subject: string,
    message: string,
    firstName?: string
  ): Promise<void> {
    try {
      logger.info('Sending notification email', {
        email,
        subject,
        firstName,
      });

      await this.sendEmail({
        to: email,
        subject,
        template: 'notification',
        data: {
          firstName: firstName || 'Foydalanuvchi',
          message,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@ultramarket.uz',
        },
      });

      logger.info('Notification email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send notification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Send email with template
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const html = await this.renderTemplate(options.template, options.data);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@ultramarket.uz',
        to: options.to,
        subject: options.subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      // Log preview URL for development
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Email preview URL:', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });
      throw error;
    }
  }

  /**
   * Render email template
   */
  private async renderTemplate(templateName: string, data: any): Promise<string> {
    try {
      const templatePath = join(__dirname, '../templates', `${templateName}.html`);
      let template = readFileSync(templatePath, 'utf8');

      // Simple template replacement
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, data[key]);
      });

      return template;
    } catch (error) {
      logger.error('Failed to render email template', {
        error: error instanceof Error ? error.message : 'Unknown error',
        templateName,
      });
      
      // Fallback to simple HTML template
      return this.getFallbackTemplate(templateName, data);
    }
  }

  /**
   * Fallback template when file template is not found
   */
  private getFallbackTemplate(templateName: string, data: any): string {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>UltraMarket</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #1890ff; font-size: 24px; font-weight: bold; }
          .content { margin-bottom: 30px; }
          .button { display: inline-block; background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">UltraMarket</div>
          </div>
          <div class="content">
            {{content}}
          </div>
          <div class="footer">
            <p>Bu email avtomatik yuborilgan. Javob bermang.</p>
            <p>Savol va takliflar uchun: {{supportEmail}}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    let content = '';
    switch (templateName) {
      case 'email-verification':
        content = `
          <h2>Salom ${data.firstName}!</h2>
          <p>UltraMarket platformasiga xush kelibsiz!</p>
          <p>Email manzilingizni tasdiqlash uchun quyidagi tugmani bosing:</p>
          <a href="${data.verificationLink}" class="button">Email ni tasdiqlash</a>
          <p>Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:</p>
          <p>${data.verificationLink}</p>
        `;
        break;
      case 'password-reset':
        content = `
          <h2>Salom ${data.firstName}!</h2>
          <p>Parolni tiklash uchun so'rov yuborildi.</p>
          <p>Yangi parol o'rnatish uchun quyidagi tugmani bosing:</p>
          <a href="${data.resetLink}" class="button">Parolni tiklash</a>
          <p>Agar bu so'rov siz tomondan yuborilmagan bo'lsa, bu emailni e'tiborsiz qoldiring.</p>
        `;
        break;
      case 'welcome':
        content = `
          <h2>Xush kelibsiz ${data.firstName}!</h2>
          <p>UltraMarket platformasiga muvaffaqiyatli ro'yxatdan o'tdingiz!</p>
          <p>Endi siz platformaning barcha imkoniyatlaridan foydalanishingiz mumkin.</p>
          <a href="${data.loginUrl}" class="button">Platformaga kirish</a>
        `;
        break;
      default:
        content = `
          <h2>Salom ${data.firstName}!</h2>
          <p>${data.message}</p>
        `;
    }

    return baseTemplate.replace('{{content}}', content).replace('{{supportEmail}}', data.supportEmail);
  }

  /**
   * Test email service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection successful');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}
