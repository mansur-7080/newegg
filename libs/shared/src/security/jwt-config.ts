import crypto from 'crypto';
import { logger } from '../logging/logger';

interface JWTConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

class SecureJWTManager {
  private static instance: SecureJWTManager;
  private config: JWTConfig;

  private constructor() {
    this.config = this.initializeSecureConfig();
    this.validateConfiguration();
  }

  static getInstance(): SecureJWTManager {
    if (!SecureJWTManager.instance) {
      SecureJWTManager.instance = new SecureJWTManager();
    }
    return SecureJWTManager.instance;
  }

  private initializeSecureConfig(): JWTConfig {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret) {
      throw new Error(
        'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is required. ' +
        'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }

    if (!refreshSecret) {
      throw new Error(
        'CRITICAL SECURITY ERROR: JWT_REFRESH_SECRET environment variable is required. ' +
        'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }

    return {
      accessSecret,
      refreshSecret,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'ultramarket-platform',
      audience: process.env.JWT_AUDIENCE || 'ultramarket-services',
    };
  }

  private validateConfiguration(): void {
    // Check for common insecure patterns
    const insecurePatterns = [
      'your-secret-key',
      'secret',
      'password',
      'test',
      'dev',
      '123',
      'qwerty',
      'admin',
    ];

    const checkSecret = (secret: string, name: string) => {
      // Check minimum length
      if (secret.length < 32) {
        throw new Error(
          `CRITICAL SECURITY ERROR: ${name} must be at least 32 characters long. ` +
          `Current length: ${secret.length}`
        );
      }

      // Check for insecure patterns
      const lowerSecret = secret.toLowerCase();
      for (const pattern of insecurePatterns) {
        if (lowerSecret.includes(pattern)) {
          throw new Error(
            `CRITICAL SECURITY ERROR: ${name} contains insecure pattern: "${pattern}". ` +
            'Use a cryptographically secure random string.'
          );
        }
      }

      // Check for proper entropy (basic check)
      const uniqueChars = new Set(secret).size;
      if (uniqueChars < 16) {
        logger.warn(
          `${name} may have low entropy. Consider using a more random secret. ` +
          `Unique characters: ${uniqueChars}`
        );
      }
    };

    checkSecret(this.config.accessSecret, 'JWT_SECRET');
    checkSecret(this.config.refreshSecret, 'JWT_REFRESH_SECRET');

    // Ensure secrets are different
    if (this.config.accessSecret === this.config.refreshSecret) {
      throw new Error(
        'CRITICAL SECURITY ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be different'
      );
    }

    logger.info('JWT configuration validated successfully', {
      accessSecretLength: this.config.accessSecret.length,
      refreshSecretLength: this.config.refreshSecret.length,
      accessExpiresIn: this.config.accessExpiresIn,
      refreshExpiresIn: this.config.refreshExpiresIn,
    });
  }

  getAccessSecret(): string {
    return this.config.accessSecret;
  }

  getRefreshSecret(): string {
    return this.config.refreshSecret;
  }

  getAccessExpiresIn(): string {
    return this.config.accessExpiresIn;
  }

  getRefreshExpiresIn(): string {
    return this.config.refreshExpiresIn;
  }

  getIssuer(): string {
    return this.config.issuer;
  }

  getAudience(): string {
    return this.config.audience;
  }

  getTokenOptions() {
    return {
      issuer: this.config.issuer,
      audience: this.config.audience,
      expiresIn: this.config.accessExpiresIn,
    };
  }

  getRefreshTokenOptions() {
    return {
      issuer: this.config.issuer,
      audience: this.config.audience,
      expiresIn: this.config.refreshExpiresIn,
    };
  }

  // Utility method to generate secure secrets for development/setup
  static generateSecureSecret(length = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Method to validate an existing secret before using it
  static validateSecret(secret: string, minLength = 32): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!secret) {
      errors.push('Secret is required');
      return { isValid: false, errors };
    }

    if (secret.length < minLength) {
      errors.push(`Secret must be at least ${minLength} characters long`);
    }

    const insecurePatterns = [
      'your-secret-key',
      'secret',
      'password',
      'test',
      'dev',
      '123',
      'qwerty',
      'admin',
    ];

    const lowerSecret = secret.toLowerCase();
    for (const pattern of insecurePatterns) {
      if (lowerSecret.includes(pattern)) {
        errors.push(`Secret contains insecure pattern: "${pattern}"`);
      }
    }

    const uniqueChars = new Set(secret).size;
    if (uniqueChars < 16) {
      errors.push(`Secret may have low entropy. Unique characters: ${uniqueChars}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const jwtConfig = SecureJWTManager.getInstance();
export { SecureJWTManager };

// Export utility functions
export const generateSecureJWTSecret = SecureJWTManager.generateSecureSecret;
export const validateJWTSecret = SecureJWTManager.validateSecret;