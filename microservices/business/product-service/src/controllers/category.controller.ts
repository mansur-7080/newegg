import { Request, Response, NextFunction } from 'express';
import { logger } from '@ultramarket/shared';
import { NotFoundError, ValidationError } from '../errors';
import Category from '../models/Category';
import Product from '../models/Product';

export class CategoryController {
  static async getAllCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive, parentId } = req.query;
      
      const filter: any = {};
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (parentId !== undefined) filter.parentId = parentId || null;

      const categories = await Category.find(filter)
        .sort({ displayOrder: 1, name: 1 })
        .lean();

      res.json({
        success: true,
        data: categories,
        count: categories.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await Category.findById(req.params.id)
        .populate('parent', 'name slug')
        .lean();

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, sort = '-createdAt' } = req.query;
      
      const category = await Category.findById(req.params.id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [products, total] = await Promise.all([
        Product.find({ categoryId: req.params.id, status: 'active' })
          .sort(sort as string)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Product.countDocuments({ categoryId: req.params.id, status: 'active' })
      ]);

      res.json({
        success: true,
        data: products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryTree(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await Category.find({ isActive: true })
        .sort({ displayOrder: 1, name: 1 })
        .lean();

      // Build tree structure
      const categoryMap = new Map();
      const tree: any[] = [];

      categories.forEach(cat => {
        categoryMap.set(cat._id.toString(), { ...cat, children: [] });
      });

      categories.forEach(cat => {
        if (cat.parentId) {
          const parent = categoryMap.get(cat.parentId.toString());
          if (parent) {
            parent.children.push(categoryMap.get(cat._id.toString()));
          }
        } else {
          tree.push(categoryMap.get(cat._id.toString()));
        }
      });

      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryData = req.body;

      // Generate slug if not provided
      if (!categoryData.slug) {
        categoryData.slug = categoryData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      // Check if slug already exists
      const existing = await Category.findOne({ slug: categoryData.slug });
      if (existing) {
        throw new ValidationError('Category with this slug already exists');
      }

      const category = await Category.create(categoryData);

      logger.info('Category created', { 
        categoryId: category._id,
        name: category.name,
        userId: (req as any).user?.id 
      });

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const updates = req.body;

      // Check slug uniqueness if updating
      if (updates.slug) {
        const existing = await Category.findOne({ 
          slug: updates.slug, 
          _id: { $ne: req.params.id } 
        });
        if (existing) {
          throw new ValidationError('Category with this slug already exists');
        }
      }

      const category = await Category.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      );

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      logger.info('Category updated', { 
        categoryId: category._id,
        updates,
        userId: (req as any).user?.id 
      });

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if category has products
      const productCount = await Product.countDocuments({ categoryId: req.params.id });
      if (productCount > 0) {
        throw new ValidationError(`Cannot delete category with ${productCount} products`);
      }

      // Check if category has subcategories
      const subCategoryCount = await Category.countDocuments({ parentId: req.params.id });
      if (subCategoryCount > 0) {
        throw new ValidationError(`Cannot delete category with ${subCategoryCount} subcategories`);
      }

      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      logger.info('Category deleted', { 
        categoryId: req.params.id,
        name: category.name,
        userId: (req as any).user?.id 
      });

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      // Image upload logic would go here
      // For now, just update the image URL
      const { imageUrl } = req.body;

      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { image: imageUrl },
        { new: true }
      );

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { $unset: { image: 1 } },
        { new: true }
      );

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }
}