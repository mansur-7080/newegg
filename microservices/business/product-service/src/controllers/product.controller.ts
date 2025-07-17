/**
 * Product Controller
 * Professional product management with comprehensive CRUD operations
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@ultramarket/shared';
import { NotFoundError, ValidationError, AuthorizationError } from '../errors';
import { Product } from '../models/Product';
import {
  validateProductInput,
  validateProductUpdateInput,
  validateProductSearchInput
} from '../validators/product.validator';

export class ProductController {
  /**
   * Get all products with pagination and filtering
   */
  static async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        brand,
        minPrice,
        maxPrice,
        inStock,
        featured,
        sort = '-createdAt',
        status = 'active'
      } = req.query;

      const filter: any = { status };

      if (category) filter.category = category;
      if (brand) filter.brand = brand;
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
      }
      if (inStock === 'true') {
        filter.$or = [
          { 'inventory.tracked': false },
          { 'inventory.quantity': { $gt: 0 } },
          { 'inventory.allowBackorder': true }
        ];
      }
      if (featured === 'true') filter.featured = true;

      const skip = (Number(page) - 1) * Number(limit);

      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name slug')
          .sort(sort as string)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Product.countDocuments(filter)
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

  /**
   * Search products
   */
  static async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = validateProductSearchInput(req.query);
      if (error) {
        throw new ValidationError('Invalid search parameters', error.details);
      }

      const {
        query,
        category,
        brand,
        minPrice,
        maxPrice,
        inStock,
        tags,
        sort = 'relevance',
        page = 1,
        limit = 20
      } = value;

      const searchQuery: any = { status: 'active' };

      // Text search
      if (query) {
        searchQuery.$text = { $search: query };
      }

      // Filters
      if (category) searchQuery.category = category;
      if (brand) searchQuery.brand = brand;
      if (minPrice || maxPrice) {
        searchQuery.price = {};
        if (minPrice) searchQuery.price.$gte = minPrice;
        if (maxPrice) searchQuery.price.$lte = maxPrice;
      }
      if (inStock) {
        searchQuery.$or = [
          { 'inventory.tracked': false },
          { 'inventory.quantity': { $gt: 0 } },
          { 'inventory.allowBackorder': true }
        ];
      }
      if (tags && tags.length > 0) {
        searchQuery.tags = { $in: tags };
      }

      // Sorting
      let sortOption: any = {};
      switch (sort) {
        case 'price_asc':
          sortOption = { price: 1 };
          break;
        case 'price_desc':
          sortOption = { price: -1 };
          break;
        case 'name':
          sortOption = { name: 1 };
          break;
        case 'created':
          sortOption = { createdAt: -1 };
          break;
        case 'popularity':
          sortOption = { 'analytics.purchases': -1 };
          break;
        default:
          if (query) {
            sortOption = { score: { $meta: 'textScore' } };
          }
      }

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find(searchQuery, query ? { score: { $meta: 'textScore' } } : {})
          .populate('category', 'name slug')
          .sort(sortOption)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(searchQuery)
      ]);

      res.json({
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await Product.findById(req.params.id)
        .populate('category', 'name slug')
        .populate('relatedProducts', 'name price images slug')
        .lean();

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Increment view count
      Product.findByIdAndUpdate(req.params.id, {
        $inc: { 'analytics.views': 1 }
      }).exec();

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, sort = '-createdAt' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [products, total] = await Promise.all([
        Product.find({ category: req.params.categoryId, status: 'active' })
          .populate('category', 'name slug')
          .sort(sort as string)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Product.countDocuments({ category: req.params.categoryId, status: 'active' })
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

  /**
   * Get products by brand
   */
  static async getProductsByBrand(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, sort = '-createdAt' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [products, total] = await Promise.all([
        Product.find({ brand: req.params.brand, status: 'active' })
          .populate('category', 'name slug')
          .sort(sort as string)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Product.countDocuments({ brand: req.params.brand, status: 'active' })
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

  /**
   * Get product reviews
   */
  static async getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const product = await Product.findById(req.params.id)
        .select('reviews rating')
        .lean();

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const start = (Number(page) - 1) * Number(limit);
      const end = start + Number(limit);
      const paginatedReviews = product.reviews.slice(start, end);

      res.json({
        success: true,
        data: {
          reviews: paginatedReviews,
          rating: product.rating,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: product.reviews.length,
            pages: Math.ceil(product.reviews.length / Number(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new product
   */
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = validateProductInput(req.body);
      if (error) {
        throw new ValidationError('Invalid product data', error.details);
      }

      const productData = {
        ...value,
        vendorId: (req as any).user?.id,
        vendor: {
          name: (req as any).user?.name,
          email: (req as any).user?.email
        }
      };

      // Generate slug if not provided
      if (!productData.slug) {
        productData.slug = productData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      // Check if slug already exists
      const existing = await Product.findOne({ slug: productData.slug });
      if (existing) {
        productData.slug = `${productData.slug}-${Date.now()}`;
      }

      const product = await Product.create(productData);

      logger.info('Product created', {
        productId: product._id,
        name: product.name,
        vendorId: productData.vendorId
      });

      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product
   */
  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = validateProductUpdateInput(req.body);
      if (error) {
        throw new ValidationError('Invalid product data', error.details);
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership
      const user = (req as any).user;
      if (product.vendorId !== user.id && user.role !== 'admin') {
        throw new AuthorizationError('You are not authorized to update this product');
      }

      // Update product
      Object.assign(product, value);
      await product.save();

      logger.info('Product updated', {
        productId: product._id,
        updates: Object.keys(value),
        userId: user.id
      });

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership
      const user = (req as any).user;
      if (product.vendorId !== user.id && user.role !== 'admin') {
        throw new AuthorizationError('You are not authorized to delete this product');
      }

      // Soft delete - just change status to archived
      product.status = 'archived';
      await product.save();

      logger.info('Product deleted', {
        productId: product._id,
        name: product.name,
        userId: user.id
      });

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update inventory
   */
  static async updateInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const { quantity, operation = 'set' } = req.body;

      const product = await Product.findById(req.params.id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership
      const user = (req as any).user;
      if (product.vendorId !== user.id && user.role !== 'admin') {
        throw new AuthorizationError('You are not authorized to update inventory');
      }

      switch (operation) {
        case 'set':
          product.inventory.quantity = quantity;
          break;
        case 'add':
          product.inventory.quantity += quantity;
          break;
        case 'subtract':
          product.inventory.quantity = Math.max(0, product.inventory.quantity - quantity);
          break;
        default:
          throw new ValidationError('Invalid operation');
      }

      await product.save();

      logger.info('Inventory updated', {
        productId: product._id,
        operation,
        quantity,
        newQuantity: product.inventory.quantity,
        userId: user.id
      });

      res.json({
        success: true,
        data: {
          productId: product._id,
          inventory: product.inventory
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory
   */
  static async getInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await Product.findById(req.params.id)
        .select('name sku inventory')
        .lean();

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      res.json({
        success: true,
        data: {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          inventory: product.inventory
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload product images
   */
  static async uploadImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { images } = req.body;

      const product = await Product.findById(req.params.id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership
      const user = (req as any).user;
      if (product.vendorId !== user.id && user.role !== 'admin') {
        throw new AuthorizationError('You are not authorized to update this product');
      }

      // Add new images
      product.images.push(...images);
      await product.save();

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product image
   */
  static async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership
      const user = (req as any).user;
      if (product.vendorId !== user.id && user.role !== 'admin') {
        throw new AuthorizationError('You are not authorized to update this product');
      }

      // Remove image
      product.images = product.images.filter(img => img !== req.params.imageId);
      await product.save();

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk import products
   */
  static async bulkImport(req: Request, res: Response, next: NextFunction) {
    try {
      const { products } = req.body;
      const user = (req as any).user;

      if (!Array.isArray(products)) {
        throw new ValidationError('Products must be an array');
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as any[]
      };

      for (const productData of products) {
        try {
          const { error, value } = validateProductInput(productData);
          if (error) {
            results.failed++;
            results.errors.push({
              sku: productData.sku,
              error: error.details[0].message
            });
            continue;
          }

          await Product.create({
            ...value,
            vendorId: user.id,
            vendor: {
              name: user.name,
              email: user.email
            }
          });

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            sku: productData.sku,
            error: error.message
          });
        }
      }

      logger.info('Bulk import completed', {
        userId: user.id,
        total: products.length,
        success: results.success,
        failed: results.failed
      });

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk export products
   */
  static async bulkExport(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const filter: any = {};

      // Admin can export all, vendors only their own
      if (user.role !== 'admin') {
        filter.vendorId = user.id;
      }

      const products = await Product.find(filter)
        .populate('category', 'name')
        .lean();

      res.json({
        success: true,
        data: products,
        count: products.length
      });
    } catch (error) {
      next(error);
    }
  }
}
