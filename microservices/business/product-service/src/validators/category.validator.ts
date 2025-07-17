import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const categorySchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  image: Joi.string().uri().optional(),
  parentId: Joi.string().uuid().optional(),
  isActive: Joi.boolean().default(true).optional(),
  sortOrder: Joi.number().integer().min(0).default(0).optional(),
});

const categoryUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  image: Joi.string().uri().optional(),
  parentId: Joi.string().uuid().optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

export const validateCategoryInput = (req: Request, res: Response, next: NextFunction) => {
  const { error } = categorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

export const validateCategoryUpdateInput = (req: Request, res: Response, next: NextFunction) => {
  const { error } = categoryUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};