/**
 * UltraMarket Category Controller
 * Professional category management controller
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@ultramarket/shared/logging/logger';
import { ValidationError, NotFoundError } from '@ultramarket/shared/errors';

export class CategoryController {
  /**
   * Get all categories with filtering and pagination
   * GET /api/v1/categories
   */
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        parentId,
        includeChildren = false,
        isActive,
        isFeatured,
        sortBy = 'name',
        sortOrder = 'asc',
      } = req.query;

      // Build query
      const query: any = {};
      
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }
      
      if (parentId) {
        query.parentId = parentId;
      }
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }
      
      if (isFeatured !== undefined) {
        query.isFeatured = isFeatured === 'true';
      }

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);
      
      // Sort
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      // Mock data for now - replace with actual database query
      const categories = [
        {
          _id: '1',
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices and accessories',
          isActive: true,
          isFeatured: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: '2',
          name: 'Clothing',
          slug: 'clothing',
          description: 'Fashion and apparel',
          isActive: true,
          isFeatured: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const total = categories.length;
      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          categories: categories.slice(skip, skip + Number(limit)),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category tree structure
   * GET /api/v1/categories/tree
   */
  static async getCategoryTree(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.query;

      // Mock tree data
      const tree = [
        {
          _id: '1',
          name: 'Electronics',
          slug: 'electronics',
          isActive: true,
          children: [
            {
              _id: '3',
              name: 'Smartphones',
              slug: 'smartphones',
              isActive: true,
              children: [],
            },
            {
              _id: '4',
              name: 'Laptops',
              slug: 'laptops',
              isActive: true,
              children: [],
            },
          ],
        },
        {
          _id: '2',
          name: 'Clothing',
          slug: 'clothing',
          isActive: true,
          children: [],
        },
      ];

      res.json({
        success: true,
        data: { tree },
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
      const { includeChildren = false } = req.query;

      // Mock category data
      const category = {
        _id: id,
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
        isActive: true,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

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
   * Get category by slug
   * GET /api/v1/categories/slug/:slug
   */
  static async getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const { includeChildren = false } = req.query;

      // Mock category data
      const category = {
        _id: '1',
        name: 'Electronics',
        slug: slug,
        description: 'Electronic devices and accessories',
        isActive: true,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

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
   * Create a new category
   * POST /api/v1/categories
   */
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryData = req.body;
      const userId = (req as any).user?.id;

      // Mock creation
      const category = {
        _id: Date.now().toString(),
        ...categoryData,
        slug: categoryData.name.toLowerCase().replace(/\s+/g, '-'),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      };

      logger.info('Category created successfully', {
        categoryId: category._id,
        name: category.name,
        createdBy: userId,
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
   * Update a category
   * PUT /api/v1/categories/:id
   */
  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = (req as any).user?.id;

      // Mock update
      const category = {
        _id: id,
        ...updateData,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      logger.info('Category updated successfully', {
        categoryId: id,
        updatedBy: userId,
        updatedFields: Object.keys(updateData),
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
   * Delete a category
   * DELETE /api/v1/categories/:id
   */
  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      // Check if category exists (mock)
      const categoryExists = true;
      if (!categoryExists) {
        throw new NotFoundError('Category not found');
      }

      // Check if category has products or subcategories (mock)
      const hasProducts = false;
      const hasSubcategories = false;

      if (hasProducts || hasSubcategories) {
        throw new ValidationError(
          'Cannot delete category with products or subcategories'
        );
      }

      logger.info('Category deleted successfully', {
        categoryId: id,
        deletedBy: userId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export default CategoryController;