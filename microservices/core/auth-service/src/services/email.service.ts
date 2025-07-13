/**
 * Email Service
 * Professional email sending with templates and queue management
 */

import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { JWTService } from './jwt.service';
import { prisma } from '../index';

export class EmailService {
  private jwtService: JWTService;
  private transporter: nodemailer.Transporter;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.jwtService = new JWTService();
    this.initializeTransporter();
    this.loadTemplates();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('SMTP configuration error:', error);
      } else {
        logger.info('SMTP server ready for email sending');
      }
    });
  }

  /**
   * Load email templates
   */
  private loadTemplates(): void {
    try {
      const templatesDir = path.join(__dirname, '..', 'templates', 'email');
      
      const templateFiles = [
        'verification.hbs',
        'password-reset.hbs',
        'welcome.hbs'
      ];

      templateFiles.forEach(filename => {
        const templatePath = path.join(templatesDir, filename);
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          const templateName = filename.replace('.hbs', '');
          this.templates.set(templateName, handlebars.compile(templateContent));
          logger.info(`Email template loaded: ${templateName}`);
        } else {
          logger.warn(`Email template not found: ${templatePath}`);
        }
      });
    } catch (error) {
      logger.error('Failed to load email templates:', error);
    }
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

      // Send email using template
      await this.sendTemplatedEmail({
        to: email,
        subject: 'Email Manzilni Tasdiqlang - UltraMarket',
        template: 'verification',
        data: {
          firstName,
          verificationLink
        }
      });

      logger.info('Email verification sent successfully', {
        email,
        firstName,
        userId: user.id,
      });
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

      // Send email using template
      await this.sendTemplatedEmail({
        to: email,
        subject: 'Parolni Tiklash - UltraMarket',
        template: 'password-reset',
        data: {
          firstName,
          resetLink
        }
      });

      logger.info('Password reset email sent successfully', {
        email,
        firstName,
      });
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
      const platformUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Send email using template
      await this.sendTemplatedEmail({
        to: email,
        subject: 'Xush kelibsiz - UltraMarket!',
        template: 'welcome',
        data: {
          firstName,
          platformUrl
        }
      });

      logger.info('Welcome email sent successfully', {
        email,
        firstName,
      });
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
      // Send plain text email for notifications
      await this.transporter.sendMail({
        from: `"UltraMarket" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>UltraMarket</h2>
            ${firstName ? `<p>Assalomu alaykum ${firstName},</p>` : '<p>Assalomu alaykum,</p>'}
            <p>${message}</p>
            <hr>
            <p style="font-size: 12px; color: #666;">
              Bu avtomatik xabar. Iltimos, javob bermang.<br>
              UltraMarket jamoasi
            </p>
          </div>
        `
      });

      logger.info('Notification email sent successfully', {
        email,
        subject,
        firstName,
      });
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
   * Send templated email
   */
  private async sendTemplatedEmail(options: {
    to: string;
    subject: string;
    template: string;
    data: any;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }): Promise<void> {
    try {
      const template = this.templates.get(options.template);
      if (!template) {
        throw new Error(`Email template not found: ${options.template}`);
      }

      const html = template(options.data);

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"UltraMarket" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: html,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Templated email sent successfully', {
        to: options.to,
        subject: options.subject,
        template: options.template,
        messageId: result.messageId
      });
    } catch (error) {
      logger.error('Failed to send templated email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        template: options.template
      });
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email configuration test successful');
      return true;
    } catch (error) {
      logger.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Send bulk emails (for marketing, etc.)
   */
  async sendBulkEmails(
    recipients: Array<{ email: string; firstName?: string }>,
    subject: string,
    template: string,
    data: any
  ): Promise<{ sent: number; failed: number; errors: any[] }> {
    const results = { sent: 0, failed: 0, errors: [] as any[] };

    for (const recipient of recipients) {
      try {
        await this.sendTemplatedEmail({
          to: recipient.email,
          subject,
          template,
          data: {
            ...data,
            firstName: recipient.firstName || 'Mijoz'
          }
        });
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Bulk email sending completed', results);
    return results;
  }
}
