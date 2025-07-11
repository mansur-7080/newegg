import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { logger } from '@ultramarket/shared/logging/logger';
import { validateToken } from '@ultramarket/shared/auth/jwt';
import { requireAdmin } from '@ultramarket/shared/auth/jwt';

const router = Router();

// Validation middleware
const validateCategory = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('description').trim().isLength({ min: 10, max: 1000 }),
  body('image').notEmpty(),
  body('parentId').optional().isMongoId(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('seo.title').optional().isLength({ max: 60 }),
  body('seo.description').optional().isLength({ max: 160 }),
];

const validateCategoryUpdate = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }),
  body('image').optional().notEmpty(),
  body('parentId').optional().isMongoId(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('seo.title').optional().isLength({ max: 60 }),
  body('seo.description').optional().isLength({ max: 160 }),
];

// Get all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parent', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    logger.info('Categories fetched successfully', { count: categories.length });

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    logger.error('Failed to fetch categories', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get category tree
router.get('/tree', async (req: Request, res: Response) => {
  try {
    const categoryTree = await Category.getCategoryTree();

    logger.info('Category tree fetched successfully');

    res.status(200).json({
      success: true,
      data: { categories: categoryTree },
    });
  } catch (error) {
    logger.error('Failed to fetch category tree', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get root categories
router.get('/root', async (req: Request, res: Response) => {
  try {
    const categories = await Category.findRootCategories()
      .populate('children', 'name slug description image productCount')
      .lean();

    logger.info('Root categories fetched successfully', { count: categories.length });

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    logger.error('Failed to fetch root categories', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get category by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id)
      .populate('parent', 'name slug')
      .populate('children', 'name slug description image productCount')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    logger.info('Category fetched successfully', { categoryId: id });

    res.status(200).json({
      success: true,
      data: { category },
    });
  } catch (error) {
    logger.error('Failed to fetch category', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get category by slug
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const category = await Category.findBySlug(slug)
      .populate('parent', 'name slug')
      .populate('children', 'name slug description image productCount')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    logger.info('Category fetched by slug successfully', { slug });

    res.status(200).json({
      success: true,
      data: { category },
    });
  } catch (error) {
    logger.error('Failed to fetch category by slug', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get child categories
router.get('/:id/children', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if parent category exists
    const parentCategory = await Category.findById(id);
    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: 'Parent category not found',
      });
    }

    const children = await Category.findChildren(id);

    logger.info('Child categories fetched successfully', { parentId: id, count: children.length });

    res.status(200).json({
      success: true,
      data: { 
        parent: parentCategory,
        children 
      },
    });
  } catch (error) {
    logger.error('Failed to fetch child categories', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Create new category (Admin only)
router.post('/', validateToken, requireAdmin, validateCategory, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Check if parent category exists (if provided)
    if (req.body.parentId) {
      const parentCategory = await Category.findById(req.body.parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
        });
      }
    }

    const category = new Category(req.body);
    await category.save();

    logger.info('Category created successfully', { categoryId: category._id });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  } catch (error) {
    logger.error('Failed to create category', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Update category (Admin only)
router.put('/:id', validateToken, requireAdmin, validateCategoryUpdate, async (req: Request, res: Response) => {
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

    // Check if category exists
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if parent category exists (if being updated)
    if (req.body.parentId) {
      const parentCategory = await Category.findById(req.body.parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found',
        });
      }
      
      // Prevent circular reference
      if (req.body.parentId === id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent',
        });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).populate('parent', 'name slug');

    logger.info('Category updated successfully', { categoryId: id });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category: updatedCategory },
    });
  } catch (error) {
    logger.error('Failed to update category', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Delete category (Admin only)
router.delete('/:id', validateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if category has children
    const childrenCount = await Category.countDocuments({ parentId: id, isActive: true });
    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories',
      });
    }

    // Check if category has products
    const productsCount = await Product.countDocuments({ categoryId: id, isActive: true });
    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with products',
      });
    }

    // Soft delete - mark as inactive
    category.isActive = false;
    await category.save();

    logger.info('Category deleted successfully', { categoryId: id });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete category', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Get category statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Get product statistics
    const [totalProducts, activeProducts, featuredProducts] = await Promise.all([
      Product.countDocuments({ categoryId: id }),
      Product.countDocuments({ categoryId: id, isActive: true }),
      Product.countDocuments({ categoryId: id, isActive: true, isFeatured: true }),
    ]);

    // Get price statistics
    const priceStats = await Product.aggregate([
      { $match: { categoryId: category._id, isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' },
          totalValue: { $sum: '$price' },
        },
      },
    ]);

    const stats = {
      totalProducts,
      activeProducts,
      featuredProducts,
      priceRange: priceStats[0] ? {
        min: priceStats[0].minPrice,
        max: priceStats[0].maxPrice,
        average: priceStats[0].avgPrice,
        totalValue: priceStats[0].totalValue,
      } : null,
    };

    logger.info('Category statistics fetched successfully', { categoryId: id });

    res.status(200).json({
      success: true,
      data: { 
        category: {
          id: category._id,
          name: category.name,
          slug: category.slug,
        },
        stats 
      },
    });
  } catch (error) {
    logger.error('Failed to fetch category statistics', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;