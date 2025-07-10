import Joi from 'joi';
import { UserRole } from './types';

// Common validation patterns
const patterns = {
  email: Joi.string().email().max(255),
  password: Joi.string().min(8).max(128).pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  ),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  uuid: Joi.string().uuid(),
  url: Joi.string().uri(),
  positiveNumber: Joi.number().positive(),
  nonNegativeNumber: Joi.number().min(0),
  date: Joi.date().iso(),
  boolean: Joi.boolean()
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    email: patterns.email.required(),
    password: patterns.password.required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phoneNumber: patterns.phone.optional(),
    role: Joi.string().valid(...Object.values(UserRole)).default(UserRole.CUSTOMER)
  }),

  login: Joi.object({
    email: patterns.email.required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phoneNumber: patterns.phone.optional(),
    bio: Joi.string().max(500).optional(),
    profileImage: patterns.url.optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: patterns.password.required()
  }),

  resetPassword: Joi.object({
    email: patterns.email.required()
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required()
  })
};

// Address validation schemas
export const addressSchemas = {
  create: Joi.object({
    type: Joi.string().valid('SHIPPING', 'BILLING').required(),
    street1: Joi.string().min(5).max(255).required(),
    street2: Joi.string().max(255).optional(),
    city: Joi.string().min(2).max(100).required(),
    state: Joi.string().min(2).max(100).required(),
    postalCode: Joi.string().min(3).max(20).required(),
    country: Joi.string().min(2).max(100).required(),
    isDefault: patterns.boolean.optional()
  }),

  update: Joi.object({
    type: Joi.string().valid('SHIPPING', 'BILLING').optional(),
    street1: Joi.string().min(5).max(255).optional(),
    street2: Joi.string().max(255).optional(),
    city: Joi.string().min(2).max(100).optional(),
    state: Joi.string().min(2).max(100).optional(),
    postalCode: Joi.string().min(3).max(20).optional(),
    country: Joi.string().min(2).max(100).optional(),
    isDefault: patterns.boolean.optional()
  })
};

// Product validation schemas
export const productSchemas = {
  create: Joi.object({
    name: Joi.string().min(3).max(255).required(),
    description: Joi.string().min(10).max(2000).required(),
    price: patterns.positiveNumber.required(),
    compareAtPrice: patterns.positiveNumber.optional(),
    costPrice: patterns.positiveNumber.optional(),
    sku: Joi.string().min(3).max(100).required(),
    barcode: Joi.string().max(100).optional(),
    weight: patterns.nonNegativeNumber.optional(),
    dimensions: Joi.object({
      length: patterns.nonNegativeNumber.required(),
      width: patterns.nonNegativeNumber.required(),
      height: patterns.nonNegativeNumber.required()
    }).optional(),
    categoryId: patterns.uuid.required(),
    brandId: patterns.uuid.optional(),
    tags: Joi.array().items(Joi.string().min(2).max(50)).optional(),
    images: Joi.array().items(patterns.url).min(1).optional(),
    isActive: patterns.boolean.optional(),
    isFeatured: patterns.boolean.optional(),
    inventory: Joi.object({
      quantity: patterns.nonNegativeNumber.required(),
      lowStockThreshold: patterns.nonNegativeNumber.optional(),
      trackQuantity: patterns.boolean.optional()
    }).required()
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(255).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    price: patterns.positiveNumber.optional(),
    compareAtPrice: patterns.positiveNumber.optional(),
    costPrice: patterns.positiveNumber.optional(),
    sku: Joi.string().min(3).max(100).optional(),
    barcode: Joi.string().max(100).optional(),
    weight: patterns.nonNegativeNumber.optional(),
    dimensions: Joi.object({
      length: patterns.nonNegativeNumber.required(),
      width: patterns.nonNegativeNumber.required(),
      height: patterns.nonNegativeNumber.required()
    }).optional(),
    categoryId: patterns.uuid.optional(),
    brandId: patterns.uuid.optional(),
    tags: Joi.array().items(Joi.string().min(2).max(50)).optional(),
    images: Joi.array().items(patterns.url).min(1).optional(),
    isActive: patterns.boolean.optional(),
    isFeatured: patterns.boolean.optional(),
    inventory: Joi.object({
      quantity: patterns.nonNegativeNumber.required(),
      lowStockThreshold: patterns.nonNegativeNumber.optional(),
      trackQuantity: patterns.boolean.optional()
    }).optional()
  })
};

// Order validation schemas
export const orderSchemas = {
  create: Joi.object({
    items: Joi.array().items(
      Joi.object({
        productId: patterns.uuid.required(),
        quantity: patterns.positiveNumber.required(),
        price: patterns.positiveNumber.required()
      })
    ).min(1).required(),
    shippingAddressId: patterns.uuid.required(),
    billingAddressId: patterns.uuid.required(),
    paymentMethod: Joi.string().valid('CREDIT_CARD', 'PAYPAL', 'STRIPE').required(),
    notes: Joi.string().max(500).optional()
  }),

  update: Joi.object({
    status: Joi.string().valid(
      'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'
    ).optional(),
    trackingNumber: Joi.string().max(100).optional(),
    notes: Joi.string().max(500).optional()
  })
};

// Cart validation schemas
export const cartSchemas = {
  addItem: Joi.object({
    productId: patterns.uuid.required(),
    quantity: patterns.positiveNumber.required()
  }),

  updateItem: Joi.object({
    quantity: patterns.positiveNumber.required()
  })
};

// Review validation schemas
export const reviewSchemas = {
  create: Joi.object({
    productId: patterns.uuid.required(),
    rating: Joi.number().min(1).max(5).required(),
    title: Joi.string().min(5).max(200).required(),
    comment: Joi.string().min(10).max(1000).required(),
    images: Joi.array().items(patterns.url).optional()
  }),

  update: Joi.object({
    rating: Joi.number().min(1).max(5).optional(),
    title: Joi.string().min(5).max(200).optional(),
    comment: Joi.string().min(10).max(1000).optional(),
    images: Joi.array().items(patterns.url).optional()
  })
};

// Search validation schemas
export const searchSchemas = {
  search: Joi.object({
    query: Joi.string().min(1).max(255).required(),
    category: Joi.string().optional(),
    brand: Joi.string().optional(),
    minPrice: patterns.nonNegativeNumber.optional(),
    maxPrice: patterns.positiveNumber.optional(),
    rating: Joi.number().min(1).max(5).optional(),
    sortBy: Joi.string().valid('relevance', 'price_asc', 'price_desc', 'newest', 'rating').optional(),
    page: patterns.nonNegativeNumber.optional(),
    limit: Joi.number().min(1).max(100).optional()
  })
};

// Pagination validation schema
export const paginationSchema = Joi.object({
  page: patterns.nonNegativeNumber.optional(),
  limit: Joi.number().min(1).max(100).optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

// Common validation functions
export const validateId = (id: string): boolean => {
  const { error } = patterns.uuid.validate(id);
  return !error;
};

export const validateEmail = (email: string): boolean => {
  const { error } = patterns.email.validate(email);
  return !error;
};

export const validatePassword = (password: string): boolean => {
  const { error } = patterns.password.validate(password);
  return !error;
};

// Export all schemas
export const schemas = {
  user: userSchemas,
  address: addressSchemas,
  product: productSchemas,
  order: orderSchemas,
  cart: cartSchemas,
  review: reviewSchemas,
  search: searchSchemas,
  pagination: paginationSchema
}; 