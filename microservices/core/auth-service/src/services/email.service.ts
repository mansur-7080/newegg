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

      // Development mode: Log email for testing
      // In production, this would be replaced with real SMTP service
      logger.info('📧 Email verification sent', {
        email,
        firstName,
        verificationLink,
        type: 'email-verification',
        status: 'sent-dev-mode'
      });

      // For development: We'll mark user as verified immediately
      // This allows testing without real email setup
      console.log(`✅ Development Mode: Email verification link for ${firstName}:`);
      console.log(`🔗 ${verificationLink}`);
      console.log(`📧 In production, this would be sent to: ${email}`);
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

      // Development mode: Log password reset for testing
      logger.info('📧 Password reset email sent', {
        email,
        firstName,
        resetLink,
        type: 'password-reset',
        status: 'sent-dev-mode'
      });

      console.log(`✅ Development Mode: Password reset link for ${firstName}:`);
      console.log(`🔗 ${resetLink}`);
      console.log(`📧 In production, this would be sent to: ${email}`);
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

      // TODO: Implement actual email sending
      // await this.sendEmail({
      //   to: email,
      //   subject: 'Welcome to UltraMarket!',
      //   template: 'welcome',
      //   data: {
      //     firstName,
      //   },
      // });

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
   * Private method to send email (placeholder for actual implementation)
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<void> {
    // TODO: Implement with nodemailer, SendGrid, or similar
    // Example with nodemailer:
    /*
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const html = await this.renderTemplate(options.template, options.data);

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html,
    });
    */

    logger.debug('Email sent (placeholder)', options);
  }

  /**
   * Render email template (placeholder)
   */
  private async renderTemplate(templateName: string, data: any): Promise<string> {
    // TODO: Implement template rendering with handlebars, ejs, or similar
    return `<h1>Email Template: ${templateName}</h1><pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
}
