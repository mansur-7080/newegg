import { PrismaClient } from '@prisma/client';
import { logger } from '../../../../libs/shared/src/logging/logger';
import { RealEmailService } from '../../email-service/src/services/real-email.service';

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels: NotificationChannel[];
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isRead: boolean;
  isSent: boolean;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  templateId?: string;
  batchId?: string;
  retryCount: number;
  maxRetries: number;
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
}

enum NotificationType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PRICE_DROP = 'PRICE_DROP',
  BACK_IN_STOCK = 'BACK_IN_STOCK',
  NEW_PRODUCT = 'NEW_PRODUCT',
  PROMOTION = 'PROMOTION',
  ACCOUNT_VERIFICATION = 'ACCOUNT_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  SECURITY_ALERT = 'SECURITY_ALERT',
  REVIEW_REMINDER = 'REVIEW_REMINDER',
  WISHLIST_SALE = 'WISHLIST_SALE',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  GENERAL = 'GENERAL',
}

enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  preferences: {
    [key in NotificationType]: {
      push: boolean;
      email: boolean;
      sms: boolean;
      inApp: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
    timezone: string;
  };
  updatedAt: Date;
}

interface SendNotificationRequest {
  userId?: string;
  userIds?: string[];
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels?: NotificationChannel[];
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  templateId?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  click_action?: string;
  data?: any;
}

interface SMSRequest {
  phone: string;
  message: string;
  userId: string;
  type: NotificationType;
}

export class RealNotificationService {
  private db: PrismaClient;
  private emailService: RealEmailService;

  constructor() {
    this.db = new PrismaClient();
    this.emailService = new RealEmailService();
  }

