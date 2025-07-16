/**
 * UltraMarket Category Controller
 * Professional category management controller
 */

import { Request, Response, NextFunction } from 'express';

const logger = { info: console.log, debug: console.log, warn: console.warn, error: console.error };

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

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
          categories: categories.slice(0, Number(limit)),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
          },
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get category tree structure
   * GET /api/v1/categories/tree
   */
  static async getCategoryTree(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error: any) {
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

      res.json({
        success: true,
        data: { category },
      });
    } catch (error: any) {
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

      res.json({
        success: true,
        data: { category },
      });
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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

      logger.info('Category deleted successfully', {
        categoryId: id,
        deletedBy: userId,
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  }
}

export default CategoryController;