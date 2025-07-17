/**
 * Product Service
 * Professional product business logic layer
 */

import mongoose from 'mongoose';
import Product, { IProduct } from '../models/Product';
import Category from '../models/Category';
import { logger } from '@ultramarket/shared/logging/logger';
import { ValidationError, NotFoundError } from '@ultramarket/shared/errors';

export interface ProductSearchParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  status?: string;
}

export interface ProductQueryParams {
  query: string;
  page: number;
  limit: number;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{ index: number; error: string; data: any }>;
}

export class ProductService {
  /**
   * Get products with filtering, sorting, and pagination
   */
  async getProducts(params: ProductSearchParams) {
    const {
      page,
      limit,
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      status = 'active'
    } = params;

    // Build filter query
    const filter: any = { deletedAt: null };

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (brand) {
      filter.brand = { $regex: brand, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }

    // Build sort object
    const sort: any = {};
    switch (sortBy) {
      case 'name':
        sort.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'price':
        sort.price = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'rating':
        sort['rating.average'] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'sales':
        sort.salesCount = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'updatedAt':
        sort.updatedAt = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sort.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('subcategory', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Search products with advanced text search
   */
  async searchProducts(params: ProductQueryParams) {
    const {
      query,
      page,
      limit,
      category,
      brand,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder
    } = params;

    // Build search query
    const searchFilter: any = {
      deletedAt: null,
      status: 'active',
      $text: { $search: query }
    };

    // Additional filters
    if (category) {
      searchFilter.category = category;
    }

    if (brand) {
      searchFilter.brand = { $regex: brand, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      searchFilter.price = {};
      if (minPrice) searchFilter.price.$gte = minPrice;
      if (maxPrice) searchFilter.price.$lte = maxPrice;
    }

    // Build sort object
    const sort: any = { score: { $meta: 'textScore' } };
    
    if (sortBy !== 'relevance') {
      switch (sortBy) {
        case 'price':
          sort.price = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'rating':
          sort['rating.average'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'sales':
          sort.salesCount = sortOrder === 'asc' ? 1 : -1;
          break;
        default:
          sort.createdAt = sortOrder === 'asc' ? 1 : -1;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute search
    const [products, total] = await Promise.all([
      Product.find(searchFilter, { score: { $meta: 'textScore' } })
        .populate('category', 'name slug')
        .populate('subcategory', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(searchFilter)
    ]);

    return {
      products,
      query,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create a new product
   */
  async createProduct(productData: Partial<IProduct>): Promise<IProduct> {
    try {
      // Validate required fields
      if (!productData.name || !productData.description || !productData.price || !productData.category || !productData.sku) {
        throw new ValidationError('Missing required product fields');
      }

      // Check if SKU already exists
      const existingSKU = await Product.findOne({ sku: productData.sku, deletedAt: null });
      if (existingSKU) {
        throw new ValidationError('SKU already exists');
      }

      // Validate category exists
      const category = await Category.findById(productData.category);
      if (!category || !category.isActive) {
        throw new ValidationError('Invalid or inactive category');
      }

      // Create product
      const product = new Product(productData);
      await product.save();

      logger.info('Product created', {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        vendorId: product.vendorId,
      });

      return product;
    } catch (error) {
      logger.error('Error creating product', { error, productData });
      throw error;
    }
  }

  /**
   * Update a product
   */
  async updateProduct(productId: string, updateData: Partial<IProduct>): Promise<IProduct> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check if SKU is being changed and if it already exists
      if (updateData.sku && updateData.sku !== product.sku) {
        const existingSKU = await Product.findOne({
          sku: updateData.sku,
          _id: { $ne: productId },
          deletedAt: null
        });
        if (existingSKU) {
          throw new ValidationError('SKU already exists');
        }
      }

      // Validate category if being changed
      if (updateData.category && updateData.category !== product.category.toString()) {
        const category = await Category.findById(updateData.category);
        if (!category || !category.isActive) {
          throw new ValidationError('Invalid or inactive category');
        }
      }

      // Update product
      Object.assign(product, updateData);
      await product.save();

      logger.info('Product updated', {
        productId: product._id,
        name: product.name,
        changes: Object.keys(updateData),
      });

      return product;
    } catch (error) {
      logger.error('Error updating product', { error, productId, updateData });
      throw error;
    }
  }

  /**
   * Get product by ID with full details
   */
  async getProductById(productId: string): Promise<IProduct | null> {
    try {
      const product = await Product.findById(productId)
        .populate('category', 'name slug path')
        .populate('subcategory', 'name slug path')
        .populate('vendorId', 'name email')
        .exec();

      return product;
    } catch (error) {
      logger.error('Error getting product by ID', { error, productId });
      throw error;
    }
  }

  /**
   * Get related products
   */
  async getRelatedProducts(productId: string, limit: number = 8): Promise<IProduct[]> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        return [];
      }

      const relatedProducts = await Product.find({
        _id: { $ne: productId },
        status: 'active',
        deletedAt: null,
        $or: [
          { category: product.category },
          { brand: product.brand },
          { tags: { $in: product.tags } }
        ]
      })
      .populate('category', 'name slug')
      .sort({ 'rating.average': -1, salesCount: -1 })
      .limit(limit)
      .lean();

      return relatedProducts;
    } catch (error) {
      logger.error('Error getting related products', { error, productId });
      return [];
    }
  }

  /**
   * Bulk import products
   */
  async bulkImport(products: any[], importedBy: string): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < products.length; i++) {
      try {
        const productData = products[i];
        productData.vendorId = importedBy;

        await this.createProduct(productData);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: products[i]
        });
      }
    }

    logger.info('Bulk import completed', {
      total: products.length,
      success: result.success,
      failed: result.failed,
      importedBy,
    });

    return result;
  }

  /**
   * Update product inventory
   */
  async updateInventory(productId: string, operation: 'add' | 'subtract' | 'set', quantity: number): Promise<IProduct> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      await product.updateInventory(quantity, operation);

      logger.info('Product inventory updated', {
        productId: product._id,
        operation,
        quantity,
        newQuantity: product.inventory.quantity,
      });

      return product;
    } catch (error) {
      logger.error('Error updating inventory', { error, productId, operation, quantity });
      throw error;
    }
  }

