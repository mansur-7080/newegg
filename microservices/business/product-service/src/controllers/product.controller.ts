/**
 * Product Controller
 * Professional product management with comprehensive CRUD operations
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logger';
import { ValidationError, NotFoundError, AuthorizationError } from '../shared/errors';
import Product, { IProduct } from '../models/Product';
import Category from '../models/Category';
import { ProductService } from '../services/product.service';
import { CacheService } from '../services/cache.service';

export class ProductController {
  private static productService = new ProductService();
  private static cacheService = new CacheService();

  /**
   * Get all products with filtering and pagination
   * GET /api/v1/products
   */
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        brand,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status = 'active'
      } = req.query;

      const result = await ProductController.productService.getProducts({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        category: category as string,
        brand: brand as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        status: status as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get featured products
   * GET /api/v1/products/featured
   */
  static async getFeaturedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = 10 } = req.query;

      // Try cache first
      const cacheKey = `featured_products_${limit}`;
      let products = await ProductController.cacheService.get(cacheKey);

      if (!products) {
        products = await Product.findFeatured(parseInt(limit as string));
        await ProductController.cacheService.set(cacheKey, products, 300); // Cache for 5 minutes
      }

      res.json({
        success: true,
        data: { products },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get products by category
   * GET /api/v1/products/categories/:categoryId
   */
  static async getProductsByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId } = req.params;
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Verify category exists
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      const result = await ProductController.productService.getProducts({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        category: categoryId,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        status: 'active',
      });

      res.json({
        success: true,
        data: {
          category,
          ...result,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search products
   * GET /api/v1/products/search
   */
  static async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        q: searchQuery,
        page = 1,
        limit = 20,
        category,
        brand,
        minPrice,
        maxPrice,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.query;

      if (!searchQuery) {
        throw new ValidationError('Search query is required');
      }

      const result = await ProductController.productService.searchProducts({
        query: searchQuery as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        category: category as string,
        brand: brand as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Try cache first
      const cacheKey = `product_${id}`;
      let product = await ProductController.cacheService.get(cacheKey);

      if (!product) {
        product = await Product.findById(id)
          .populate('category', 'name slug')
          .populate('subcategory', 'name slug')
          .exec();

        if (!product) {
          throw new NotFoundError('Product not found');
        }

        // Only cache active products
        if (product.status === 'active') {
          await ProductController.cacheService.set(cacheKey, product, 300);
        }
      }

      // Increment view count (don't await to avoid blocking)
      Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

      res.json({
        success: true,
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by slug
   * GET /api/v1/products/slug/:slug
   */
  static async getProductBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;

      // Try cache first
      const cacheKey = `product_slug_${slug}`;
      let product = await ProductController.cacheService.get(cacheKey);

      if (!product) {
        product = await Product.findBySlug(slug)
          .populate('category', 'name slug')
          .populate('subcategory', 'name slug');

        if (!product) {
          throw new NotFoundError('Product not found');
        }

        await ProductController.cacheService.set(cacheKey, product, 300);
      }

      // Increment view count (don't await to avoid blocking)
      Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } }).exec();

      res.json({
        success: true,
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new product
   * POST /api/v1/products
   */
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productData = req.body;
      const userId = (req as any).user?.id;

      // Validate category exists
      const category = await Category.findById(productData.category);
      if (!category) {
        throw new ValidationError('Category not found');
      }

      // Add vendor ID from authenticated user
      productData.vendorId = userId;

      const product = await ProductController.productService.createProduct(productData);

      logger.info('Product created successfully', {
        productId: product._id,
        name: product.name,
        vendorId: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check authorization (vendor can only update own products)
      if (userRole !== 'admin' && product.vendorId.toString() !== userId) {
        throw new AuthorizationError('You can only update your own products');
      }

      // Validate category if being changed
      if (updateData.category && updateData.category !== product.category.toString()) {
        const category = await Category.findById(updateData.category);
        if (!category) {
          throw new ValidationError('Category not found');
        }
      }

      const updatedProduct = await ProductController.productService.updateProduct(id, updateData);

      // Clear cache
      await ProductController.cacheService.delete(`product_${id}`);
      await ProductController.cacheService.delete(`product_slug_${updatedProduct.slug}`);

      logger.info('Product updated successfully', {
        productId: product._id,
        name: product.name,
        updatedBy: userId,
      });

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: { product: updatedProduct },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product (soft delete)
   * DELETE /api/v1/products/:id
   */
  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check authorization
      if (userRole !== 'admin' && product.vendorId.toString() !== userId) {
        throw new AuthorizationError('You can only delete your own products');
      }

      // Check if product can be deleted
      const canDelete = await product.canBeDeleted();
      if (!canDelete) {
        throw new ValidationError('Cannot delete product with existing orders');
      }

      // Soft delete
      product.deletedAt = new Date();
      product.status = 'archived';
      await product.save();

      // Clear cache
      await ProductController.cacheService.delete(`product_${id}`);
      await ProductController.cacheService.delete(`product_slug_${product.slug}`);

      logger.info('Product deleted successfully', {
        productId: product._id,
        name: product.name,
        deletedBy: userId,
      });

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product inventory
   * PATCH /api/v1/products/:id/inventory
   */
  static async updateInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { quantity, tracked, allowBackorder, lowStockThreshold } = req.body;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check authorization
      if (userRole !== 'admin' && product.vendorId.toString() !== userId) {
        throw new AuthorizationError('You can only update your own products');
      }

      // Update inventory fields
      if (quantity !== undefined) product.inventory.quantity = quantity;
      if (tracked !== undefined) product.inventory.tracked = tracked;
      if (allowBackorder !== undefined) product.inventory.allowBackorder = allowBackorder;
      if (lowStockThreshold !== undefined) product.inventory.lowStockThreshold = lowStockThreshold;

      await product.save();

      // Clear cache
      await ProductController.cacheService.delete(`product_${id}`);

      res.json({
        success: true,
        message: 'Inventory updated successfully',
        data: { inventory: product.inventory },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product status
   * PATCH /api/v1/products/:id/status
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check authorization
      if (userRole !== 'admin' && product.vendorId.toString() !== userId) {
        throw new AuthorizationError('You can only update your own products');
      }

      product.status = status;
      await product.save();

      // Clear cache
      await ProductController.cacheService.delete(`product_${id}`);
      await ProductController.cacheService.delete(`product_slug_${product.slug}`);

      logger.info('Product status updated', {
        productId: product._id,
        status,
        updatedBy: userId,
      });

      res.json({
        success: true,
        message: 'Product status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle product featured status (Admin only)
   * PATCH /api/v1/products/:id/featured
   */
  static async toggleFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      product.isFeatured = !product.isFeatured;
      await product.save();

      // Clear featured products cache
      await ProductController.cacheService.deletePattern('featured_products_*');

      logger.info('Product featured status toggled', {
        productId: product._id,
        isFeatured: product.isFeatured,
        updatedBy: userId,
      });

      res.json({
        success: true,
        message: 'Featured status updated successfully',
        data: { isFeatured: product.isFeatured },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk import products (Admin only)
   * POST /api/v1/products/bulk/import
   */
  static async bulkImport(req: Request, res: Response, next: NextFunction) {
    try {
      const { products } = req.body;
      const userId = (req as any).user?.id;

      const result = await ProductController.productService.bulkImport(products, userId);

      logger.info('Products bulk imported', {
        imported: result.success,
        failed: result.failed,
        importedBy: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Products imported successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product analytics summary (Admin only)
   * GET /api/v1/products/analytics/summary
   */
  static async getAnalyticsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      // Try cache first
      const cacheKey = 'product_analytics_summary';
      let analytics = await ProductController.cacheService.get(cacheKey);

      if (!analytics) {
        analytics = await Product.getAnalytics();
        await ProductController.cacheService.set(cacheKey, analytics, 600); // Cache for 10 minutes
      }

      res.json({
        success: true,
        data: { analytics },
      });
    } catch (error) {
      next(error);
    }
  }
}
