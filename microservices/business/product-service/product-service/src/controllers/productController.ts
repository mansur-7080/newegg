import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { logger } from '@ultramarket/common';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  // Product endpoints
  createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const product = await this.productService.createProduct(req.body);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });
    } catch (error: any) {
      logger.error('Controller: Error creating product:', error);

      const statusCode = error.message.includes('already exists') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error creating product',
      });
    }
  };

  getProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const product = await this.productService.getProductById(id);

      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error: any) {
      logger.error('Controller: Error getting product:', error);

      const statusCode = error.message === 'Product not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error getting product',
      });
    }
  };

  getProductBySku = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sku } = req.params;
      const product = await this.productService.getProductBySku(sku);

      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error: any) {
      logger.error('Controller: Error getting product by SKU:', error);

      const statusCode = error.message === 'Product not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error getting product',
      });
    }
  };

  updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const product = await this.productService.updateProduct(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product },
      });
    } catch (error: any) {
      logger.error('Controller: Error updating product:', error);

      let statusCode = 500;
      if (error.message === 'Product not found') statusCode = 404;
      if (error.message.includes('already exists')) statusCode = 409;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error updating product',
      });
    }
  };

  deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.productService.deleteProduct(id);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error: any) {
      logger.error('Controller: Error deleting product:', error);

      const statusCode = error.message === 'Product not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error deleting product',
      });
    }
  };

  searchProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        subcategory,
        brand,
        minPrice,
        maxPrice,
        inStock,
        isActive,
        isFeatured,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const filters: any = {};
      if (category) filters.category = category as string;
      if (subcategory) filters.subcategory = subcategory as string;
      if (brand) filters.brand = brand as string;
      if (minPrice) filters.minPrice = parseFloat(minPrice as string);
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice as string);
      if (inStock !== undefined) filters.inStock = inStock === 'true';
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';
      if (search) filters.search = search as string;

      const result = await this.productService.searchProducts({
        filters,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Controller: Error searching products:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error searching products',
      });
    }
  };

  getFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = 10 } = req.query;
      const products = await this.productService.getFeaturedProducts(parseInt(limit as string));

      res.status(200).json({
        success: true,
        data: { products },
      });
    } catch (error: any) {
      logger.error('Controller: Error getting featured products:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error getting featured products',
      });
    }
  };

  getRelatedProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 6 } = req.query;
      const products = await this.productService.getRelatedProducts(id, parseInt(limit as string));

      res.status(200).json({
        success: true,
        data: { products },
      });
    } catch (error: any) {
      logger.error('Controller: Error getting related products:', error);

      const statusCode = error.message === 'Product not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error getting related products',
      });
    }
  };

  updateInventory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      if (typeof quantity !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Quantity must be a number',
        });
        return;
      }

      const product = await this.productService.updateInventory(id, quantity);

      res.status(200).json({
        success: true,
        message: 'Inventory updated successfully',
        data: { product },
      });
    } catch (error: any) {
      logger.error('Controller: Error updating inventory:', error);

      let statusCode = 500;
      if (error.message === 'Product not found') statusCode = 404;
      if (error.message === 'Insufficient inventory') statusCode = 400;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error updating inventory',
      });
    }
  };

  checkAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { quantity = 1 } = req.query;

      const result = await this.productService.checkProductAvailability([id]);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Controller: Error checking availability:', error);

      const statusCode = error.message === 'Product not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error checking availability',
      });
    }
  };

  // Category endpoints
  createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const category = await this.productService.createCategory(req.body);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category },
      });
    } catch (error: any) {
      logger.error('Controller: Error creating category:', error);

      const statusCode = error.message.includes('already exists') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error creating category',
      });
    }
  };

  getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const { parent } = req.query;
      const categories = await this.productService.getCategories(parent as string);

      res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error: any) {
      logger.error('Controller: Error getting categories:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error getting categories',
      });
    }
  };

  getCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const category = await this.productService.getCategoryBySlug(slug);

      res.status(200).json({
        success: true,
        data: { category },
      });
    } catch (error: any) {
      logger.error('Controller: Error getting category:', error);

      const statusCode = error.message === 'Category not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error getting category',
      });
    }
  };

  // Review endpoints
  createReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const review = await this.productService.createReview(req.body);

      res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: { review },
      });
    } catch (error: any) {
      logger.error('Controller: Error creating review:', error);

      const statusCode = error.message === 'Product not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error creating review',
      });
    }
  };

  getProductReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const reviews = await this.productService.getProductReviews(
        id,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error: any) {
      logger.error('Controller: Error getting reviews:', error);

      const statusCode = error.message === 'Product not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error getting reviews',
      });
    }
  };

  // Statistics endpoint
  getProductStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.productService.getProductStats();

      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (error: any) {
      logger.error('Controller: Error getting stats:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error getting statistics',
      });
    }
  };
}
