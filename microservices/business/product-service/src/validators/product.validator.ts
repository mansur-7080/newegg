/**
 * Product Validation Schemas
 * Professional input validation for UltraMarket Product Service
 */

import Joi from 'joi';

/**
 * Uzbekistan-specific validation patterns
 */
const UZBEKISTAN_PATTERNS = {
  // Uzbek phone number: +998XXXXXXXXX
  PHONE: /^\+998[0-9]{9}$/,
  // Uzbek postal code: 6 digits
  POSTAL_CODE: /^[0-9]{6}$/,
  // Valid currency codes for Uzbekistan
  CURRENCIES: ['UZS', 'USD', 'EUR'],
  // Uzbek text pattern (Cyrillic, Latin, numbers, common punctuation)
  UZBEK_TEXT: /^[\u0400-\u04FF\u0020-\u007Fa-zA-Z0-9\s\.,;:!?'"()\-\u2013\u2014]*$/,
};

/**
 * Valid product statuses (matching Prisma schema)
 */
const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];

/**
 * Common validation schemas
 */
const CommonSchemas = {
  objectId: Joi.string().length(24).hex().message('Invalid ID format'),
  
  productName: Joi.string()
    .min(2)
    .max(200)
    .required()
    .pattern(/^[^<>]*$/) // No HTML tags
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 200 characters',
      'string.pattern.base': 'Product name contains invalid characters',
      'string.empty': 'Product name is required',
    }),

  uzbekName: Joi.string()
    .min(2)
    .max(200)
    .pattern(UZBEKISTAN_PATTERNS.UZBEK_TEXT)
    .messages({
      'string.min': 'Uzbek name must be at least 2 characters',
      'string.max': 'Uzbek name cannot exceed 200 characters',
      'string.pattern.base': 'Uzbek name contains invalid characters',
    }),

  description: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description cannot exceed 5000 characters',
      'string.empty': 'Description is required',
    }),

  shortDescription: Joi.string()
    .max(300)
    .messages({
      'string.max': 'Short description cannot exceed 300 characters',
    }),

  price: Joi.number()
    .positive()
    .precision(2)
    .max(999999999)
    .required()
    .messages({
      'number.positive': 'Price must be positive',
      'number.max': 'Price is too high',
      'number.base': 'Price must be a valid number',
      'any.required': 'Price is required',
    }),

  comparePrice: Joi.number()
    .positive()
    .precision(2)
    .max(999999999)
    .messages({
      'number.positive': 'Compare price must be positive',
      'number.max': 'Compare price is too high',
    }),

  costPrice: Joi.number()
    .positive()
    .precision(2)
    .max(999999999)
    .messages({
      'number.positive': 'Cost price must be positive',
      'number.max': 'Cost price is too high',
    }),

  currency: Joi.string()
    .valid(...UZBEKISTAN_PATTERNS.CURRENCIES)
    .default('UZS')
    .messages({
      'any.only': `Currency must be one of: ${UZBEKISTAN_PATTERNS.CURRENCIES.join(', ')}`,
    }),

  categoryId: Joi.string()
    .length(36) // UUID length
    .required()
    .messages({
      'string.length': 'Category ID must be a valid UUID',
      'any.required': 'Category ID is required',
    }),

  brand: Joi.string()
    .min(1)
    .max(100)
    .required()
    .pattern(/^[^<>]*$/)
    .messages({
      'string.min': 'Brand name is required',
      'string.max': 'Brand name cannot exceed 100 characters',
      'string.pattern.base': 'Brand name contains invalid characters',
      'any.required': 'Brand is required',
    }),

  sku: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[A-Z0-9\-_]+$/)
    .required()
    .messages({
      'string.min': 'SKU must be at least 3 characters',
      'string.max': 'SKU cannot exceed 50 characters',
      'string.pattern.base': 'SKU can only contain uppercase letters, numbers, hyphens, and underscores',
      'any.required': 'SKU is required',
    }),

  weight: Joi.number()
    .positive()
    .max(1000000) // 1000 kg max
    .messages({
      'number.positive': 'Weight must be positive',
      'number.max': 'Weight is too high',
    }),

  dimensions: Joi.object({
    length: Joi.number().positive().max(10000),
    width: Joi.number().positive().max(10000),
    height: Joi.number().positive().max(10000),
  }).messages({
    'object.base': 'Dimensions must be an object with length, width, and height',
  }),

  images: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().uri({ scheme: ['http', 'https'] }),
        Joi.object({
          url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
          altText: Joi.string().max(200),
          isMain: Joi.boolean().default(false),
        })
      )
    )
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one image is required',
      'array.max': 'Cannot have more than 20 images',
      'any.required': 'Images are required',
    }),

  thumbnail: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .messages({
      'string.uri': 'Thumbnail must be a valid URL',
    }),

  tags: Joi.array()
    .items(
      Joi.string()
        .min(1)
        .max(50)
        .pattern(/^[a-zA-Z0-9\s\-_]+$/)
        .messages({
          'string.pattern.base': 'Tags can only contain letters, numbers, spaces, hyphens, and underscores',
        })
    )
    .max(20)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 20 tags',
    }),

  attributes: Joi.object()
    .pattern(
      Joi.string(),
      Joi.alternatives().try(
        Joi.string().max(500),
        Joi.number(),
        Joi.boolean(),
        Joi.array().items(Joi.string().max(100))
      )
    )
    .default({})
    .messages({
      'object.base': 'Attributes must be an object',
    }),

  seoTitle: Joi.string()
    .max(120)
    .messages({
      'string.max': 'SEO title cannot exceed 120 characters',
    }),

  seoDescription: Joi.string()
    .max(300)
    .messages({
      'string.max': 'SEO description cannot exceed 300 characters',
    }),

  seoKeywords: Joi.array()
    .items(Joi.string().max(50))
    .max(20)
    .default([])
    .messages({
      'array.max': 'Cannot have more than 20 SEO keywords',
    }),

  quantity: Joi.number()
    .integer()
    .min(0)
    .max(1000000)
    .required()
    .messages({
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity cannot be negative',
      'number.max': 'Quantity is too high',
      'any.required': 'Quantity is required',
    }),

  lowStockThreshold: Joi.number()
    .integer()
    .min(0)
    .max(1000)
    .default(10)
    .messages({
      'number.integer': 'Low stock threshold must be a whole number',
      'number.min': 'Low stock threshold cannot be negative',
    }),

  reorderPoint: Joi.number()
    .integer()
    .min(0)
    .max(1000)
    .default(5)
    .messages({
      'number.integer': 'Reorder point must be a whole number',
      'number.min': 'Reorder point cannot be negative',
    }),

  reorderQuantity: Joi.number()
    .integer()
    .min(0)
    .max(1000000)
    .default(50)
    .messages({
      'number.integer': 'Reorder quantity must be a whole number',
      'number.min': 'Reorder quantity cannot be negative',
    }),

  status: Joi.string()
    .valid(...VALID_STATUSES)
    .default('DRAFT')
    .messages({
      'any.only': `Status must be one of: ${VALID_STATUSES.join(', ')}`,
    }),

  isFeatured: Joi.boolean().default(false),

  isBestSeller: Joi.boolean().default(false),

  isNewArrival: Joi.boolean().default(false),

  isOnSale: Joi.boolean().default(false),

  salePercentage: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .messages({
      'number.min': 'Sale percentage cannot be negative',
      'number.max': 'Sale percentage cannot exceed 100%',
    }),

  saleStartDate: Joi.date(),

  saleEndDate: Joi.date().greater(Joi.ref('saleStartDate')),
};

