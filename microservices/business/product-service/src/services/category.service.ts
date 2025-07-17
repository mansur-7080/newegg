/**
 * Category Service
 * Professional category business logic layer
 */

import mongoose from 'mongoose';
import Category, { ICategory } from '../models/Category';
import Product from '../models/Product';
import { logger } from '../shared/logger';
import { ValidationError, NotFoundError } from '../shared/errors';

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{ index: number; error: string; data: any }>;
}

export class CategoryService {
  /**
   * Build category tree structure
   */
  async buildCategoryTree(parentId: string | null = null, maxDepth: number = 5, activeOnly: boolean = true): Promise<ICategory[]> {
    try {
      const filter: any = { parentId };
      
      if (activeOnly) {
        filter.isActive = true;
      }

      const categories = await Category.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      // If we haven't reached max depth, get children for each category
      if (maxDepth > 1) {
        for (const category of categories) {
          (category as any).children = await this.buildCategoryTree(
            category._id.toString(),
            maxDepth - 1,
            activeOnly
          );
        }
      }

      return categories;
    } catch (error) {
      logger.error('Error building category tree', { error, parentId, maxDepth, activeOnly });
      throw error;
    }
  }

  /**
   * Get all descendants of a category
   */
  async getAllDescendants(categoryId: string): Promise<ICategory[]> {
    try {
      const descendants: ICategory[] = [];
      
      // Get direct children
      const children = await Category.find({ parentId: categoryId }).lean();
      
      for (const child of children) {
        descendants.push(child);
        
        // Recursively get descendants
        const childDescendants = await this.getAllDescendants(child._id.toString());
        descendants.push(...childDescendants);
      }

      return descendants;
    } catch (error) {
      logger.error('Error getting category descendants', { error, categoryId });
      throw error;
    }
  }

  /**
   * Get all ancestors of a category
   */
  async getAllAncestors(categoryId: string): Promise<ICategory[]> {
    try {
      const ancestors: ICategory[] = [];
      let currentCategory = await Category.findById(categoryId);

      while (currentCategory && currentCategory.parentId) {
        const parent = await Category.findById(currentCategory.parentId);
        if (parent) {
          ancestors.unshift(parent); // Add to beginning to maintain order
          currentCategory = parent;
        } else {
          break;
        }
      }

      return ancestors;
    } catch (error) {
      logger.error('Error getting category ancestors', { error, categoryId });
      throw error;
    }
  }

  /**
   * Move category to a different parent
   */
  async moveCategory(categoryId: string, newParentId: string | null, position?: number): Promise<void> {
    try {
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Validate new parent exists
      if (newParentId) {
        const newParent = await Category.findById(newParentId);
        if (!newParent) {
          throw new ValidationError('New parent category not found');
        }

        // Check for circular reference
        const descendants = await this.getAllDescendants(categoryId);
        const descendantIds = descendants.map(d => (d._id as mongoose.Types.ObjectId).toString());
        
        if (descendantIds.includes(newParentId)) {
          throw new ValidationError('Cannot move category to its own descendant');
        }
      }

      // Update parent
      category.parentId = newParentId ? new mongoose.Types.ObjectId(newParentId) : undefined;

      // Update position if provided
      if (position !== undefined) {
        // Get siblings in new parent
        const siblings = await Category.find({ 
          parentId: newParentId,
          _id: { $ne: categoryId }
        }).sort({ sortOrder: 1 });

        // Update sort orders
        let sortOrder = 0;
        for (let i = 0; i < siblings.length; i++) {
          if (i === position) {
            category.sortOrder = sortOrder;
            sortOrder++;
          }
          siblings[i].sortOrder = sortOrder;
          await siblings[i].save();
          sortOrder++;
        }

        // If position is at the end
        if (position >= siblings.length) {
          category.sortOrder = sortOrder;
        }
      }

      await category.save();

      logger.info('Category moved successfully', {
        categoryId,
        newParentId,
        position,
      });
    } catch (error) {
      logger.error('Error moving category', { error, categoryId, newParentId, position });
      throw error;
    }
  }

