import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const productSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).optional(),
  shortDescription: Joi.string().max(500).optional(),
  sku: Joi.string().min(1).max(100).required(),
  barcode: Joi.string().optional(),
  brand: Joi.string().max(100).optional(),
  model: Joi.string().max(100).optional(),
  weight: Joi.number().positive().optional(),
  dimensions: Joi.object().optional(),
  price: Joi.number().positive().required(),
  comparePrice: Joi.number().positive().optional(),
  costPrice: Joi.number().positive().optional(),
  currency: Joi.string().length(3).default('USD').optional(),
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED').default('DRAFT').optional(),
  type: Joi.string().valid('PHYSICAL', 'DIGITAL', 'SERVICE').default('PHYSICAL').optional(),
  isActive: Joi.boolean().default(true).optional(),
  isFeatured: Joi.boolean().default(false).optional(),
  isBestSeller: Joi.boolean().default(false).optional(),
  isNewArrival: Joi.boolean().default(false).optional(),
  isOnSale: Joi.boolean().default(false).optional(),
  salePercentage: Joi.number().min(0).max(100).optional(),
  saleStartDate: Joi.date().optional(),
  saleEndDate: Joi.date().optional(),
  metaTitle: Joi.string().max(255).optional(),
  metaDescription: Joi.string().max(500).optional(),
  metaKeywords: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  attributes: Joi.object().optional(),
  specifications: Joi.object().optional(),
  warranty: Joi.string().max(255).optional(),
  returnPolicy: Joi.string().max(500).optional(),
  shippingInfo: Joi.string().max(500).optional(),
  categoryId: Joi.string().uuid().required(),
  vendorId: Joi.string().uuid().optional(),
});

const productUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(2000).optional(),
  shortDescription: Joi.string().max(500).optional(),
  sku: Joi.string().min(1).max(100).optional(),
  barcode: Joi.string().optional(),
  brand: Joi.string().max(100).optional(),
  model: Joi.string().max(100).optional(),
  weight: Joi.number().positive().optional(),
  dimensions: Joi.object().optional(),
  price: Joi.number().positive().optional(),
  comparePrice: Joi.number().positive().optional(),
  costPrice: Joi.number().positive().optional(),
  currency: Joi.string().length(3).optional(),
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED').optional(),
  type: Joi.string().valid('PHYSICAL', 'DIGITAL', 'SERVICE').optional(),
  isActive: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  isBestSeller: Joi.boolean().optional(),
  isNewArrival: Joi.boolean().optional(),
  isOnSale: Joi.boolean().optional(),
  salePercentage: Joi.number().min(0).max(100).optional(),
  saleStartDate: Joi.date().optional(),
  saleEndDate: Joi.date().optional(),
  metaTitle: Joi.string().max(255).optional(),
  metaDescription: Joi.string().max(500).optional(),
  metaKeywords: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  attributes: Joi.object().optional(),
  specifications: Joi.object().optional(),
  warranty: Joi.string().max(255).optional(),
  returnPolicy: Joi.string().max(500).optional(),
  shippingInfo: Joi.string().max(500).optional(),
  categoryId: Joi.string().uuid().optional(),
});

export const validateProductInput = (req: Request, res: Response, next: NextFunction) => {
  const { error } = productSchema.validate(req.body);
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

export const validateProductUpdateInput = (req: Request, res: Response, next: NextFunction) => {
  const { error } = productUpdateSchema.validate(req.body);
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