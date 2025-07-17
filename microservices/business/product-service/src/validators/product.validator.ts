/**
 * Product Validators
 * Professional validation schemas for product operations
 */

import { body, query, param } from 'express-validator';

/**
 * Validation for creating a new product
 */
export const validateCreateProduct = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters')
    .trim(),

  body('description')
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Product description must be between 10 and 5000 characters')
    .trim(),

  body('sku')
    .notEmpty()
    .withMessage('SKU is required')
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('SKU must contain only uppercase letters, numbers, hyphens, and underscores')
    .isLength({ min: 3, max: 50 })
    .withMessage('SKU must be between 3 and 50 characters'),

  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .custom((value) => {
      if (value < 0.01) {
        throw new Error('Price must be at least 0.01');
      }
      return true;
    }),

  body('comparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number')
    .custom((value, { req }) => {
      if (value && req.body.price && value <= req.body.price) {
        throw new Error('Compare price must be greater than regular price');
      }
      return true;
    }),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ObjectId'),

  body('subcategory')
    .optional()
    .isMongoId()
    .withMessage('Subcategory must be a valid MongoDB ObjectId'),

  body('brand')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Brand name cannot exceed 100 characters')
    .trim(),

  body('status')
    .optional()
    .isIn(['draft', 'active', 'inactive', 'archived'])
    .withMessage('Status must be one of: draft, active, inactive, archived'),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),

  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .trim(),

  body('images')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Images must be an array with maximum 10 items'),

  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('Image URL must be valid'),

  body('images.*.alt')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Image alt text cannot exceed 200 characters'),

  body('variants')
    .optional()
    .isArray({ max: 50 })
    .withMessage('Variants must be an array with maximum 50 items'),

  body('variants.*.name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Variant name must be between 1 and 100 characters'),

  body('variants.*.sku')
    .optional()
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('Variant SKU must contain only uppercase letters, numbers, hyphens, and underscores'),

  body('variants.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Variant price must be a positive number'),

  body('inventory.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Inventory quantity must be a non-negative integer'),

  body('inventory.tracked')
    .optional()
    .isBoolean()
    .withMessage('Inventory tracked must be a boolean'),

  body('inventory.allowBackorder')
    .optional()
    .isBoolean()
    .withMessage('Allow backorder must be a boolean'),

  body('inventory.lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer'),

  body('seo.title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('SEO title cannot exceed 200 characters')
    .trim(),

  body('seo.description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('SEO description cannot exceed 500 characters')
    .trim(),

  body('seo.keywords')
    .optional()
    .isArray({ max: 20 })
    .withMessage('SEO keywords must be an array with maximum 20 items'),

  body('dimensions.weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),

  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number'),

  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),

  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('Featured status must be a boolean'),

  body('isDigital')
    .optional()
    .isBoolean()
    .withMessage('Digital product status must be a boolean'),
];

/**
 * Validation for updating a product
 */
export const validateUpdateProduct = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Product description must be between 10 and 5000 characters')
    .trim(),

  body('sku')
    .optional()
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('SKU must contain only uppercase letters, numbers, hyphens, and underscores')
    .isLength({ min: 3, max: 50 })
    .withMessage('SKU must be between 3 and 50 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be at least 0.01'),

  body('comparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number')
    .custom((value, { req }) => {
      if (value && req.body.price && value <= req.body.price) {
        throw new Error('Compare price must be greater than regular price');
      }
      return true;
    }),

  body('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ObjectId'),

  body('subcategory')
    .optional()
    .isMongoId()
    .withMessage('Subcategory must be a valid MongoDB ObjectId'),

  body('brand')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Brand name cannot exceed 100 characters')
    .trim(),

  body('status')
    .optional()
    .isIn(['draft', 'active', 'inactive', 'archived'])
    .withMessage('Status must be one of: draft, active, inactive, archived'),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('Featured status must be a boolean'),

  body('isDigital')
    .optional()
    .isBoolean()
    .withMessage('Digital product status must be a boolean'),
];

/**
 * Validation for product search
 */
export const validateProductSearch = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .trim(),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ObjectId'),

  query('brand')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Brand cannot exceed 100 characters')
    .trim(),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number')
    .custom((value, { req }) => {
      if (value && req.query.minPrice && parseFloat(value) < parseFloat(req.query.minPrice)) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      return true;
    }),

  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'rating', 'sales', 'createdAt', 'updatedAt', 'relevance'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

/**
 * Validation for product listing
 */
export const validateProductListing = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters')
    .trim(),

  query('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ObjectId'),

  query('brand')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Brand cannot exceed 100 characters')
    .trim(),

  query('status')
    .optional()
    .isIn(['draft', 'active', 'inactive', 'archived'])
    .withMessage('Status must be one of: draft, active, inactive, archived'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),

  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'rating', 'sales', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

/**
 * Validation for updating inventory
 */
export const validateInventoryUpdate = [
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),

  body('tracked')
    .optional()
    .isBoolean()
    .withMessage('Tracked must be a boolean'),

  body('allowBackorder')
    .optional()
    .isBoolean()
    .withMessage('Allow backorder must be a boolean'),

  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer'),
];

/**
 * Validation for bulk operations
 */
export const validateBulkProducts = [
  body('products')
    .isArray({ min: 1, max: 100 })
    .withMessage('Products must be an array with 1 to 100 items'),

  body('products.*.name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),

  body('products.*.sku')
    .notEmpty()
    .withMessage('SKU is required')
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('SKU must contain only uppercase letters, numbers, hyphens, and underscores'),

  body('products.*.price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be at least 0.01'),

  body('products.*.category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Category must be a valid MongoDB ObjectId'),
];

/**
 * Validation for status update
 */
export const validateStatusUpdate = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['draft', 'active', 'inactive', 'archived'])
    .withMessage('Status must be one of: draft, active, inactive, archived'),
];

/**
 * Validation for featured toggle
 */
export const validateFeaturedToggle = [
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('Featured status must be a boolean'),
];

/**
 * Validation for product ID parameter
 */
export const validateProductId = [
  param('id')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
];

/**
 * Validation for product slug parameter
 */
export const validateProductSlug = [
  param('slug')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Product slug must contain only lowercase letters, numbers, and hyphens'),
];

/**
 * Validation for category ID parameter
 */
export const validateCategoryId = [
  param('categoryId')
    .isMongoId()
    .withMessage('Category ID must be a valid MongoDB ObjectId'),
];

/**
 * Validation for featured products query
 */
export const validateFeaturedProducts = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];