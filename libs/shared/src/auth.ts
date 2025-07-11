import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JwtPayload, TokenPair, UserRole } from './types';
import { UnauthorizedError } from './errors';
import { JWT_EXPIRY } from './constants';

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// JWT token generation
export const generateTokens = (payload: JwtPayload): TokenPair => {
  const accessToken = jwt.sign(payload, process.env['JWT_SECRET']!, {
    expiresIn: JWT_EXPIRY.ACCESS_TOKEN,
  });

  const refreshToken = jwt.sign(payload, process.env['JWT_REFRESH_SECRET']!, {
    expiresIn: JWT_EXPIRY.REFRESH_TOKEN,
  });

  return { accessToken, refreshToken };
};

// JWT token verification
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, process.env['JWT_SECRET']!) as JwtPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, process.env['JWT_REFRESH_SECRET']!) as JwtPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};

export const verifyToken = (token: string, secret: string): any => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

// Token extraction from headers
export const extractTokenFromHeader = (authHeader?: string): string => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }
  return authHeader.substring(7);
};

// Permission checking
export const hasRole = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.includes(userRole);
};

export const isAdmin = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
};

export const isSeller = (userRole: UserRole): boolean => {
  return userRole === UserRole.SELLER || isAdmin(userRole);
};

// Generate random tokens
export const generateRandomToken = (length = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export const generateOTP = (length = 6): string => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
};