  /**
   * Update category status recursively
   */
  async updateStatusRecursive(categoryId: string, isActive: boolean): Promise<void> {
    try {
      // Update the category itself
      await Category.findByIdAndUpdate(categoryId, { isActive });

      // Get all descendants and update them
      const descendants = await this.getAllDescendants(categoryId);
      
      if (descendants.length > 0) {
        const descendantIds = descendants.map(d => d._id);
        await Category.updateMany(
          { _id: { $in: descendantIds } },
          { isActive }
        );
      }

      logger.info('Category status updated recursively', {
        categoryId,
        isActive,
        affectedCategories: descendants.length + 1,
      });
    } catch (error) {
      logger.error('Error updating category status recursively', { error, categoryId, isActive });
      throw error;
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categoryOrders: Array<{ id: string; sortOrder: number }>): Promise<void> {
    try {
      const session = await mongoose.startSession();
      
      await session.withTransaction(async () => {
        for (const order of categoryOrders) {
          await Category.findByIdAndUpdate(
            order.id,
            { sortOrder: order.sortOrder },
            { session }
          );
        }
      });

      await session.endSession();

      logger.info('Categories reordered successfully', {
        count: categoryOrders.length,
      });
    } catch (error) {
      logger.error('Error reordering categories', { error, categoryOrders });
      throw error;
    }
  }

  /**
   * Get category with product count
   */
  async getCategoryWithProductCount(categoryId: string, includeDescendants: boolean = false): Promise<any> {
    try {
      const category = await Category.findById(categoryId).lean();
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      let productCount = 0;

      if (includeDescendants) {
        // Get all descendants
        const descendants = await this.getAllDescendants(categoryId);
        const categoryIds = [categoryId, ...descendants.map(d => (d._id as mongoose.Types.ObjectId).toString())];
        
        productCount = await Product.countDocuments({
          category: { $in: categoryIds },
          status: 'active',
          deletedAt: null
        });
      } else {
        productCount = await Product.countDocuments({
          category: categoryId,
          status: 'active',
          deletedAt: null
        });
      }

      return {
        ...category,
        productCount
      };
    } catch (error) {
      logger.error('Error getting category with product count', { error, categoryId, includeDescendants });
      throw error;
    }
  }

  /**
   * Get categories by level
   */
  async getCategoriesByLevel(level: number, activeOnly: boolean = true): Promise<ICategory[]> {
    try {
      const filter: any = { level };
      
      if (activeOnly) {
        filter.isActive = true;
      }

      const categories = await Category.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      return categories;
    } catch (error) {
      logger.error('Error getting categories by level', { error, level, activeOnly });
      throw error;
    }
  }

  /**
   * Search categories
   */
  async searchCategories(query: string, limit: number = 20): Promise<ICategory[]> {
    try {
      const categories = await Category.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { 'metadata.keywords': { $in: [new RegExp(query, 'i')] } }
        ],
        isActive: true
      })
      .sort({ level: 1, name: 1 })
      .limit(limit)
      .lean();

