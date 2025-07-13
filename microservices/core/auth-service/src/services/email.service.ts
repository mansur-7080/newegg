/**
 * Email Service
 * Professional email sending with templates and queue management
 */

import { PrismaClient } from '@prisma/client';
import { JWTService } from './jwt.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

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

      // Generate verification link
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

      logger.info('Email verification link generated', {
        email,
        firstName,
        userId: user.id,
        verificationLink,
        service: 'email-service',
        operation: 'email_verification'
      });

      // Send actual email
      await this.sendEmail({
        to: email,
        subject: 'Verify your email address',
        template: 'email-verification',
        data: {
          firstName,
          verificationLink,
        },
      });

    } catch (error) {
      logger.error('Failed to send verification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        service: 'email-service',
        operation: 'email_verification'
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

      logger.info('Password reset email link generated', {
        email,
        firstName,
        resetLink,
        service: 'email-service',
        operation: 'password_reset'
      });

      // Send actual email
      await this.sendEmail({
        to: email,
        subject: 'Reset your password',
        template: 'password-reset',
        data: {
          firstName,
          resetLink,
        },
      });

    } catch (error) {
      logger.error('Failed to send password reset email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        service: 'email-service',
        operation: 'password_reset'
      });
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      logger.info('Welcome email initiated', {
        email,
        firstName,
        service: 'email-service',
        operation: 'welcome_email'
      });

      // Send actual email
      await this.sendEmail({
        to: email,
        subject: 'Welcome to UltraMarket!',
        template: 'welcome',
        data: {
          firstName,
        },
      });

      logger.info('Welcome email sent successfully', {
        email,
        firstName,
        service: 'email-service',
        operation: 'welcome_email'
      });

    } catch (error) {
      logger.error('Failed to send welcome email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        service: 'email-service',
        operation: 'welcome_email'
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
      logger.info('Notification email initiated', {
        email,
        subject,
        firstName,
        service: 'email-service',
        operation: 'notification_email'
      });

      // Send actual email
      await this.sendEmail({
        to: email,
        subject,
        template: 'notification',
        data: {
          firstName: firstName || 'User',
          message,
        },
      });

      logger.info('Notification email sent successfully', {
        email,
        subject,
        firstName,
        service: 'email-service',
        operation: 'notification_email'
      });

    } catch (error) {
      logger.error('Failed to send notification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        subject,
        service: 'email-service',
        operation: 'notification_email'
      });
      throw error;
    }
  }

  /**
   * Private method to send email using configured email service
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<void> {
    try {
      // Check if email service is configured
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('Email service not configured, skipping email send', {
          to: options.to,
          subject: options.subject,
          service: 'email-service',
          operation: 'send_email'
        });
        return;
      }

      // Import nodemailer dynamically to avoid issues if not installed
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const html = await this.renderTemplate(options.template, options.data);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html,
      });

      logger.debug('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        template: options.template,
        service: 'email-service',
        operation: 'send_email'
      });

    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
        service: 'email-service',
        operation: 'send_email'
      });
      throw error;
    }
  }

  /**
   * Render email template using configured template engine
   */
  private async renderTemplate(templateName: string, data: any): Promise<string> {
    try {
      // Check if template engine is configured
      if (!process.env.TEMPLATE_ENGINE) {
        // Fallback to simple HTML template
        return this.generateSimpleHTML(templateName, data);
      }

      // Import template engine dynamically
      const templateEngine = await import(process.env.TEMPLATE_ENGINE);
      
      // Render template based on engine type
      switch (process.env.TEMPLATE_ENGINE) {
        case 'handlebars':
          return templateEngine.compile(this.getTemplateContent(templateName))(data);
        case 'ejs':
          return templateEngine.render(this.getTemplateContent(templateName), data);
        default:
          return this.generateSimpleHTML(templateName, data);
      }

    } catch (error) {
      logger.warn('Template rendering failed, using fallback', {
        templateName,
        error: error instanceof Error ? error.message : 'Unknown error',
        service: 'email-service',
        operation: 'render_template'
      });
      
      return this.generateSimpleHTML(templateName, data);
    }
  }

  /**
   * Generate simple HTML template as fallback
   */
  private generateSimpleHTML(templateName: string, data: any): string {
    const baseHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UltraMarket</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UltraMarket</h1>
          </div>
          <div class="content">
            ${this.getTemplateContent(templateName, data)}
          </div>
          <div class="footer">
            <p>&copy; 2024 UltraMarket. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return baseHTML;
  }

  /**
   * Get template content based on template name
   */
  private getTemplateContent(templateName: string, data?: any): string {
    switch (templateName) {
      case 'email-verification':
        return `
          <h2>Verify Your Email Address</h2>
          <p>Hello ${data?.firstName || 'there'},</p>
          <p>Thank you for signing up with UltraMarket. Please verify your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="${data?.verificationLink}" class="button">Verify Email</a>
          </p>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p>${data?.verificationLink}</p>
          <p>This link will expire in 24 hours.</p>
        `;

      case 'password-reset':
        return `
          <h2>Reset Your Password</h2>
          <p>Hello ${data?.firstName || 'there'},</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${data?.resetLink}" class="button">Reset Password</a>
          </p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        `;

      case 'welcome':
        return `
          <h2>Welcome to UltraMarket!</h2>
          <p>Hello ${data?.firstName || 'there'},</p>
          <p>Welcome to UltraMarket! We're excited to have you on board.</p>
          <p>Start exploring our products and enjoy your shopping experience!</p>
        `;

      case 'notification':
        return `
          <h2>${data?.subject || 'Notification'}</h2>
          <p>Hello ${data?.firstName || 'there'},</p>
          <p>${data?.message || 'You have a new notification.'}</p>
        `;

      default:
        return `
          <h2>UltraMarket Notification</h2>
          <p>Hello ${data?.firstName || 'there'},</p>
          <p>You have a new notification from UltraMarket.</p>
        `;
    }
  }
}
