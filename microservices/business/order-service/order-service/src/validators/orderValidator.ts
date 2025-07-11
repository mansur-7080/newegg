import Joi from 'joi';

export const validateOrderCreate = (data: any) => {
  const schema = Joi.object({
    customer: Joi.object({
      id: Joi.string().required(),
      email: Joi.string().email().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      phone: Joi.string().optional()
    }).required(),
    items: Joi.array().items(Joi.object({
      productId: Joi.string().required(),
      productName: Joi.string().required(),
      sku: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      unitPrice: Joi.number().min(0).required(),
      totalPrice: Joi.number().min(0).required(),
      variantId: Joi.string().optional(),
      variantName: Joi.string().optional()
    })).min(1).required(),
    shipping: Joi.object({
      address: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        company: Joi.string().optional(),
        address1: Joi.string().required(),
        address2: Joi.string().optional(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        postalCode: Joi.string().required(),
        country: Joi.string().required(),
        phone: Joi.string().optional()
      }).required(),
      method: Joi.string().required()
    }).required(),
    billing: Joi.object({
      address: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        company: Joi.string().optional(),
        address1: Joi.string().required(),
        address2: Joi.string().optional(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        postalCode: Joi.string().required(),
        country: Joi.string().required(),
        phone: Joi.string().optional()
      }).required(),
      method: Joi.string().required()
    }).required(),
    payment: Joi.object({
      method: Joi.string().required(),
      transactionId: Joi.string().optional(),
      status: Joi.string().valid('pending', 'paid', 'failed', 'refunded', 'partially_refunded').default('pending'),
      amount: Joi.number().min(0).required(),
      currency: Joi.string().default('USD'),
      gateway: Joi.string().required()
    }).required(),
    totals: Joi.object({
      subtotal: Joi.number().min(0).optional(),
      tax: Joi.number().min(0).optional(),
      shipping: Joi.number().min(0).optional(),
      discount: Joi.number().min(0).default(0),
      total: Joi.number().min(0).optional(),
      currency: Joi.string().default('USD')
    }).optional(),
    notes: Joi.object({
      customer: Joi.string().optional(),
      internal: Joi.string().optional()
    }).optional(),
    metadata: Joi.object().optional()
  });

  return schema.validate(data);
};

export const validateOrderUpdate = (data: any) => {
  const schema = Joi.object({
    customer: Joi.object({
      id: Joi.string().optional(),
      email: Joi.string().email().optional(),
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      phone: Joi.string().optional()
    }).optional(),
    items: Joi.array().items(Joi.object({
      productId: Joi.string().required(),
      productName: Joi.string().required(),
      sku: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      unitPrice: Joi.number().min(0).required(),
      totalPrice: Joi.number().min(0).required(),
      variantId: Joi.string().optional(),
      variantName: Joi.string().optional()
    })).optional(),
    shipping: Joi.object({
      address: Joi.object({
        firstName: Joi.string().optional(),
        lastName: Joi.string().optional(),
        company: Joi.string().optional(),
        address1: Joi.string().optional(),
        address2: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        postalCode: Joi.string().optional(),
        country: Joi.string().optional(),
        phone: Joi.string().optional()
      }).optional(),
      method: Joi.string().optional(),
      trackingNumber: Joi.string().optional(),
      estimatedDelivery: Joi.date().optional()
    }).optional(),
    billing: Joi.object({
      address: Joi.object({
        firstName: Joi.string().optional(),
        lastName: Joi.string().optional(),
        company: Joi.string().optional(),
        address1: Joi.string().optional(),
        address2: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        postalCode: Joi.string().optional(),
        country: Joi.string().optional(),
        phone: Joi.string().optional()
      }).optional(),
      method: Joi.string().optional()
    }).optional(),
    payment: Joi.object({
      method: Joi.string().optional(),
      transactionId: Joi.string().optional(),
      status: Joi.string().valid('pending', 'paid', 'failed', 'refunded', 'partially_refunded').optional(),
      amount: Joi.number().min(0).optional(),
      currency: Joi.string().optional(),
      gateway: Joi.string().optional(),
      paidAt: Joi.date().optional()
    }).optional(),
    totals: Joi.object({
      subtotal: Joi.number().min(0).optional(),
      tax: Joi.number().min(0).optional(),
      shipping: Joi.number().min(0).optional(),
      discount: Joi.number().min(0).optional(),
      total: Joi.number().min(0).optional(),
      currency: Joi.string().optional()
    }).optional(),
    notes: Joi.object({
      customer: Joi.string().optional(),
      internal: Joi.string().optional()
    }).optional(),
    metadata: Joi.object().optional()
  });

  return schema.validate(data);
};

export const validateOrderStatus = (data: any) => {
  const schema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').required(),
    note: Joi.string().optional()
  });

  return schema.validate(data);
};