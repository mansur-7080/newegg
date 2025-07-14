import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import EmailService from '../config/email.config';
import { logger } from '../utils/logger';

export class EmailController {
  private notificationService: NotificationService;
  private emailService: EmailService;

  constructor() {
    this.notificationService = new NotificationService();
    this.emailService = new EmailService();
  }

  /**
   * Test email connection
   */
  public testConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const connectionInfo = await this.emailService.getConnectionInfo();
      
      res.json({
        success: true,
        data: connectionInfo,
        message: 'Email service connection tested',
      });
    } catch (error) {
      logger.error('Email connection test failed', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_CONNECTION_FAILED',
          message: error.message,
        },
      });
    }
  };

  /**
   * Send test email
   */
  public sendTestEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { to, subject, message } = req.body;

      if (!to || !subject) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'To and subject are required',
          },
        });
      }

      const result = await this.emailService.sendEmail({
        to,
        subject,
        html: `
          <h1>Test Email - UltraMarket</h1>
          <p>${message || 'Bu test email xabari.'}</p>
          <p>Agar siz bu xabarni olgan bo'lsangiz, email service to'g'ri ishlayapti!</p>
          <hr>
          <small>UltraMarket Notification Service</small>
        `,
        text: `Test Email: ${message || 'Bu test email xabari.'}`,
      });

      res.json({
        success: true,
        data: {
          messageId: result.messageId,
          to,
          subject,
        },
        message: 'Test email sent successfully',
      });
    } catch (error) {
      logger.error('Test email failed', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: error.message,
        },
      });
    }
  };

  /**
   * Send welcome email
   */
  public sendWelcomeEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { to, name, verificationUrl } = req.body;

      if (!to || !name || !verificationUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'To, name and verificationUrl are required',
          },
        });
      }

      await this.notificationService.sendWelcomeEmail(to, name, verificationUrl);

      res.json({
        success: true,
        message: 'Welcome email sent successfully',
      });
    } catch (error) {
      logger.error('Welcome email failed', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: error.message,
        },
      });
    }
  };

  /**
   * Send order confirmation email
   */
  public sendOrderConfirmation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { to, customerName, orderNumber, totalAmount, deliveryAddress } = req.body;

      if (!to || !customerName || !orderNumber || !totalAmount || !deliveryAddress) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'All order fields are required',
          },
        });
      }

      await this.notificationService.sendOrderConfirmation(
        to,
        customerName,
        orderNumber,
        totalAmount,
        deliveryAddress
      );

      res.json({
        success: true,
        message: 'Order confirmation email sent successfully',
      });
    } catch (error) {
      logger.error('Order confirmation email failed', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: error.message,
        },
      });
    }
  };

  /**
   * Send password reset email
   */
  public sendPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { to, resetUrl } = req.body;

      if (!to || !resetUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'To and resetUrl are required',
          },
        });
      }

      await this.notificationService.sendPasswordReset(to, resetUrl);

      res.json({
        success: true,
        message: 'Password reset email sent successfully',
      });
    } catch (error) {
      logger.error('Password reset email failed', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: error.message,
        },
      });
    }
  };

  /**
   * Send bulk emails
   */
  public sendBulkEmails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { emails } = req.body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EMAIL_LIST',
            message: 'Emails array is required and cannot be empty',
          },
        });
      }

      // Validate email structure
      for (const email of emails) {
        if (!email.to || !email.subject || !email.template) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_EMAIL_STRUCTURE',
              message: 'Each email must have to, subject and template fields',
            },
          });
        }
      }

      await this.notificationService.sendBulkEmails(emails);

      res.json({
        success: true,
        data: {
          count: emails.length,
        },
        message: 'Bulk emails sent successfully',
      });
    } catch (error) {
      logger.error('Bulk emails failed', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_EMAIL_FAILED',
          message: error.message,
        },
      });
    }
  };

  /**
   * Get email statistics
   */
  public getEmailStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      
      // This would typically query the database for email statistics
      // For now, return mock data
      const stats = {
        totalSent: 1500,
        delivered: 1450,
        bounced: 30,
        failed: 20,
        deliveryRate: 96.7,
        period: {
          start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: endDate || new Date().toISOString(),
        },
        templates: {
          welcome: 500,
          orderConfirmation: 600,
          passwordReset: 200,
          newsletter: 200,
        },
      };

      res.json({
        success: true,
        data: stats,
        message: 'Email statistics retrieved successfully',
      });
    } catch (error) {
      logger.error('Email stats failed', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_RETRIEVAL_FAILED',
          message: error.message,
        },
      });
    }
  };

  /**
   * Get email templates
   */
  public getEmailTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = [
        {
          name: 'welcome',
          subject: 'UltraMarket ga xush kelibsiz!',
          description: 'Yangi foydalanuvchilar uchun xush kelibsiz xabari',
          variables: ['name', 'verificationUrl'],
        },
        {
          name: 'orderConfirmation',
          subject: 'Buyurtma tasdiqlandi',
          description: 'Buyurtma tasdiqlanganida yuboriladi',
          variables: ['customerName', 'orderNumber', 'totalAmount', 'deliveryAddress'],
        },
        {
          name: 'passwordReset',
          subject: 'Parolni tiklash',
          description: 'Parol tiklash so\'rovi uchun',
          variables: ['resetUrl'],
        },
      ];

      res.json({
        success: true,
        data: templates,
        message: 'Email templates retrieved successfully',
      });
    } catch (error) {
      logger.error('Template retrieval failed', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_RETRIEVAL_FAILED',
          message: error.message,
        },
      });
    }
  };
}