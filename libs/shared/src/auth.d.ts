import { JwtPayload, TokenPair, UserRole } from './types';
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export declare const generateTokens: (payload: JwtPayload) => TokenPair;
export declare const generateToken: (payload: string | object | Buffer, secret: string, expiresIn: string) => string;
export declare const verifyAccessToken: (token: string) => JwtPayload;
export declare const verifyRefreshToken: (token: string) => JwtPayload;
export declare const verifyToken: (token: string, secret: string) => any;
export declare const extractTokenFromHeader: (authHeader?: string) => string;
export declare const hasRole: (userRole: UserRole, requiredRoles: UserRole[]) => boolean;
export declare const isAdmin: (userRole: UserRole) => boolean;
export declare const isSeller: (userRole: UserRole) => boolean;
export declare const generateRandomToken: (length?: number) => string;
export declare const generateOTP: (length?: number) => string;
export interface SessionData {
    sessionId: string;
    userId: string;
    deviceInfo: Record<string, any>;
    ipAddress: string;
    createdAt: Date;
    lastActivity: Date;
    isActive: boolean;
}
export declare const createSession: (userId: string, deviceInfo: Record<string, any>, ipAddress: string) => Promise<SessionData>;
export declare const cache: {
    setex(key: string, ttl: number, value: string): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
    srem(key: string, value: string): Promise<void>;
    getJson<T>(key: string): Promise<T | null>;
    setJson(key: string, value: any, ttl?: number): Promise<void>;
};
//# sourceMappingURL=auth.d.ts.map