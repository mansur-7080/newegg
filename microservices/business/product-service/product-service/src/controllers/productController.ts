import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { CategoryService } from '../services/categoryService';
import { SearchService } from '../services/searchService';
import { logger } from '@ultramarket/shared/logging/logger';
import { validateUuid } from '@ultramarket/shared/validation/validation';

export class ProductController {
  private productService: ProductService;
  private categoryService: CategoryService;
  private searchService: SearchService;

  constructor() {
    this.productService = new ProductService();
    this.categoryService = new CategoryService();
    this.searchService = new SearchService();
  }

  /**
   * Get all products with pagination and filtering
   */
  async getProducts(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        brand,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        inStock,
        featured,
        search,
      } = req.query;

      const filters = {
        category: category as string,
        brand: brand as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        inStock: inStock === 'true',
        featured: featured === 'true',
        search: search as string,
      };

      const sortOptions = {
        field: sortBy as string,
        order: sortOrder as 'asc' | 'desc',
      };

      const result = await this.productService.getProducts(
        parseInt(page as string),
        parseInt(limit as string),
        filters,
        sortOptions
      );

      res.status(200).json({
        success: true,
        data: result.products,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      logger.error('Failed to get products', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get products',
      });
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!validateUuid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format',
        });
      }

      const product = await this.productService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error('Failed to get product by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get product',
      });
    }
  }

  /**
   * Create new product
   */
  async createProduct(req: Request, res: Response) {
    try {
      const productData = req.body;
      const user = (req as any).user;

      // Check permissions
      if (user.role !== 'SELLER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create products',
        });
      }

      const product = await this.productService.createProduct({
        ...productData,
        sellerId: user.userId,
      });

      // Index product for search
      await this.searchService.indexProduct(product);

      logger.info('Product created successfully', {
        productId: product.id,
        sellerId: user.userId,
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      logger.error('Failed to create product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sellerId: (req as any).user?.userId,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
      });
    }
  }

  /**
   * Update product
   */
  async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const user = (req as any).user;

      if (!validateUuid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format',
        });
      }

      // Check if product exists and user has permission
      const existingProduct = await this.productService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Check permissions
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && existingProduct.sellerId !== user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update this product',
        });
      }

      const updatedProduct = await this.productService.updateProduct(id, updateData);

      // Update search index
      await this.searchService.updateProductIndex(updatedProduct);

      logger.info('Product updated successfully', {
        productId: id,
        userId: user.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: updatedProduct,
      });
    } catch (error) {
      logger.error('Failed to update product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: req.params.id,
        userId: (req as any).user?.userId,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
      });
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!validateUuid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format',
        });
      }

      // Check if product exists and user has permission
      const existingProduct = await this.productService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Check permissions
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && existingProduct.sellerId !== user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete this product',
        });
      }

      await this.productService.deleteProduct(id);

      // Remove from search index
      await this.searchService.removeProductFromIndex(id);

      logger.info('Product deleted successfully', {
        productId: id,
        userId: user.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: req.params.id,
        userId: (req as any).user?.userId,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
      });
    }
  }

  /**
   * Search products
   */
  async searchProducts(req: Request, res: Response) {
    try {
      const {
        q,
        page = 1,
        limit = 20,
        category,
        brand,
        minPrice,
        maxPrice,
        sortBy = 'relevance',
        sortOrder = 'desc',
      } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const searchFilters = {
        category: category as string,
        brand: brand as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      };

      const result = await this.searchService.searchProducts(
        q as string,
        parseInt(page as string),
        parseInt(limit as string),
        searchFilters,
        {
          field: sortBy as string,
          order: sortOrder as 'asc' | 'desc',
        }
      );

      res.status(200).json({
        success: true,
        data: result.products,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
        searchQuery: q,
      });
    } catch (error) {
      logger.error('Failed to search products', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to search products',
      });
    }
  }

  /**
   * Get product categories
   */
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await this.categoryService.getAllCategories();

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Failed to get categories', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get categories',
      });
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!validateUuid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format',
        });
      }

      const category = await this.categoryService.getCategoryById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      logger.error('Failed to get category by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        categoryId: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get category',
      });
    }
  }

  /**
   * Create category
   */
  async createCategory(req: Request, res: Response) {
    try {
      const categoryData = req.body;
      const user = (req as any).user;

      // Check permissions
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create categories',
        });
      }

      const category = await this.categoryService.createCategory(categoryData);

      logger.info('Category created successfully', {
        categoryId: category.id,
        userId: user.userId,
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } catch (error) {
      logger.error('Failed to create category', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: (req as any).user?.userId,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to create category',
      });
    }
  }

  /**
   * Update category
   */
  async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const user = (req as any).user;

      if (!validateUuid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format',
        });
      }

      // Check permissions
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update categories',
        });
      }

      const updatedCategory = await this.categoryService.updateCategory(id, updateData);

      logger.info('Category updated successfully', {
        categoryId: id,
        userId: user.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: updatedCategory,
      });
    } catch (error) {
      logger.error('Failed to update category', {
        error: error instanceof Error ? error.message : 'Unknown error',
        categoryId: req.params.id,
        userId: (req as any).user?.userId,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update category',
      });
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!validateUuid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format',
        });
      }

      // Check permissions
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete categories',
        });
      }

      await this.categoryService.deleteCategory(id);

      logger.info('Category deleted successfully', {
        categoryId: id,
        userId: user.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete category', {
        error: error instanceof Error ? error.message : 'Unknown error',
        categoryId: req.params.id,
        userId: (req as any).user?.userId,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to delete category',
      });
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(req: Request, res: Response) {
    try {
      const { limit = 10 } = req.query;

      const products = await this.productService.getFeaturedProducts(parseInt(limit as string));

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error('Failed to get featured products', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get featured products',
      });
    }
  }

  /**
   * Get products by seller
   */
  async getProductsBySeller(req: Request, res: Response) {
    try {
      const { sellerId } = req.params;
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      if (!validateUuid(sellerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid seller ID format',
        });
      }

      const result = await this.productService.getProductsBySeller(
        sellerId,
        parseInt(page as string),
        parseInt(limit as string),
        {
          field: sortBy as string,
          order: sortOrder as 'asc' | 'desc',
        }
      );

      res.status(200).json({
        success: true,
        data: result.products,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      logger.error('Failed to get products by seller', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sellerId: req.params.sellerId,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get products by seller',
      });
    }
  }

  /**
   * Update product stock
   */
  async updateProductStock(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { stock } = req.body;
      const user = (req as any).user;

      if (!validateUuid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format',
        });
      }

      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock must be a non-negative number',
        });
      }

      // Check if product exists and user has permission
      const existingProduct = await this.productService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      // Check permissions
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && existingProduct.sellerId !== user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update this product',
        });
      }

      const updatedProduct = await this.productService.updateProductStock(id, stock);

      logger.info('Product stock updated successfully', {
        productId: id,
        newStock: stock,
        userId: user.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Product stock updated successfully',
        data: updatedProduct,
      });
    } catch (error) {
      logger.error('Failed to update product stock', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: req.params.id,
        userId: (req as any).user?.userId,
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update product stock',
      });
    }
  }
}
