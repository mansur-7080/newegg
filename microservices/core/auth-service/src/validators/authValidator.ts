import Joi from 'joi';

/**
 * Validation schema for user registration
 */
export const validateRegistration = (data: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional()
  });

  return schema.validate(data);
};

/**
 * Validation schema for user login
 */
export const validateLogin = (data: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  return schema.validate(data);
};

/**
 * Validation schema for password change
 */
export const validatePasswordChange = (data: any) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  });

  return schema.validate(data);
};

/**
 * Validation schema for password reset
 */
export const validatePasswordReset = (data: any) => {
  const schema = Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  });

  return schema.validate(data);
};

/**
 * Validation schema for profile update
 */
export const validateProfileUpdate = (data: any) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name must not exceed 50 characters'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name must not exceed 50 characters'
      }),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      })
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Validation schema for refresh token
 */
export const validateRefreshToken = (data: any) => {
  const schema = Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required'
      })
  });

  return schema.validate(data, { abortEarly: false });
};