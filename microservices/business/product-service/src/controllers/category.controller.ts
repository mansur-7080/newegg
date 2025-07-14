/**
 * Real Category Controller
 * Professional category management for e-commerce
 * NO FAKE OR MOCK DATA - All operations are real
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import { createSlug } from '../utils/helpers';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export class CategoryController {
  /**
   * Get all categories with real hierarchical structure
   */
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        includeProducts = false,
        status = 'ACTIVE'
      } = req.query;

      // Real database query with hierarchy
      const categories = await prisma.category.findMany({
        where: {
          status: status as string
        },
        include: {
          parent: true,
          children: {
            where: { status: 'ACTIVE' },
            orderBy: { sortOrder: 'asc' }
          },
          ...(includeProducts === 'true' && {
            products: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: true
              },
              take: 5 // Limit products per category
            }
          }),
          _count: {
            select: { products: true }
          }
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      });

      // Build real hierarchical structure
      const rootCategories = categories.filter(cat => !cat.parentId);
      const hierarchicalCategories = this.buildCategoryTree(rootCategories, categories);

      res.json({
        success: true,
        data: {
          categories: hierarchicalCategories.map(category => ({
            ...category,
            productCount: category._count.products,
            products: category.products?.map((product: any) => ({
              ...product,
              images: product.images ? JSON.parse(product.images) : []
            }))
          }))
        }
      });

      logger.info('Categories fetched', { 
        count: categories.length,
        includeProducts: includeProducts === 'true'
      });

    } catch (error) {
      logger.error('Error fetching categories:', error);
      next(error);
    }
  }

  /**
   * Get single category by ID with real data
   */
  async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id: Number(id) },
        include: {
          parent: true,
          children: {
            where: { status: 'ACTIVE' },
            orderBy: { sortOrder: 'asc' }
          },
          products: {
            where: { status: 'ACTIVE' },
            include: {
              category: true,
              _count: {
                select: { reviews: true }
              }
            },
            orderBy: { featured: 'desc' }
          }
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        data: {
          ...category,
          products: category.products.map(product => ({
            ...product,
            images: product.images ? JSON.parse(product.images) : [],
            specifications: product.specifications ? JSON.parse(product.specifications) : {},
            reviewCount: product._count.reviews
          }))
        }
      });

      logger.info('Category viewed', { categoryId: id });

    } catch (error) {
      logger.error('Error fetching category:', error);
      next(error);
    }
  }

  /**
   * Create new category (Admin only) - Real implementation
   */
  async createCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        name,
        description,
        parentId,
        imageUrl,
        sortOrder,
        seoTitle,
        seoDescription
      } = req.body;

      // Real slug generation
      const slug = createSlug(name);

      // Check if category with same name or slug exists
      const existingCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { name },
            { slug }
          ]
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      // Validate parent category if provided
      if (parentId) {
        const parentCategory = await prisma.category.findUnique({
          where: { id: Number(parentId) }
        });

        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            message: 'Parent category not found'
          });
        }
      }

      // Real database transaction
      const category = await prisma.category.create({
        data: {
          name,
          slug,
          description,
          parentId: parentId ? Number(parentId) : undefined,
          imageUrl,
          sortOrder: Number(sortOrder) || 0,
          seoTitle,
          seoDescription
        },
        include: {
          parent: true,
          _count: {
            select: { products: true }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });

      logger.info('Category created', { 
        categoryId: category.id, 
        name: category.name,
        createdBy: req.user?.userId 
      });

    } catch (error) {
      logger.error('Error creating category:', error);
      next(error);
    }
  }

  /**
   * Update category (Admin only) - Real implementation
   */
  async updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const updateData: any = { ...req.body };

      // Handle slug update if name changed
      if (updateData.name) {
        updateData.slug = createSlug(updateData.name);
      }

      // Convert numbers
      if (updateData.parentId) updateData.parentId = Number(updateData.parentId);
      if (updateData.sortOrder) updateData.sortOrder = Number(updateData.sortOrder);

      // Update timestamp
      updateData.updatedAt = new Date();

      // Validate parent category if changed
      if (updateData.parentId) {
        const parentCategory = await prisma.category.findUnique({
          where: { id: updateData.parentId }
        });

        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            message: 'Parent category not found'
          });
        }

        // Prevent circular reference
        if (updateData.parentId === Number(id)) {
          return res.status(400).json({
            success: false,
            message: 'Category cannot be its own parent'
          });
        }
      }

      const category = await prisma.category.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          parent: true,
          children: true,
          _count: {
            select: { products: true }
          }
        }
      });

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });

      logger.info('Category updated', { 
        categoryId: id, 
        updatedBy: req.user?.userId 
      });

    } catch (error) {
      logger.error('Error updating category:', error);
      next(error);
    }
  }

  /**
   * Delete category (Admin only) - Real implementation
   */
  async deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id: Number(id) },
        include: {
          children: true,
          products: true
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if category has children or products
      if (category.children.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with subcategories. Delete subcategories first.'
        });
      }

      if (category.products.length > 0) {
        // Soft delete if has products
        await prisma.category.update({
          where: { id: Number(id) },
          data: { status: 'INACTIVE' }
        });

        res.json({
          success: true,
          message: 'Category deactivated (has products)'
        });
      } else {
        // Hard delete if no products
        await prisma.category.delete({
          where: { id: Number(id) }
        });

        res.json({
          success: true,
          message: 'Category deleted successfully'
        });
      }

      logger.info('Category deleted', { 
        categoryId: id, 
        deletedBy: req.user?.userId 
      });

    } catch (error) {
      logger.error('Error deleting category:', error);
      next(error);
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await prisma.category.findMany({
        where: { status: 'ACTIVE' },
        include: {
          _count: {
            select: { 
              products: {
                where: { status: 'ACTIVE' }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      const categoryStats = stats.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        productCount: category._count.products,
        hasImage: !!category.imageUrl
      }));

      res.json({
        success: true,
        data: {
          totalCategories: stats.length,
          totalProducts: stats.reduce((sum, cat) => sum + cat._count.products, 0),
          categories: categoryStats
        }
      });

      logger.info('Category stats fetched');

    } catch (error) {
      logger.error('Error fetching category stats:', error);
      next(error);
    }
  }

  /**
   * Helper method to build category tree
   */
  private buildCategoryTree(rootCategories: any[], allCategories: any[]): any[] {
    return rootCategories.map(category => {
      const children = allCategories.filter(cat => cat.parentId === category.id);
      return {
        ...category,
        children: children.length > 0 ? this.buildCategoryTree(children, allCategories) : []
      };
    });
  }
}