  /**
   * Reserve product inventory
   */
  async reserveInventory(productId: string, quantity: number): Promise<boolean> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const reserved = await product.reserveInventory(quantity);

      if (reserved) {
        logger.info('Product inventory reserved', {
          productId: product._id,
          quantity,
          remainingAvailable: product.getAvailableQuantity(),
        });
      } else {
        logger.warn('Failed to reserve inventory - insufficient stock', {
          productId: product._id,
          requestedQuantity: quantity,
          availableQuantity: product.getAvailableQuantity(),
        });
      }

      return reserved;
    } catch (error) {
      logger.error('Error reserving inventory', { error, productId, quantity });
      throw error;
    }
  }

  /**
   * Release reserved inventory
   */
  async releaseInventory(productId: string, quantity: number): Promise<void> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      await product.releaseInventory(quantity);

      logger.info('Product inventory released', {
        productId: product._id,
        quantity,
        newAvailableQuantity: product.getAvailableQuantity(),
      });
    } catch (error) {
      logger.error('Error releasing inventory', { error, productId, quantity });
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(vendorId?: string): Promise<IProduct[]> {
    try {
      const filter: any = {
        deletedAt: null,
        status: 'active',
        'inventory.tracked': true,
        $expr: {
          $lte: ['$inventory.availableQuantity', '$inventory.lowStockThreshold']
        }
      };

      if (vendorId) {
        filter.vendorId = vendorId;
      }

      const products = await Product.find(filter)
        .populate('category', 'name slug')
        .sort({ 'inventory.availableQuantity': 1 })
        .lean();

      return products;
    } catch (error) {
      logger.error('Error getting low stock products', { error, vendorId });
      throw error;
    }
  }

  /**
   * Get products by vendor
   */
  async getVendorProducts(vendorId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const filter = {
        vendorId,
        deletedAt: null
      };

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name slug')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter)
      ]);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error getting vendor products', { error, vendorId });
      throw error;
    }
  }

  /**
   * Get product suggestions based on search
   */
  async getProductSuggestions(query: string, limit: number = 10): Promise<string[]> {
    try {
      const products = await Product.aggregate([
        {
          $match: {
            deletedAt: null,
            status: 'active',
            name: { $regex: query, $options: 'i' }
          }
        },
        {
          $group: {
            _id: null,
            suggestions: { $addToSet: '$name' }
          }
        },
        {
          $project: {
            suggestions: { $slice: ['$suggestions', limit] }
          }
        }
      ]);

      return products[0]?.suggestions || [];
    } catch (error) {
      logger.error('Error getting product suggestions', { error, query });
      return [];
    }
  }

  /**
   * Update product views
   */
  async incrementViews(productId: string): Promise<void> {
    try {
      await Product.findByIdAndUpdate(productId, { $inc: { viewCount: 1 } });
    } catch (error) {
      logger.error('Error incrementing product views', { error, productId });
    }
  }

  /**
   * Update product sales count
   */
  async incrementSales(productId: string, quantity: number = 1): Promise<void> {
    try {
      await Product.findByIdAndUpdate(productId, { $inc: { salesCount: quantity } });

      logger.info('Product sales count updated', {
        productId,
        quantity,
      });
    } catch (error) {
      logger.error('Error incrementing product sales', { error, productId, quantity });
    }
  }
}