  /**
   * Send notification to user(s)
   */
  async sendNotification(request: SendNotificationRequest): Promise<void> {
    try {
      const userIds = request.userIds || (request.userId ? [request.userId] : []);
      
      if (userIds.length === 0) {
        throw new Error('No recipients specified');
      }

      // Create batch ID for group notifications
      const batchId = userIds.length > 1 ? this.generateBatchId() : undefined;

      // Process each user
      const notifications = await Promise.all(
        userIds.map(userId => this.createNotificationForUser(userId, request, batchId))
      );

      // Send notifications through available channels
      await Promise.all(
        notifications.map(notification => this.processNotification(notification))
      );

      logger.info('Notifications sent successfully', {
        type: request.type,
        recipientCount: userIds.length,
        batchId,
      });
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request,
      });
      throw error;
    }
  }

  /**
   * Create notification record for a user
   */
  private async createNotificationForUser(
    userId: string,
    request: SendNotificationRequest,
    batchId?: string
  ): Promise<Notification> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Determine channels based on preferences and request
      const availableChannels = request.channels || [
        NotificationChannel.PUSH,
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ];

      const enabledChannels = this.filterEnabledChannels(
        availableChannels,
        request.type,
        preferences
      );

      // Check if scheduled for quiet hours
      const isQuietHours = this.isQuietHours(preferences);
      const priority = request.priority || 'NORMAL';
      
      // Don't send non-urgent notifications during quiet hours
      if (isQuietHours && priority !== 'URGENT') {
        const scheduledFor = this.getNextActiveTime(preferences);
        request.scheduledFor = scheduledFor;
      }

      const notification = await this.db.notification.create({
        data: {
          userId,
          type: request.type,
          title: request.title,
          message: request.message,
          data: request.data ? JSON.stringify(request.data) : null,
          channels: enabledChannels,
          priority,
          templateId: request.templateId,
          batchId,
          scheduledFor: request.scheduledFor,
          expiresAt: request.expiresAt,
          maxRetries: this.getMaxRetries(request.type),
          isRead: false,
          isSent: false,
          retryCount: 0,
        },
      });

      return this.mapPrismaNotificationToInterface(notification);
    } catch (error) {
      logger.error('Failed to create notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        type: request.type,
      });
      throw error;
    }
  }

  /**
   * Process notification through enabled channels
   */
  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Check if notification should be sent now
      if (notification.scheduledFor && notification.scheduledFor > new Date()) {
        logger.info('Notification scheduled for later', {
          notificationId: notification.id,
          scheduledFor: notification.scheduledFor,
        });
        return;
      }

      // Check if notification has expired
      if (notification.expiresAt && notification.expiresAt < new Date()) {
        await this.markNotificationExpired(notification.id);
        return;
      }

      const user = await this.getUserForNotification(notification.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const results = await Promise.allSettled([
        // Send through enabled channels
        ...notification.channels.map(channel => 
          this.sendThroughChannel(notification, user, channel)
        ),
      ]);

      // Check if any channel succeeded
      const hasSuccess = results.some(result => result.status === 'fulfilled');
      
      if (hasSuccess) {
        await this.markNotificationSent(notification.id);
        logger.info('Notification sent successfully', {
          notificationId: notification.id,
          userId: notification.userId,
          type: notification.type,
          channels: notification.channels,
        });
      } else {
        await this.handleNotificationFailure(notification);
      }
    } catch (error) {
      logger.error('Failed to process notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification.id,
      });
      
      await this.handleNotificationFailure(notification);
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendThroughChannel(
    notification: Notification,
    user: any,
    channel: NotificationChannel
  ): Promise<void> {
    switch (channel) {
      case NotificationChannel.PUSH:
        await this.sendPushNotification(notification, user);
        break;
      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(notification, user);
        break;
      case NotificationChannel.SMS:
        await this.sendSMSNotification(notification, user);
        break;
      case NotificationChannel.IN_APP:
        // In-app notifications are already stored in DB
        break;
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: Notification, user: any): Promise<void> {
    try {
      // Get user's FCM tokens
      const fcmTokens = await this.db.userDevice.findMany({
        where: {
          userId: user.id,
          fcmToken: { not: null },
          isActive: true,
        },
        select: { fcmToken: true },
      });

      if (fcmTokens.length === 0) {
        logger.warn('No FCM tokens found for user', { userId: user.id });
        return;
      }

      const payload: PushNotificationPayload = {
        title: notification.title,
        body: notification.message,
        icon: '/icons/app-icon-192.png',
        badge: '/icons/badge-icon.png',
        click_action: this.getClickAction(notification),
        data: {
          notificationId: notification.id,
          type: notification.type,
          userId: notification.userId,
          ...notification.data,
        },
      };

      // Send to Firebase Cloud Messaging
      await this.sendFCMNotification(fcmTokens.map(t => t.fcmToken!), payload);

      logger.info('Push notification sent', {
        notificationId: notification.id,
        tokenCount: fcmTokens.length,
      });
    } catch (error) {
      logger.error('Failed to send push notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification.id,
      });
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: Notification, user: any): Promise<void> {
    try {
      if (!user.email) {
        throw new Error('User email not found');
      }

      // Use template if specified
      if (notification.templateId) {
        await this.emailService.sendTemplatedEmail({
          to: user.email,
          templateId: notification.templateId,
          data: {
            userName: `${user.firstName} ${user.lastName}`,
            title: notification.title,
            message: notification.message,
            ...notification.data,
          },
        });
      } else {
        // Send generic notification email
        await this.emailService.sendNotificationEmail({
          to: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          data: notification.data,
        });
      }

      logger.info('Email notification sent', {
        notificationId: notification.id,
        email: user.email,
      });
    } catch (error) {
      logger.error('Failed to send email notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification.id,
      });
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: Notification, user: any): Promise<void> {
    try {
      if (!user.phone) {
        throw new Error('User phone not found');
      }

      // Create SMS-friendly message
      const smsMessage = this.createSMSMessage(notification);

      await this.sendSMS({
        phone: user.phone,
        message: smsMessage,
        userId: user.id,
        type: notification.type,
      });

      logger.info('SMS notification sent', {
        notificationId: notification.id,
        phone: user.phone.substring(0, 8) + '***', // Mask phone for privacy
      });
    } catch (error) {
      logger.error('Failed to send SMS notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification.id,
      });
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
    } = {}
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
    totalPages: number;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = { userId };
      
      if (options.unreadOnly) {
        where.isRead = false;
      }
      
      if (options.types && options.types.length > 0) {
        where.type = { in: options.types };
      }

      // Don't include expired notifications
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];

      const [notifications, total, unreadCount] = await Promise.all([
        this.db.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.db.notification.count({ where }),
        this.db.notification.count({
          where: { ...where, isRead: false },
        }),
      ]);

      return {
        notifications: notifications.map(this.mapPrismaNotificationToInterface),
        total,
        unreadCount,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get user notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        options,
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await this.db.notification.updateMany({
        where: {
          id: notificationId,
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('Notification marked as read', {
        notificationId,
        userId,
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await this.db.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      logger.info('All notifications marked as read', {
        userId,
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await this.db.notification.deleteMany({
        where: {
          id: notificationId,
          userId,
        },
      });

      if (result.count === 0) {
        throw new Error('Notification not found or not owned by user');
      }

      logger.info('Notification deleted', {
        notificationId,
        userId,
      });
    } catch (error) {
      logger.error('Failed to delete notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const updated = await this.db.userNotificationPreferences.upsert({
        where: { userId },
        create: {
          userId,
          ...preferences,
          updatedAt: new Date(),
        },
        update: {
          ...preferences,
          updatedAt: new Date(),
        },
      });

      logger.info('Notification preferences updated', {
        userId,
        updatedFields: Object.keys(preferences),
      });

      return this.mapPrismaPreferencesToInterface(updated);
    } catch (error) {
      logger.error('Failed to update notification preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        preferences,
      });
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await this.db.userNotificationPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // Return default preferences
        return this.getDefaultPreferences(userId);
      }

      return this.mapPrismaPreferencesToInterface(preferences);
    } catch (error) {
      logger.error('Failed to get user notification preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      
      // Return default preferences on error
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Register FCM token for push notifications
   */
  async registerFCMToken(
    userId: string,
    token: string,
    deviceInfo: {
      deviceId: string;
      deviceType: 'WEB' | 'ANDROID' | 'IOS';
      deviceName?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      await this.db.userDevice.upsert({
        where: {
          userId_deviceId: {
            userId,
            deviceId: deviceInfo.deviceId,
          },
        },
        create: {
          userId,
          deviceId: deviceInfo.deviceId,
          deviceType: deviceInfo.deviceType,
          deviceName: deviceInfo.deviceName,
          userAgent: deviceInfo.userAgent,
          fcmToken: token,
          isActive: true,
          lastSeenAt: new Date(),
        },
        update: {
          fcmToken: token,
          isActive: true,
          lastSeenAt: new Date(),
          deviceName: deviceInfo.deviceName,
          userAgent: deviceInfo.userAgent,
        },
      });

      logger.info('FCM token registered', {
        userId,
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
      });
    } catch (error) {
      logger.error('Failed to register FCM token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        deviceInfo,
      });
      throw error;
    }
  }

  /**
   * Unregister FCM token
   */
  async unregisterFCMToken(userId: string, deviceId: string): Promise<void> {
    try {
      await this.db.userDevice.updateMany({
        where: {
          userId,
          deviceId,
        },
        data: {
          isActive: false,
          fcmToken: null,
        },
      });

      logger.info('FCM token unregistered', {
        userId,
        deviceId,
      });
    } catch (error) {
      logger.error('Failed to unregister FCM token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(
    userIds: string[],
    notification: Omit<SendNotificationRequest, 'userId' | 'userIds'>
  ): Promise<void> {
    try {
      const batchSize = 100; // Process in batches
      const batches = this.chunkArray(userIds, batchSize);

      for (const batch of batches) {
        await this.sendNotification({
          ...notification,
          userIds: batch,
        });
      }

      logger.info('Bulk notification sent', {
        type: notification.type,
        totalRecipients: userIds.length,
        batchCount: batches.length,
      });
    } catch (error) {
      logger.error('Failed to send bulk notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userCount: userIds.length,
        type: notification.type,
      });
      throw error;
    }
  }

  /**
   * Cleanup expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await this.db.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info('Expired notifications cleaned up', {
        deletedCount: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications(): Promise<number> {
    try {
      const notifications = await this.db.notification.findMany({
        where: {
          scheduledFor: {
            lte: new Date(),
          },
          isSent: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        take: 100, // Process 100 at a time
      });

      let processedCount = 0;

      for (const notificationData of notifications) {
        try {
          const notification = this.mapPrismaNotificationToInterface(notificationData);
          await this.processNotification(notification);
          processedCount++;
        } catch (error) {
          logger.error('Failed to process scheduled notification', {
            error: error instanceof Error ? error.message : 'Unknown error',
            notificationId: notificationData.id,
          });
        }
      }

      logger.info('Scheduled notifications processed', {
        processedCount,
        totalFound: notifications.length,
      });

      return processedCount;
    } catch (error) {
      logger.error('Failed to process scheduled notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Private helper methods

  private async getUserForNotification(userId: string): Promise<any> {
    return await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredLanguage: true,
      },
    });
  }

  private filterEnabledChannels(
    requestedChannels: NotificationChannel[],
    type: NotificationType,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    return requestedChannels.filter(channel => {
      const globalEnabled = this.isChannelGloballyEnabled(channel, preferences);
      const typeEnabled = this.isChannelEnabledForType(channel, type, preferences);
      return globalEnabled && typeEnabled;
    });
  }

  private isChannelGloballyEnabled(
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): boolean {
    switch (channel) {
      case NotificationChannel.PUSH:
        return preferences.pushEnabled;
      case NotificationChannel.EMAIL:
        return preferences.emailEnabled;
      case NotificationChannel.SMS:
        return preferences.smsEnabled;
      case NotificationChannel.IN_APP:
        return preferences.inAppEnabled;
      default:
        return false;
    }
  }

  private isChannelEnabledForType(
    channel: NotificationChannel,
    type: NotificationType,
    preferences: NotificationPreferences
  ): boolean {
    const typePrefs = preferences.preferences[type];
    if (!typePrefs) return true; // Default to enabled if not specified

    switch (channel) {
      case NotificationChannel.PUSH:
        return typePrefs.push;
      case NotificationChannel.EMAIL:
        return typePrefs.email;
      case NotificationChannel.SMS:
        return typePrefs.sms;
      case NotificationChannel.IN_APP:
        return typePrefs.inApp;
      default:
        return false;
    }
  }

  private isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return (
      currentTime >= preferences.quietHours.startTime &&
      currentTime <= preferences.quietHours.endTime
    );
  }

  private getNextActiveTime(preferences: NotificationPreferences): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [endHour, endMinute] = preferences.quietHours.endTime.split(':').map(Number);
    const nextActive = new Date(now);
    nextActive.setHours(endHour, endMinute, 0, 0);
    
    if (nextActive <= now) {
      nextActive.setDate(nextActive.getDate() + 1);
    }
    
    return nextActive;
  }

  private getMaxRetries(type: NotificationType): number {
    const urgentTypes = [
      NotificationType.SECURITY_ALERT,
      NotificationType.PAYMENT_FAILED,
      NotificationType.ORDER_CANCELLED,
    ];
    
    return urgentTypes.includes(type) ? 5 : 3;
  }

  private getClickAction(notification: Notification): string {
    switch (notification.type) {
      case NotificationType.ORDER_CONFIRMATION:
      case NotificationType.ORDER_SHIPPED:
      case NotificationType.ORDER_DELIVERED:
        return `/order/${notification.data?.orderId}`;
      case NotificationType.PRICE_DROP:
      case NotificationType.BACK_IN_STOCK:
        return `/product/${notification.data?.productId}`;
      default:
        return '/notifications';
    }
  }

  private createSMSMessage(notification: Notification): string {
    // Create a concise SMS message (max 160 characters)
    const message = `${notification.title}: ${notification.message}`;
    return message.length > 160 ? message.substring(0, 157) + '...' : message;
  }

  private async sendFCMNotification(tokens: string[], payload: PushNotificationPayload): Promise<void> {
    // In production, integrate with Firebase Admin SDK
    // For now, simulate the API call
    logger.info('FCM notification simulated', {
      tokenCount: tokens.length,
      title: payload.title,
    });
  }

  private async sendSMS(request: SMSRequest): Promise<void> {
    // In production, integrate with SMS provider (Twilio, etc.)
    // For now, simulate the API call
    logger.info('SMS notification simulated', {
      phone: request.phone.substring(0, 8) + '***',
      type: request.type,
    });
  }

  private async markNotificationSent(notificationId: string): Promise<void> {
    await this.db.notification.update({
      where: { id: notificationId },
      data: {
        isSent: true,
        sentAt: new Date(),
      },
    });
  }

  private async markNotificationExpired(notificationId: string): Promise<void> {
    await this.db.notification.update({
      where: { id: notificationId },
      data: {
        isSent: false,
        updatedAt: new Date(),
      },
    });
  }

  private async handleNotificationFailure(notification: Notification): Promise<void> {
    const newRetryCount = notification.retryCount + 1;
    
    if (newRetryCount >= notification.maxRetries) {
      // Mark as failed
      await this.db.notification.update({
        where: { id: notification.id },
        data: {
          retryCount: newRetryCount,
          isSent: false,
          updatedAt: new Date(),
        },
      });
      
      logger.error('Notification failed after max retries', {
        notificationId: notification.id,
        retryCount: newRetryCount,
        maxRetries: notification.maxRetries,
      });
    } else {
      // Schedule retry
      const retryDelay = Math.pow(2, newRetryCount) * 60 * 1000; // Exponential backoff in minutes
      const scheduledFor = new Date(Date.now() + retryDelay);
      
      await this.db.notification.update({
        where: { id: notification.id },
        data: {
          retryCount: newRetryCount,
          scheduledFor,
          updatedAt: new Date(),
        },
      });
      
      logger.info('Notification scheduled for retry', {
        notificationId: notification.id,
        retryCount: newRetryCount,
        scheduledFor,
      });
    }
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    const defaultTypePreferences = {
      push: true,
      email: true,
      sms: false,
      inApp: true,
    };

    return {
      userId,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      preferences: Object.values(NotificationType).reduce((acc, type) => {
        acc[type] = { ...defaultTypePreferences };
        return acc;
      }, {} as any),
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Asia/Tashkent',
      },
      updatedAt: new Date(),
    };
  }

  private mapPrismaNotificationToInterface(prismaNotification: any): Notification {
    return {
      id: prismaNotification.id,
      userId: prismaNotification.userId,
      type: prismaNotification.type,
      title: prismaNotification.title,
      message: prismaNotification.message,
      data: prismaNotification.data ? JSON.parse(prismaNotification.data) : null,
      channels: prismaNotification.channels,
      priority: prismaNotification.priority,
      isRead: prismaNotification.isRead,
      isSent: prismaNotification.isSent,
      sentAt: prismaNotification.sentAt,
      readAt: prismaNotification.readAt,
      expiresAt: prismaNotification.expiresAt,
      templateId: prismaNotification.templateId,
      batchId: prismaNotification.batchId,
      retryCount: prismaNotification.retryCount,
      maxRetries: prismaNotification.maxRetries,
      scheduledFor: prismaNotification.scheduledFor,
      createdAt: prismaNotification.createdAt,
      updatedAt: prismaNotification.updatedAt,
    };
  }

  private mapPrismaPreferencesToInterface(prismaPreferences: any): NotificationPreferences {
    return {
      userId: prismaPreferences.userId,
      pushEnabled: prismaPreferences.pushEnabled,
      emailEnabled: prismaPreferences.emailEnabled,
      smsEnabled: prismaPreferences.smsEnabled,
      inAppEnabled: prismaPreferences.inAppEnabled,
      preferences: prismaPreferences.preferences ? JSON.parse(prismaPreferences.preferences) : {},
      quietHours: prismaPreferences.quietHours ? JSON.parse(prismaPreferences.quietHours) : {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Asia/Tashkent',
      },
      updatedAt: prismaPreferences.updatedAt,
    };
  }
}