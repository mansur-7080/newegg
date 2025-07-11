import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { logger } from '@ultramarket/shared/logging/logger';
import { validateToken } from '@ultramarket/shared/auth/jwt';
import { requireAdmin } from '@ultramarket/shared/auth/jwt';

const router = Router();

// Validation middleware
const validateProduct = [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('description').trim().isLength({ min: 10, max: 5000 }),
  body('shortDescription').trim().isLength({ min: 10, max: 500 }),
  body('brand').trim().isLength({ min: 2, max: 100 }),
  body('price').isFloat({ min: 0 }),
  body('costPrice').isFloat({ min: 0 }),
  body('currency').isIn(['USD', 'EUR', 'UZS']),
  body('categoryId').isMongoId(),
  body('images').isArray({ min: 1 }),
  body('thumbnail').notEmpty(),
  body('stock').isInt({ min: 0 }),
  body('weight').isFloat({ min: 0 }),
  body('dimensions.length').isFloat({ min: 0 }),
  body('dimensions.width').isFloat({ min: 0 }),
  body('dimensions.height').isFloat({ min: 0 }),
];

const validateProductUpdate = [
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ min: 10, max: 5000 }),
  body('shortDescription').optional().trim().isLength({ min: 10, max: 500 }),
  body('brand').optional().trim().isLength({ min: 2, max: 100 }),
  body('price').optional().isFloat({ min: 0 }),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('currency').optional().isIn(['USD', 'EUR', 'UZS']),
  body('categoryId').optional().isMongoId(),
  body('stock').optional().isInt({ min: 0 }),
  body('weight').optional().isFloat({ min: 0 }),
];

// Get all products with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isMongoId(),
  query('brand').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sort').optional().isIn(['name', 'price', 'createdAt', 'rating', 'sales']),
  query('order').optional().isIn(['asc', 'desc']),
  query('featured').optional().isBoolean(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      page = 1,
      limit = 20,
      category,
      brand,
      minPrice,
      maxPrice,
      sort = 'createdAt',
      order = 'desc',
      featured,
    } = req.query;

    // Build filter object
    const filter: any = { isActive: true };
    
    if (category) filter.categoryId = category;
    if (brand) filter.brand = { $regex: brand as string, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice as string);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice as string);
    }
    if (featured === 'true') filter.isFeatured = true;

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit as string));

    logger.info('Products fetched successfully', { 
      count: products.length, 
      total, 
      page: parseInt(page as string) 
    });

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch products', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('category', 'name slug description')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    logger.info('Product fetched successfully', { productId: id });

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    logger.error('Failed to fetch product', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get product by SKU
router.get('/sku/:sku', async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;

    const product = await Product.findOne({ sku, isActive: true })
      .populate('category', 'name slug description')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    logger.info('Product fetched by SKU successfully', { sku });

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    logger.error('Failed to fetch product by SKU', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Create new product (Admin only)
router.post('/', validateToken, requireAdmin, validateProduct, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Check if category exists
    const category = await Category.findById(req.body.categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found',
      });
    }

    const product = new Product(req.body);
    await product.save();

    // Update category product count
    await category.updateProductCount();

    logger.info('Product created successfully', { productId: product._id });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    logger.error('Failed to create product', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Update product (Admin only)
router.put('/:id', validateToken, requireAdmin, validateProductUpdate, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    // Check if product exists
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if category exists (if being updated)
    if (req.body.categoryId) {
      const category = await Category.findById(req.body.categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found',
        });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name slug description');

    logger.info('Product updated successfully', { productId: id });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct },
    });
  } catch (error) {
    logger.error('Failed to update product', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Delete product (Admin only)
router.delete('/:id', validateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Soft delete - mark as inactive
    product.isActive = false;
    await product.save();

    // Update category product count
    const category = await Category.findById(product.categoryId);
    if (category) {
      await category.updateProductCount();
    }

    logger.info('Product deleted successfully', { productId: id });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete product', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get featured products
router.get('/featured/list', async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .populate('category', 'name slug')
      .sort({ 'sales.total': -1 })
      .limit(10)
      .lean();

    logger.info('Featured products fetched successfully', { count: products.length });

    res.status(200).json({
      success: true,
      data: { products },
    });
  } catch (error) {
    logger.error('Failed to fetch featured products', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get products by category
router.get('/category/:categoryId', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['name', 'price', 'createdAt', 'rating', 'sales']),
  query('order').optional().isIn(['asc', 'desc']),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { categoryId } = req.params;
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = order === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [products, total] = await Promise.all([
      Product.find({ categoryId, isActive: true })
        .populate('category', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Product.countDocuments({ categoryId, isActive: true }),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit as string));

    logger.info('Products by category fetched successfully', { 
      categoryId, 
      count: products.length, 
      total 
    });

    res.status(200).json({
      success: true,
      data: {
        category,
        products,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages,
          hasNext: parseInt(page as string) < totalPages,
          hasPrev: parseInt(page as string) > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch products by category', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;