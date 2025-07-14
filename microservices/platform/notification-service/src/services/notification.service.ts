import nodemailer from 'nodemailer';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import Handlebars from 'handlebars';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { RedisService } from '../config/redis';
import { readFileSync } from 'fs';
import { join } from 'path';

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
  private redis: RedisService;
  private firebaseApp?: admin.app.App;

  constructor() {
    this.initializeEmailService();
    this.initializeSMSService();
    this.initializePushService();
    this.loadTemplates();
    this.redis = new RedisService();
  }

  /**
   * Initialize email service with SMTP configuration
   */
  private initializeEmailService(): void {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify email configuration
    this.emailTransporter.verify((error, success) => {
      if (error) {
        logger.error('Email service initialization failed:', error);
      } else {
        logger.info('Email service initialized successfully');
      }
    });
  }

  /**
   * Initialize SMS service (ESKIZ integration for Uzbekistan)
   */
  private initializeSMSService(): void {
    if (!process.env.ESKIZ_EMAIL || !process.env.ESKIZ_PASSWORD) {
      logger.warn('ESKIZ SMS credentials not configured');
    } else {
      logger.info('SMS service initialized with ESKIZ');
    }
  }

  /**
   * Initialize push notification service (Firebase)
   */
  private initializePushService(): void {
    try {
      if (process.env.FIREBASE_CREDENTIALS) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
        
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        logger.info('Push notification service initialized with Firebase');
      } else {
        logger.warn('Firebase credentials not configured');
      }
    } catch (error) {
      logger.error('Failed to initialize push service:', error);
    }
  }

  /**
   * Send notification based on payload
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Check user preferences
      const preferences = await this.getUserPreferences(payload.userId);
      
      if (!preferences || !preferences[payload.type]) {
        logger.info('User has disabled notifications', {
          userId: payload.userId,
          type: payload.type,
        });
        return;
      }

      // Schedule if needed
      if (payload.scheduledAt && payload.scheduledAt > new Date()) {
        await this.scheduleNotification(payload);
        return;
      }

      // Send based on type
      switch (payload.type) {
        case 'email':
          await this.sendEmailFromPayload(payload);
          break;
        case 'sms':
          await this.sendSMSFromPayload(payload);
          break;
        case 'push':
          await this.sendPushFromPayload(payload);
          break;
        case 'in-app':
          await this.sendInAppFromPayload(payload);
          break;
      }

      // Store notification history
      await this.storeNotificationHistory(payload);
    } catch (error) {
      logger.error('Failed to send notification', error);
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
        throw new Error(`Template not found: ${notification.template}`);
      }

      const compiledTemplate = Handlebars.compile(template.html);
      const html = compiledTemplate(notification.data);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@ultramarket.uz',
        to: notification.to,
        subject: notification.subject,
        html,
        attachments: notification.attachments,
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: notification.to,
        template: notification.template,
      });
    } catch (error) {
      logger.error('Failed to send email', error);
      throw error;
    }
  }

  /**
   * Send SMS notification using ESKIZ API
   */
  async sendSMS(notification: SMSNotification): Promise<void> {
    try {
      // Get ESKIZ token
      const token = await this.getEskizToken();
      
      if (!token) {
        throw new Error('Failed to get ESKIZ token');
      }

      // Format phone number (remove +998 if present)
      let phoneNumber = notification.to.replace(/\s+/g, '');
      if (phoneNumber.startsWith('+998')) {
        phoneNumber = phoneNumber.substring(4);
      }

      // Send SMS via ESKIZ API
      const response = await axios.post(
        'https://notify.eskiz.uz/api/message/sms/send',
        {
          mobile_phone: phoneNumber,
          message: notification.message,
          from: process.env.ESKIZ_SENDER_NAME || '4546',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.status === 'success') {
        logger.info('SMS sent successfully', {
          to: notification.to,
          messageId: response.data.id,
        });
      } else {
        throw new Error(`SMS sending failed: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('Failed to send SMS', error);
      
      // Fallback to PlayMobile if ESKIZ fails
      if (process.env.PLAYMOBILE_API_KEY) {
        await this.sendSMSViaPlayMobile(notification);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get ESKIZ authentication token
   */
  private async getEskizToken(): Promise<string | null> {
    try {
      // Check if we have a cached token
      const cachedToken = await this.redis.get('eskiz:token');
      if (cachedToken) {
        return cachedToken;
      }

      // Get new token
      const response = await axios.post('https://notify.eskiz.uz/api/auth/login', {
        email: process.env.ESKIZ_EMAIL,
        password: process.env.ESKIZ_PASSWORD,
      });

      if (response.data.status === 'success' && response.data.data.token) {
        const token = response.data.data.token;
        
        // Cache token for 25 days (ESKIZ tokens expire in 30 days)
        await this.redis.setex('eskiz:token', 25 * 24 * 60 * 60, token);
        
        return token;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get ESKIZ token', error);
      return null;
    }
  }

  /**
   * Send SMS via PlayMobile (backup provider)
   */
  private async sendSMSViaPlayMobile(notification: SMSNotification): Promise<void> {
    try {
      const response = await axios.post(
        'https://send.smsxabar.uz/broker-api/send',
        {
          messages: [
            {
              recipient: notification.to,
              message_id: Date.now().toString(),
              sms: {
                originator: '3700',
                content: {
                  text: notification.message,
                },
              },
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PLAYMOBILE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('SMS sent via PlayMobile', {
        to: notification.to,
        response: response.data,
      });
    } catch (error) {
      logger.error('Failed to send SMS via PlayMobile', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  async sendPush(notification: PushNotification): Promise<void> {
    try {
      if (!this.firebaseApp) {
        logger.warn('Firebase not initialized, skipping push notification');
        return;
      }

      // Get user's FCM tokens
      const userTokens = await this.getUserFCMTokens(notification.userId);
      
      if (!userTokens || userTokens.length === 0) {
        logger.info('No FCM tokens found for user', { userId: notification.userId });
        return;
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        android: {
          notification: {
            icon: notification.icon || 'ic_notification',
            sound: notification.sound || 'default',
            clickAction: notification.clickAction,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: notification.badge,
              sound: notification.sound || 'default',
            },
          },
        },
        tokens: userTokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      
      logger.info('Push notification sent', {
        userId: notification.userId,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      // Remove invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(userTokens[idx]);
          }
        });
        
        if (failedTokens.length > 0) {
          await this.removeInvalidFCMTokens(notification.userId, failedTokens);
        }
      }
    } catch (error) {
      logger.error('Failed to send push notification', error);
      throw error;
    }
  }

  /**
   * Send in-app notification
   */
  async sendInApp(notification: InAppNotification): Promise<void> {
    try {
      // Store in database
      await prisma.inAppNotification.create({
        data: {
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          metadata: notification.metadata || {},
          read: false,
        },
      });

      // Emit real-time event if user is online
      // This would integrate with your WebSocket service
      logger.info('In-app notification created', {
        userId: notification.userId,
        title: notification.title,
      });
    } catch (error) {
      logger.error('Failed to send in-app notification', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(notifications: NotificationPayload[]): Promise<void> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    const succeeded = results.filter(r => r.status === 'fulfilled').length;

    logger.info('Bulk notifications sent', {
      total: notifications.length,
      succeeded,
      failed,
    });
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    try {
      const cacheKey = `user:preferences:${userId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // Default preferences
        const defaultPrefs = {
          userId,
          email: true,
          sms: true,
          push: true,
          inApp: true,
        };

        await prisma.notificationPreference.create({
          data: defaultPrefs,
        });

        await this.redis.setex(cacheKey, 3600, JSON.stringify(defaultPrefs));
        return defaultPrefs;
      }

      await this.redis.setex(cacheKey, 3600, JSON.stringify(preferences));
      return preferences;
    } catch (error) {
      logger.error('Failed to get user preferences', error);
      return null;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    try {
      await prisma.notificationPreference.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          ...preferences,
        },
      });

      // Clear cache
      await this.redis.del(`user:preferences:${userId}`);
      
      logger.info('User preferences updated', { userId });
    } catch (error) {
      logger.error('Failed to update user preferences', error);
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
      const where: any = { userId };
      if (options.type) {
        where.type = options.type;
      }

      const history = await prisma.notificationHistory.findMany({
        where,
        take: options.limit || 20,
        skip: options.offset || 0,
        orderBy: { createdAt: 'desc' },
      });

      return history;
    } catch (error) {
      logger.error('Failed to get notification history', error);
      throw error;
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
          read: true,
          readAt: new Date(),
        },
      });

      logger.info('Notification marked as read', { userId, notificationId });
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  /**
   * Load email templates
   */
  private loadTemplates(): void {
    const templatesDir = join(__dirname, '..', 'templates');
    
    const templates = [
      { name: 'welcome', file: 'welcome.hbs' },
      { name: 'order-confirmation', file: 'order-confirmation.hbs' },
      { name: 'payment-success', file: 'payment-success.hbs' },
      { name: 'shipping-update', file: 'shipping-update.hbs' },
      { name: 'password-reset', file: 'password-reset.hbs' },
      { name: 'verification', file: 'verification.hbs' },
    ];

    templates.forEach(template => {
      try {
        const content = readFileSync(join(templatesDir, template.file), 'utf-8');
        this.templates.set(template.name, {
          html: content,
        });
        logger.info(`Template loaded: ${template.name}`);
      } catch (error) {
        logger.warn(`Failed to load template: ${template.name}`, error);
        // Set a default template
        this.templates.set(template.name, {
          html: '<p>{{message}}</p>',
        });
      }
    });
  }

  /**
   * Get user's FCM tokens
   */
  private async getUserFCMTokens(userId: string): Promise<string[]> {
    try {
      const tokens = await prisma.userDevice.findMany({
        where: {
          userId,
          fcmToken: { not: null },
          active: true,
        },
        select: { fcmToken: true },
      });

      return tokens.map(t => t.fcmToken!).filter(Boolean);
    } catch (error) {
      logger.error('Failed to get user FCM tokens', error);
      return [];
    }
  }

  /**
   * Remove invalid FCM tokens
   */
  private async removeInvalidFCMTokens(userId: string, tokens: string[]): Promise<void> {
    try {
      await prisma.userDevice.updateMany({
        where: {
          userId,
          fcmToken: { in: tokens },
        },
        data: {
          active: false,
          updatedAt: new Date(),
        },
      });

      logger.info('Invalid FCM tokens removed', { userId, count: tokens.length });
    } catch (error) {
      logger.error('Failed to remove invalid FCM tokens', error);
    }
  }

  /**
   * Schedule notification for later
   */
  private async scheduleNotification(payload: NotificationPayload): Promise<void> {
    await prisma.scheduledNotification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        template: payload.template,
        data: payload.data,
        priority: payload.priority,
        scheduledAt: payload.scheduledAt!,
        metadata: payload.metadata || {},
        status: 'PENDING',
      },
    });

    logger.info('Notification scheduled', {
      userId: payload.userId,
      type: payload.type,
      scheduledAt: payload.scheduledAt,
    });
  }

  /**
   * Store notification history
   */
  private async storeNotificationHistory(payload: NotificationPayload): Promise<void> {
    await prisma.notificationHistory.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        template: payload.template,
        data: payload.data,
        priority: payload.priority,
        metadata: payload.metadata || {},
        sentAt: new Date(),
      },
    });
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      const notifications = await prisma.scheduledNotification.findMany({
        where: {
          scheduledAt: { lte: now },
          status: 'PENDING',
        },
        take: 100,
      });

      for (const notification of notifications) {
        try {
          await this.sendNotification({
            userId: notification.userId,
            type: notification.type as any,
            template: notification.template,
            data: notification.data as any,
            priority: notification.priority as any,
            metadata: notification.metadata as any,
          });

          await prisma.scheduledNotification.update({
            where: { id: notification.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });
        } catch (error) {
          logger.error('Failed to send scheduled notification', {
            notificationId: notification.id,
            error,
          });

          await prisma.scheduledNotification.update({
            where: { id: notification.id },
            data: {
              status: 'FAILED',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }
    } catch (error) {
      logger.error('Failed to process scheduled notifications', error);
    }
  }

  /**
   * Send notification based on payload type
   */
  private async sendEmailFromPayload(payload: NotificationPayload): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.email) {
      throw new Error('User email not found');
    }

    await this.sendEmail({
      to: user.email,
      subject: this.getEmailSubject(payload.template),
      template: payload.template,
      data: {
        ...payload.data,
        userName: user.name,
      },
    });
  }

  private async sendSMSFromPayload(payload: NotificationPayload): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.phone) {
      throw new Error('User phone not found');
    }

    const message = this.renderSMSTemplate(payload.template, payload.data);
    
    await this.sendSMS({
      to: user.phone,
      message,
    });
  }

  private async sendPushFromPayload(payload: NotificationPayload): Promise<void> {
    const pushData = this.getPushData(payload.template, payload.data);
    
    await this.sendPush({
      userId: payload.userId,
      title: pushData.title,
      body: pushData.body,
      data: payload.data,
    });
  }

  private async sendInAppFromPayload(payload: NotificationPayload): Promise<void> {
    const inAppData = this.getInAppData(payload.template, payload.data);
    
    await this.sendInApp({
      userId: payload.userId,
      title: inAppData.title,
      message: inAppData.message,
      type: inAppData.type,
      actionUrl: payload.data.actionUrl,
      actionText: payload.data.actionText,
      metadata: payload.metadata,
    });
  }

  /**
   * Get email subject based on template
   */
  private getEmailSubject(template: string): string {
    const subjects: Record<string, string> = {
      'welcome': 'Welcome to UltraMarket!',
      'order-confirmation': 'Order Confirmation - {{orderId}}',
      'payment-success': 'Payment Successful - {{orderId}}',
      'shipping-update': 'Your Order is {{status}}',
      'password-reset': 'Reset Your Password',
      'verification': 'Verify Your Email',
    };

    return subjects[template] || 'UltraMarket Notification';
  }

  /**
   * Render SMS template
   */
  private renderSMSTemplate(template: string, data: Record<string, any>): string {
    const templates: Record<string, string> = {
      'order-confirmation': 'Buyurtmangiz qabul qilindi. Buyurtma raqami: {{orderId}}. Summa: {{amount}} UZS',
      'payment-success': 'To\'lov muvaffaqiyatli amalga oshirildi. Buyurtma: {{orderId}}',
      'shipping-update': 'Buyurtmangiz {{status}}. Kuzatish: {{trackingNumber}}',
      'verification-code': 'Tasdiqlash kodi: {{code}}. 10 daqiqa ichida foydalaning.',
    };

    let message = templates[template] || 'UltraMarket xabari';
    
    // Replace placeholders
    Object.keys(data).forEach(key => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    });

    return message;
  }

  /**
   * Get push notification data
   */
  private getPushData(template: string, data: Record<string, any>): { title: string; body: string } {
    const templates: Record<string, { title: string; body: string }> = {
      'order-confirmation': {
        title: 'Buyurtma tasdiqlandi',
        body: `Buyurtma #${data.orderId} qabul qilindi`,
      },
      'payment-success': {
        title: 'To\'lov amalga oshirildi',
        body: `${data.amount} UZS to'lov qabul qilindi`,
      },
      'shipping-update': {
        title: 'Yetkazib berish yangilanishi',
        body: `Buyurtmangiz ${data.status}`,
      },
    };

    return templates[template] || { title: 'UltraMarket', body: 'Yangi xabar' };
  }

  /**
   * Get in-app notification data
   */
  private getInAppData(template: string, data: Record<string, any>): {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } {
    const templates: Record<string, any> = {
      'order-confirmation': {
        title: 'Buyurtma tasdiqlandi',
        message: `Sizning #${data.orderId} buyurtmangiz qabul qilindi va tez orada ishlov beriladi.`,
        type: 'success',
      },
      'payment-success': {
        title: 'To\'lov muvaffaqiyatli',
        message: `${data.amount} UZS miqdoridagi to'lov qabul qilindi.`,
        type: 'success',
      },
      'shipping-update': {
        title: 'Yetkazib berish yangilandi',
        message: `Buyurtmangiz holati: ${data.status}`,
        type: 'info',
      },
    };

    return templates[template] || {
      title: 'Xabar',
      message: data.message || 'Yangi xabar',
      type: 'info',
    };
  }
}
