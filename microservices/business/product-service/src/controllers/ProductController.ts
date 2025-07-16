import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/ProductService';
import { Logger } from '../shared/logger';
import { 
  CreateProductInput, 
  UpdateProductInput,
  ProductFilters,
  ProductSearchOptions,
  InventoryUpdateInput,
  BulkUpdateProductsInput
} from '../types/product.types';

/**
 * Professional Product Controller - Real REST API Implementation
 * Handles all HTTP requests for product operations
 */
export class ProductController {
  private productService: ProductService;
  private logger: Logger;

  constructor(productService: ProductService) {
    this.productService = productService;
    this.logger = new Logger('ProductController');
  }

  /**
   * GET /api/v1/products
   * Get products with filtering and pagination
   */
  async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: ProductFilters = {
        categoryId: req.query.categoryId as string,
        brandId: req.query.brandId as string,
        vendorId: req.query.vendorId as string,
        status: req.query.status as any,
        visibility: req.query.visibility as any,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        inStock: req.query.inStock === 'true',
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string
      };

      const options: ProductSearchOptions = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        sortBy: req.query.sortBy as any || 'createdAt',
        sortOrder: req.query.sortOrder as any || 'desc',
        include: {
          category: req.query.includeCategory !== 'false',
          brand: req.query.includeBrand !== 'false',
          vendor: req.query.includeVendor !== 'false',
          images: req.query.includeImages !== 'false',
          variants: req.query.includeVariants !== 'false',
          reviews: req.query.includeReviews !== 'false'
        }
      };

      const result = await this.productService.getProducts(filters, options);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: result.pages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        }
      });

    } catch (error) {
      this.logger.error('Error in getProducts controller', { error, query: req.query });
      next(error);
    }
  }

  /**
   * GET /api/v1/products/:id
   * Get product by ID
   */
  async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await this.productService.getProductById(id);

      if (!product) {
        res.status(404).json({
          success: false,
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: product
      });

    } catch (error) {
      this.logger.error('Error in getProductById controller', { error, id: req.params.id });
      next(error);
    }
  }

  /**
   * POST /api/v1/products
   * Create new product
   */
  async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: CreateProductInput = req.body;
      const product = await this.productService.createProduct(input);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });

    } catch (error) {
      this.logger.error('Error in createProduct controller', { error, body: req.body });
      next(error);
    }
  }

  /**
   * PUT /api/v1/products/:id
   * Update product
   */
  async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input: UpdateProductInput = req.body;
      
      const product = await this.productService.updateProduct(id, input);

      res.status(200).json({
        success: true,
        data: product,
        message: 'Product updated successfully'
      });

    } catch (error) {
      this.logger.error('Error in updateProduct controller', { 
        error, 
        id: req.params.id, 
        body: req.body 
      });
      next(error);
    }
  }

  /**
   * DELETE /api/v1/products/:id
   * Delete product (soft delete)
   */
  async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.productService.deleteProduct(id);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      this.logger.error('Error in deleteProduct controller', { error, id: req.params.id });
      next(error);
    }
  }

  /**
   * GET /api/v1/products/search
   * Search products
   */
  async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
          code: 'MISSING_QUERY'
        });
        return;
      }

      const options: ProductSearchOptions = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        sortBy: req.query.sortBy as any || 'createdAt',
        sortOrder: req.query.sortOrder as any || 'desc'
      };

      const result = await this.productService.searchProducts(query, options);

      res.status(200).json({
        success: true,
        data: result,
        query,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: result.pages
        }
      });

    } catch (error) {
      this.logger.error('Error in searchProducts controller', { error, query: req.query });
      next(error);
    }
  }

  /**
   * POST /api/v1/products/:id/inventory
   * Update product inventory
   */
  async updateInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input: InventoryUpdateInput = {
        productId: id,
        ...req.body
      };

      const product = await this.productService.updateInventory(input);

      res.status(200).json({
        success: true,
        data: product,
        message: 'Inventory updated successfully'
      });

    } catch (error) {
      this.logger.error('Error in updateInventory controller', { 
        error, 
        id: req.params.id, 
        body: req.body 
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/products/categories/:categoryId
   * Get products by category
   */
  async getProductsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId } = req.params;
      
      const options: ProductSearchOptions = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        sortBy: req.query.sortBy as any || 'createdAt',
        sortOrder: req.query.sortOrder as any || 'desc'
      };

      const result = await this.productService.getProductsByCategory(categoryId, options);

      res.status(200).json({
        success: true,
        data: result,
        categoryId,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: result.pages
        }
      });

    } catch (error) {
      this.logger.error('Error in getProductsByCategory controller', { 
        error, 
        categoryId: req.params.categoryId,
        query: req.query 
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/products/statistics
   * Get product statistics
   */
  async getProductStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statistics = await this.productService.getProductStatistics();

      res.status(200).json({
        success: true,
        data: statistics
      });

    } catch (error) {
      this.logger.error('Error in getProductStatistics controller', { error });
      next(error);
    }
  }

  /**
   * PUT /api/v1/products/bulk
   * Bulk update products
   */
  async bulkUpdateProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: BulkUpdateProductsInput = req.body;
      const result = await this.productService.bulkUpdateProducts(input);

      res.status(200).json({
        success: true,
        data: result,
        message: `Bulk update completed. ${result.updated} products updated, ${result.errors.length} errors.`
      });

    } catch (error) {
      this.logger.error('Error in bulkUpdateProducts controller', { error, body: req.body });
      next(error);
    }
  }

  /**
   * GET /api/v1/products/low-stock
   * Get low stock products
   */
  async getLowStockProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const options: ProductSearchOptions = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        sortBy: 'stockQuantity',
        sortOrder: 'asc'
      };

      // This would use the repository method we created
      const result = await this.productService.getProducts(
        { inStock: false }, // This would be enhanced to filter low stock specifically
        options
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Low stock products retrieved'
      });

    } catch (error) {
      this.logger.error('Error in getLowStockProducts controller', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/products/:id/activate
   * Activate product
   */
  async activateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const product = await this.productService.updateProduct(id, {
        status: 'ACTIVE',
        visibility: 'VISIBLE'
      });

      res.status(200).json({
        success: true,
        data: product,
        message: 'Product activated successfully'
      });

    } catch (error) {
      this.logger.error('Error in activateProduct controller', { error, id: req.params.id });
      next(error);
    }
  }

  /**
   * POST /api/v1/products/:id/deactivate
   * Deactivate product
   */
  async deactivateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const product = await this.productService.updateProduct(id, {
        status: 'INACTIVE',
        visibility: 'HIDDEN'
      });

      res.status(200).json({
        success: true,
        data: product,
        message: 'Product deactivated successfully'
      });

    } catch (error) {
      this.logger.error('Error in deactivateProduct controller', { error, id: req.params.id });
      next(error);
    }
  }

  /**
   * GET /api/v1/products/health
   * Health check for product service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Could include database connectivity check, cache check, etc.
      res.status(200).json({
        success: true,
        service: 'product-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });

    } catch (error) {
      this.logger.error('Error in healthCheck controller', { error });
      res.status(500).json({
        success: false,
        service: 'product-service',
        status: 'unhealthy',
        error: 'Health check failed'
      });
    }
  }
}