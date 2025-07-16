"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlInjectionProtection = exports.xssProtection = exports.securityHeaders = exports.schemas = exports.fileUploadSchema = exports.rateLimitSchema = exports.ValidationError = exports.validateRequest = exports.validateEnvironment = exports.sanitizeHtml = exports.sanitizeInput = exports.uuidSchema = exports.phoneSchema = exports.usernameSchema = exports.emailSchema = exports.apiGatewayEnvironmentSchema = exports.orderServiceEnvironmentSchema = exports.cartServiceEnvironmentSchema = exports.productServiceEnvironmentSchema = exports.userServiceEnvironmentSchema = exports.baseEnvironmentSchema = exports.databaseUrlSchema = exports.jwtSecretSchema = exports.passwordSchema = void 0;
// Auth exports
__exportStar(require("./auth"), exports);
// Cache exports
__exportStar(require("./cache"), exports);
// Constants exports
__exportStar(require("./constants"), exports);
// Error exports
__exportStar(require("./errors"), exports);
// Logger exports
__exportStar(require("./logger"), exports);
// Messaging exports
__exportStar(require("./messaging"), exports);
// Types exports
__exportStar(require("./types"), exports);
// Utils exports
__exportStar(require("./utils"), exports);
// Explicitly export only needed validation and middleware symbols to avoid conflicts
var validation_1 = require("./validation");
Object.defineProperty(exports, "passwordSchema", { enumerable: true, get: function () { return validation_1.passwordSchema; } });
Object.defineProperty(exports, "jwtSecretSchema", { enumerable: true, get: function () { return validation_1.jwtSecretSchema; } });
Object.defineProperty(exports, "databaseUrlSchema", { enumerable: true, get: function () { return validation_1.databaseUrlSchema; } });
Object.defineProperty(exports, "baseEnvironmentSchema", { enumerable: true, get: function () { return validation_1.baseEnvironmentSchema; } });
Object.defineProperty(exports, "userServiceEnvironmentSchema", { enumerable: true, get: function () { return validation_1.userServiceEnvironmentSchema; } });
Object.defineProperty(exports, "productServiceEnvironmentSchema", { enumerable: true, get: function () { return validation_1.productServiceEnvironmentSchema; } });
Object.defineProperty(exports, "cartServiceEnvironmentSchema", { enumerable: true, get: function () { return validation_1.cartServiceEnvironmentSchema; } });
Object.defineProperty(exports, "orderServiceEnvironmentSchema", { enumerable: true, get: function () { return validation_1.orderServiceEnvironmentSchema; } });
Object.defineProperty(exports, "apiGatewayEnvironmentSchema", { enumerable: true, get: function () { return validation_1.apiGatewayEnvironmentSchema; } });
Object.defineProperty(exports, "emailSchema", { enumerable: true, get: function () { return validation_1.emailSchema; } });
Object.defineProperty(exports, "usernameSchema", { enumerable: true, get: function () { return validation_1.usernameSchema; } });
Object.defineProperty(exports, "phoneSchema", { enumerable: true, get: function () { return validation_1.phoneSchema; } });
Object.defineProperty(exports, "uuidSchema", { enumerable: true, get: function () { return validation_1.uuidSchema; } });
Object.defineProperty(exports, "sanitizeInput", { enumerable: true, get: function () { return validation_1.sanitizeInput; } });
Object.defineProperty(exports, "sanitizeHtml", { enumerable: true, get: function () { return validation_1.sanitizeHtml; } });
Object.defineProperty(exports, "validateEnvironment", { enumerable: true, get: function () { return validation_1.validateEnvironment; } });
Object.defineProperty(exports, "validateRequest", { enumerable: true, get: function () { return validation_1.validateRequest; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return validation_1.ValidationError; } });
Object.defineProperty(exports, "rateLimitSchema", { enumerable: true, get: function () { return validation_1.rateLimitSchema; } });
Object.defineProperty(exports, "fileUploadSchema", { enumerable: true, get: function () { return validation_1.fileUploadSchema; } });
Object.defineProperty(exports, "schemas", { enumerable: true, get: function () { return validation_1.schemas; } });
// Export securityHeaders and other middleware as needed
var security_1 = require("./middleware/security");
Object.defineProperty(exports, "securityHeaders", { enumerable: true, get: function () { return security_1.securityHeaders; } });
Object.defineProperty(exports, "xssProtection", { enumerable: true, get: function () { return security_1.xssProtection; } });
Object.defineProperty(exports, "sqlInjectionProtection", { enumerable: true, get: function () { return security_1.sqlInjectionProtection; } });
