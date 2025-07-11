import crypto from 'crypto';

/**
 * Generate a random verification token
 */
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a random password reset token
 */
export const generatePasswordResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a random refresh token
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Hash a token for secure storage
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify token hash
 */
export const verifyTokenHash = (token: string, hash: string): boolean => {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash, 'hex'), Buffer.from(hash, 'hex'));
};