/**
 * Product creation validation schema
 */
export const validateProductInput = (data: any) => {
  const schema = Joi.object({
    name: CommonSchemas.productName,
    description: CommonSchemas.description.optional(),
    shortDescription: CommonSchemas.shortDescription,
    categoryId: CommonSchemas.categoryId,
    brand: CommonSchemas.brand.optional(),
    model: Joi.string().max(100),
    sku: CommonSchemas.sku,
    barcode: Joi.string().max(100),
    price: CommonSchemas.price,
    comparePrice: CommonSchemas.comparePrice,
    costPrice: CommonSchemas.costPrice,
    currency: CommonSchemas.currency,
    weight: CommonSchemas.weight,
    dimensions: CommonSchemas.dimensions,
    images: CommonSchemas.images,
    tags: CommonSchemas.tags,
    attributes: CommonSchemas.attributes,
    specifications: CommonSchemas.attributes,
    metaTitle: CommonSchemas.seoTitle,
    metaDescription: CommonSchemas.seoDescription,
    metaKeywords: CommonSchemas.seoKeywords,
    warranty: Joi.string().max(500),
    returnPolicy: Joi.string().max(500),
    shippingInfo: Joi.string().max(500),
    quantity: CommonSchemas.quantity,
    lowStockThreshold: CommonSchemas.lowStockThreshold,
    reorderPoint: CommonSchemas.reorderPoint,
    reorderQuantity: CommonSchemas.reorderQuantity,
    location: Joi.string().max(100),
    warehouse: Joi.string().max(100),
    status: CommonSchemas.status,
    isFeatured: CommonSchemas.isFeatured,
    isBestSeller: CommonSchemas.isBestSeller,
    isNewArrival: CommonSchemas.isNewArrival,
    isOnSale: CommonSchemas.isOnSale,
    salePercentage: CommonSchemas.salePercentage,
    saleStartDate: CommonSchemas.saleStartDate,
    saleEndDate: CommonSchemas.saleEndDate,
  })
  .custom((value, helpers) => {
    // Custom validation: compare price should be higher than price
    if (value.comparePrice && value.price && value.comparePrice <= value.price) {
      return helpers.error('custom.comparePriceTooLow');
    }

    // Custom validation: cost price should be lower than price
    if (value.costPrice && value.price && value.costPrice >= value.price) {
      return helpers.error('custom.costPriceTooHigh');
    }

    // Custom validation: max stock should be higher than min stock
    if (value.maxStock && value.minStock && value.maxStock <= value.minStock) {
      return helpers.error('custom.maxStockTooLow');
    }

    // Custom validation: stock should be within min/max range
    if (value.minStock && value.stock < value.minStock) {
      return helpers.error('custom.stockBelowMinimum');
    }

    if (value.maxStock && value.stock > value.maxStock) {
      return helpers.error('custom.stockAboveMaximum');
    }

    return value;
  })
  .messages({
    'custom.comparePriceTooLow': 'Compare price must be higher than selling price',
    'custom.costPriceTooHigh': 'Cost price must be lower than selling price',
    'custom.maxStockTooLow': 'Maximum stock must be higher than minimum stock',
    'custom.stockBelowMinimum': 'Stock cannot be below minimum stock level',
    'custom.stockAboveMaximum': 'Stock cannot be above maximum stock level',
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Product update validation schema
 */
export const validateProductUpdateInput = (data: any) => {
  const schema = Joi.object({
    name: CommonSchemas.productName.optional(),
    nameUz: CommonSchemas.uzbekName.optional(),
    nameRu: CommonSchemas.uzbekName.optional(),
    description: CommonSchemas.description.optional(),
    descriptionUz: Joi.string().min(10).max(5000).optional(),
    descriptionRu: Joi.string().min(10).max(5000).optional(),
    shortDescription: CommonSchemas.shortDescription.optional(),
    category: CommonSchemas.category.optional(),
    subcategory: CommonSchemas.subcategory.optional(),
    brand: CommonSchemas.brand.optional(),
    price: CommonSchemas.price.optional(),
    comparePrice: CommonSchemas.comparePrice.optional(),
    costPrice: CommonSchemas.costPrice.optional(),
    weight: CommonSchemas.weight.optional(),
    dimensions: CommonSchemas.dimensions.optional(),
    images: CommonSchemas.images.optional(),
    thumbnail: CommonSchemas.thumbnail.optional(),
    tags: CommonSchemas.tags.optional(),
    attributes: CommonSchemas.attributes.optional(),
    seoTitle: CommonSchemas.seoTitle.optional(),
    seoDescription: CommonSchemas.seoDescription.optional(),
    seoKeywords: CommonSchemas.seoKeywords.optional(),
    stock: CommonSchemas.stock.optional(),
    minStock: CommonSchemas.minStock.optional(),
    maxStock: CommonSchemas.maxStock.optional(),
    isDigital: CommonSchemas.isDigital.optional(),
    shippingRequired: CommonSchemas.shippingRequired.optional(),
    status: CommonSchemas.status.optional(),
    featured: CommonSchemas.featured.optional(),
    visibility: CommonSchemas.visibility.optional(),
  })
  .min(1) // At least one field must be provided for update
  .custom((value, helpers) => {
    // Same custom validations as create
    if (value.comparePrice && value.price && value.comparePrice <= value.price) {
      return helpers.error('custom.comparePriceTooLow');
    }

    if (value.costPrice && value.price && value.costPrice >= value.price) {
      return helpers.error('custom.costPriceTooHigh');
    }

    if (value.maxStock && value.minStock && value.maxStock <= value.minStock) {
      return helpers.error('custom.maxStockTooLow');
    }

    if (value.minStock && value.stock !== undefined && value.stock < value.minStock) {
      return helpers.error('custom.stockBelowMinimum');
    }

    if (value.maxStock && value.stock !== undefined && value.stock > value.maxStock) {
      return helpers.error('custom.stockAboveMaximum');
    }

    return value;
  })
  .messages({
    'object.min': 'At least one field must be provided for update',
    'custom.comparePriceTooLow': 'Compare price must be higher than selling price',
    'custom.costPriceTooHigh': 'Cost price must be lower than selling price',
    'custom.maxStockTooLow': 'Maximum stock must be higher than minimum stock',
    'custom.stockBelowMinimum': 'Stock cannot be below minimum stock level',
    'custom.stockAboveMaximum': 'Stock cannot be above maximum stock level',
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Product search validation schema
 */
export const validateProductSearchInput = (data: any) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().valid(...VALID_CATEGORIES),
    subcategory: Joi.string().valid(...VALID_SUBCATEGORIES),
    brand: Joi.string().max(100),
    minPrice: Joi.number().positive().max(999999999),
    maxPrice: Joi.number().positive().max(999999999),
    status: Joi.string().valid(...VALID_STATUSES),
    vendorId: CommonSchemas.objectId,
    featured: Joi.boolean(),
    inStock: Joi.boolean(),
    tags: Joi.array().items(Joi.string().max(50)),
    search: Joi.string().max(200).pattern(/^[^<>]*$/),
    sortBy: Joi.string().valid(
      'price', 'name', 'rating', 'sales', 'views', 'stock', 'createdAt'
    ).default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  })
  .custom((value, helpers) => {
    // Validate price range
    if (value.minPrice && value.maxPrice && value.minPrice >= value.maxPrice) {
      return helpers.error('custom.invalidPriceRange');
    }

    return value;
  })
  .messages({
    'custom.invalidPriceRange': 'Minimum price must be less than maximum price',
  });

  return schema.validate(data, { abortEarly: false });
};

/**
 * Bulk operation validation schema
 */
export const validateBulkOperationInput = (data: any) => {
  const schema = Joi.object({
    productIds: Joi.array()
      .items(CommonSchemas.objectId)
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one product ID is required',
        'array.max': 'Cannot process more than 100 products at once',
        'any.required': 'Product IDs are required',
      }),
    operation: Joi.string()
      .valid('updateStatus', 'updateCategory', 'updateVisibility', 'delete', 'updatePrices')
      .required()
      .messages({
        'any.only': 'Invalid bulk operation',
        'any.required': 'Operation is required',
      }),
    data: Joi.object()
      .when('operation', {
        is: 'updateStatus',
        then: Joi.object({
          status: CommonSchemas.status.required(),
        }).required(),
        otherwise: Joi.when('operation', {
          is: 'updateCategory',
          then: Joi.object({
            category: CommonSchemas.category.required(),
            subcategory: CommonSchemas.subcategory,
          }).required(),
          otherwise: Joi.when('operation', {
            is: 'updateVisibility',
            then: Joi.object({
              visibility: CommonSchemas.visibility.required(),
            }).required(),
            otherwise: Joi.when('operation', {
              is: 'updatePrices',
              then: Joi.object({
                priceAdjustment: Joi.number().min(-99).max(1000).required(),
                adjustmentType: Joi.string().valid('percentage', 'fixed').required(),
              }).required(),
              otherwise: Joi.object().optional(),
            }),
          }),
        }),
      }),
  });

  return schema.validate(data, { abortEarly: false });
};