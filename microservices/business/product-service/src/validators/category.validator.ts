import Joi from 'joi';

export const categoryValidation = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    slug: Joi.string().lowercase().trim().optional(),
    parentId: Joi.string().uuid().optional().allow(null),
    image: Joi.string().uri().optional(),
    icon: Joi.string().optional(),
    isActive: Joi.boolean().default(true),
    displayOrder: Joi.number().integer().min(0).default(0),
    metadata: Joi.object().optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().max(500),
    slug: Joi.string().lowercase().trim(),
    parentId: Joi.string().uuid().allow(null),
    image: Joi.string().uri(),
    icon: Joi.string(),
    isActive: Joi.boolean(),
    displayOrder: Joi.number().integer().min(0),
    metadata: Joi.object()
  }).min(1)
};