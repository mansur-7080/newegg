/**
 * Multi-Factor Authentication Service
 * Professional MFA implementation with TOTP and SMS
 */

import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';

export interface MFAMethod {
  type: 'TOTP' | 'SMS' | 'EMAIL';
  enabled: boolean;
  secret?: string;
  phone?: string;
}

export interface BackupCode {
  code: string;
  used: boolean;
  createdAt: Date;
}

export class MFAService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Enable MFA for user
   */
  async enableMFA(userId: string, method: 'TOTP' | 'SMS' | 'EMAIL'): Promise<{
    secret?: string;
    qrCode?: string;
    backupCodes: string[];
  }> {
    try {
      // Generate TOTP secret
      const secret = authenticator.generateSecret();
      const qrCode = authenticator.keyuri(
        userId,
        'UltraMarket',
        secret
      );

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Save MFA configuration
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaMethod: method,
          mfaSecret: method === 'TOTP' ? secret : null,
          backupCodes: backupCodes.map(code => ({
            code,
            used: false,
            createdAt: new Date()
          }))
        }
      });

      logger.info('MFA enabled for user', { userId, method });

      return {
        secret: method === 'TOTP' ? secret : undefined,
        qrCode: method === 'TOTP' ? qrCode : undefined,
        backupCodes
      };
    } catch (error) {
      logger.error('Failed to enable MFA', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw new Error('Failed to enable MFA');
    }
  }

  /**
   * Verify MFA token
   */
  async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          mfaEnabled: true,
          mfaMethod: true,
          mfaSecret: true,
          backupCodes: true
        }
      });

      if (!user?.mfaEnabled) {
        return true; // MFA not enabled
      }

      // Check backup codes first
      if (this.isBackupCode(token, user.backupCodes as BackupCode[])) {
        await this.markBackupCodeAsUsed(userId, token);
        return true;
      }

      // Verify TOTP
      if (user.mfaMethod === 'TOTP' && user.mfaSecret) {
        return authenticator.verify({ token, secret: user.mfaSecret });
      }

      // Verify SMS/Email (implement based on your SMS/Email service)
      if (user.mfaMethod === 'SMS' || user.mfaMethod === 'EMAIL') {
        return await this.verifySMSOrEmailToken(userId, token, user.mfaMethod);
      }

      return false;
    } catch (error) {
      logger.error('MFA verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Check if token is a backup code
   */
  private isBackupCode(token: string, backupCodes: BackupCode[]): boolean {
    return backupCodes.some(
      backup => backup.code === token && !backup.used
    );
  }

  /**
   * Mark backup code as used
   */
  private async markBackupCodeAsUsed(userId: string, code: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        backupCodes: {
          update: {
            where: { code },
            data: { used: true }
          }
        }
      }
    });
  }

  /**
   * Verify SMS or Email token
   */
  private async verifySMSOrEmailToken(
    userId: string,
    token: string,
    method: 'SMS' | 'EMAIL'
  ): Promise<boolean> {
    // Implement based on your SMS/Email service
    // This is a placeholder implementation
    const storedToken = await prisma.mfaToken.findFirst({
      where: {
        userId,
        type: method,
        token,
        expiresAt: { gt: new Date() },
        used: false
      }
    });

    if (storedToken) {
      await prisma.mfaToken.update({
        where: { id: storedToken.id },
        data: { used: true }
      });
      return true;
    }

    return false;
  }

  /**
   * Send MFA token via SMS or Email
   */
  async sendMFAToken(userId: string, method: 'SMS' | 'EMAIL'): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save token
      await prisma.mfaToken.create({
        data: {
          userId,
          type: method,
          token,
          expiresAt
        }
      });

      // Send token
      if (method === 'EMAIL' && user.email) {
        await this.emailService.sendMFAToken(user.email, token);
      } else if (method === 'SMS' && user.phone) {
        // Implement SMS sending
        await this.sendSMSToken(user.phone, token);
      }

      logger.info('MFA token sent', { userId, method });
    } catch (error) {
      logger.error('Failed to send MFA token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        method
      });
      throw new Error('Failed to send MFA token');
    }
  }

  /**
   * Generate MFA token
   */
  private generateToken(): string {
    return Math.random().toString().slice(2, 8);
  }

  /**
   * Send SMS token (placeholder)
   */
  private async sendSMSToken(phone: string, token: string): Promise<void> {
    // Implement SMS sending logic
    logger.info('SMS token sent', { phone, token });
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaMethod: null,
          mfaSecret: null,
          backupCodes: []
        }
      });

      logger.info('MFA disabled for user', { userId });
    } catch (error) {
      logger.error('Failed to disable MFA', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw new Error('Failed to disable MFA');
    }
  }
}