/**
 * Multi-Factor Authentication Service
 * Professional MFA implementation with TOTP, SMS, and Email
 */

import { authenticator } from 'otplib';
import { randomBytes, randomInt } from 'crypto';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';

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

export interface MFAToken {
  id: string;
  userId: string;
  type: 'SMS' | 'EMAIL';
  token: string;
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export class MFAService {
  private emailService: EmailService;
  private smsService: SMSService;
  private readonly BACKUP_CODES_COUNT = parseInt(process.env.MFA_BACKUP_CODES_COUNT || '10');
  private readonly TOKEN_EXPIRY_MINUTES = parseInt(process.env.MFA_TOKEN_EXPIRY_MINUTES || '5');
  private readonly TOTP_ISSUER = process.env.MFA_TOTP_ISSUER || 'UltraMarket';

  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
  }

  /**
   * Enable MFA for user
   */
  async enableMFA(
    userId: string, 
    method: 'TOTP' | 'SMS' | 'EMAIL',
    phone?: string
  ): Promise<{
    secret?: string;
    qrCode?: string;
    backupCodes: string[];
    message: string;
  }> {
    try {
      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate TOTP secret for TOTP method
      let secret: string | undefined;
      let qrCode: string | undefined;

      if (method === 'TOTP') {
        secret = authenticator.generateSecret();
        qrCode = authenticator.keyuri(
          user.email,
          this.TOTP_ISSUER,
          secret
        );
      }

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

      logger.info('MFA enabled for user', { 
        userId, 
        method, 
        hasSecret: !!secret,
        backupCodesCount: backupCodes.length 
      });

      return {
        secret: method === 'TOTP' ? secret : undefined,
        qrCode: method === 'TOTP' ? qrCode : undefined,
        backupCodes,
        message: `MFA ${method} enabled successfully`
      };
    } catch (error) {
      logger.error('Failed to enable MFA', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        method
      });
      throw new Error(`Failed to enable MFA: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify MFA token
   */
  async verifyMFAToken(userId: string, token: string): Promise<{
    success: boolean;
    message: string;
    method?: string;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          mfaEnabled: true,
          mfaMethod: true,
          mfaSecret: true,
          backupCodes: true,
          email: true,
          phone: true
        }
      });

      if (!user?.mfaEnabled) {
        return { success: true, message: 'MFA not enabled' };
      }

      // Check backup codes first
      if (this.isBackupCode(token, user.backupCodes as BackupCode[])) {
        await this.markBackupCodeAsUsed(userId, token);
        logger.info('MFA verified with backup code', { userId });
        return { 
          success: true, 
          message: 'MFA verified with backup code',
          method: 'BACKUP'
        };
      }

      // Verify TOTP
      if (user.mfaMethod === 'TOTP' && user.mfaSecret) {
        const isValid = authenticator.verify({ 
          token, 
          secret: user.mfaSecret,
          window: 1 // Allow 1 time step tolerance
        });
        
        if (isValid) {
          logger.info('MFA verified with TOTP', { userId });
          return { 
            success: true, 
            message: 'MFA verified with TOTP',
            method: 'TOTP'
          };
        }
      }

      // Verify SMS/Email token
      if (user.mfaMethod === 'SMS' || user.mfaMethod === 'EMAIL') {
        const isValid = await this.verifySMSOrEmailToken(userId, token, user.mfaMethod);
        if (isValid) {
          logger.info('MFA verified with token', { userId, method: user.mfaMethod });
          return { 
            success: true, 
            message: `MFA verified with ${user.mfaMethod}`,
            method: user.mfaMethod
          };
        }
      }

      logger.warn('MFA verification failed', { userId, token: token.substring(0, 3) + '***' });
      return { 
        success: false, 
        message: 'Invalid MFA token' 
      };
    } catch (error) {
      logger.error('MFA verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return { 
        success: false, 
        message: 'MFA verification error' 
      };
    }
  }

  /**
   * Send MFA token via SMS or Email
   */
  async sendMFAToken(
    userId: string, 
    method: 'SMS' | 'EMAIL'
  ): Promise<{
    success: boolean;
    message: string;
    expiresIn?: number;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true, mfaMethod: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.mfaMethod !== method) {
        throw new Error(`MFA method mismatch. Expected: ${user.mfaMethod}, Got: ${method}`);
      }

      // Generate token
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000);

      // Save token to database
      await prisma.mfaToken.create({
        data: {
          userId,
          type: method,
          token,
          expiresAt,
          used: false
        }
      });

      // Send token
      if (method === 'SMS' && user.phone) {
        await this.smsService.sendToken(user.phone, token);
      } else if (method === 'EMAIL' && user.email) {
        await this.emailService.sendMFAToken(user.email, token);
      } else {
        throw new Error(`No ${method} contact found for user`);
      }

      logger.info('MFA token sent', { 
        userId, 
        method, 
        expiresIn: this.TOKEN_EXPIRY_MINUTES 
      });

      return {
        success: true,
        message: `MFA token sent via ${method}`,
        expiresIn: this.TOKEN_EXPIRY_MINUTES
      };
    } catch (error) {
      logger.error('Failed to send MFA token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        method
      });
      throw new Error(`Failed to send MFA token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaMethod: null,
          mfaSecret: null,
          backupCodes: null
        }
      });

      // Delete all MFA tokens for this user
      await prisma.mfaToken.deleteMany({
        where: { userId }
      });

      logger.info('MFA disabled for user', { userId });

      return {
        success: true,
        message: 'MFA disabled successfully'
      };
    } catch (error) {
      logger.error('Failed to disable MFA', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw new Error(`Failed to disable MFA: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<{
    success: boolean;
    backupCodes: string[];
    message: string;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true }
      });

      if (!user?.mfaEnabled) {
        throw new Error('MFA not enabled');
      }

      const backupCodes = this.generateBackupCodes();

      await prisma.user.update({
        where: { id: userId },
        data: {
          backupCodes: backupCodes.map(code => ({
            code,
            used: false,
            createdAt: new Date()
          }))
        }
      });

      logger.info('Backup codes regenerated', { userId });

      return {
        success: true,
        backupCodes,
        message: 'Backup codes regenerated successfully'
      };
    } catch (error) {
      logger.error('Failed to regenerate backup codes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw new Error(`Failed to regenerate backup codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get MFA status for user
   */
  async getMFAStatus(userId: string): Promise<{
    enabled: boolean;
    method?: string;
    hasBackupCodes: boolean;
    backupCodesRemaining: number;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          mfaEnabled: true,
          mfaMethod: true,
          backupCodes: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const backupCodes = user.backupCodes as BackupCode[] || [];
      const unusedBackupCodes = backupCodes.filter(code => !code.used).length;

      return {
        enabled: user.mfaEnabled || false,
        method: user.mfaMethod || undefined,
        hasBackupCodes: backupCodes.length > 0,
        backupCodesRemaining: unusedBackupCodes
      };
    } catch (error) {
      logger.error('Failed to get MFA status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw new Error(`Failed to get MFA status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
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
   * Generate random token
   */
  private generateToken(): string {
    return randomInt(100000, 999999).toString();
  }
}

export default MFAService;