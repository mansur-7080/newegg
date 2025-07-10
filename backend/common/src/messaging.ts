import { Kafka, Producer, Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import { logger } from './logger';

// Kafka configuration
const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'newegg-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  ssl: process.env.KAFKA_SSL === 'true',
  sasl: process.env.KAFKA_SASL === 'true' ? {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME || '',
    password: process.env.KAFKA_PASSWORD || ''
  } : undefined,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
};

// Create Kafka instance
export const kafka = new Kafka(kafkaConfig);

// Message broker service
export class MessageBrokerService {
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();

  constructor() {
    this.producer = kafka.producer();
  }

  // Initialize producer
  async initializeProducer(): Promise<void> {
    try {
      await this.producer.connect();
      logger.info('Kafka producer connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  // Send message to topic
  async sendMessage(topic: string, message: any, key?: string): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{
          key: key || Date.now().toString(),
          value: JSON.stringify(message),
          timestamp: Date.now()
        }]
      });
      logger.debug(`Message sent to topic: ${topic}`);
    } catch (error) {
      logger.error(`Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  // Send multiple messages
  async sendBatchMessages(topic: string, messages: Array<{ key?: string; value: any }>): Promise<void> {
    try {
      const kafkaMessages = messages.map(msg => ({
        key: msg.key || Date.now().toString(),
        value: JSON.stringify(msg.value),
        timestamp: Date.now()
      }));

      await this.producer.send({
        topic,
        messages: kafkaMessages
      });
      logger.debug(`Batch messages sent to topic: ${topic}, count: ${messages.length}`);
    } catch (error) {
      logger.error(`Failed to send batch messages to topic ${topic}:`, error);
      throw error;
    }
  }

  // Create consumer
  async createConsumer(groupId: string): Promise<Consumer> {
    try {
      const consumer = kafka.consumer({ groupId });
      await consumer.connect();
      logger.info(`Kafka consumer created for group: ${groupId}`);
      return consumer;
    } catch (error) {
      logger.error(`Failed to create consumer for group ${groupId}:`, error);
      throw error;
    }
  }

  // Subscribe to topic
  async subscribeToTopic(
    consumer: Consumer,
    topic: string,
    handler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    try {
      await consumer.subscribe({ topic, fromBeginning: false });
      
      await consumer.run({
        eachMessage: async (payload) => {
          try {
            await handler(payload);
          } catch (error) {
            logger.error(`Error processing message from topic ${topic}:`, error);
          }
        }
      });

      logger.info(`Subscribed to topic: ${topic}`);
    } catch (error) {
      logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  // Disconnect producer
  async disconnectProducer(): Promise<void> {
    try {
      await this.producer.disconnect();
      logger.info('Kafka producer disconnected');
    } catch (error) {
      logger.error('Failed to disconnect Kafka producer:', error);
    }
  }

  // Disconnect consumer
  async disconnectConsumer(consumer: Consumer): Promise<void> {
    try {
      await consumer.disconnect();
      logger.info('Kafka consumer disconnected');
    } catch (error) {
      logger.error('Failed to disconnect Kafka consumer:', error);
    }
  }

  // Disconnect all consumers
  async disconnectAllConsumers(): Promise<void> {
    for (const [groupId, consumer] of this.consumers) {
      await this.disconnectConsumer(consumer);
      this.consumers.delete(groupId);
    }
  }
}

// Event types
export enum EventType {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',
  PAYMENT_PROCESSED = 'payment.processed',
  PAYMENT_FAILED = 'payment.failed',
  CART_UPDATED = 'cart.updated',
  CART_CLEARED = 'cart.cleared',
  REVIEW_CREATED = 'review.created',
  REVIEW_UPDATED = 'review.updated',
  NOTIFICATION_SENT = 'notification.sent',
  SEARCH_PERFORMED = 'search.performed'
}

// Event interface
export interface Event {
  id: string;
  type: EventType;
  data: any;
  metadata: {
    timestamp: string;
    source: string;
    version: string;
    correlationId?: string;
  };
}

// Event service
export class EventService {
  private messageBroker: MessageBrokerService;

  constructor(messageBroker: MessageBrokerService) {
    this.messageBroker = messageBroker;
  }

  // Publish event
  async publishEvent(event: Event): Promise<void> {
    try {
      await this.messageBroker.sendMessage(event.type, event);
      logger.info(`Event published: ${event.type}`);
    } catch (error) {
      logger.error(`Failed to publish event ${event.type}:`, error);
      throw error;
    }
  }

  // Create event
  createEvent(type: EventType, data: any, source: string, correlationId?: string): Event {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        source,
        version: '1.0.0',
        correlationId
      }
    };
  }

  // Publish user events
  async publishUserCreated(userId: string, userData: any, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.USER_CREATED, { userId, userData }, 'user-service', correlationId);
    await this.publishEvent(event);
  }

  async publishUserUpdated(userId: string, userData: any, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.USER_UPDATED, { userId, userData }, 'user-service', correlationId);
    await this.publishEvent(event);
  }

  async publishUserDeleted(userId: string, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.USER_DELETED, { userId }, 'user-service', correlationId);
    await this.publishEvent(event);
  }

  // Publish product events
  async publishProductCreated(productId: string, productData: any, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.PRODUCT_CREATED, { productId, productData }, 'product-service', correlationId);
    await this.publishEvent(event);
  }

  async publishProductUpdated(productId: string, productData: any, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.PRODUCT_UPDATED, { productId, productData }, 'product-service', correlationId);
    await this.publishEvent(event);
  }

  async publishProductDeleted(productId: string, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.PRODUCT_DELETED, { productId }, 'product-service', correlationId);
    await this.publishEvent(event);
  }

  // Publish order events
  async publishOrderCreated(orderId: string, orderData: any, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.ORDER_CREATED, { orderId, orderData }, 'order-service', correlationId);
    await this.publishEvent(event);
  }

  async publishOrderUpdated(orderId: string, orderData: any, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.ORDER_UPDATED, { orderId, orderData }, 'order-service', correlationId);
    await this.publishEvent(event);
  }

  async publishOrderCancelled(orderId: string, reason: string, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.ORDER_CANCELLED, { orderId, reason }, 'order-service', correlationId);
    await this.publishEvent(event);
  }

  // Publish payment events
  async publishPaymentProcessed(paymentId: string, paymentData: any, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.PAYMENT_PROCESSED, { paymentId, paymentData }, 'payment-service', correlationId);
    await this.publishEvent(event);
  }

  async publishPaymentFailed(paymentId: string, error: string, correlationId?: string): Promise<void> {
    const event = this.createEvent(EventType.PAYMENT_FAILED, { paymentId, error }, 'payment-service', correlationId);
    await this.publishEvent(event);
  }
}

// Message handler interface
export interface MessageHandler {
  handle(message: KafkaMessage): Promise<void>;
}

// Consumer service
export class ConsumerService {
  private messageBroker: MessageBrokerService;
  private consumers: Map<string, Consumer> = new Map();
  private handlers: Map<string, MessageHandler> = new Map();

  constructor(messageBroker: MessageBrokerService) {
    this.messageBroker = messageBroker;
  }

  // Register message handler
  registerHandler(topic: string, handler: MessageHandler): void {
    this.handlers.set(topic, handler);
    logger.info(`Message handler registered for topic: ${topic}`);
  }

  // Start consuming messages
  async startConsuming(groupId: string, topics: string[]): Promise<void> {
    try {
      const consumer = await this.messageBroker.createConsumer(groupId);
      this.consumers.set(groupId, consumer);

      for (const topic of topics) {
        const handler = this.handlers.get(topic);
        if (handler) {
          await this.messageBroker.subscribeToTopic(consumer, topic, async (payload) => {
            await handler.handle(payload.message);
          });
        }
      }

      logger.info(`Started consuming messages for group: ${groupId}, topics: ${topics.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to start consuming messages for group ${groupId}:`, error);
      throw error;
    }
  }

  // Stop consuming messages
  async stopConsuming(groupId: string): Promise<void> {
    const consumer = this.consumers.get(groupId);
    if (consumer) {
      await this.messageBroker.disconnectConsumer(consumer);
      this.consumers.delete(groupId);
      logger.info(`Stopped consuming messages for group: ${groupId}`);
    }
  }

  // Stop all consumers
  async stopAllConsumers(): Promise<void> {
    for (const [groupId] of this.consumers) {
      await this.stopConsuming(groupId);
    }
  }
}

// Export default instances
export const messageBrokerService = new MessageBrokerService();
export const eventService = new EventService(messageBrokerService);
export const consumerService = new ConsumerService(messageBrokerService);

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down message broker...');
  await messageBrokerService.disconnectProducer();
  await consumerService.stopAllConsumers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down message broker...');
  await messageBrokerService.disconnectProducer();
  await consumerService.stopAllConsumers();
  process.exit(0);
}); 