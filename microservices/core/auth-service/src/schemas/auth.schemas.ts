/**
 * UltraMarket Auth Service - Validation Schemas
 * Professional validation schemas for authentication endpoints
 */

import Joi from 'joi';

export const authSchemas = {
  /**
   * User registration schema
   */
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required',
      }),
    firstName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name must not exceed 50 characters',
        'any.required': 'First name is required',
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name must not exceed 50 characters',
        'any.required': 'Last name is required',
      }),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
      }),
  }),

  /**
   * User login schema
   */
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required',
      }),
  }),

  /**
   * Refresh token schema
   */
  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required',
      }),
  }),

  /**
   * Logout schema
   */
  logout: Joi.object({
    refreshToken: Joi.string()
      .optional()
      .messages({
        'string.base': 'Refresh token must be a string',
      }),
  }),

  /**
   * Update profile schema
   */
  updateProfile: Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name must not exceed 50 characters',
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name must not exceed 50 characters',
      }),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
      }),
  }),

  /**
   * Change password schema
   */
  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required',
      }),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required',
      }),
  }),

  /**
   * Forgot password schema
   */
  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
  }),

  /**
   * Reset password schema
   */
  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required',
      }),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required',
      }),
  }),

  /**
   * Verify email schema
   */
  verifyEmail: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Verification token is required',
      }),
  }),
};