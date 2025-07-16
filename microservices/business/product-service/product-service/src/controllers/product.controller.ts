/**
 * Product Controller - Prisma Based
 * Professional HTTP request handlers with validation and error handling
 */

import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { logger } from '../utils/logger';
import {
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
  PaginationOptions,
} from '../models/product.model';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Create a new product
   * POST /api/v1/products
   */
  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productData: CreateProductInput = req.body;
      const userId = (req as any).user?.id;

      const product = await this.productService.createProduct(productData, userId);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });
    } catch (error) {
      logger.error('Error creating product', { error: error.message, body: req.body });
      next(error);
    }
  }

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const product = await this.productService.getProductById(id);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error) {
      logger.error('Error getting product by ID', { error: error.message, id: req.params.id });
      next(error);
    }
  }

  /**
   * Get product by slug
   * GET /api/v1/products/slug/:slug
   */
  async getProductBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;

      const product = await this.productService.getProductBySlug(slug);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error) {
      logger.error('Error getting product by slug', { error: error.message, slug: req.params.slug });
      next(error);
    }
  }

  /**
   * Get products with filtering and pagination
   * GET /api/v1/products
   */
  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract query parameters
      const {
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        categoryId,
        brand,
        minPrice,
        maxPrice,
        status,
        isActive,
        isFeatured,
        isBestSeller,
        isNewArrival,
        isOnSale,
        search,
        tags,
        vendorId,
      } = req.query;

      // Build filters
      const filters: ProductFilters = {};
      
      if (categoryId) filters.categoryId = categoryId as string;
      if (brand) filters.brand = brand as string;
      if (minPrice) filters.minPrice = parseFloat(minPrice as string);
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice as string);
      if (status) filters.status = status as any;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';
      if (isBestSeller !== undefined) filters.isBestSeller = isBestSeller === 'true';
      if (isNewArrival !== undefined) filters.isNewArrival = isNewArrival === 'true';
      if (isOnSale !== undefined) filters.isOnSale = isOnSale === 'true';
      if (search) filters.search = search as string;
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags as string[] : [tags as string];
      }
      if (vendorId) filters.vendorId = vendorId as string;

      // Build pagination
      const pagination: PaginationOptions = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.productService.getProducts(filters, pagination);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error getting products', { error: error.message, query: req.query });
      next(error);
    }
  }

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateProductInput = req.body;
      const userId = (req as any).user?.id;

      const product = await this.productService.updateProduct(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product },
      });
    } catch (error) {
      logger.error('Error updating product', { 
        error: error.message, 
        id: req.params.id, 
        body: req.body 
      });
      next(error);
    }
  }

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      await this.productService.deleteProduct(id, userId);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting product', { error: error.message, id: req.params.id });
      next(error);
    }
  }

  /**
   * Search products
   * GET /api/v1/products/search
   */
  async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q: query, limit = '20' } = req.query;

      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
        return;
      }

      const products = await this.productService.searchProducts(
        query as string,
        parseInt(limit as string, 10)
      );

      res.status(200).json({
        success: true,
        data: { products },
      });
    } catch (error) {
      logger.error('Error searching products', { error: error.message, query: req.query });
      next(error);
    }
  }

  /**
   * Get featured products
   * GET /api/v1/products/featured
   */
  async getFeaturedProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = '10' } = req.query;

      const products = await this.productService.getFeaturedProducts(
        parseInt(limit as string, 10)
      );

      res.status(200).json({
        success: true,
        data: { products },
      });
    } catch (error) {
      logger.error('Error getting featured products', { error: error.message });
      next(error);
    }
  }

  /**
   * Get products by category
   * GET /api/v1/products/category/:categoryId
   */
  async getProductsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId } = req.params;
      const {
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pagination: PaginationOptions = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.productService.getProductsByCategory(categoryId, pagination);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error getting products by category', { 
        error: error.message, 
        categoryId: req.params.categoryId 
      });
      next(error);
    }
  }

  /**
   * Get product statistics
   * GET /api/v1/products/statistics
   */
  async getProductStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statistics = await this.productService.getProductStatistics();

      res.status(200).json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      logger.error('Error getting product statistics', { error: error.message });
      next(error);
    }
  }

  /**
   * Bulk update products
   * PATCH /api/v1/products/bulk
   */
  async bulkUpdateProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids, data } = req.body;
      const userId = (req as any).user?.id;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Product IDs array is required',
        });
        return;
      }

      if (!data || typeof data !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Update data is required',
        });
        return;
      }

      const count = await this.productService.bulkUpdateProducts(ids, data, userId);

      res.status(200).json({
        success: true,
        message: `${count} products updated successfully`,
        data: { updatedCount: count },
      });
    } catch (error) {
      logger.error('Error bulk updating products', { error: error.message, body: req.body });
      next(error);
    }
  }
}

// Create instance and export methods for use in routes
const productController = new ProductController();

export const {
  createProduct,
  getProductById,
  getProductBySlug,
  getProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
  getFeaturedProducts,
  getProductsByCategory,
  getProductStatistics,
  bulkUpdateProducts,
} = productController;
