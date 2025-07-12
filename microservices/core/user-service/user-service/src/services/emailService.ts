import nodemailer from 'nodemailer';
import { logger } from '@ultramarket/common';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = this.createTransporter();
  }

  private createTransporter(): nodemailer.Transporter {
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    return nodemailer.createTransporter(config);
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    try {
      const template = this.getEmailTemplate(emailData.template);
      const htmlContent = this.renderTemplate(template.html, emailData.data);
      const textContent = this.renderTemplate(template.text, emailData.data);
      const subject = this.renderTemplate(template.subject, emailData.data);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@ultramarket.com',
        to: emailData.to,
        subject: subject,
        html: htmlContent,
        text: textContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: emailData.to,
        template: emailData.template,
      });
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendVerificationEmail(email: string, token: string, userName: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      template: 'email-verification',
      data: {
        userName,
        verificationUrl,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@ultramarket.com',
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      template: 'password-reset',
      data: {
        userName,
        resetUrl,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@ultramarket.com',
      },
    });
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to UltraMarket!',
      template: 'welcome',
      data: {
        userName,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@ultramarket.com',
      },
    });
  }

  private getEmailTemplate(templateName: string): EmailTemplate {
    const templates: Record<string, EmailTemplate> = {
      'email-verification': {
        subject: 'Verify your email address - UltraMarket',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hello {{userName}},</h2>
            <p>Thank you for registering with UltraMarket! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verificationUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with UltraMarket, you can safely ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              Need help? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
            </p>
          </div>
        `,
        text: `
          Hello {{userName}},
          
          Thank you for registering with UltraMarket! Please verify your email address by visiting this link:
          
          {{verificationUrl}}
          
          This link will expire in 24 hours.
          
          If you didn't create an account with UltraMarket, you can safely ignore this email.
          
          Need help? Contact us at {{supportEmail}}
        `,
      },
      'password-reset': {
        subject: 'Reset your password - UltraMarket',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hello {{userName}},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              Need help? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
            </p>
          </div>
        `,
        text: `
          Hello {{userName}},
          
          We received a request to reset your password. Visit this link to create a new password:
          
          {{resetUrl}}
          
          This link will expire in 1 hour.
          
          If you didn't request a password reset, you can safely ignore this email.
          
          Need help? Contact us at {{supportEmail}}
        `,
      },
      'welcome': {
        subject: 'Welcome to UltraMarket!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to UltraMarket, {{userName}}!</h2>
            <p>Thank you for joining our community. We're excited to have you on board!</p>
            <p>You can now:</p>
            <ul>
              <li>Browse our extensive product catalog</li>
              <li>Create and manage your shopping cart</li>
              <li>Track your orders</li>
              <li>Save your favorite items</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{loginUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Shopping</a>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              Need help? Contact us at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
            </p>
          </div>
        `,
        text: `
          Welcome to UltraMarket, {{userName}}!
          
          Thank you for joining our community. We're excited to have you on board!
          
          You can now:
          - Browse our extensive product catalog
          - Create and manage your shopping cart
          - Track your orders
          - Save your favorite items
          
          Start shopping: {{loginUrl}}
          
          If you have any questions, feel free to reach out to our support team.
          
          Need help? Contact us at {{supportEmail}}
        `,
      },
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    return template;
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}