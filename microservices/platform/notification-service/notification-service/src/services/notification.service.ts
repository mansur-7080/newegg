import nodemailer from 'nodemailer';
import { logger } from '@ultramarket/common';

export interface NotificationPayload {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  template: string;
  data: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels?: string[];
  scheduledAt?: Date;
  metadata?: Record<string, any>;
}

export interface EmailNotification {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SMSNotification {
  to: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
}

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  icon?: string;
  clickAction?: string;
}

export interface InAppNotification {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;
  private templates: Map<string, any> = new Map();

  constructor() {
    this.emailTransporter = this.createEmailTransporter();
    this.loadTemplates();
  }

  /**
   * Send notification through multiple channels
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      logger.info('Sending notification', { 
        userId: payload.userId, 
        type: payload.type, 
        template: payload.template 
      });

      // If scheduled, store for later processing
      if (payload.scheduledAt && payload.scheduledAt > new Date()) {
        await this.scheduleNotification(payload);
        return;
      }

      // Send based on channels
      const channels = payload.channels || [payload.type];
      
      await Promise.all(
        channels.map(channel => this.sendByChannel(channel as any, payload))
      );

      // Store notification history
      await this.storeNotificationHistory(payload);

    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(notification: EmailNotification): Promise<void> {
    try {
      const template = this.templates.get(notification.template);
      if (!template) {
        throw new Error(`Email template '${notification.template}' not found`);
      }

      const htmlContent = this.renderTemplate(template.html, notification.data);
      const textContent = this.renderTemplate(template.text, notification.data);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@ultramarket.com',
        to: notification.to,
        subject: this.renderTemplate(notification.subject || template.subject, notification.data),
        html: htmlContent,
        text: textContent,
        attachments: notification.attachments
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', { 
        messageId: info.messageId, 
        to: notification.to 
      });

    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(notification: SMSNotification): Promise<void> {
    try {
      let message = notification.message;

      // Render template if provided
      if (notification.template && notification.data) {
        const template = this.templates.get(notification.template);
        if (template?.sms) {
          message = this.renderTemplate(template.sms, notification.data);
        }
      }

      // Implementation would use SMS service (Twilio, AWS SNS, etc.)
      // For now, we'll log the SMS
      logger.info('SMS sent', { 
        to: notification.to, 
        message: message.substring(0, 50) + '...' 
      });

      // Actual SMS implementation would go here
      // await smsProvider.send({ to: notification.to, message });

    } catch (error) {
      logger.error('Failed to send SMS:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  async sendPush(notification: PushNotification): Promise<void> {
    try {
      // Implementation would use FCM, APNS, etc.
      logger.info('Push notification sent', { 
        userId: notification.userId, 
        title: notification.title 
      });

      // Actual push implementation would go here
      // await fcm.send({
      //   token: userDeviceToken,
      //   notification: {
      //     title: notification.title,
      //     body: notification.body
      //   },
      //   data: notification.data
      // });

    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send in-app notification
   */
  async sendInApp(notification: InAppNotification): Promise<void> {
    try {
      // Store in database for user to see in app
      // Implementation would save to database
      logger.info('In-app notification created', { 
        userId: notification.userId, 
        title: notification.title 
      });

      // Emit real-time event via WebSocket
      // socketService.emit(notification.userId, 'notification', notification);

    } catch (error) {
      logger.error('Failed to send in-app notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications: NotificationPayload[]): Promise<void> {
    try {
      const batchSize = 100;
      
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(notification => this.sendNotification(notification))
        );

        // Small delay between batches to avoid rate limits
        if (i + batchSize < notifications.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info('Bulk notifications sent', { count: notifications.length });

    } catch (error) {
      logger.error('Failed to send bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    try {
      // Implementation would fetch from database
      // Default preferences for now
      return {
        email: {
          orderUpdates: true,
          promotions: true,
          newsletter: false,
          security: true
        },
        sms: {
          orderUpdates: true,
          promotions: false,
          security: true
        },
        push: {
          orderUpdates: true,
          promotions: true,
          inApp: true
        }
      };
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      return {};
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    try {
      // Implementation would save to database
      logger.info('User preferences updated', { userId });
    } catch (error) {
      logger.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(
    userId: string, 
    options: { limit?: number; offset?: number; type?: string }
  ): Promise<any[]> {
    try {
      // Implementation would query database
      // Mock data for now
      return [
        {
          id: '1',
          type: 'email',
          template: 'order-confirmation',
          status: 'sent',
          sentAt: new Date(),
          metadata: {}
        }
      ];
    } catch (error) {
      logger.error('Failed to get notification history:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      // Implementation would update database
      logger.info('Notification marked as read', { userId, notificationId });
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async sendByChannel(channel: string, payload: NotificationPayload): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmail({
          to: await this.getUserEmail(payload.userId),
          subject: '',
          template: payload.template,
          data: payload.data
        });
        break;

      case 'sms':
        await this.sendSMS({
          to: await this.getUserPhone(payload.userId),
          message: '',
          template: payload.template,
          data: payload.data
        });
        break;

      case 'push':
        await this.sendPush({
          userId: payload.userId,
          title: payload.data.title || 'Notification',
          body: payload.data.message || '',
          data: payload.data
        });
        break;

      case 'in-app':
        await this.sendInApp({
          userId: payload.userId,
          title: payload.data.title || 'Notification',
          message: payload.data.message || '',
          type: payload.data.type || 'info',
          metadata: payload.metadata
        });
        break;

      default:
        logger.warn('Unknown notification channel:', channel);
    }
  }

  private createEmailTransporter(): nodemailer.Transporter {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'sendgrid',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } else {
      return nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || 'test@example.com',
          pass: process.env.ETHEREAL_PASS || 'test123'
        }
      });
    }
  }

  private loadTemplates(): void {
    // Load notification templates
    this.templates.set('order-confirmation', {
      subject: 'Order Confirmation - {{orderNumber}}',
      html: `
        <h2>Thank you for your order!</h2>
        <p>Your order {{orderNumber}} has been confirmed.</p>
        <p>Total: {{total}}</p>
      `,
      text: 'Thank you for your order! Your order {{orderNumber}} has been confirmed. Total: {{total}}',
      sms: 'Your order {{orderNumber}} is confirmed. Total: {{total}}'
    });

    this.templates.set('order-shipped', {
      subject: 'Your order has shipped - {{orderNumber}}',
      html: `
        <h2>Your order is on the way!</h2>
        <p>Order {{orderNumber}} has been shipped.</p>
        <p>Tracking: {{trackingNumber}}</p>
      `,
      text: 'Your order {{orderNumber}} has been shipped. Tracking: {{trackingNumber}}',
      sms: 'Order {{orderNumber}} shipped. Track: {{trackingNumber}}'
    });

    this.templates.set('password-reset', {
      subject: 'Reset your password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="{{resetLink}}">Reset Password</a>
      `,
      text: 'Password reset requested. Click: {{resetLink}}',
      sms: 'Password reset code: {{resetCode}}'
    });
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, data[key]?.toString() || '');
    });
    return result;
  }

  private async getUserEmail(userId: string): Promise<string> {
    // Implementation would fetch from user service
    return 'user@example.com';
  }

  private async getUserPhone(userId: string): Promise<string> {
    // Implementation would fetch from user service
    return '+1234567890';
  }

  private async scheduleNotification(payload: NotificationPayload): Promise<void> {
    // Implementation would store in database or queue for later processing
    logger.info('Notification scheduled', { 
      userId: payload.userId, 
      scheduledAt: payload.scheduledAt 
    });
  }

  private async storeNotificationHistory(payload: NotificationPayload): Promise<void> {
    // Implementation would store in database
    logger.debug('Notification history stored', { userId: payload.userId });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.emailTransporter.verify();
      return true;
    } catch (error) {
      logger.error('Notification service health check failed:', error);
      return false;
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      // Implementation would query database for due notifications
      logger.info('Processing scheduled notifications');
    } catch (error) {
      logger.error('Failed to process scheduled notifications:', error);
    }
  }
}

export const notificationService = new NotificationService(); 