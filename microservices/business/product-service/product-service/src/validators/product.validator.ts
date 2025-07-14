/**
 * Product Validator - REAL IMPLEMENTATION
 * Fixed to match actual Prisma schema
 */

import Joi from 'joi';

/**
 * Valid product statuses (matching Prisma schema)
 */
const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

/**
 * Product creation validation schema
 */
export const validateProductInput = (data: any) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(1)
      .max(255)
      .required()
      .messages({
        'string.min': 'Product name is required',
        'string.max': 'Product name cannot exceed 255 characters',
        'any.required': 'Product name is required',
      }),

    description: Joi.string()
      .max(5000)
      .optional(),

    shortDescription: Joi.string()
      .max(500)
      .optional(),

    sku: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'SKU is required',
        'string.max': 'SKU cannot exceed 100 characters',
        'any.required': 'SKU is required',
      }),

    barcode: Joi.string()
      .max(100)
      .optional(),

    brand: Joi.string()
      .max(100)
      .optional(),

    model: Joi.string()
      .max(100)
      .optional(),

    weight: Joi.number()
      .positive()
      .optional(),

    dimensions: Joi.object().optional(),

    price: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'Price must be a positive number',
        'any.required': 'Price is required',
      }),

    comparePrice: Joi.number()
      .positive()
      .optional(),

    costPrice: Joi.number()
      .positive()
      .optional(),

    currency: Joi.string()
      .length(3)
      .default('USD'),

    categoryId: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.uuid': 'Category ID must be a valid UUID',
        'any.required': 'Category ID is required',
      }),

    vendorId: Joi.string()
      .uuid()
      .optional(),

    status: Joi.string()
      .valid(...VALID_STATUSES)
      .default('DRAFT'),

    isFeatured: Joi.boolean().default(false),
    isBestSeller: Joi.boolean().default(false),
    isNewArrival: Joi.boolean().default(false),
    isOnSale: Joi.boolean().default(false),

    salePercentage: Joi.number()
      .integer()
      .min(0)
      .max(100)
      .optional(),

    saleStartDate: Joi.date().optional(),
    saleEndDate: Joi.date()
      .greater(Joi.ref('saleStartDate'))
      .optional(),

    metaTitle: Joi.string()
      .max(255)
      .optional(),

    metaDescription: Joi.string()
      .max(500)
      .optional(),

    metaKeywords: Joi.string()
      .max(255)
      .optional(),

    tags: Joi.array()
      .items(Joi.string().max(50))
      .default([]),

    attributes: Joi.object().optional(),
    specifications: Joi.object().optional(),

    warranty: Joi.string()
      .max(500)
      .optional(),

    returnPolicy: Joi.string()
      .max(500)
      .optional(),

    shippingInfo: Joi.string()
      .max(500)
      .optional(),

    images: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          altText: Joi.string().max(200).optional(),
          isMain: Joi.boolean().default(false),
        })
      )
      .optional(),

    inventory: Joi.object({
      quantity: Joi.number()
        .integer()
        .min(0)
        .required(),
      lowStockThreshold: Joi.number()
        .integer()
        .min(0)
        .default(10),
      reorderPoint: Joi.number()
        .integer()
        .min(0)
        .default(5),
      reorderQuantity: Joi.number()
        .integer()
        .min(0)
        .default(50),
      location: Joi.string()
        .max(100)
        .optional(),
      warehouse: Joi.string()
        .max(100)
        .optional(),
    }).optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Product update validation schema
 */
export const validateProductUpdateInput = (data: any) => {
  const schema = Joi.object({
    name: Joi.string()
      .min(1)
      .max(255)
      .optional(),

    description: Joi.string()
      .max(5000)
      .optional(),

    shortDescription: Joi.string()
      .max(500)
      .optional(),

    barcode: Joi.string()
      .max(100)
      .optional(),

    brand: Joi.string()
      .max(100)
      .optional(),

    model: Joi.string()
      .max(100)
      .optional(),

    weight: Joi.number()
      .positive()
      .optional(),

    dimensions: Joi.object().optional(),

    price: Joi.number()
      .positive()
      .optional(),

    comparePrice: Joi.number()
      .positive()
      .optional(),

    costPrice: Joi.number()
      .positive()
      .optional(),

    currency: Joi.string()
      .length(3)
      .optional(),

    categoryId: Joi.string()
      .uuid()
      .optional(),

    status: Joi.string()
      .valid(...VALID_STATUSES)
      .optional(),

    isFeatured: Joi.boolean().optional(),
    isBestSeller: Joi.boolean().optional(),
    isNewArrival: Joi.boolean().optional(),
    isOnSale: Joi.boolean().optional(),

    salePercentage: Joi.number()
      .integer()
      .min(0)
      .max(100)
      .optional(),

    saleStartDate: Joi.date().optional(),
    saleEndDate: Joi.date().optional(),

    metaTitle: Joi.string()
      .max(255)
      .optional(),

    metaDescription: Joi.string()
      .max(500)
      .optional(),

    metaKeywords: Joi.string()
      .max(255)
      .optional(),

    tags: Joi.array()
      .items(Joi.string().max(50))
      .optional(),

    attributes: Joi.object().optional(),
    specifications: Joi.object().optional(),

    warranty: Joi.string()
      .max(500)
      .optional(),

    returnPolicy: Joi.string()
      .max(500)
      .optional(),

    shippingInfo: Joi.string()
      .max(500)
      .optional(),
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Product search validation schema
 */
export const validateProductSearchInput = (data: any) => {
  const schema = Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20),

    categoryId: Joi.string()
      .uuid()
      .optional(),

    brand: Joi.string()
      .max(100)
      .optional(),

    minPrice: Joi.number()
      .positive()
      .optional(),

    maxPrice: Joi.number()
      .positive()
      .optional(),

    status: Joi.string()
      .valid(...VALID_STATUSES)
      .optional(),

    search: Joi.string()
      .max(255)
      .optional(),

    sortBy: Joi.string()
      .valid('name', 'price', 'createdAt', 'updatedAt')
      .default('createdAt'),

    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc'),

    isFeatured: Joi.boolean().optional(),
    isBestSeller: Joi.boolean().optional(),
    isNewArrival: Joi.boolean().optional(),
    isOnSale: Joi.boolean().optional(),

    tags: Joi.array()
      .items(Joi.string().max(50))
      .optional(),
  });

  return schema.validate(data, { abortEarly: false });
};