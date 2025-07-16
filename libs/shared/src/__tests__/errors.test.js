"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("../errors");
describe('Error Classes', () => {
    describe('AppError', () => {
        it('should create an AppError with default values', () => {
            const error = new errors_1.AppError('Test error', 400);
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(400);
            expect(error.isOperational).toBe(true);
            expect(error.code).toBeUndefined();
        });
        it('should create an AppError with custom values', () => {
            const error = new errors_1.AppError('Custom error', 500, false, 'CUSTOM_ERROR');
            expect(error.message).toBe('Custom error');
            expect(error.statusCode).toBe(500);
            expect(error.isOperational).toBe(false);
            expect(error.code).toBe('CUSTOM_ERROR');
        });
        it('should capture stack trace', () => {
            const error = new errors_1.AppError('Test error', 400);
            expect(error.stack).toBeDefined();
            expect(typeof error.stack).toBe('string');
        });
    });
    describe('BadRequestError', () => {
        it('should create a BadRequestError with default message', () => {
            const error = new errors_1.BadRequestError();
            expect(error.message).toBe('Bad Request');
            expect(error.statusCode).toBe(400);
            expect(error.isOperational).toBe(true);
        });
        it('should create a BadRequestError with custom message', () => {
            const error = new errors_1.BadRequestError('Invalid input');
            expect(error.message).toBe('Invalid input');
            expect(error.statusCode).toBe(400);
        });
        it('should create a BadRequestError with custom code', () => {
            const error = new errors_1.BadRequestError('Invalid input', 'INVALID_INPUT');
            expect(error.code).toBe('INVALID_INPUT');
        });
    });
    describe('UnauthorizedError', () => {
        it('should create an UnauthorizedError with default message', () => {
            const error = new errors_1.UnauthorizedError();
            expect(error.message).toBe('Unauthorized');
            expect(error.statusCode).toBe(401);
        });
        it('should create an UnauthorizedError with custom message', () => {
            const error = new errors_1.UnauthorizedError('Authentication required');
            expect(error.message).toBe('Authentication required');
            expect(error.statusCode).toBe(401);
        });
    });
    describe('ForbiddenError', () => {
        it('should create a ForbiddenError with default message', () => {
            const error = new errors_1.ForbiddenError();
            expect(error.message).toBe('Forbidden');
            expect(error.statusCode).toBe(403);
        });
        it('should create a ForbiddenError with custom message', () => {
            const error = new errors_1.ForbiddenError('Insufficient permissions');
            expect(error.message).toBe('Insufficient permissions');
            expect(error.statusCode).toBe(403);
        });
    });
    describe('NotFoundError', () => {
        it('should create a NotFoundError with default message', () => {
            const error = new errors_1.NotFoundError();
            expect(error.message).toBe('Resource not found');
            expect(error.statusCode).toBe(404);
        });
        it('should create a NotFoundError with custom message', () => {
            const error = new errors_1.NotFoundError('User not found');
            expect(error.message).toBe('User not found');
            expect(error.statusCode).toBe(404);
        });
    });
    describe('ConflictError', () => {
        it('should create a ConflictError with default message', () => {
            const error = new errors_1.ConflictError();
            expect(error.message).toBe('Conflict');
            expect(error.statusCode).toBe(409);
        });
        it('should create a ConflictError with custom message', () => {
            const error = new errors_1.ConflictError('Resource already exists');
            expect(error.message).toBe('Resource already exists');
            expect(error.statusCode).toBe(409);
        });
    });
    describe('ValidationError', () => {
        it('should create a ValidationError with errors object', () => {
            const errors = {
                email: ['Email is required'],
                password: ['Password must be at least 8 characters'],
            };
            const error = new errors_1.ValidationError(errors);
            expect(error.message).toBe('Validation failed');
            expect(error.statusCode).toBe(422);
            expect(error.errors).toEqual(errors);
            expect(error.code).toBe('VALIDATION_ERROR');
        });
        it('should create a ValidationError with custom message', () => {
            const errors = { field: ['Error'] };
            const error = new errors_1.ValidationError(errors, 'Custom validation error');
            expect(error.message).toBe('Custom validation error');
            expect(error.errors).toEqual(errors);
        });
    });
    describe('TooManyRequestsError', () => {
        it('should create a TooManyRequestsError with default message', () => {
            const error = new errors_1.TooManyRequestsError();
            expect(error.message).toBe('Too many requests');
            expect(error.statusCode).toBe(429);
        });
        it('should create a TooManyRequestsError with custom message', () => {
            const error = new errors_1.TooManyRequestsError('Rate limit exceeded');
            expect(error.message).toBe('Rate limit exceeded');
            expect(error.statusCode).toBe(429);
        });
    });
    describe('InternalServerError', () => {
        it('should create an InternalServerError with default message', () => {
            const error = new errors_1.InternalServerError();
            expect(error.message).toBe('Internal server error');
            expect(error.statusCode).toBe(500);
            expect(error.isOperational).toBe(false);
        });
        it('should create an InternalServerError with custom message', () => {
            const error = new errors_1.InternalServerError('Database connection failed');
            expect(error.message).toBe('Database connection failed');
            expect(error.statusCode).toBe(500);
        });
    });
    describe('ServiceUnavailableError', () => {
        it('should create a ServiceUnavailableError with default message', () => {
            const error = new errors_1.ServiceUnavailableError();
            expect(error.message).toBe('Service unavailable');
            expect(error.statusCode).toBe(503);
        });
        it('should create a ServiceUnavailableError with custom message', () => {
            const error = new errors_1.ServiceUnavailableError('Maintenance in progress');
            expect(error.message).toBe('Maintenance in progress');
            expect(error.statusCode).toBe(503);
        });
    });
    describe('ErrorCode', () => {
        it('should contain all expected error codes', () => {
            expect(errors_1.ErrorCode.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
            expect(errors_1.ErrorCode.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
            expect(errors_1.ErrorCode.TOKEN_INVALID).toBe('TOKEN_INVALID');
            expect(errors_1.ErrorCode.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
            expect(errors_1.ErrorCode.USER_ALREADY_EXISTS).toBe('USER_ALREADY_EXISTS');
            expect(errors_1.ErrorCode.EMAIL_ALREADY_VERIFIED).toBe('EMAIL_ALREADY_VERIFIED');
            expect(errors_1.ErrorCode.PRODUCT_NOT_FOUND).toBe('PRODUCT_NOT_FOUND');
            expect(errors_1.ErrorCode.PRODUCT_OUT_OF_STOCK).toBe('PRODUCT_OUT_OF_STOCK');
            expect(errors_1.ErrorCode.ORDER_NOT_FOUND).toBe('ORDER_NOT_FOUND');
            expect(errors_1.ErrorCode.ORDER_ALREADY_CANCELLED).toBe('ORDER_ALREADY_CANCELLED');
            expect(errors_1.ErrorCode.PAYMENT_FAILED).toBe('PAYMENT_FAILED');
            expect(errors_1.ErrorCode.INSUFFICIENT_FUNDS).toBe('INSUFFICIENT_FUNDS');
            expect(errors_1.ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
            expect(errors_1.ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
            expect(errors_1.ErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
        });
    });
});