      return categories;
    } catch (error) {
      logger.error('Error searching categories', { error, query, limit });
      throw error;
    }
  }

  /**
   * Bulk import categories
   */
  async bulkImport(categories: any[]): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        for (let i = 0; i < categories.length; i++) {
          try {
            const categoryData = categories[i];

            // Validate parent exists if provided
            if (categoryData.parentId) {
              const parent = await Category.findById(categoryData.parentId).session(session);
              if (!parent) {
                throw new ValidationError('Parent category not found');
              }
            }

            const category = new Category(categoryData);
            await category.save({ session });
            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              index: i,
              error: error instanceof Error ? error.message : 'Unknown error',
              data: categories[i]
            });
          }
        }
      });

      logger.info('Category bulk import completed', {
        total: categories.length,
        success: result.success,
        failed: result.failed,
      });
    } catch (error) {
      logger.error('Error in bulk import transaction', { error });
      throw error;
    } finally {
      await session.endSession();
    }

    return result;
  }

  /**
   * Validate category hierarchy
   */
  async validateHierarchy(categoryId: string, newParentId: string): Promise<boolean> {
    try {
      // Check if new parent is a descendant of the category
      const descendants = await this.getAllDescendants(categoryId);
      const descendantIds = descendants.map(d => (d._id as mongoose.Types.ObjectId).toString());
      
      return !descendantIds.includes(newParentId);
    } catch (error) {
      logger.error('Error validating category hierarchy', { error, categoryId, newParentId });
      return false;
    }
  }

  /**
   * Get category breadcrumb
   */
  async getCategoryBreadcrumb(categoryId: string): Promise<ICategory[]> {
    try {
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      const breadcrumb = await category.getFullPath();
      return breadcrumb;
    } catch (error) {
      logger.error('Error getting category breadcrumb', { error, categoryId });
      throw error;
    }
  }

  /**
   * Get popular categories based on product count
   */
  async getPopularCategories(limit: number = 10): Promise<any[]> {
    try {
      const popularCategories = await Product.aggregate([
        {
          $match: {
            status: 'active',
            deletedAt: null
          }
        },
        {
          $group: {
            _id: '$category',
            productCount: { $sum: 1 },
            totalSales: { $sum: '$salesCount' },
            averageRating: { $avg: '$rating.average' }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $unwind: '$category'
        },
        {
          $match: {
            'category.isActive': true
          }
        },
        {
          $sort: {
            totalSales: -1,
            productCount: -1
          }
        },
        {
          $limit: limit
        },
        {
          $project: {
            _id: '$category._id',
            name: '$category.name',
            slug: '$category.slug',
            level: '$category.level',
            metadata: '$category.metadata',
            productCount: 1,
            totalSales: 1,
            averageRating: 1
          }
        }
      ]);

      return popularCategories;
    } catch (error) {
      logger.error('Error getting popular categories', { error, limit });
      throw error;
    }
  }

  /**
   * Get category suggestions for autocomplete
   */
  async getCategorySuggestions(query: string, limit: number = 10): Promise<string[]> {
    try {
      const suggestions = await Category.aggregate([
        {
          $match: {
            isActive: true,
            name: { $regex: query, $options: 'i' }
          }
        },
        {
          $project: {
            name: 1
          }
        },
        {
          $limit: limit
        }
      ]);

      return suggestions.map(s => s.name);
    } catch (error) {
      logger.error('Error getting category suggestions', { error, query, limit });
      return [];
    }
  }

  /**
   * Update category sort orders within a parent
   */
  async updateSortOrdersInParent(parentId: string | null): Promise<void> {
    try {
      const categories = await Category.find({ parentId })
        .sort({ sortOrder: 1, name: 1 });

      for (let i = 0; i < categories.length; i++) {
        categories[i].sortOrder = i;
        await categories[i].save();
      }

      logger.info('Sort orders updated in parent', {
        parentId,
        count: categories.length,
      });
    } catch (error) {
      logger.error('Error updating sort orders in parent', { error, parentId });
      throw error;
    }
  }

  /**
   * Cleanup empty categories (categories without products or children)
   */
  async cleanupEmptyCategories(dryRun: boolean = true): Promise<{ toDelete: string[]; deleted?: string[] }> {
    try {
      const emptyCategories = await Category.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'category',
            as: 'products'
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: 'parentId',
            as: 'children'
          }
        },
        {
          $match: {
            products: { $size: 0 },
            children: { $size: 0 }
          }
        },
        {
          $project: {
            _id: 1,
            name: 1
          }
        }
      ]);

      const categoryIds = emptyCategories.map(c => c._id.toString());

      if (!dryRun && categoryIds.length > 0) {
        await Category.deleteMany({ _id: { $in: categoryIds } });
        
        logger.info('Empty categories cleaned up', {
          count: categoryIds.length,
          categoryIds,
        });

        return { toDelete: categoryIds, deleted: categoryIds };
      }

      return { toDelete: categoryIds };
    } catch (error) {
      logger.error('Error cleaning up empty categories', { error, dryRun });
      throw error;
    }
  }
}