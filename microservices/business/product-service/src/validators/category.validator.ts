/**
 * Category Validators
 * Professional validation schemas for category operations
 */

import { body, query, param } from 'express-validator';

/**
 * Validation for creating a new category
 */
export const validateCreateCategory = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Category description cannot exceed 1000 characters')
    .trim(),

  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Parent ID must be a valid MongoDB ObjectId'),

  body('slug')
    .optional()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
    .isLength({ min: 2, max: 100 })
    .withMessage('Slug must be between 2 and 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean'),

  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),

  body('metadata.icon')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Icon cannot exceed 100 characters'),

  body('metadata.color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code'),

  body('metadata.keywords')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Keywords must be an array with maximum 20 items'),

  body('metadata.keywords.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each keyword must be between 1 and 50 characters')
    .trim(),

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

  body('image.url')
    .optional()
    .isURL()
    .withMessage('Image URL must be valid'),

  body('image.alt')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Image alt text cannot exceed 200 characters'),
];

/**
 * Validation for updating a category
 */
export const validateUpdateCategory = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Category description cannot exceed 1000 characters')
    .trim(),

  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Parent ID must be a valid MongoDB ObjectId'),

  body('slug')
    .optional()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
    .isLength({ min: 2, max: 100 })
    .withMessage('Slug must be between 2 and 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean'),

  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),

  body('metadata.icon')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Icon cannot exceed 100 characters'),

  body('metadata.color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code'),

  body('metadata.keywords')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Keywords must be an array with maximum 20 items'),

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

  body('image.url')
    .optional()
    .isURL()
    .withMessage('Image URL must be valid'),

  body('image.alt')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Image alt text cannot exceed 200 characters'),
];

/**
 * Validation for category listing
 */
export const validateCategoryListing = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('parent')
    .optional()
    .custom((value) => {
      if (value === 'null') return true;
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Parent must be a valid MongoDB ObjectId or "null"');
      }
      return true;
    }),

  query('active')
    .optional()
    .isBoolean()
    .withMessage('Active filter must be a boolean'),

  query('level')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Level must be between 0 and 10'),

  query('includeProducts')
    .optional()
    .isBoolean()
    .withMessage('Include products flag must be a boolean'),

  query('includeChildren')
    .optional()
    .isBoolean()
    .withMessage('Include children flag must be a boolean'),
];

/**
 * Validation for category tree
 */
export const validateCategoryTree = [
  query('maxDepth')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Max depth must be between 1 and 10'),

  query('activeOnly')
    .optional()
    .isBoolean()
    .withMessage('Active only flag must be a boolean'),
];

/**
 * Validation for moving category
 */
export const validateMoveCategory = [
  body('newParentId')
    .optional()
    .custom((value) => {
      if (value === null) return true;
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('New parent ID must be a valid MongoDB ObjectId or null');
      }
      return true;
    }),

  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Position must be a non-negative integer'),
];

/**
 * Validation for category status update
 */
export const validateCategoryStatusUpdate = [
  body('isActive')
    .notEmpty()
    .withMessage('Active status is required')
    .isBoolean()
    .withMessage('Active status must be a boolean'),

  body('recursive')
    .optional()
    .isBoolean()
    .withMessage('Recursive flag must be a boolean'),
];

/**
 * Validation for category reorder
 */
export const validateCategoryReorder = [
  body('categoryOrders')
    .isArray({ min: 1, max: 100 })
    .withMessage('Category orders must be an array with 1 to 100 items'),

  body('categoryOrders.*.id')
    .isMongoId()
    .withMessage('Category ID must be a valid MongoDB ObjectId'),

  body('categoryOrders.*.sortOrder')
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
];

/**
 * Validation for bulk category import
 */
export const validateBulkCategoryImport = [
  body('categories')
    .isArray({ min: 1, max: 100 })
    .withMessage('Categories must be an array with 1 to 100 items'),

  body('categories.*.name')
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),

  body('categories.*.slug')
    .optional()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),

  body('categories.*.parentId')
    .optional()
    .isMongoId()
    .withMessage('Parent ID must be a valid MongoDB ObjectId'),

  body('categories.*.isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean'),
];

/**
 * Validation for category ID parameter
 */
export const validateCategoryId = [
  param('id')
    .isMongoId()
    .withMessage('Category ID must be a valid MongoDB ObjectId'),
];

/**
 * Validation for category slug parameter
 */
export const validateCategorySlug = [
  param('slug')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Category slug must contain only lowercase letters, numbers, and hyphens'),
];

/**
 * Validation for getting child categories
 */
export const validateGetChildren = [
  query('recursive')
    .optional()
    .isBoolean()
    .withMessage('Recursive flag must be a boolean'),
];

/**
 * Validation for category search
 */
export const validateCategorySearch = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .trim(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

/**
 * Validation for category level query
 */
export const validateCategoryLevel = [
  query('level')
    .isInt({ min: 0, max: 10 })
    .withMessage('Level must be between 0 and 10'),

  query('activeOnly')
    .optional()
    .isBoolean()
    .withMessage('Active only flag must be a boolean'),
];

/**
 * Validation for popular categories
 */
export const validatePopularCategories = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

/**
 * Validation for category cleanup
 */
export const validateCategoryCleanup = [
  body('dryRun')
    .optional()
    .isBoolean()
    .withMessage('Dry run flag must be a boolean'),
];

/**
 * Custom validator for checking circular reference
 */
export const validateNoCircularReference = () => {
  return body('parentId').custom(async (parentId, { req }) => {
    if (!parentId) return true;

    const categoryId = req.params?.id;
    if (!categoryId) return true;

    // This validation will be handled in the service layer
    // as it requires database queries
    return true;
  });
};

/**
 * Validation for category depth limit
 */
export const validateCategoryDepth = () => {
  return body('parentId').custom(async (parentId, { req }) => {
    if (!parentId) return true;

    // This validation will be handled in the service layer
    // Maximum depth is typically 5-10 levels
    return true;
  });
};