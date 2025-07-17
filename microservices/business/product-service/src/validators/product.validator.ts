import Joi from 'joi';

export const productValidation = {
  create: Joi.object({
    name: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(5000).required(),
    sku: Joi.string().uppercase().required(),
    price: Joi.number().positive().required(),
    compareAtPrice: Joi.number().positive().optional(),
    cost: Joi.number().positive().optional(),
    quantity: Joi.number().integer().min(0).required(),
    categoryId: Joi.string().uuid().required(),
    brand: Joi.string().max(100).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    weight: Joi.number().positive().optional(),
    dimensions: Joi.object({
      length: Joi.number().positive(),
      width: Joi.number().positive(),
      height: Joi.number().positive()
    }).optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    status: Joi.string().valid('active', 'draft', 'archived').default('draft'),
    attributes: Joi.object().pattern(
      Joi.string(),
      Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
    ).optional(),
    seo: Joi.object({
      title: Joi.string().max(70),
      description: Joi.string().max(160),
      keywords: Joi.array().items(Joi.string())
    }).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(200),
    description: Joi.string().min(10).max(5000),
    sku: Joi.string().uppercase(),
    price: Joi.number().positive(),
    compareAtPrice: Joi.number().positive(),
    cost: Joi.number().positive(),
    quantity: Joi.number().integer().min(0),
    categoryId: Joi.string().uuid(),
    brand: Joi.string().max(100),
    tags: Joi.array().items(Joi.string()),
    weight: Joi.number().positive(),
    dimensions: Joi.object({
      length: Joi.number().positive(),
      width: Joi.number().positive(),
      height: Joi.number().positive()
    }),
    images: Joi.array().items(Joi.string().uri()),
    status: Joi.string().valid('active', 'draft', 'archived'),
    attributes: Joi.object().pattern(
      Joi.string(),
      Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
    ),
    seo: Joi.object({
      title: Joi.string().max(70),
      description: Joi.string().max(160),
      keywords: Joi.array().items(Joi.string())
    })
  }).min(1),

  search: Joi.object({
    query: Joi.string().min(1).max(100),
    category: Joi.string().uuid(),
    brand: Joi.string(),
    minPrice: Joi.number().positive(),
    maxPrice: Joi.number().positive(),
    inStock: Joi.boolean(),
    tags: Joi.array().items(Joi.string()),
    sort: Joi.string().valid('price_asc', 'price_desc', 'name', 'created', 'popularity'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

export const validateProductInput = (data: any) => {
  return productValidation.create.validate(data, { abortEarly: false });
};

export const validateProductUpdateInput = (data: any) => {
  return productValidation.update.validate(data, { abortEarly: false });
};

export const validateProductSearchInput = (data: any) => {
  return productValidation.search.validate(data, { abortEarly: false });
};