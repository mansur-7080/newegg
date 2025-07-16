/**
 * UltraMarket Error Handler Middleware
 * Professional error handling for Express applications
 */
import { Request, Response, NextFunction } from 'express';
export interface ErrorWithCode extends Error {
    code?: string;
    statusCode?: number;
    details?: unknown;
    isOperational?: boolean;
}
export interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
    code?: string;
}
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    readonly details?: unknown;
    constructor(message: string, statusCode?: number, code?: string, details?: unknown, isOperational?: boolean);
}
export declare class ValidationAppError extends AppError {
    readonly validationErrors: ValidationError[];
    constructor(message: string, validationErrors: ValidationError[]);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare function errorHandler(error: ErrorWithCode, req: Request, res: Response, next: NextFunction): void;
export declare function asyncHandler<T extends Request, U extends Response>(fn: (req: T, res: U, next: NextFunction) => Promise<void>): (req: T, res: U, next: NextFunction) => void;
export declare function notFoundHandler(req: Request, res: Response): void;
export declare function handleValidationError(errors: ValidationError[]): ValidationAppError;
export declare function handleDatabaseError(error: Error): AppError;
export declare function handleUnhandledRejection(): void;
export declare function handleUncaughtException(): void;
export declare function initializeErrorHandlers(): void;
declare const _default: {
    errorHandler: typeof errorHandler;
    notFoundHandler: typeof notFoundHandler;
    asyncHandler: typeof asyncHandler;
    AppError: typeof AppError;
    ValidationAppError: typeof ValidationAppError;
    NotFoundError: typeof NotFoundError;
    UnauthorizedError: typeof UnauthorizedError;
    ForbiddenError: typeof ForbiddenError;
    ConflictError: typeof ConflictError;
    RateLimitError: typeof RateLimitError;
    handleValidationError: typeof handleValidationError;
    handleDatabaseError: typeof handleDatabaseError;
    initializeErrorHandlers: typeof initializeErrorHandlers;
};
export default _default;
//# sourceMappingURL=error-handler.d.ts.map