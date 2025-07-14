/**
 * Product Controller
 * Simplified and functional product management
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger, ValidationError, NotFoundError } from '@ultramarket/shared';
import {
  createProduct,
  findProductById,
  findProducts,
  updateProduct,
  deleteProduct,
  getProductCategories,
  getProductBrands,
  getProductStatistics,
  CreateProductInput,
  UpdateProductInput,
} from '../services/product.service';

const prisma = new PrismaClient();

export class ProductController {
  /**
   * Create a new product
   * POST /api/v1/products
   */
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productData: CreateProductInput = req.body;
      const userId = req.user?.id;

      const product = await createProduct({
        ...productData,
        vendorId: userId,
      });

      logger.info('Product created successfully', {
        productId: product.id,
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
   * Get product by ID
   * GET /api/v1/products/:id
   */
  static async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await findProductById(id);

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all products with pagination and filtering
   * GET /api/v1/products
   */
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 20,
        categoryId,
        brand,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status = 'ACTIVE',
        search,
        isFeatured,
        isBestSeller,
        isNewArrival,
        isOnSale,
        inStock,
        tags,
      } = req.query;

      const filters = {
        categoryId: categoryId as string,
        brand: brand as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        status: status as string,
        search: search as string,
        isFeatured: isFeatured ? isFeatured === 'true' : undefined,
        isBestSeller: isBestSeller ? isBestSeller === 'true' : undefined,
        isNewArrival: isNewArrival ? isNewArrival === 'true' : undefined,
        isOnSale: isOnSale ? isOnSale === 'true' : undefined,
        inStock: inStock ? inStock === 'true' : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
      };

      const products = await findProducts({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        filters,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      res.status(200).json({
        success: true,
        data: products,
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
      const updateData: UpdateProductInput = req.body;

      const updatedProduct = await updateProduct(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product: updatedProduct },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const deletedProduct = await deleteProduct(id);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
        data: { product: deletedProduct },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product categories
   * GET /api/v1/products/categories
   */
  static async getProductCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await getProductCategories();

      res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product brands
   * GET /api/v1/products/brands
   */
  static async getProductBrands(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId } = req.query;

      const brands = await getProductBrands(categoryId as string);

      res.status(200).json({
        success: true,
        data: { brands },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product statistics
   * GET /api/v1/products/stats
   */
  static async getProductStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { vendorId } = req.query;

      const stats = await getProductStatistics(vendorId as string);

      res.status(200).json({
        success: true,
        data: { stats },
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
      const { q, page = 1, limit = 20 } = req.query;

      if (!q) {
        throw new ValidationError('Search query is required');
      }

      const filters = {
        search: q as string,
      };

      const results = await findProducts({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        filters,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      res.status(200).json({
        success: true,
        data: results,
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

      const filters = {
        isFeatured: true,
      };

      const products = await findProducts({
        page: 1,
        limit: parseInt(limit as string),
        filters,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product recommendations
   * GET /api/v1/products/:id/recommendations
   */
  static async getProductRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;

      // Get product to find same category
      const product = await findProductById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const filters = {
        categoryId: product.category.id,
      };

      const recommendations = await findProducts({
        page: 1,
        limit: parseInt(limit as string),
        filters,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Remove the current product from recommendations
      const filteredRecommendations = {
        ...recommendations,
        data: recommendations.data.filter((p: any) => p.id !== id),
      };

      res.status(200).json({
        success: true,
        data: { recommendations: filteredRecommendations },
      });
    } catch (error) {
      next(error);
    }
  }
}
