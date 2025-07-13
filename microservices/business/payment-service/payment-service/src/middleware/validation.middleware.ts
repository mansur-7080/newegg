import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

// Payment validation schemas
const paymentSchemas = {
  createPayment: Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid('UZS', 'USD', 'EUR').required(),
    orderId: Joi.string().required(),
    userId: Joi.string().required(),
    paymentMethod: Joi.string().valid('click', 'payme', 'uzcard').required(),
    description: Joi.string().max(500).optional(),
    returnUrl: Joi.string().uri().optional(),
    cancelUrl: Joi.string().uri().optional(),
  }),

  processWebhook: Joi.object({
    transactionId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    status: Joi.string().valid('success', 'failed', 'pending').required(),
    signature: Joi.string().required(),
    timestamp: Joi.number().required(),
  }),

  refundPayment: Joi.object({
    transactionId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    reason: Joi.string().max(200).required(),
    userId: Joi.string().required(),
  }),

  getPaymentStatus: Joi.object({
    transactionId: Joi.string().required(),
  }),

  getPaymentHistory: Joi.object({
    userId: Joi.string().required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('all', 'success', 'failed', 'pending').default('all'),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
  }),
};

// Click payment validation schemas
const clickSchemas = {
  createClickPayment: Joi.object({
    amount: Joi.number().positive().required(),
    orderId: Joi.string().required(),
    userId: Joi.string().required(),
    description: Joi.string().max(500).optional(),
    returnUrl: Joi.string().uri().optional(),
    cancelUrl: Joi.string().uri().optional(),
  }),

  clickWebhook: Joi.object({
    click_trans_id: Joi.string().required(),
    service_id: Joi.string().required(),
    merchant_trans_id: Joi.string().required(),
    amount: Joi.number().positive().required(),
    action: Joi.number().valid(0, 1).required(),
    sign_time: Joi.string().required(),
    sign_string: Joi.string().required(),
    error: Joi.number().optional(),
    error_note: Joi.string().optional(),
  }),
};

// Payme payment validation schemas
const paymeSchemas = {
  createPaymePayment: Joi.object({
    amount: Joi.number().positive().required(),
    orderId: Joi.string().required(),
    userId: Joi.string().required(),
    description: Joi.string().max(500).optional(),
    returnUrl: Joi.string().uri().optional(),
    cancelUrl: Joi.string().uri().optional(),
  }),

  paymeWebhook: Joi.object({
    id: Joi.string().required(),
    method: Joi.string().required(),
    params: Joi.object({
      id: Joi.string().required(),
      amount: Joi.number().positive().required(),
      account: Joi.object({
        order_id: Joi.string().required(),
      }).required(),
      time: Joi.number().required(),
      create_time: Joi.number().required(),
      perform_time: Joi.number().optional(),
      cancel_time: Joi.number().optional(),
      transaction: Joi.string().required(),
      state: Joi.number().valid(-2, -1, 0, 1, 2).required(),
      reason: Joi.number().optional(),
    }).required(),
  }),
};

// Validation middleware factory
const createValidationMiddleware = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

             throw new ValidationError('Validation failed');
    }

    // Replace request body with validated data
    req.body = value;
    next();
  };
};

// Query validation middleware factory
const createQueryValidationMiddleware = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

             throw new ValidationError('Query validation failed');
    }

    // Replace request query with validated data
    req.query = value;
    next();
  };
};

// Params validation middleware factory
const createParamsValidationMiddleware = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

             throw new ValidationError('Parameter validation failed');
    }

    // Replace request params with validated data
    req.params = value;
    next();
  };
};

// Export validation middlewares
export const validateCreatePayment = createValidationMiddleware(paymentSchemas.createPayment);
export const validateProcessWebhook = createValidationMiddleware(paymentSchemas.processWebhook);
export const validateRefundPayment = createValidationMiddleware(paymentSchemas.refundPayment);
export const validateGetPaymentStatus = createParamsValidationMiddleware(paymentSchemas.getPaymentStatus);
export const validateGetPaymentHistory = createQueryValidationMiddleware(paymentSchemas.getPaymentHistory);

export const validateCreateClickPayment = createValidationMiddleware(clickSchemas.createClickPayment);
export const validateClickWebhook = createValidationMiddleware(clickSchemas.clickWebhook);

export const validateCreatePaymePayment = createValidationMiddleware(paymeSchemas.createPaymePayment);
export const validatePaymeWebhook = createValidationMiddleware(paymeSchemas.paymeWebhook);

// Generic validation middleware
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return createValidationMiddleware(schema);
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return createQueryValidationMiddleware(schema);
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return createParamsValidationMiddleware(schema);
};
