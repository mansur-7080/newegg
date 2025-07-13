import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

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
    this.initializeEmailService();
    this.loadTemplates();
  }

  private initializeEmailService(): void {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Send notification based on type
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      logger.info('Sending notification', {
        userId: payload.userId,
        type: payload.type,
        template: payload.template,
        priority: payload.priority,
      });

      // Check user preferences
      const preferences = await this.getUserPreferences(payload.userId);
      
      // Schedule notification if needed
      if (payload.scheduledAt && payload.scheduledAt > new Date()) {
        await this.scheduleNotification(payload);
        return;
      }

      // Send notification based on type
      switch (payload.type) {
        case 'email':
          if (preferences.emailEnabled) {
            const userEmail = await this.getUserEmail(payload.userId);
            await this.sendEmail({
              to: userEmail,
              subject: payload.data.subject || 'Notification',
              template: payload.template,
              data: payload.data,
            });
          }
          break;

        case 'sms':
          if (preferences.smsEnabled) {
            const userPhone = await this.getUserPhone(payload.userId);
            await this.sendSMS({
              to: userPhone,
              message: payload.data.message || '',
              template: payload.template,
              data: payload.data,
            });
          }
          break;

        case 'push':
          if (preferences.pushEnabled) {
            await this.sendPush({
              userId: payload.userId,
              title: payload.data.title || 'Notification',
              body: payload.data.body || '',
              data: payload.data,
            });
          }
          break;

        case 'in-app':
                     await this.sendInApp({
             userId: payload.userId,
             title: payload.data.title || 'Notification',
             message: payload.data.message || '',
             type: payload.data.type || 'info',
             actionUrl: payload.data.actionUrl,
             actionText: payload.data.actionText,
             metadata: payload.metadata || {},
           });
          break;
      }

      // Store notification history
      await this.storeNotificationHistory(payload);

      logger.info('Notification sent successfully', {
        userId: payload.userId,
        type: payload.type,
      });
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: payload.userId,
        type: payload.type,
      });
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(notification: EmailNotification): Promise<void> {
    try {
      const template = this.renderTemplate(notification.template, notification.data);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@ultramarket.uz',
        to: notification.to,
        subject: notification.subject,
        html: template,
        attachments: notification.attachments,
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to: notification.to,
        subject: notification.subject,
        messageId: info.messageId,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: notification.to,
      });
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(notification: SMSNotification): Promise<void> {
    try {
      // Validate phone number format
      if (!this.isValidUzbekPhoneNumber(notification.to)) {
        throw new Error('Invalid Uzbekistan phone number format');
      }

      // Use ESKIZ SMS service for Uzbekistan
      const response = await this.sendSMSViaEskiz(notification);
      
      if (response.success) {
        logger.info('SMS sent successfully', {
          to: notification.to,
          provider: 'eskiz',
          messageId: response.messageId,
        });
      } else {
        // Fallback to Play Mobile
        const fallbackResponse = await this.sendSMSViaPlayMobile(notification);
        
        if (fallbackResponse.success) {
          logger.info('SMS sent successfully via fallback', {
            to: notification.to,
            provider: 'playmobile',
            messageId: fallbackResponse.messageId,
          });
        } else {
          throw new Error('Failed to send SMS via all providers');
        }
      }
    } catch (error) {
      logger.error('Failed to send SMS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: notification.to,
      });
      throw error;
    }
  }

  /**
   * Send SMS via ESKIZ service
   */
  private async sendSMSViaEskiz(notification: SMSNotification): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const token = await this.getEskizToken();
      
      const response = await axios.post(
        'https://notify.eskiz.uz/api/message/sms/send',
        {
          mobile_phone: notification.to,
          message: notification.message,
          from: process.env.ESKIZ_FROM || 'UltraMarket',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status === 'success') {
        return {
          success: true,
          messageId: response.data.id,
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Unknown error',
        };
      }
    } catch (error) {
      logger.error('ESKIZ SMS failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: notification.to,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SMS via Play Mobile service
   */
  private async sendSMSViaPlayMobile(notification: SMSNotification): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const response = await axios.post(
        'https://api.playmobile.uz/v1/sms/send',
        {
          phone: notification.to,
          text: notification.message,
          sender: process.env.PLAYMOBILE_SENDER || 'UltraMarket',
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PLAYMOBILE_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        return {
          success: true,
          messageId: response.data.id,
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Unknown error',
        };
      }
    } catch (error) {
      logger.error('Play Mobile SMS failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: notification.to,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get ESKIZ authentication token
   */
  private async getEskizToken(): Promise<string> {
    try {
      const response = await axios.post(
        'https://notify.eskiz.uz/api/auth/login',
        {
          email: process.env.ESKIZ_EMAIL,
          password: process.env.ESKIZ_PASSWORD,
        }
      );

      if (response.data.token_type === 'Bearer') {
        return response.data.data.token;
      } else {
        throw new Error('Failed to get ESKIZ token');
      }
    } catch (error) {
      logger.error('Failed to get ESKIZ token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate Uzbekistan phone number
   */
  private isValidUzbekPhoneNumber(phone: string): boolean {
    // Uzbekistan phone number pattern: +998XXXXXXXXX
    const pattern = /^\+998[0-9]{9}$/;
    return pattern.test(phone);
  }

  /**
   * Send push notification
   */
  async sendPush(notification: PushNotification): Promise<void> {
    try {
      // Get user's device tokens
      const deviceTokens = await this.getUserDeviceTokens(notification.userId);
      
      if (deviceTokens.length === 0) {
        logger.warn('No device tokens found for user', {
          userId: notification.userId,
        });
        return;
      }

      // Send via Firebase Cloud Messaging
      await this.sendPushViaFirebase(notification, deviceTokens);
      
      logger.info('Push notification sent successfully', {
        userId: notification.userId,
        title: notification.title,
        deviceCount: deviceTokens.length,
      });
    } catch (error) {
      logger.error('Failed to send push notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: notification.userId,
      });
      throw error;
    }
  }

  /**
   * Send push notification via Firebase
   */
  private async sendPushViaFirebase(
    notification: PushNotification,
    deviceTokens: string[]
  ): Promise<void> {
    try {
      const fcmPayload = {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192x192.png',
        },
        data: notification.data || {},
        tokens: deviceTokens,
      };

      const response = await axios.post(
        'https://fcm.googleapis.com/v1/projects/ultramarket-app/messages:send',
        {
          message: fcmPayload,
        },
        {
          headers: {
            'Authorization': `Bearer ${await this.getFirebaseToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success_count > 0) {
        logger.info('Firebase push sent successfully', {
          successCount: response.data.success_count,
          failureCount: response.data.failure_count,
        });
      } else {
        throw new Error('All push notifications failed');
      }
    } catch (error) {
      logger.error('Firebase push failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: notification.userId,
      });
      throw error;
    }
  }

  /**
   * Get Firebase authentication token
   */
  private async getFirebaseToken(): Promise<string> {
    // In production, use Firebase Admin SDK
    // For now, return environment variable
    return process.env.FIREBASE_SERVER_KEY || '';
  }

  /**
   * Get user's device tokens
   */
  private async getUserDeviceTokens(userId: string): Promise<string[]> {
    try {
      const devices = await prisma.userDevice.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          fcmToken: true,
        },
      });

             return devices
         .filter((device: any) => device.fcmToken)
         .map((device: any) => device.fcmToken!);
    } catch (error) {
      logger.error('Failed to get user device tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return [];
    }
  }

  /**
   * Send in-app notification
   */
  async sendInApp(notification: InAppNotification): Promise<void> {
    try {
      // Store in-app notification in database
      await prisma.inAppNotification.create({
        data: {
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          metadata: notification.metadata,
          isRead: false,
          createdAt: new Date(),
        },
      });

      // Send real-time notification via WebSocket
      await this.sendRealTimeNotification(notification);

      logger.info('In-app notification sent successfully', {
        userId: notification.userId,
        title: notification.title,
      });
    } catch (error) {
      logger.error('Failed to send in-app notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: notification.userId,
      });
      throw error;
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  private async sendRealTimeNotification(notification: InAppNotification): Promise<void> {
    try {
      // Send to WebSocket service
      await axios.post(`${process.env.WEBSOCKET_SERVICE_URL}/send`, {
        userId: notification.userId,
        event: 'notification',
        data: {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to send real-time notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: notification.userId,
      });
      // Don't throw error, WebSocket failure shouldn't break notification
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications: NotificationPayload[]): Promise<void> {
    try {
      const promises = notifications.map(notification => 
        this.sendNotification(notification).catch(error => {
          logger.error('Bulk notification failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: notification.userId,
          });
        })
      );

      await Promise.allSettled(promises);
      
      logger.info('Bulk notifications processed', {
        count: notifications.length,
      });
    } catch (error) {
      logger.error('Bulk notifications failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        count: notifications.length,
      });
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    try {
      const preferences = await prisma.userNotificationPreferences.findUnique({
        where: { userId },
      });

      return preferences || {
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        marketingEnabled: true,
      };
    } catch (error) {
      logger.error('Failed to get user preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      
      // Return default preferences
      return {
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        marketingEnabled: true,
      };
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    try {
      await prisma.userNotificationPreferences.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          ...preferences,
        },
      });

      logger.info('User preferences updated', {
        userId,
        preferences,
      });
    } catch (error) {
      logger.error('Failed to update user preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    userId: string,
    options: { limit?: number; offset?: number; type?: string }
  ): Promise<any[]> {
    try {
      const { limit = 50, offset = 0, type } = options;
      
      const where: any = { userId };
      if (type) {
        where.type = type;
      }

      const notifications = await prisma.notificationHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return notifications;
    } catch (error) {
      logger.error('Failed to get notification history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      await prisma.inAppNotification.update({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('Notification marked as read', {
        userId,
        notificationId,
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Send notification by channel
   */
  private async sendByChannel(channel: string, payload: NotificationPayload): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendNotification({ ...payload, type: 'email' });
        break;
      case 'sms':
        await this.sendNotification({ ...payload, type: 'sms' });
        break;
      case 'push':
        await this.sendNotification({ ...payload, type: 'push' });
        break;
      case 'in-app':
        await this.sendNotification({ ...payload, type: 'in-app' });
        break;
      default:
        logger.warn('Unknown notification channel', { channel });
    }
  }

  /**
   * Create email transporter
   */
     private createEmailTransporter(): nodemailer.Transporter {
     return nodemailer.createTransport({
       host: process.env.EMAIL_HOST || 'smtp.gmail.com',
       port: parseInt(process.env.EMAIL_PORT || '587'),
       secure: process.env.EMAIL_SECURE === 'true',
       auth: {
         user: process.env.EMAIL_USER,
         pass: process.env.EMAIL_PASS,
       },
     });
   }

  /**
   * Load notification templates
   */
  private loadTemplates(): void {
    // Load email templates
    this.templates.set('welcome', {
      subject: 'Xush kelibsiz - UltraMarket',
      html: `
        <h2>Xush kelibsiz {{firstName}}!</h2>
        <p>UltraMarket platformasiga muvaffaqiyatli ro'yxatdan o'tdingiz!</p>
        <p>Endi siz platformaning barcha imkoniyatlaridan foydalanishingiz mumkin.</p>
      `,
    });

    this.templates.set('order_confirmation', {
      subject: 'Buyurtma tasdiqlandi - UltraMarket',
      html: `
        <h2>Buyurtma tasdiqlandi</h2>
        <p>Salom {{firstName}}!</p>
        <p>Buyurtma #{{orderId}} muvaffaqiyatli tasdiqlandi.</p>
        <p>Umumiy summa: {{totalAmount}} UZS</p>
      `,
    });

    this.templates.set('payment_completed', {
      subject: 'To\'lov muvaffaqiyatli amalga oshirildi',
      html: `
        <h2>To'lov muvaffaqiyatli</h2>
        <p>Salom {{firstName}}!</p>
        <p>Buyurtma #{{orderId}} uchun to'lov muvaffaqiyatli amalga oshirildi.</p>
        <p>To'lov summasi: {{amount}} UZS</p>
      `,
    });
  }

  /**
   * Render notification template
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    const templateData = this.templates.get(template);
    if (!templateData) {
      return data.message || 'Notification';
    }

    let html = templateData.html;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key]);
    });

    return html;
  }

  /**
   * Get user email address
   */
  private async getUserEmail(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email || '';
  }

  /**
   * Get user phone number
   */
  private async getUserPhone(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    return user?.phone || '';
  }

  /**
   * Schedule notification for later
   */
  private async scheduleNotification(payload: NotificationPayload): Promise<void> {
    try {
      await prisma.scheduledNotification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          template: payload.template,
          data: payload.data,
          priority: payload.priority,
          scheduledAt: payload.scheduledAt!,
          status: 'pending',
          createdAt: new Date(),
        },
      });

      logger.info('Notification scheduled', {
        userId: payload.userId,
        type: payload.type,
        scheduledAt: payload.scheduledAt,
      });
    } catch (error) {
      logger.error('Failed to schedule notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: payload.userId,
      });
      throw error;
    }
  }

  /**
   * Store notification in history
   */
  private async storeNotificationHistory(payload: NotificationPayload): Promise<void> {
    try {
      await prisma.notificationHistory.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          template: payload.template,
          data: payload.data,
          priority: payload.priority,
          status: 'sent',
          sentAt: new Date(),
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to store notification history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: payload.userId,
      });
      // Don't throw error, history failure shouldn't break notification
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check email service
      await this.emailTransporter.verify();
      
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      return true;
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await prisma.scheduledNotification.findMany({
        where: {
          status: 'pending',
          scheduledAt: {
            lte: new Date(),
          },
        },
        take: 100,
      });

      for (const scheduled of scheduledNotifications) {
        try {
          await this.sendNotification({
            userId: scheduled.userId,
            type: scheduled.type as any,
            template: scheduled.template,
            data: scheduled.data as any,
            priority: scheduled.priority as any,
          });

          await prisma.scheduledNotification.update({
            where: { id: scheduled.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          });
        } catch (error) {
          await prisma.scheduledNotification.update({
            where: { id: scheduled.id },
            data: {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }

      logger.info('Scheduled notifications processed', {
        count: scheduledNotifications.length,
      });
    } catch (error) {
      logger.error('Failed to process scheduled notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
