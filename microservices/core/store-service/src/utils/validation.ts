import { body, param, query } from 'express-validator';

export const StoreValidation = {
  // Create store validation
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Store name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Store name must be between 2 and 100 characters'),
    
    body('slug')
      .trim()
      .notEmpty()
      .withMessage('Store slug is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Store slug must be between 2 and 50 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Store slug can only contain lowercase letters, numbers, and hyphens'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('phone')
      .optional()
      .trim()
      .isMobilePhone('any')
      .withMessage('Invalid phone number format'),
    
    body('website')
      .optional()
      .trim()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Invalid website URL'),
    
    body('address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Address cannot exceed 500 characters'),
    
    body('facebook')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid Facebook URL'),
    
    body('instagram')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid Instagram URL'),
    
    body('telegram')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Telegram handle cannot exceed 100 characters'),
  ],

  // Update store validation
  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid store ID format'),
    
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Store name cannot be empty')
      .isLength({ min: 2, max: 100 })
      .withMessage('Store name must be between 2 and 100 characters'),
    
    body('slug')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Store slug cannot be empty')
      .isLength({ min: 2, max: 50 })
      .withMessage('Store slug must be between 2 and 50 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Store slug can only contain lowercase letters, numbers, and hyphens'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('phone')
      .optional()
      .trim()
      .isMobilePhone('any')
      .withMessage('Invalid phone number format'),
    
    body('website')
      .optional()
      .trim()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Invalid website URL'),
    
    body('commission')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Commission must be between 0 and 100'),
    
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    
    body('isVerified')
      .optional()
      .isBoolean()
      .withMessage('isVerified must be a boolean'),
  ],

  // Get store validation
  getById: [
    param('id')
      .isUUID()
      .withMessage('Invalid store ID format'),
  ],

  // Get stores with filters
  getAll: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    
    query('isVerified')
      .optional()
      .isBoolean()
      .withMessage('isVerified must be a boolean'),
    
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
  ],
};

export const ProductValidation = {
  create: [
    param('storeId')
      .isUUID()
      .withMessage('Invalid store ID format'),
    
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Product name is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Product name must be between 2 and 200 characters'),
    
    body('slug')
      .trim()
      .notEmpty()
      .withMessage('Product slug is required')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Product slug can only contain lowercase letters, numbers, and hyphens'),
    
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    
    body('salePrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Sale price must be a positive number'),
    
    body('sku')
      .trim()
      .notEmpty()
      .withMessage('SKU is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('SKU must be between 1 and 50 characters'),
    
    body('stock')
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    
    body('categoryId')
      .isUUID()
      .withMessage('Invalid category ID format'),
  ],

  update: [
    param('storeId')
      .isUUID()
      .withMessage('Invalid store ID format'),
    
    param('productId')
      .isUUID()
      .withMessage('Invalid product ID format'),
    
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
  ],
};

export const CategoryValidation = {
  create: [
    param('storeId')
      .isUUID()
      .withMessage('Invalid store ID format'),
    
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Category name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Category name must be between 2 and 100 characters'),
    
    body('slug')
      .trim()
      .notEmpty()
      .withMessage('Category slug is required')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Category slug can only contain lowercase letters, numbers, and hyphens'),
    
    body('parentId')
      .optional()
      .isUUID()
      .withMessage('Invalid parent category ID format'),
  ],
};

export const StaffValidation = {
  create: [
    param('storeId')
      .isUUID()
      .withMessage('Invalid store ID format'),
    
    body('userId')
      .isUUID()
      .withMessage('Invalid user ID format'),
    
    body('role')
      .isIn(['STAFF', 'MANAGER', 'ADMIN'])
      .withMessage('Invalid staff role'),
    
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
  ],
};