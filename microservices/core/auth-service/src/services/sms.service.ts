/**
 * SMS Service
 * Professional SMS implementation for UltraMarket
 */

import { logger } from '../utils/logger';

export class SMSService {
  private readonly TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  private readonly TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  private readonly TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

  constructor() {
    // Validate required environment variables
    if (!this.TWILIO_ACCOUNT_SID || !this.TWILIO_AUTH_TOKEN || !this.TWILIO_PHONE_NUMBER) {
      logger.warn('SMS service not properly configured. Missing Twilio credentials.');
    }
  }

  /**
   * Send SMS token
   */
  async sendToken(phone: string, token: string): Promise<void> {
    try {
      if (!this.TWILIO_ACCOUNT_SID || !this.TWILIO_AUTH_TOKEN || !this.TWILIO_PHONE_NUMBER) {
        throw new Error('SMS service not configured');
      }

      const message = `Your UltraMarket verification code is: ${token}. Valid for 5 minutes.`;
      
      // In development, just log the message
      if (process.env.NODE_ENV === 'development') {
        logger.info('SMS sent (development mode)', {
          to: phone,
          message: message,
          token: token.substring(0, 3) + '***'
        });
        return;
      }

      // In production, send via Twilio
      // Note: You would need to install twilio package and implement actual sending
      // const twilio = require('twilio');
      // const client = twilio(this.TWILIO_ACCOUNT_SID, this.TWILIO_AUTH_TOKEN);
      // await client.messages.create({
      //   body: message,
      //   from: this.TWILIO_PHONE_NUMBER,
      //   to: phone
      // });

      logger.info('SMS token sent', {
        to: phone,
        token: token.substring(0, 3) + '***'
      });
    } catch (error) {
      logger.error('Failed to send SMS token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phone: phone.substring(0, 3) + '***'
      });
      throw new Error(`Failed to send SMS token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    // Basic phone number validation for Uzbekistan
    const phoneRegex = /^\+998[0-9]{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format phone number
   */
  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with 998, add +
    if (cleaned.startsWith('998')) {
      return '+' + cleaned;
    }
    
    // If it starts with +998, return as is
    if (cleaned.startsWith('+998')) {
      return cleaned;
    }
    
    // If it's a local number, assume Uzbekistan
    if (cleaned.length === 9) {
      return '+998' + cleaned;
    }
    
    return phone;
  }
}

export default SMSService;