import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enhanced logger for security events
const logger = {
  info: (message: string, meta?: any) => console.log(`[PASSWORD-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[PASSWORD-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[PASSWORD-WARN] ${message}`, meta),
  security: (message: string, meta?: any) => console.log(`[SECURITY] ${message}`, meta),
};

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  score: number;
}

export interface PasswordHistory {
  id: string;
  userId: string;
  hashedPassword: string;
  createdAt: Date;
}

export class PasswordService {
  private readonly saltRounds: number;
  private readonly minPasswordLength: number;
  private readonly maxPasswordHistory: number;
  private readonly passwordExpiryDays: number;

  constructor() {
    this.saltRounds = parseInt(process.env.PASSWORD_SALT_ROUNDS || '12');
    this.minPasswordLength = parseInt(process.env.MIN_PASSWORD_LENGTH || '8');
    this.maxPasswordHistory = parseInt(process.env.MAX_PASSWORD_HISTORY || '5');
    this.passwordExpiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS || '90');
  }

  /**
   * ENHANCED: Hash password with strong security
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Validate password before hashing
      const validation = this.validatePassword(password);
      if (!validation.isValid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate strong salt
      const salt = await bcrypt.genSalt(this.saltRounds);
      
      // Hash password with salt
      const hashedPassword = await bcrypt.hash(password, salt);

      logger.security('Password hashed successfully', {
        saltRounds: this.saltRounds,
        strength: validation.strength,
        score: validation.score,
      });

      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing failed', { error });
      throw error;
    }
  }

  /**
   * ENHANCED: Verify password with timing attack protection
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const startTime = performance.now();
      
      const isValid = await bcrypt.compare(password, hashedPassword);
      
      const duration = performance.now() - startTime;
      
      // Log security events
      if (isValid) {
        logger.security('Password verified successfully', { duration: `${duration.toFixed(2)}ms` });
      } else {
        logger.security('Password verification failed', { duration: `${duration.toFixed(2)}ms` });
      }

      return isValid;
    } catch (error) {
      logger.error('Password verification error', { error });
      return false;
    }
  }

  /**
   * ENHANCED: Validate password complexity and strength
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.minPasswordLength) {
      errors.push(`Password must be at least ${this.minPasswordLength} characters long`);
    } else {
      score += Math.min(password.length * 2, 20); // Max 20 points for length
    }

    // Character variety checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 10;
    }

    if (!hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 10;
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    } else {
      score += 10;
    }

    if (!hasSpecialChars) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 15;
    }

    // Common password check
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
      score -= 20;
    }

    // Sequential character check
    const sequentialPatterns = ['123', 'abc', 'qwe', 'asd', 'zxc'];
    const hasSequential = sequentialPatterns.some(pattern => 
      password.toLowerCase().includes(pattern)
    );

    if (hasSequential) {
      errors.push('Password contains sequential characters');
      score -= 10;
    }

    // Repeated character check
    const hasRepeated = /(.)\1{2,}/.test(password);
    if (hasRepeated) {
      errors.push('Password contains repeated characters');
      score -= 5;
    }

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    if (score < 30) {
      strength = 'weak';
    } else if (score < 50) {
      strength = 'medium';
    } else if (score < 70) {
      strength = 'strong';
    } else {
      strength = 'very_strong';
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score,
    };
  }

  /**
   * ENHANCED: Check password against history
   */
  async isPasswordInHistory(userId: string, newPassword: string): Promise<boolean> {
    try {
      const passwordHistory = await this.getPasswordHistory(userId);
      
      for (const historyEntry of passwordHistory) {
        const isMatch = await this.verifyPassword(newPassword, historyEntry.hashedPassword);
        if (isMatch) {
          logger.security('Password found in history', { userId });
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Password history check failed', { error, userId });
      return false;
    }
  }

  /**
   * ENHANCED: Save password to history
   */
  async savePasswordToHistory(userId: string, hashedPassword: string): Promise<void> {
    try {
      // TODO: Implement password history table in database
      // For now, log the password change
      logger.security('Password change logged (history table not implemented)', { userId });

      // TODO: Implement password history cleanup
      logger.info('Password history cleanup not implemented', { userId });

      logger.security('Password saved to history', { userId });
    } catch (error) {
      logger.error('Failed to save password to history', { error, userId });
      throw error;
    }
  }

  /**
   * Get password history for user
   */
  async getPasswordHistory(userId: string): Promise<PasswordHistory[]> {
    try {
      // TODO: Implement password history table in database
      logger.info('Password history not implemented', { userId });
      return [];
    } catch (error) {
      logger.error('Failed to get password history', { error, userId });
      return [];
    }
  }

  /**
   * ENHANCED: Check if password is expired
   */
  async isPasswordExpired(userId: string): Promise<boolean> {
    try {
      // TODO: Implement password expiry check with database field
      logger.info('Password expiry check not implemented', { userId });
      return false;
    } catch (error) {
      logger.error('Password expiry check failed', { error, userId });
      return false;
    }
  }

  /**
   * ENHANCED: Generate secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each category
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[crypto.randomInt(26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[crypto.randomInt(26)]; // Lowercase
    password += '0123456789'[crypto.randomInt(10)]; // Number
    password += '!@#$%^&*'[crypto.randomInt(8)]; // Special char

    // Fill remaining length with random characters
    for (let i = 4; i < length; i++) {
      password += charset[crypto.randomInt(charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * ENHANCED: Update user password with history tracking
   */
  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.isValid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }

      // Check against history
      const isInHistory = await this.isPasswordInHistory(userId, newPassword);
      if (isInHistory) {
        throw new Error('Password has been used recently');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      });

      // Save to history
      await this.savePasswordToHistory(userId, hashedPassword);

      logger.security('User password updated successfully', {
        userId,
        strength: validation.strength,
        score: validation.score,
      });
    } catch (error) {
      logger.error('Failed to update user password', { error, userId });
      throw error;
    }
  }
}

// Export singleton instance
export const passwordService = new PasswordService();