"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUserOrAdmin = exports.requireAdmin = exports.requireRole = exports.verifyRefreshToken = exports.generateRefreshToken = exports.generateAccessToken = exports.validateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../logging/logger");
/**
 * Validate JWT token middleware
 */
const validateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Access token required',
            });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!process.env.JWT_SECRET) {
            logger_1.logger.error('JWT_SECRET not configured');
            res.status(500).json({
                success: false,
                message: 'Server configuration error',
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Add user info to request
        req.user = decoded;
        next();
    }
    catch (error) {
        logger_1.logger.error('Token validation failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: 'Token expired',
            });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Token validation error',
            });
        }
    }
};
exports.validateToken = validateToken;
/**
 * Generate access token
 */
const generateAccessToken = (payload) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
    }
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
};
exports.generateAccessToken = generateAccessToken;
/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET not configured');
    }
    return jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET not configured');
    }
    return jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;
/**
 * Role-based access control middleware
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Admin-only middleware
 */
exports.requireAdmin = (0, exports.requireRole)(['ADMIN', 'SUPER_ADMIN']);
/**
 * User or admin middleware
 */
exports.requireUserOrAdmin = (0, exports.requireRole)(['USER', 'ADMIN', 'SUPER_ADMIN']);
