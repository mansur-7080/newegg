import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailConfig {
  provider: 'gmail' | 'sendgrid' | 'mailgun' | 'smtp' | 'ethereal';
  from: {
    name: string;
    email: string;
  };
  replyTo?: string;
  templates: {
    baseUrl: string;
    language: 'uz' | 'ru' | 'en';
  };
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    this.config = this.getEmailConfig();
    this.transporter = this.createTransporter();
    this.verifyConnection();
  }

  private getEmailConfig(): EmailConfig {
    return {
      provider: (process.env.EMAIL_PROVIDER as any) || 'gmail',
      from: {
        name: process.env.EMAIL_FROM_NAME || 'UltraMarket',
        email: process.env.EMAIL_FROM_ADDRESS || 'noreply@ultramarket.uz',
      },
      replyTo: process.env.EMAIL_REPLY_TO || 'support@ultramarket.uz',
      templates: {
        baseUrl: process.env.EMAIL_TEMPLATE_BASE_URL || '/templates',
        language: (process.env.DEFAULT_LANGUAGE as any) || 'uz',
      },
    };
  }

  private createTransporter(): nodemailer.Transporter {
    const provider = this.config.provider;

    switch (provider) {
      case 'gmail':
        return this.createGmailTransporter();
      case 'sendgrid':
        return this.createSendGridTransporter();
      case 'mailgun':
        return this.createMailgunTransporter();
      case 'smtp':
        return this.createSMTPTransporter();
      case 'ethereal':
        return this.createEtherealTransporter();
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  private createGmailTransporter(): nodemailer.Transporter {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error('Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD');
    }

    logger.info('Creating Gmail transporter', { user });

    return nodemailer.createTransporter({
      service: 'gmail',
      auth: { user, pass },
      pool: true,
      maxConnections: 10,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
    });
  }

  private createSendGridTransporter(): nodemailer.Transporter {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      throw new Error('SendGrid API key not configured. Set SENDGRID_API_KEY');
    }

    logger.info('Creating SendGrid transporter');

    return nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: apiKey,
      },
    });
  }

  private createMailgunTransporter(): nodemailer.Transporter {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;

    if (!apiKey || !domain) {
      throw new Error('Mailgun credentials not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN');
    }

    logger.info('Creating Mailgun transporter', { domain });

    return nodemailer.createTransporter({
      service: 'Mailgun',
      auth: {
        user: `postmaster@${domain}`,
        pass: apiKey,
      },
    });
  }

  private createSMTPTransporter(): nodemailer.Transporter {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      throw new Error('SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
    }

    logger.info('Creating SMTP transporter', { host, port, secure, user });

    return nodemailer.createTransporter({
      host,
      port,
      secure,
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 50,
    });
  }

  private createEtherealTransporter(): nodemailer.Transporter {
    logger.warn('Using Ethereal Email for testing - emails will not be delivered!');

    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || 'example@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'password',
      },
    });
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified successfully', {
        provider: this.config.provider,
      });
    } catch (error) {
      logger.error('Email service connection failed', {
        provider: this.config.provider,
        error: error.message,
      });
      throw new Error(`Email service connection failed: ${error.message}`);
    }
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    template?: {
      name: string;
      data: Record<string, any>;
    };
    attachments?: Array<{
      filename: string;
      content: string | Buffer;
      contentType?: string;
    }>;
    priority?: 'high' | 'normal' | 'low';
    headers?: Record<string, string>;
  }): Promise<nodemailer.SentMessageInfo> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `${this.config.from.name} <${this.config.from.email}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        replyTo: this.config.replyTo,
        attachments: options.attachments,
        headers: options.headers,
      };

      // Handle template or direct content
      if (options.template) {
        const { html, text } = await this.renderTemplate(
          options.template.name,
          options.template.data
        );
        mailOptions.html = html;
        mailOptions.text = text;
      } else {
        mailOptions.html = options.html;
        mailOptions.text = options.text;
      }

      // Set priority
      if (options.priority === 'high') {
        mailOptions.priority = 'high';
        mailOptions.headers = {
          ...mailOptions.headers,
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        };
      }

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
        provider: this.config.provider,
      });

      return result;
    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        to: options.to,
        subject: options.subject,
      });
      throw error;
    }
  }

  async sendBulkEmail(emails: Array<{
    to: string;
    subject: string;
    template: string;
    data: Record<string, any>;
  }>): Promise<nodemailer.SentMessageInfo[]> {
    const results: nodemailer.SentMessageInfo[] = [];
    
    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(email =>
        this.sendEmail({
          to: email.to,
          subject: email.subject,
          template: {
            name: email.template,
            data: email.data,
          },
        })
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('Bulk email failed', {
            email: batch[index].to,
            error: result.reason.message,
          });
        }
      });

      // Rate limiting delay
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  private async renderTemplate(templateName: string, data: Record<string, any>): Promise<{
    html: string;
    text: string;
  }> {
    // This would integrate with a template engine like Handlebars or Mustache
    // For now, return basic templates

    const templates = {
      welcome: {
        html: `
          <h1>Xush kelibsiz, ${data.name}!</h1>
          <p>UltraMarket platformasiga muvaffaqiyatli ro'yxatdan o'tdingiz.</p>
          <p>Akkountingizni tasdiqlash uchun quyidagi tugmani bosing:</p>
          <a href="${data.verificationUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Akkountni tasdiqlash
          </a>
        `,
        text: `Xush kelibsiz, ${data.name}! Akkountingizni tasdiqlash: ${data.verificationUrl}`,
      },
      orderConfirmation: {
        html: `
          <h1>Buyurtma tasdiqlandi</h1>
          <p>Hurmatli ${data.customerName},</p>
          <p>Sizning #${data.orderNumber} raqamli buyurtmangiz qabul qilindi.</p>
          <p>Umumiy summa: ${data.totalAmount} so'm</p>
          <p>Yetkazib berish manzili: ${data.deliveryAddress}</p>
        `,
        text: `Buyurtma #${data.orderNumber} tasdiqlandi. Summa: ${data.totalAmount} so'm`,
      },
      passwordReset: {
        html: `
          <h1>Parolni tiklash</h1>
          <p>Parolni tiklash uchun quyidagi havolaga bosing:</p>
          <a href="${data.resetUrl}">Parolni tiklash</a>
          <p>Bu havola 1 soat davomida amal qiladi.</p>
        `,
        text: `Parolni tiklash: ${data.resetUrl}`,
      },
    };

    const template = templates[templateName as keyof typeof templates];
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    return template;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email connection test failed', error);
      return false;
    }
  }

  async getConnectionInfo(): Promise<{
    provider: string;
    from: string;
    status: 'connected' | 'error';
    lastTest?: Date;
  }> {
    const isConnected = await this.testConnection();
    
    return {
      provider: this.config.provider,
      from: `${this.config.from.name} <${this.config.from.email}>`,
      status: isConnected ? 'connected' : 'error',
      lastTest: new Date(),
    };
  }
}

export default EmailService;