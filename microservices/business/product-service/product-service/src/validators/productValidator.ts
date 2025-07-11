import Joi from 'joi';

export const validateProductCreate = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(5000).required(),
    shortDescription: Joi.string().min(10).max(500).required(),
    sku: Joi.string().min(3).max(50).required(),
    category: Joi.string().required(),
    subcategory: Joi.string().optional(),
    brand: Joi.string().required(),
    price: Joi.object({
      current: Joi.number().min(0).required(),
      original: Joi.number().min(0).optional(),
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'UZS').default('USD')
    }).required(),
    images: Joi.object({
      primary: Joi.string().uri().required(),
      gallery: Joi.array().items(Joi.string().uri()).optional()
    }).required(),
    specifications: Joi.object().optional(),
    features: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    variants: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      sku: Joi.string().required(),
      price: Joi.number().min(0).required(),
      stock: Joi.number().min(0).default(0),
      attributes: Joi.object().optional()
    })).optional(),
    inventory: Joi.object({
      totalStock: Joi.number().min(0).default(0),
      lowStockThreshold: Joi.number().min(0).default(5),
      trackInventory: Joi.boolean().default(true)
    }).optional(),
    shipping: Joi.object({
      weight: Joi.number().min(0).required(),
      dimensions: Joi.object({
        length: Joi.number().min(0).required(),
        width: Joi.number().min(0).required(),
        height: Joi.number().min(0).required()
      }).required(),
      freeShipping: Joi.boolean().default(false),
      shippingClass: Joi.string().optional()
    }).required(),
    seo: Joi.object({
      metaTitle: Joi.string().max(60).optional(),
      metaDescription: Joi.string().max(160).optional(),
      keywords: Joi.array().items(Joi.string()).optional()
    }).optional(),
    vendor: Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required()
    }).optional()
  });

  return schema.validate(data);
};

export const validateProductUpdate = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(10).max(5000).optional(),
    shortDescription: Joi.string().min(10).max(500).optional(),
    sku: Joi.string().min(3).max(50).optional(),
    category: Joi.string().optional(),
    subcategory: Joi.string().optional(),
    brand: Joi.string().optional(),
    price: Joi.object({
      current: Joi.number().min(0).optional(),
      original: Joi.number().min(0).optional(),
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'UZS').optional()
    }).optional(),
    images: Joi.object({
      primary: Joi.string().uri().optional(),
      gallery: Joi.array().items(Joi.string().uri()).optional()
    }).optional(),
    specifications: Joi.object().optional(),
    features: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    variants: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      sku: Joi.string().required(),
      price: Joi.number().min(0).required(),
      stock: Joi.number().min(0).default(0),
      attributes: Joi.object().optional()
    })).optional(),
    inventory: Joi.object({
      totalStock: Joi.number().min(0).optional(),
      lowStockThreshold: Joi.number().min(0).optional(),
      trackInventory: Joi.boolean().optional()
    }).optional(),
    shipping: Joi.object({
      weight: Joi.number().min(0).optional(),
      dimensions: Joi.object({
        length: Joi.number().min(0).optional(),
        width: Joi.number().min(0).optional(),
        height: Joi.number().min(0).optional()
      }).optional(),
      freeShipping: Joi.boolean().optional(),
      shippingClass: Joi.string().optional()
    }).optional(),
    seo: Joi.object({
      metaTitle: Joi.string().max(60).optional(),
      metaDescription: Joi.string().max(160).optional(),
      keywords: Joi.array().items(Joi.string()).optional()
    }).optional(),
    status: Joi.string().valid('active', 'inactive', 'draft').optional(),
    visibility: Joi.string().valid('public', 'private', 'password').optional(),
    featured: Joi.boolean().optional(),
    bestSeller: Joi.boolean().optional(),
    newArrival: Joi.boolean().optional()
  });

  return schema.validate(data);
};

export const validateProductSearch = (data: any) => {
  const schema = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    category: Joi.string().optional(),
    brand: Joi.string().optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    status: Joi.string().valid('active', 'inactive', 'draft').default('active'),
    sortBy: Joi.string().valid('name', 'price', 'rating', 'createdAt', 'updatedAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().optional(),
    featured: Joi.boolean().optional(),
    bestSeller: Joi.boolean().optional(),
    newArrival: Joi.boolean().optional()
  });

  return schema.validate(data);
};

export const validateProduct = validateProductCreate;

/**
 * Validation schema for product filters
 */
export const validateProductFilters = (data: any) => {
  const schema = Joi.object({
    category: Joi.string()
      .optional(),
    brand: Joi.string()
      .optional(),
    minPrice: Joi.number()
      .min(0)
      .optional(),
    maxPrice: Joi.number()
      .min(0)
      .optional(),
    inStock: Joi.boolean()
      .optional(),
    featured: Joi.boolean()
      .optional(),
    bestSeller: Joi.boolean()
      .optional(),
    newArrival: Joi.boolean()
      .optional(),
    search: Joi.string()
      .optional(),
    sortBy: Joi.string()
      .valid('name', 'price', 'rating', 'createdAt', 'updatedAt')
      .default('createdAt'),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc'),
    page: Joi.number()
      .min(1)
      .default(1),
    limit: Joi.number()
      .min(1)
      .max(100)
      .default(20)
  });

  return schema.validate(data, { abortEarly: false });
};
