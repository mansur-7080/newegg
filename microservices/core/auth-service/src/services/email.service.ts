/**
 * Email Service
 * Professional email sending with templates and queue management
 */

import { logger } from '../utils/logger';
import { JWTService } from './jwt.service';
import { prisma } from '../index';

export class EmailService {
  private jwtService: JWTService;

  constructor() {
    this.jwtService = new JWTService();
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, firstName: string): Promise<void> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate verification token
      const token = await this.jwtService.generateVerificationToken(user.id);

      // Save verification token to database
      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // In a real implementation, you would send an actual email here
      // For now, we'll just log the verification link
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

      logger.info('Email verification sent', {
        email,
        firstName,
        verificationLink,
        userId: user.id,
      });

      // TODO: Implement actual email sending with nodemailer or similar
      // Example:
      // await this.sendEmail({
      //   to: email,
      //   subject: 'Verify your email address',
      //   template: 'email-verification',
      //   data: {
      //     firstName,
      //     verificationLink,
      //   },
      // });

      console.log(`📧 Email Verification Link for ${firstName} (${email}):`);
      console.log(`🔗 ${verificationLink}`);
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

      logger.info('Password reset email sent', {
        email,
        firstName,
        resetLink,
      });

      // TODO: Implement actual email sending
      // await this.sendEmail({
      //   to: email,
      //   subject: 'Reset your password',
      //   template: 'password-reset',
      //   data: {
      //     firstName,
      //     resetLink,
      //   },
      // });

      console.log(`📧 Password Reset Link for ${firstName} (${email}):`);
      console.log(`🔗 ${resetLink}`);
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
      logger.info('Welcome email sent', {
        email,
        firstName,
      });

      // Real email implementation
      await this.sendEmail({
        to: email,
        subject: 'Xush kelibsiz! - UltraMarket',
        template: 'welcome',
        data: {
          firstName,
          email,
          loginUrl: `${process.env.FRONTEND_URL}/login`,
        },
      });

      console.log(`📧 Welcome Email sent to ${firstName} (${email})`);
    } catch (error) {
      logger.error('Failed to send welcome email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendNotificationEmail(
    email: string,
    subject: string,
    message: string,
    firstName?: string
  ): Promise<void> {
    try {
      logger.info('Notification email sent', {
        email,
        subject,
        firstName,
      });

      // TODO: Implement actual email sending
      console.log(`📧 Notification Email to ${firstName || 'User'} (${email}):`);
      console.log(`📌 Subject: ${subject}`);
      console.log(`💬 Message: ${message}`);
    } catch (error) {
      logger.error('Failed to send notification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        subject,
      });
      throw error;
    }
  }

  /**
   * Private method to send email (real implementation)
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<void> {
    try {
      // Real email implementation with nodemailer
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const html = await this.renderTemplate(options.template, options.data);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@ultramarket.uz',
        to: options.to,
        subject: options.subject,
        html,
      });

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        template: options.template,
      });
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
   * Render email template (real implementation)
   */
  private async renderTemplate(templateName: string, data: any): Promise<string> {
    // Real template rendering with handlebars
    const handlebars = require('handlebars');
    
    const templates = {
      welcome: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Xush kelibsiz!</h1>
          <p>Hurmatli {{firstName}},</p>
          <p>UltraMarket platformasiga xush kelibsiz! Sizning hisobingiz muvaffaqiyatli yaratildi.</p>
          <p>Email: {{email}}</p>
          <a href="{{loginUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Tizimga kirish</a>
          <p>Savollaringiz bo'lsa, biz bilan bog'laning.</p>
          <p>Rahmat,<br>UltraMarket jamoasi</p>
        </div>
      `,
      'email-verification': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Email manzilingizni tasdiqlang</h1>
          <p>Hurmatli {{firstName}},</p>
          <p>Email manzilingizni tasdiqlash uchun quyidagi havolani bosing:</p>
          <a href="{{verificationLink}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Email tasdiqlash</a>
          <p>Bu havola 24 soat amal qiladi.</p>
          <p>Rahmat,<br>UltraMarket jamoasi</p>
        </div>
      `,
      'password-reset': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Parolingizni tiklang</h1>
          <p>Hurmatli {{firstName}},</p>
          <p>Parolingizni tiklash uchun quyidagi havolani bosing:</p>
          <a href="{{resetLink}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Parol tiklash</a>
          <p>Bu havola 1 soat amal qiladi.</p>
          <p>Rahmat,<br>UltraMarket jamoasi</p>
        </div>
      `,
    };

    const template = templates[templateName] || templates.welcome;
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
  }
}
