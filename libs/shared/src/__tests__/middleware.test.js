"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const middleware_1 = require("../middleware");
const errors_1 = require("../errors");
const types_1 = require("../types");
const joi_1 = __importDefault(require("joi"));
// Mock JWT functions
jest.mock('../auth', () => ({
    verifyAccessToken: jest.fn(),
    extractTokenFromHeader: jest.fn(),
    hasRole: jest.fn(),
}));
const { verifyAccessToken, extractTokenFromHeader, hasRole } = require('../auth');
describe('Middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    beforeEach(() => {
        mockRequest = {
            headers: {},
            url: '/test',
            method: 'GET',
            ip: '127.0.0.1',
            body: {},
            get: jest.fn(),
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
        };
        mockNext = jest.fn();
    });
    describe('authenticate', () => {
        it('should authenticate valid token', async () => {
            const mockPayload = { userId: '123', role: types_1.UserRole.CUSTOMER };
            extractTokenFromHeader.mockReturnValue('valid-token');
            verifyAccessToken.mockReturnValue(mockPayload);
            await (0, middleware_1.authenticate)(mockRequest, mockResponse, mockNext);
            expect(extractTokenFromHeader).toHaveBeenCalledWith(undefined);
            expect(verifyAccessToken).toHaveBeenCalledWith('valid-token');
            expect(mockRequest.user).toEqual(mockPayload);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should handle missing token', async () => {
            extractTokenFromHeader.mockReturnValue(null);
            verifyAccessToken.mockImplementation(() => {
                throw new Error('No token');
            });
            await (0, middleware_1.authenticate)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.UnauthorizedError));
        });
        it('should handle invalid token', async () => {
            extractTokenFromHeader.mockReturnValue('invalid-token');
            verifyAccessToken.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            await (0, middleware_1.authenticate)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.UnauthorizedError));
        });
    });
    describe('authorize', () => {
        it('should authorize user with required role', () => {
            mockRequest.user = { userId: '123', email: 'admin@test.com', role: types_1.UserRole.ADMIN };
            hasRole.mockReturnValue(true);
            const middleware = (0, middleware_1.authorize)([types_1.UserRole.ADMIN]);
            middleware(mockRequest, mockResponse, mockNext);
            expect(hasRole).toHaveBeenCalledWith(types_1.UserRole.ADMIN, [types_1.UserRole.ADMIN]);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should reject user without required role', () => {
            mockRequest.user = { userId: '123', email: 'customer@test.com', role: types_1.UserRole.CUSTOMER };
            hasRole.mockReturnValue(false);
            const middleware = (0, middleware_1.authorize)([types_1.UserRole.ADMIN]);
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.ForbiddenError));
        });
        it('should reject unauthenticated user', () => {
            const middleware = (0, middleware_1.authorize)([types_1.UserRole.ADMIN]);
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.UnauthorizedError));
        });
    });
    describe('requireAdmin', () => {
        it('should allow admin user', () => {
            mockRequest.user = { userId: '123', email: 'admin@test.com', role: types_1.UserRole.ADMIN };
            (0, middleware_1.requireAdmin)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should allow super admin user', () => {
            mockRequest.user = {
                userId: '123',
                email: 'superadmin@test.com',
                role: types_1.UserRole.SUPER_ADMIN,
            };
            (0, middleware_1.requireAdmin)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should reject customer user', () => {
            mockRequest.user = { userId: '123', email: 'customer@test.com', role: types_1.UserRole.CUSTOMER };
            (0, middleware_1.requireAdmin)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.ForbiddenError));
        });
        it('should reject unauthenticated user', () => {
            (0, middleware_1.requireAdmin)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.UnauthorizedError));
        });
    });
    describe('validateRequest', () => {
        it('should validate request body', () => {
            const schema = joi_1.default.object({
                email: joi_1.default.string().email().required(),
                password: joi_1.default.string().min(8).required(),
            });
            mockRequest.body = {
                email: 'test@example.com',
                password: 'password123',
            };
            const middleware = (0, middleware_1.validateRequest)(schema);
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith();
        });
        it('should reject invalid request body', () => {
            const schema = joi_1.default.object({
                email: joi_1.default.string().email().required(),
                password: joi_1.default.string().min(8).required(),
            });
            mockRequest.body = {
                email: 'invalid-email',
                password: 'short',
            };
            const middleware = (0, middleware_1.validateRequest)(schema);
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledWith(expect.any(errors_1.ValidationError));
        });
    });
    describe('errorHandler', () => {
        it('should handle known errors', () => {
            const error = new errors_1.UnauthorizedError('Authentication required');
            (0, middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required',
                code: undefined,
            });
        });
        it('should handle validation errors', () => {
            const error = new errors_1.ValidationError({
                email: ['Email is required'],
            });
            (0, middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(422);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Validation failed',
                errors: { email: ['Email is required'] },
            });
        });
        it('should handle Prisma errors', () => {
            const error = new Error('Database error');
            error.code = 'P2002';
            (0, middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(409);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Resource already exists',
                code: 'DUPLICATE_ENTRY',
            });
        });
        it('should handle unknown errors in production', () => {
            process.env.NODE_ENV = 'production';
            const error = new Error('Unknown error');
            (0, middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error',
            });
        });
        it('should handle unknown errors in development', () => {
            process.env.NODE_ENV = 'development';
            const error = new Error('Unknown error');
            (0, middleware_1.errorHandler)(error, mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Unknown error',
                stack: error.stack,
            });
        });
    });
    describe('requestLogger', () => {
        it('should log request information', () => {
            const startTime = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(startTime);
            (0, middleware_1.requestLogger)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
            // Simulate response finish
            const finishListeners = mockResponse.listeners('finish');
            if (finishListeners.length > 0) {
                finishListeners[0]();
            }
        });
    });
    describe('securityHeaders', () => {
        it('should set security headers', () => {
            (0, middleware_1.securityHeaders)(mockRequest, mockResponse, mockNext);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Security-Policy', "default-src 'self'");
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('requestId', () => {
        it('should generate request ID if not present', () => {
            (0, middleware_1.requestId)(mockRequest, mockResponse, mockNext);
            expect(mockRequest.headers['x-request-id']).toBeDefined();
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', mockRequest.headers['x-request-id']);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should use existing request ID', () => {
            const existingId = 'existing-request-id';
            mockRequest.headers['x-request-id'] = existingId;
            (0, middleware_1.requestId)(mockRequest, mockResponse, mockNext);
            expect(mockRequest.headers['x-request-id']).toBe(existingId);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
