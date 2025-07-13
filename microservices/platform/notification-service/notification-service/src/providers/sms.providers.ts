/**
 * SMS Providers for Uzbekistan Market
 * Professional implementation of SMS services
 */

import axios from 'axios';
import { logger } from '../utils/logger';

export interface SMSMessage {
  to: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
}

export interface ISMSProvider {
  send(message: SMSMessage): Promise<void>;
  getBalance(): Promise<number>;
  validatePhoneNumber(phone: string): boolean;
}

/**
 * Eskiz SMS Provider (Popular in Uzbekistan)
 */
export class EskizSMSProvider implements ISMSProvider {
  private email: string;
  private password: string;
  private baseUrl: string;
  private token?: string;
  private tokenExpiry?: Date;

  constructor(config: { email: string; password: string; baseUrl: string }) {
    this.email = config.email;
    this.password = config.password;
    this.baseUrl = config.baseUrl;
  }

  async send(message: SMSMessage): Promise<void> {
    try {
      await this.ensureAuthenticated();

      const response = await axios.post(
        `${this.baseUrl}/message/sms/send`,
        {
          mobile_phone: this.formatPhoneNumber(message.to),
          message: message.message,
          from: '4546',
          callback_url: process.env.SMS_CALLBACK_URL
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status !== 'waiting') {
        throw new Error(`SMS sending failed: ${response.data.message}`);
      }

      logger.info('SMS sent via Eskiz', {
        to: message.to,
        messageId: response.data.id,
        status: response.data.status
      });
    } catch (error) {
      logger.error('Eskiz SMS sending failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: message.to
      });
      throw error;
    }
  }

  async getBalance(): Promise<number> {
    try {
      await this.ensureAuthenticated();

      const response = await axios.get(`${this.baseUrl}/user/get-limit`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      return response.data.balance || 0;
    } catch (error) {
      logger.error('Failed to get Eskiz balance', error);
      return 0;
    }
  }

  validatePhoneNumber(phone: string): boolean {
    // Uzbekistan phone number validation
    const uzbekPhoneRegex = /^(\+998|998)?[0-9]{9}$/;
    return uzbekPhoneRegex.test(phone.replace(/\s/g, ''));
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email: this.email,
        password: this.password
      });

      this.token = response.data.data.token;
      this.tokenExpiry = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000); // 29 days

      logger.info('Eskiz SMS authentication successful');
    } catch (error) {
      logger.error('Eskiz SMS authentication failed', error);
      throw new Error('SMS provider authentication failed');
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add country code if missing
    if (cleaned.length === 9) {
      return `998${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('998')) {
      return cleaned;
    }
    if (cleaned.length === 13 && cleaned.startsWith('998')) {
      return cleaned.substring(1);
    }
    
    return cleaned;
  }
}

/**
 * PlayMobile SMS Provider (Alternative for Uzbekistan)
 */
export class PlayMobileSMSProvider implements ISMSProvider {
  private login: string;
  private password: string;
  private baseUrl: string;

  constructor(config: { login: string; password: string; baseUrl: string }) {
    this.login = config.login;
    this.password = config.password;
    this.baseUrl = config.baseUrl;
  }

  async send(message: SMSMessage): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/send`,
        {
          messages: [
            {
              recipient: this.formatPhoneNumber(message.to),
              'message-id': `msg_${Date.now()}`,
              sms: {
                originator: '3700',
                content: {
                  text: message.message
                }
              }
            }
          ]
        },
        {
          auth: {
            username: this.login,
            password: this.password
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('SMS sent via PlayMobile', {
        to: message.to,
        messageId: response.data.messages?.[0]?.['message-id'],
        status: response.data.messages?.[0]?.status
      });
    } catch (error) {
      logger.error('PlayMobile SMS sending failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: message.to
      });
      throw error;
    }
  }

  async getBalance(): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/balance`, {
        auth: {
          username: this.login,
          password: this.password
        }
      });

      return response.data.balance || 0;
    } catch (error) {
      logger.error('Failed to get PlayMobile balance', error);
      return 0;
    }
  }

  validatePhoneNumber(phone: string): boolean {
    // Uzbekistan phone number validation
    const uzbekPhoneRegex = /^(\+998|998)?[0-9]{9}$/;
    return uzbekPhoneRegex.test(phone.replace(/\s/g, ''));
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add country code if missing
    if (cleaned.length === 9) {
      return `+998${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('998')) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith('998')) {
      return `+${cleaned}`;
    }
    
    return `+${cleaned}`;
  }
}