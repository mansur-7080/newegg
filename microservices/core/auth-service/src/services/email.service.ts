/**
 * Email Service
 * Professional email sending with templates and queue management
 */

import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  data?: Record<string, any>;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private fromEmail: string;
  private fromName: string;

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    this.fromEmail = process.env.SMTP_FROM || 'noreply@ultramarket.uz';
    this.fromName = process.env.SMTP_FROM_NAME || 'UltraMarket';

    // Verify transporter configuration
    this.verifyConnection();
    
    // Load email templates
    this.loadTemplates();
  }

  /**
   * Verify SMTP connection
   */
  private async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Email service ready');
    } catch (error) {
      logger.error('❌ Email service error:', error);
    }
  }

  /**
   * Load email templates
   */
  private async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/email');
      const templateFiles = await fs.readdir(templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith('.hbs')) {
          const templateName = file.replace('.hbs', '');
          const templateContent = await fs.readFile(
            path.join(templatesDir, file),
            'utf-8'
          );
          this.templates.set(templateName, handlebars.compile(templateContent));
        }
      }

      logger.info(`📧 Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates:', error);
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Verify your UltraMarket account',
      template: 'verification',
      data: {
        verificationUrl,
        expiresIn: '24 hours',
      },
    });

    logger.info('Verification email sent', { email });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Reset your UltraMarket password',
      template: 'password-reset',
      data: {
        resetUrl,
        expiresIn: '1 hour',
      },
    });

    logger.info('Password reset email sent', { email });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to UltraMarket!',
      template: 'welcome',
      data: {
        firstName,
        loginUrl: `${process.env.APP_URL}/login`,
        supportEmail: 'support@ultramarket.uz',
      },
    });

    logger.info('Welcome email sent', { email });
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(email: string, firstName: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your UltraMarket password has been changed',
      template: 'password-changed',
      data: {
        firstName,
        supportEmail: 'support@ultramarket.uz',
        timestamp: new Date().toLocaleString(),
      },
    });

    logger.info('Password changed email sent', { email });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(
    email: string,
    orderData: {
      orderNumber: string;
      totalAmount: number;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
      shippingAddress?: string;
      estimatedDelivery?: string;
    }
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Order Confirmation #${orderData.orderNumber}`,
      template: 'order-confirmation',
      data: orderData,
    });

    logger.info('Order confirmation email sent', { email, orderNumber: orderData.orderNumber });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(
    email: string,
    paymentData: {
      orderNumber: string;
      amount: number;
      paymentMethod: string;
      transactionId: string;
    }
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Payment Confirmed - Order #${paymentData.orderNumber}`,
      template: 'payment-confirmation',
      data: paymentData,
    });

    logger.info('Payment confirmation email sent', { email, orderNumber: paymentData.orderNumber });
  }

  /**
   * Core email sending method
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      let html = options.html;
      let text = options.text;

      // Use template if specified
      if (options.template && this.templates.has(options.template)) {
        const template = this.templates.get(options.template)!;
        html = template(options.data || {});
        
        // Generate text version from HTML if not provided
        if (!text) {
          text = this.htmlToText(html);
        }
      }

      // Prepare email options
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: text || '',
        html: html || '',
        attachments: options.attachments,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });
      
      // Don't throw error to prevent application crashes
      // Email failures should be handled gracefully
    }
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Send bulk emails (with rate limiting)
   */
  async sendBulkEmails(
    recipients: string[],
    subject: string,
    template: string,
    data: Record<string, any>
  ): Promise<void> {
    const batchSize = 10;
    const delayMs = 1000; // 1 second between batches

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(recipient =>
          this.sendEmail({
            to: recipient,
            subject,
            template,
            data,
          })
        )
      );

      // Delay between batches to avoid rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.info('Bulk emails sent', {
      recipientCount: recipients.length,
      subject,
    });
  }

  /**
   * Create email preview (for testing)
   */
  async previewEmail(
    template: string,
    data: Record<string, any>
  ): Promise<{ html: string; text: string }> {
    if (!this.templates.has(template)) {
      throw new Error(`Template '${template}' not found`);
    }

    const templateFn = this.templates.get(template)!;
    const html = templateFn(data);
    const text = this.htmlToText(html);

    return { html, text };
  }
}

// Export singleton instance
export const emailService = new EmailService();
