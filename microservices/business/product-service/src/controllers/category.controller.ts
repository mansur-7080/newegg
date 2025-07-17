/**
 * Category Controller
 * Professional category management with comprehensive operations
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { logger } from '../shared/logger';
import { ValidationError, NotFoundError } from '../shared/errors';
import Category, { ICategory } from '../models/Category';
import Product from '../models/Product';
import { CategoryService } from '../services/category.service';

export class CategoryController {
  private static categoryService = new CategoryService();

  /**
   * Get all categories with filtering
   * GET /api/v1/categories
   */
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        parent,
        active,
        level,
        includeProducts,
        page = 1,
        limit = 50
      } = req.query;

      const filter: any = {};

      // Apply filters
      if (parent !== undefined) {
        filter.parentId = parent === 'null' ? null : parent;
      }

      if (active !== undefined) {
        filter.isActive = active === 'true';
      }

      if (level !== undefined) {
        filter.level = parseInt(level as string);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Get categories
      let query = Category.find(filter)
        .sort({ level: 1, sortOrder: 1 })
        .skip(skip)
        .limit(limitNum);

      if (includeProducts === 'true') {
        query = query.populate('children');
      }

      const categories = await query.exec();
      const total = await Category.countDocuments(filter);

      // Add product counts if requested
      if (includeProducts === 'true') {
        for (const category of categories) {
          const productCount = await Product.countDocuments({ 
            category: category._id, 
            status: 'active' 
          });
          (category as any).productCount = productCount;
        }
      }

      res.json({
        success: true,
        data: {
          categories,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            hasNext: pageNum < Math.ceil(total / limitNum),
            hasPrev: pageNum > 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get categories as hierarchical tree
   * GET /api/v1/categories/tree
   */
  static async getCategoryTree(req: Request, res: Response, next: NextFunction) {
    try {
      const { maxDepth = 5, activeOnly = true } = req.query;

      const tree = await CategoryController.categoryService.buildCategoryTree(
        null,
        parseInt(maxDepth as string),
        activeOnly === 'true'
      );

      res.json({
        success: true,
        data: { tree },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get root categories
   * GET /api/v1/categories/roots
   */
  static async getRootCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { includeChildren = false } = req.query;

      let query = Category.find({ parentId: null, isActive: true })
        .sort({ sortOrder: 1 });

      if (includeChildren === 'true') {
        query = query.populate({
          path: 'children',
          match: { isActive: true },
          options: { sort: { sortOrder: 1 } },
        });
      }

      const categories = await query.exec();

      res.json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category by ID
   * GET /api/v1/categories/:id
   */
  static async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { includeChildren = false, includeProducts = false } = req.query;

      let query = Category.findById(id);

      if (includeChildren === 'true') {
        query = query.populate({
          path: 'children',
          match: { isActive: true },
          options: { sort: { sortOrder: 1 } },
        });
      }

      const category = await query.exec();

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Add product count if requested
      if (includeProducts === 'true') {
        const productCount = await Product.countDocuments({ 
          category: category._id, 
          status: 'active' 
        });
        (category as any).productCount = productCount;

        // Get sample products
        const sampleProducts = await Product.find({ 
          category: category._id, 
          status: 'active' 
        })
        .limit(5)
        .select('name slug price images')
        .exec();

        (category as any).sampleProducts = sampleProducts;
      }

      res.json({
        success: true,
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category by slug
   * GET /api/v1/categories/slug/:slug
   */
  static async getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;

      const category = await Category.findOne({ slug, isActive: true })
        .populate('parent')
        .populate({
          path: 'children',
          match: { isActive: true },
          options: { sort: { sortOrder: 1 } },
        });

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      res.json({
        success: true,
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get child categories
   * GET /api/v1/categories/:id/children
   */
  static async getChildCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { recursive = false } = req.query;

      const parentCategory = await Category.findById(id);
      if (!parentCategory) {
        throw new NotFoundError('Parent category not found');
      }

      let children;
      
      if (recursive === 'true') {
        children = await CategoryController.categoryService.getAllDescendants(id);
      } else {
        children = await Category.find({ parentId: id, isActive: true })
          .sort({ sortOrder: 1 })
          .exec();
      }

      res.json({
        success: true,
        data: { children },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category breadcrumb path
   * GET /api/v1/categories/:id/path
   */
  static async getCategoryPath(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      const path = await category.getFullPath();

      res.json({
        success: true,
        data: { path },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new category
   * POST /api/v1/categories
   */
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryData = req.body;

      // Validate parent if provided
      if (categoryData.parentId) {
        const parent = await Category.findById(categoryData.parentId);
        if (!parent) {
          throw new ValidationError('Parent category not found');
        }

        // Check depth limit
        if (parent.level >= 9) {
          throw new ValidationError('Maximum category depth reached');
        }
      }

      const category = new Category(categoryData);
      await category.save();

      logger.info('Category created successfully', {
        categoryId: category._id,
        name: category.name,
        userId: (req as any).user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update category
   * PUT /api/v1/categories/:id
   */
  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const category = await Category.findById(id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Validate parent if being changed
      if (updateData.parentId && updateData.parentId !== category.parentId?.toString()) {
        const newParent = await Category.findById(updateData.parentId);
        if (!newParent) {
          throw new ValidationError('New parent category not found');
        }

        // Prevent circular reference
        const descendants = await CategoryController.categoryService.getAllDescendants(id);
        const descendantIds = descendants.map(d => (d._id as mongoose.Types.ObjectId).toString());
        
        if (descendantIds.includes(updateData.parentId)) {
          throw new ValidationError('Cannot move category to its own descendant');
        }
      }

      Object.assign(category, updateData);
      await category.save();

      logger.info('Category updated successfully', {
        categoryId: category._id,
        name: category.name,
        userId: (req as any).user?.id,
      });

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete category (soft delete)
   * DELETE /api/v1/categories/:id
   */
  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Check if category can be deleted
      const canDelete = await category.canBeDeleted();
      if (!canDelete) {
        throw new ValidationError('Cannot delete category with child categories or products');
      }

      await category.deleteOne();

      logger.info('Category deleted successfully', {
        categoryId: category._id,
        name: category.name,
        userId: (req as any).user?.id,
      });

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Move category to different parent
   * PATCH /api/v1/categories/:id/move
   */
  static async moveCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { newParentId, position } = req.body;

      const category = await Category.findById(id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Validate new parent
      if (newParentId) {
        const newParent = await Category.findById(newParentId);
        if (!newParent) {
          throw new ValidationError('New parent category not found');
        }

        // Prevent circular reference
        const descendants = await CategoryController.categoryService.getAllDescendants(id);
        const descendantIds = descendants.map(d => (d._id as mongoose.Types.ObjectId).toString());
        
        if (descendantIds.includes(newParentId)) {
          throw new ValidationError('Cannot move category to its own descendant');
        }
      }

      await CategoryController.categoryService.moveCategory(id, newParentId, position);

      res.json({
        success: true,
        message: 'Category moved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update category status
   * PATCH /api/v1/categories/:id/status
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive, recursive = false } = req.body;

      const category = await Category.findById(id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      if (recursive) {
        await CategoryController.categoryService.updateStatusRecursive(id, isActive);
      } else {
        category.isActive = isActive;
        await category.save();
      }

      logger.info('Category status updated', {
        categoryId: category._id,
        isActive,
        recursive,
        userId: (req as any).user?.id,
      });

      res.json({
        success: true,
        message: 'Category status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder categories
   * PATCH /api/v1/categories/reorder
   */
  static async reorderCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryOrders } = req.body;

      await CategoryController.categoryService.reorderCategories(categoryOrders);

      logger.info('Categories reordered', {
        count: categoryOrders.length,
        userId: (req as any).user?.id,
      });

      res.json({
        success: true,
        message: 'Categories reordered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk import categories
   * POST /api/v1/categories/bulk/import
   */
  static async bulkImport(req: Request, res: Response, next: NextFunction) {
    try {
      const { categories } = req.body;

      const result = await CategoryController.categoryService.bulkImport(categories);

      logger.info('Categories bulk imported', {
        imported: result.success,
        failed: result.failed,
        userId: (req as any).user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'Categories imported successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category analytics summary
   * GET /api/v1/categories/analytics/summary
   */
  static async getAnalyticsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await Category.getAnalytics();

      res.json({
        success: true,
        data: { analytics },
      });
    } catch (error) {
      next(error);
    }
  }
}