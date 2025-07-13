// Mock logger for demonstration
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta),
};

// Enhanced logger for notification events
const notificationLogger = {
  info: (message: string, meta?: any) => console.log(`[NOTIFICATION-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[NOTIFICATION-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[NOTIFICATION-WARN] ${message}`, meta),
  security: (message: string, meta?: any) => console.log(`[SECURITY] ${message}`, meta),
};

export interface NotificationMessage {
  id: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  recipient: string;
  subject?: string;
  content: string;
  templateId?: string;
  templateData?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'queued' | 'sending' | 'delivered' | 'failed' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryResult {
  success: boolean;
  messageId: string;
  deliveryId?: string;
  errorMessage?: string;
  retryAfter?: Date;
}

export interface NotificationQueue {
  pending: NotificationMessage[];
  processing: NotificationMessage[];
  failed: NotificationMessage[];
  delivered: NotificationMessage[];
}

export interface NotificationStats {
  total: number;
  pending: number;
  processing: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  retryRate: number;
}

// Mock notification providers
class MockEmailProvider {
  async sendEmail(to: string, subject: string, content: string): Promise<DeliveryResult> {
    const success = Math.random() > 0.1; // 90% success rate
    const deliveryId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success,
      messageId: `msg_${Date.now()}`,
      deliveryId: success ? deliveryId : undefined,
      errorMessage: success ? undefined : 'Email delivery failed',
    };
  }
}

class MockSMSProvider {
  async sendSMS(to: string, content: string): Promise<DeliveryResult> {
    const success = Math.random() > 0.05; // 95% success rate
    const deliveryId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success,
      messageId: `msg_${Date.now()}`,
      deliveryId: success ? deliveryId : undefined,
      errorMessage: success ? undefined : 'SMS delivery failed',
    };
  }
}

class MockPushProvider {
  async sendPushNotification(to: string, title: string, content: string): Promise<DeliveryResult> {
    const success = Math.random() > 0.15; // 85% success rate
    const deliveryId = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success,
      messageId: `msg_${Date.now()}`,
      deliveryId: success ? deliveryId : undefined,
      errorMessage: success ? undefined : 'Push notification failed',
    };
  }
}

export class NotificationManager {
  private emailProvider: MockEmailProvider;
  private smsProvider: MockSMSProvider;
  private pushProvider: MockPushProvider;
  private queue: NotificationQueue;
  private templates: Map<string, NotificationTemplate>;
  private isProcessing: boolean = false;
  private maxRetries: number = 3;
  private retryDelays: number[] = [1000, 5000, 15000]; // 1s, 5s, 15s

