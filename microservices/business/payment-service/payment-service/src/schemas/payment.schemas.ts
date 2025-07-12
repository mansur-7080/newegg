import Joi from 'joi';

export const createPaymentSchema = Joi.object({
  orderId: Joi.string().required().messages({
    'string.empty': 'Order ID is required',
    'any.required': 'Order ID is required',
  }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required',
  }),
  currency: Joi.string().valid('UZS', 'USD').default('UZS').messages({
    'string.empty': 'Currency is required',
    'any.only': 'Currency must be UZS or USD',
  }),
  paymentMethod: Joi.string().valid('CLICK', 'PAYME', 'UZCARD', 'HUMO', 'CASH_ON_DELIVERY').required().messages({
    'string.empty': 'Payment method is required',
    'any.only': 'Payment method must be CLICK, PAYME, UZCARD, HUMO, or CASH_ON_DELIVERY',
    'any.required': 'Payment method is required',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description must be less than 500 characters',
  }),
  returnUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Return URL must be a valid URI',
  }),
  cancelUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Cancel URL must be a valid URI',
  }),
});

export const confirmPaymentSchema = Joi.object({
  paymentId: Joi.string().required().messages({
    'string.empty': 'Payment ID is required',
    'any.required': 'Payment ID is required',
  }),
  transactionId: Joi.string().required().messages({
    'string.empty': 'Transaction ID is required',
    'any.required': 'Transaction ID is required',
  }),
  signature: Joi.string().required().messages({
    'string.empty': 'Signature is required',
    'any.required': 'Signature is required',
  }),
});

export const refundPaymentSchema = Joi.object({
  paymentId: Joi.string().required().messages({
    'string.empty': 'Payment ID is required',
    'any.required': 'Payment ID is required',
  }),
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required',
  }),
  reason: Joi.string().max(200).required().messages({
    'string.empty': 'Reason is required',
    'string.max': 'Reason must be less than 200 characters',
    'any.required': 'Reason is required',
  }),
});

export const webhookSchema = Joi.object({
  // Click webhook fields
  click_trans_id: Joi.string().optional(),
  service_id: Joi.string().optional(),
  merchant_trans_id: Joi.string().optional(),
  click_amount: Joi.number().optional(),
  action: Joi.number().optional(),
  sign_time: Joi.string().optional(),
  sign_string: Joi.string().optional(),
  error: Joi.number().optional(),
  error_note: Joi.string().optional(),

  // Payme webhook fields
  payme_id: Joi.string().optional(),
  account: Joi.object().optional(),
  payme_amount: Joi.number().optional(),
  time: Joi.number().optional(),
  reason: Joi.number().optional(),
  code: Joi.string().optional(),
  state: Joi.number().optional(),
  test: Joi.boolean().optional(),

  // Uzcard webhook fields
  transaction_id: Joi.string().optional(),
  order_id: Joi.string().optional(),
  uzcard_amount: Joi.number().optional(),
  currency: Joi.string().optional(),
  status: Joi.string().optional(),
  signature: Joi.string().optional(),

  // Humo webhook fields
  humo_transaction_id: Joi.string().optional(),
  humo_order_id: Joi.string().optional(),
  humo_amount: Joi.number().optional(),
  humo_status: Joi.string().optional(),
  humo_signature: Joi.string().optional(),
});

export const paymentIdParamSchema = Joi.object({
  id: Joi.string().required().messages({
    'string.empty': 'Payment ID is required',
    'any.required': 'Payment ID is required',
  }),
});

export const orderIdParamSchema = Joi.object({
  orderId: Joi.string().required().messages({
    'string.empty': 'Order ID is required',
    'any.required': 'Order ID is required',
  }),
});

export const getPaymentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must be at most 100',
  }),
  status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED').optional().messages({
    'any.only': 'Status must be PENDING, COMPLETED, FAILED, CANCELLED, or REFUNDED',
  }),
  method: Joi.string().valid('CLICK', 'PAYME', 'UZCARD', 'HUMO', 'CASH_ON_DELIVERY').optional().messages({
    'any.only': 'Method must be CLICK, PAYME, UZCARD, HUMO, or CASH_ON_DELIVERY',
  }),
});

export const paymentStatisticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().required().messages({
    'date.base': 'Start date must be a valid date',
    'date.format': 'Start date must be in ISO format',
    'any.required': 'Start date is required',
  }),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required().messages({
    'date.base': 'End date must be a valid date',
    'date.format': 'End date must be in ISO format',
    'date.min': 'End date must be after start date',
    'any.required': 'End date is required',
  }),
  groupBy: Joi.string().valid('day', 'week', 'month').default('day').messages({
    'any.only': 'Group by must be day, week, or month',
  }),
});
