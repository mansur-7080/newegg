import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { logger } from '@ultramarket/shared';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Get all products with pagination and filtering
   * GET /api/v1/products
   */
  async getProducts(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        brand,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        inStock
      } = req.query;

      const filters = {
        category: category as string,
        brand: brand as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        search: search as string,
        inStock: inStock === 'true'
      };

      const result = await this.productService.getProducts({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        filters,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      logger.info('Products retrieved successfully', { 
        count: result.products.length,
        total: result.total,
        page: result.page
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get products', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await this.productService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      logger.info('Product retrieved successfully', { productId: id });

      res.status(200).json({
        success: true,
        data: product
      });
    } catch (error) {
      logger.error('Failed to get product', { error, productId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Create new product
   * POST /api/v1/products
   */
  async createProduct(req: Request, res: Response) {
    try {
      const productData = req.body;
      const product = await this.productService.createProduct(productData);

      logger.info('Product created successfully', { productId: product.id });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      logger.error('Failed to create product', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const product = await this.productService.updateProduct(id, updateData);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      logger.info('Product updated successfully', { productId: id });

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      logger.error('Failed to update product', { error, productId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.productService.deleteProduct(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      logger.info('Product deleted successfully', { productId: id });

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete product', { error, productId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get products by category
   * GET /api/v1/products/category/:category
   */
  async getProductsByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await this.productService.getProductsByCategory(
        category,
        parseInt(page as string),
        parseInt(limit as string)
      );

      logger.info('Products by category retrieved successfully', { 
        category,
        count: result.products.length
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to get products by category', { error, category: req.params.category });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Search products
   * GET /api/v1/products/search
   */
  async searchProducts(req: Request, res: Response) {
    try {
      const { q, page = 1, limit = 10 } = req.query;
      const query = q as string;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const result = await this.productService.searchProducts(
        query,
        parseInt(page as string),
        parseInt(limit as string)
      );

      logger.info('Product search completed', { 
        query,
        count: result.products.length
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to search products', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get product categories
   * GET /api/v1/products/categories
   */
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await this.productService.getCategories();

      logger.info('Categories retrieved successfully', { count: categories.length });

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Failed to get categories', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get product brands
   * GET /api/v1/products/brands
   */
  async getBrands(req: Request, res: Response) {
    try {
      const brands = await this.productService.getBrands();

      logger.info('Brands retrieved successfully', { count: brands.length });

      res.status(200).json({
        success: true,
        data: brands
      });
    } catch (error) {
      logger.error('Failed to get brands', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update product stock
   * PATCH /api/v1/products/:id/stock
   */
  async updateProductStock(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity, operation = 'add' } = req.body;

      const product = await this.productService.updateStock(id, quantity, operation);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      logger.info('Product stock updated successfully', { 
        productId: id,
        quantity,
        operation
      });

      res.status(200).json({
        success: true,
        message: 'Product stock updated successfully',
        data: product
      });
    } catch (error) {
      logger.error('Failed to update product stock', { error, productId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get product statistics
   * GET /api/v1/products/stats
   */
  async getProductStats(req: Request, res: Response) {
    try {
      const stats = await this.productService.getProductStats();

      logger.info('Product statistics retrieved successfully');

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get product statistics', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get featured products
   * GET /api/v1/products/featured
   */
  async getFeaturedProducts(req: Request, res: Response) {
    try {
      const { limit = 10 } = req.query;
      const products = await this.productService.getFeaturedProducts(parseInt(limit as string));

      logger.info('Featured products retrieved successfully', { count: products.length });

      res.status(200).json({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error('Failed to get featured products', { error });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get related products
   * GET /api/v1/products/:id/related
   */
  async getRelatedProducts(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { limit = 5 } = req.query;
      const products = await this.productService.getRelatedProducts(id, parseInt(limit as string));

      logger.info('Related products retrieved successfully', { 
        productId: id,
        count: products.length
      });

      res.status(200).json({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error('Failed to get related products', { error, productId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
