/**
 * Category Controller
 * Professional category management with comprehensive CRUD operations
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@ultramarket/shared/logging/logger';
import { categoryService, CategoryFilters } from '../services/category.service';

export class CategoryController {
  /**
   * Get all categories with filtering and pagination
   * GET /api/v1/categories
   */
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: CategoryFilters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        search: req.query.search as string,
        parentId: req.query.parentId as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : true,
        includeChildren: req.query.includeChildren === 'true',
      };

      const result = await categoryService.getCategories(filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category tree
   * GET /api/v1/categories/tree
   */
  static async getCategoryTree(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.getCategoryTree();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single category by ID
   * GET /api/v1/categories/:id
   */
  static async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const includeChildren = req.query.includeChildren === 'true';
      const category = await categoryService.getCategoryById(id, includeChildren);

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single category by slug
   * GET /api/v1/categories/slug/:slug
   */
  static async getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const includeChildren = req.query.includeChildren === 'true';
      const category = await categoryService.getCategoryBySlug(slug, includeChildren);

      res.json({
        success: true,
        data: category,
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
      const category = await categoryService.createCategory(req.body);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category,
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
      const category = await categoryService.updateCategory(id, req.body);

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category,
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
      await categoryService.deleteCategory(id);

      res.status(204).json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}