  constructor() {
    this.emailProvider = new MockEmailProvider();
    this.smsProvider = new MockSMSProvider();
    this.pushProvider = new MockPushProvider();
    this.queue = {
      pending: [],
      processing: [],
      failed: [],
      delivered: [],
    };
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * ENHANCED: Send notification with comprehensive tracking
   */
  async sendNotification(notificationData: {
    type: 'email' | 'sms' | 'push' | 'in_app';
    recipient: string;
    subject?: string;
    content?: string;
    templateId?: string;
    templateData?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    scheduledAt?: Date;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    messageId?: string;
    errors: string[];
  }> {
    try {
      // 1. Validate notification data
      const validation = this.validateNotificationData(notificationData);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // 2. Process template if provided
      let finalContent = notificationData.content || '';
      let finalSubject = notificationData.subject || '';

      if (notificationData.templateId) {
        const templateResult = await this.processTemplate(
          notificationData.templateId,
          notificationData.templateData || {}
        );
        
        if (!templateResult.success) {
          return {
            success: false,
            errors: templateResult.errors,
          };
        }

        finalContent = templateResult.content;
        finalSubject = templateResult.subject || finalSubject;
      }

      // 3. Create notification message
      const message: NotificationMessage = {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: notificationData.type,
        recipient: notificationData.recipient,
        subject: finalSubject,
        content: finalContent || '',
        templateId: notificationData.templateId,
        templateData: notificationData.templateData,
        priority: notificationData.priority || 'normal',
        status: 'pending',
        attempts: 0,
        maxAttempts: this.maxRetries,
        scheduledAt: notificationData.scheduledAt,
        metadata: notificationData.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 4. Add to queue
      this.addToQueue(message);

      // 5. Process immediately if not scheduled
      if (!message.scheduledAt || message.scheduledAt <= new Date()) {
        this.processQueue();
      }

      notificationLogger.info('Notification queued successfully', {
        messageId: message.id,
        type: message.type,
        recipient: message.recipient,
        priority: message.priority,
      });

      return {
        success: true,
        messageId: message.id,
        errors: [],
      };
    } catch (error) {
      notificationLogger.error('Failed to send notification', { error, notificationData });
      return {
        success: false,
        errors: ['Failed to send notification due to system error'],
      };
    }
  }

  /**
   * ENHANCED: Process notification queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process pending messages
      while (this.queue.pending.length > 0) {
        const message = this.queue.pending.shift();
        if (!message) continue;

        // Move to processing
        this.queue.processing.push(message);
        message.status = 'sending';
        message.updatedAt = new Date();

        // Send notification
        const result = await this.sendNotificationMessage(message);

        if (result.success) {
          // Move to delivered
          this.queue.processing = this.queue.processing.filter(m => m.id !== message.id);
          this.queue.delivered.push(message);
          message.status = 'delivered';
          message.deliveredAt = new Date();
          message.updatedAt = new Date();

          notificationLogger.info('Notification delivered successfully', {
            messageId: message.id,
            type: message.type,
            recipient: message.recipient,
          });
        } else {
          // Handle failure
          message.attempts++;
          message.errorMessage = result.errorMessage;
          message.updatedAt = new Date();

          if (message.attempts >= message.maxAttempts) {
            // Move to failed
            this.queue.processing = this.queue.processing.filter(m => m.id !== message.id);
            this.queue.failed.push(message);
            message.status = 'failed';

            notificationLogger.error('Notification failed after max attempts', {
              messageId: message.id,
              attempts: message.attempts,
              error: result.errorMessage,
            });
          } else {
            // Schedule retry
            const retryDelay = this.retryDelays[message.attempts - 1] || this.retryDelays[this.retryDelays.length - 1];
            message.scheduledAt = new Date(Date.now() + retryDelay);
            
            notificationLogger.warn('Notification scheduled for retry', {
              messageId: message.id,
              attempt: message.attempts,
              retryAfter: message.scheduledAt,
            });
          }
        }
      }

      // Process scheduled messages
      const now = new Date();
      const scheduledMessages = this.queue.processing.filter(m => 
        m.scheduledAt && m.scheduledAt <= now
      );

      for (const message of scheduledMessages) {
        this.queue.processing = this.queue.processing.filter(m => m.id !== message.id);
        this.queue.pending.unshift(message); // Add to front of queue
      }

    } catch (error) {
      notificationLogger.error('Queue processing error', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * ENHANCED: Send individual notification message
   */
  private async sendNotificationMessage(message: NotificationMessage): Promise<DeliveryResult> {
    try {
      let result: DeliveryResult;

      switch (message.type) {
        case 'email':
          result = await this.emailProvider.sendEmail(
            message.recipient,
            message.subject || '',
            message.content
          );
          break;
        case 'sms':
          result = await this.smsProvider.sendSMS(
            message.recipient,
            message.content
          );
          break;
        case 'push':
          result = await this.pushProvider.sendPushNotification(
            message.recipient,
            message.subject || '',
            message.content
          );
          break;
        case 'in_app':
          // In-app notifications are always successful
          result = {
            success: true,
            messageId: message.id,
            deliveryId: `in_app_${Date.now()}`,
          };
          break;
        default:
          result = {
            success: false,
            messageId: message.id,
            errorMessage: 'Unsupported notification type',
          };
      }

      if (result.success) {
        message.sentAt = new Date();
      }

      return result;
    } catch (error) {
      notificationLogger.error('Failed to send notification message', {
        messageId: message.id,
        error,
      });

      return {
        success: false,
        messageId: message.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ENHANCED: Process notification template
   */
  private async processTemplate(
    templateId: string,
    data: Record<string, any>
  ): Promise<{
    success: boolean;
    content?: string;
    subject?: string;
    errors: string[];
  }> {
    const template = this.templates.get(templateId);
    
    if (!template) {
      return {
        success: false,
        errors: ['Template not found'],
      };
    }

    if (!template.isActive) {
      return {
        success: false,
        errors: ['Template is inactive'],
      };
    }

    try {
      // Simple template processing (replace {{variable}} with values)
      let content = template.content;
      let subject = template.subject || '';

      for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), String(value));
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      }

      // Check for missing variables
      const missingVariables = this.findMissingVariables(content, template.variables);
      if (missingVariables.length > 0) {
        return {
          success: false,
          errors: [`Missing template variables: ${missingVariables.join(', ')}`],
        };
      }

      return {
        success: true,
        content,
        subject,
        errors: [],
      };
    } catch (error) {
      notificationLogger.error('Template processing failed', { templateId, error });
      return {
        success: false,
        errors: ['Template processing failed'],
      };
    }
  }

  /**
   * ENHANCED: Get notification statistics
   */
  async getNotificationStats(): Promise<NotificationStats> {
    const total = this.queue.pending.length + 
                  this.queue.processing.length + 
                  this.queue.delivered.length + 
                  this.queue.failed.length;

    const delivered = this.queue.delivered.length;
    const failed = this.queue.failed.length;
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;

    // Calculate average delivery time
    const deliveryTimes = this.queue.delivered
      .filter(m => m.sentAt && m.deliveredAt)
      .map(m => m.deliveredAt!.getTime() - m.sentAt!.getTime());

    const averageDeliveryTime = deliveryTimes.length > 0 
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length 
      : 0;

    // Calculate retry rate
    const totalAttempts = this.queue.delivered.reduce((sum, m) => sum + m.attempts, 0) +
                          this.queue.failed.reduce((sum, m) => sum + m.attempts, 0);
    const retryRate = total > 0 ? (totalAttempts / total) : 0;

    return {
      total,
      pending: this.queue.pending.length,
      processing: this.queue.processing.length,
      delivered,
      failed,
      deliveryRate,
      averageDeliveryTime,
      retryRate,
    };
  }

  /**
   * ENHANCED: Cancel notification
   */
  async cancelNotification(messageId: string): Promise<{
    success: boolean;
    errors: string[];
  }> {
    try {
      // Find message in all queues
      const message = this.queue.pending.find(m => m.id === messageId) ||
                     this.queue.processing.find(m => m.id === messageId);

      if (!message) {
        return {
          success: false,
          errors: ['Notification not found or already processed'],
        };
      }

      // Remove from queue
      this.queue.pending = this.queue.pending.filter(m => m.id !== messageId);
      this.queue.processing = this.queue.processing.filter(m => m.id !== messageId);

      // Update status
      message.status = 'cancelled';
      message.updatedAt = new Date();

      notificationLogger.info('Notification cancelled', { messageId });

      return {
        success: true,
        errors: [],
      };
    } catch (error) {
      notificationLogger.error('Failed to cancel notification', { messageId, error });
      return {
        success: false,
        errors: ['Failed to cancel notification'],
      };
    }
  }

  /**
   * ENHANCED: Retry failed notifications
   */
  async retryFailedNotifications(): Promise<{
    success: boolean;
    retried: number;
    errors: string[];
  }> {
    try {
      const failedMessages = [...this.queue.failed];
      let retried = 0;

      for (const message of failedMessages) {
        if (message.attempts < message.maxAttempts) {
          // Reset message for retry
          message.status = 'pending';
          message.attempts = 0;
          message.errorMessage = undefined;
          message.scheduledAt = undefined;
          message.updatedAt = new Date();

          // Move back to pending queue
          this.queue.failed = this.queue.failed.filter(m => m.id !== message.id);
          this.queue.pending.push(message);
          retried++;
        }
      }

      // Process queue
      await this.processQueue();

      notificationLogger.info('Failed notifications retried', { retried });

      return {
        success: true,
        retried,
        errors: [],
      };
    } catch (error) {
      notificationLogger.error('Failed to retry notifications', { error });
      return {
        success: false,
        retried: 0,
        errors: ['Failed to retry notifications'],
      };
    }
  }

  /**
   * Add message to queue
   */
  private addToQueue(message: NotificationMessage): void {
    // Add to appropriate position based on priority
    const priorities = ['urgent', 'high', 'normal', 'low'];
    const messagePriority = priorities.indexOf(message.priority);
    
    let inserted = false;
    for (let i = 0; i < this.queue.pending.length; i++) {
      const existingPriority = priorities.indexOf(this.queue.pending[i].priority);
      if (messagePriority <= existingPriority) {
        this.queue.pending.splice(i, 0, message);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.pending.push(message);
    }
  }

  /**
   * Validate notification data
   */
  private validateNotificationData(data: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!data.type) {
      errors.push('Notification type is required');
    } else if (!['email', 'sms', 'push', 'in_app'].includes(data.type)) {
      errors.push('Invalid notification type');
    }

    if (!data.recipient) {
      errors.push('Recipient is required');
    }

    // Content validation
    if (!data.content && !data.templateId) {
      errors.push('Either content or templateId is required');
    }

    // Email-specific validation
    if (data.type === 'email' && !data.subject && !data.templateId) {
      errors.push('Subject is required for email notifications');
    }

    // Recipient format validation
    if (data.recipient) {
      if (data.type === 'email' && !this.isValidEmail(data.recipient)) {
        errors.push('Invalid email format');
      } else if (data.type === 'sms' && !this.isValidPhone(data.recipient)) {
        errors.push('Invalid phone number format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Find missing template variables
   */
  private findMissingVariables(content: string, variables: string[]): string[] {
    const missing: string[] = [];
    
    for (const variable of variables) {
      const placeholder = `{{${variable}}}`;
      if (content.includes(placeholder)) {
        missing.push(variable);
      }
    }

    return missing;
  }

  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'welcome_email',
        name: 'Welcome Email',
        type: 'email',
        subject: 'Welcome to UltraMarket, {{firstName}}!',
        content: `
          <h1>Welcome to UltraMarket!</h1>
          <p>Hi {{firstName}},</p>
          <p>Thank you for joining UltraMarket. We're excited to have you on board!</p>
          <p>Your account has been successfully created.</p>
          <p>Best regards,<br>The UltraMarket Team</p>
        `,
        variables: ['firstName'],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'order_confirmation',
        name: 'Order Confirmation',
        type: 'email',
        subject: 'Order Confirmation - Order #{{orderNumber}}',
        content: `
          <h1>Order Confirmation</h1>
          <p>Hi {{customerName}},</p>
          <p>Thank you for your order! Your order has been confirmed.</p>
          <p><strong>Order Number:</strong> {{orderNumber}}</p>
          <p><strong>Total Amount:</strong> ${{totalAmount}}</p>
          <p>We'll notify you when your order ships.</p>
          <p>Best regards,<br>The UltraMarket Team</p>
        `,
        variables: ['customerName', 'orderNumber', 'totalAmount'],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'password_reset',
        name: 'Password Reset',
        type: 'email',
        subject: 'Password Reset Request',
        content: `
          <h1>Password Reset</h1>
          <p>Hi {{firstName}},</p>
          <p>You requested a password reset for your UltraMarket account.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="{{resetLink}}">Reset Password</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>The UltraMarket Team</p>
        `,
        variables: ['firstName', 'resetLink'],
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Utility methods
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();