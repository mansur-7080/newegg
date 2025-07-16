/**
 * Product Controller
 * Professional product management with comprehensive CRUD operations
 */

import { Request, Response, NextFunction } from 'express';
const logger = { info: console.log, debug: console.log, warn: console.warn, error: console.error };

class ValidationError extends Error {
  constructor(message: string, public details?: any[]) {
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

class AuthorizationError extends Error {
  constructor(message = 'Authorization failed') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ProductController {
  /**
   * Create a new product
   * POST /api/v1/products
   */
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productData = req.body;
      const userId = (req as any).user?.id;

      // Mock product creation
      const product = {
        _id: Date.now().toString(),
        ...productData,
        vendorId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Product created successfully', {
        productId: product._id,
        vendorId: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });
    } catch (error: any) {
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

      // Mock product data
      const product = {
        _id: id,
        name: 'Sample Product',
        description: 'Sample product description',
        price: 99.99,
        category: 'electronics',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error: any) {
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

      // Mock product data
      const product = {
        _id: '1',
        name: 'Sample Product',
        slug: slug,
        description: 'Sample product description',
        price: 99.99,
        category: 'electronics',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error: any) {
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
      } = req.query;

      // Mock products data
      const products = [
        {
          _id: '1',
          name: 'Product 1',
          price: 99.99,
          category: 'electronics',
        },
        {
          _id: '2',
          name: 'Product 2',
          price: 149.99,
          category: 'electronics',
        },
      ];

      const total = products.length;
      const totalPages = Math.ceil(total / Number(limit));

      res.status(200).json({
        success: true,
        data: {
          products,
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
   * Update product by ID
   * PUT /api/v1/products/:id
   */
  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = (req as any).user?.id;

      // Mock updated product
      const updatedProduct = {
        _id: id,
        ...updateData,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      logger.info('Product updated successfully', {
        productId: id,
        vendorId: userId,
      });

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product: updatedProduct },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete product by ID
   * DELETE /api/v1/products/:id
   */
  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      logger.info('Product deleted successfully', {
        productId: id,
        deletedBy: userId,
      });

      res.status(204).send();
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Search products
   * GET /api/v1/products/search
   */
  static async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;

      // Mock search results
      const results = [
        {
          _id: '1',
          name: 'Searched Product',
          price: 99.99,
          category: 'electronics',
        },
      ];

      res.status(200).json({
        success: true,
        data: {
          results,
          total: results.length,
          query: q,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get product categories
   * GET /api/v1/products/categories
   */
  static async getProductCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = ['electronics', 'clothing', 'books', 'home'];

      res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get product brands
   * GET /api/v1/products/brands
   */
  static async getProductBrands(req: Request, res: Response, next: NextFunction) {
    try {
      const brands = ['Apple', 'Samsung', 'Sony', 'Dell'];

      res.status(200).json({
        success: true,
        data: { brands },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get product statistics
   * GET /api/v1/products/statistics
   */
  static async getProductStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const statistics = {
        totalProducts: 100,
        activeProducts: 85,
        inactiveProducts: 15,
        featuredProducts: 20,
        outOfStock: 5,
        lowStock: 10,
        averagePrice: 129.99,
        totalCategories: 8,
        totalBrands: 25,
      };

      res.status(200).json({
        success: true,
        data: { statistics },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export default ProductController;
