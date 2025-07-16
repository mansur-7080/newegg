/**
 * Product Repository - Prisma Based
 * Professional data access layer with optimized queries and caching
 */

import { Prisma, ProductStatus } from '@prisma/client';
import { prisma } from '../lib/database';
import { logger } from '../utils/logger';
import {
  ProductWithRelations,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
  PaginationOptions,
  ProductQueryResult,
  ProductStatistics,
} from '../models/product.model';

export class ProductRepository {
  /**
   * Create a new product
   */
  async create(data: CreateProductInput): Promise<ProductWithRelations> {
    try {
      const product = await prisma.product.create({
        data: {
          ...data,
          slug: data.slug || this.generateSlug(data.name),
        },
        include: {
          category: true,
          variants: true,
          images: true,
          reviews: true,
        },
      });

      logger.info('Product created successfully', { productId: product.id, sku: product.sku });
      return product;
    } catch (error) {
      logger.error('Failed to create product', { error, data });
      throw error;
    }
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<ProductWithRelations | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          reviews: {
            where: { isApproved: true },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      return product;
    } catch (error) {
      logger.error('Failed to find product by ID', { error, id });
      throw error;
    }
  }

  /**
   * Find product by SKU
   */
  async findBySku(sku: string): Promise<ProductWithRelations | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { sku },
        include: {
          category: true,
          variants: true,
          images: true,
          reviews: true,
        },
      });

      return product;
    } catch (error) {
      logger.error('Failed to find product by SKU', { error, sku });
      throw error;
    }
  }

  /**
   * Find product by slug
   */
  async findBySlug(slug: string): Promise<ProductWithRelations | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { slug },
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          reviews: {
            where: { isApproved: true },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      return product;
    } catch (error) {
      logger.error('Failed to find product by slug', { error, slug });
      throw error;
    }
  }

  /**
   * Find products with filters and pagination
   */
  async findMany(
    filters: ProductFilters,
    pagination: PaginationOptions
  ): Promise<ProductQueryResult> {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause: Prisma.ProductWhereInput = {};

      if (filters.categoryId) {
        whereClause.categoryId = filters.categoryId;
      }

      if (filters.brand) {
        whereClause.brand = { contains: filters.brand, mode: 'insensitive' };
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        whereClause.price = {};
        if (filters.minPrice !== undefined) {
          whereClause.price.gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
          whereClause.price.lte = filters.maxPrice;
        }
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.isActive !== undefined) {
        whereClause.isActive = filters.isActive;
      }

      if (filters.isFeatured !== undefined) {
        whereClause.isFeatured = filters.isFeatured;
      }

      if (filters.isBestSeller !== undefined) {
        whereClause.isBestSeller = filters.isBestSeller;
      }

      if (filters.isNewArrival !== undefined) {
        whereClause.isNewArrival = filters.isNewArrival;
      }

      if (filters.isOnSale !== undefined) {
        whereClause.isOnSale = filters.isOnSale;
      }

      if (filters.search) {
        whereClause.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
          { brand: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.tags && filters.tags.length > 0) {
        whereClause.tags = { hasSome: filters.tags };
      }

      if (filters.vendorId) {
        whereClause.vendorId = filters.vendorId;
      }

      // Build order by clause
      const orderBy: Prisma.ProductOrderByWithRelationInput = {};
      if (sortBy === 'price') {
        orderBy.price = sortOrder;
      } else if (sortBy === 'name') {
        orderBy.name = sortOrder;
      } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'updatedAt') {
        orderBy.updatedAt = sortOrder;
      }

      // Execute queries
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          include: {
            category: true,
            images: {
              take: 3,
              orderBy: { sortOrder: 'asc' },
            },
            _count: {
              select: { reviews: true },
            },
          },
          orderBy,
          skip: offset,
          take: limit,
        }),
        prisma.product.count({ where: whereClause }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: products,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      logger.error('Failed to find products', { error, filters, pagination });
      throw error;
    }
  }

  /**
   * Update product
   */
  async update(id: string, data: UpdateProductInput): Promise<ProductWithRelations> {
    try {
      const product = await prisma.product.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          category: true,
          variants: true,
          images: true,
          reviews: true,
        },
      });

      logger.info('Product updated successfully', { productId: id });
      return product;
    } catch (error) {
      logger.error('Failed to update product', { error, id, data });
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  async delete(id: string): Promise<void> {
    try {
      await prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          status: ProductStatus.ARCHIVED,
          updatedAt: new Date(),
        },
      });

      logger.info('Product deleted successfully', { productId: id });
    } catch (error) {
      logger.error('Failed to delete product', { error, id });
      throw error;
    }
  }

  /**
   * Hard delete product
   */
  async hardDelete(id: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Delete related records first
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productReview.deleteMany({ where: { productId: id } });
        
        // Delete the product
        await tx.product.delete({ where: { id } });
      });

      logger.info('Product hard deleted successfully', { productId: id });
    } catch (error) {
      logger.error('Failed to hard delete product', { error, id });
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  async getStatistics(): Promise<ProductStatistics> {
    try {
      const [
        totalProducts,
        activeProducts,
        inactiveProducts,
        featuredProducts,
        onSaleProducts,
        topCategories,
        topBrands,
        avgPriceResult,
      ] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { isActive: true } }),
        prisma.product.count({ where: { isActive: false } }),
        prisma.product.count({ where: { isFeatured: true } }),
        prisma.product.count({ where: { isOnSale: true } }),
        
        // Top categories
        prisma.product.groupBy({
          by: ['categoryId'],
          _count: { categoryId: true },
          where: { categoryId: { not: null } },
          orderBy: { _count: { categoryId: 'desc' } },
          take: 10,
        }),
        
        // Top brands
        prisma.product.groupBy({
          by: ['brand'],
          _count: { brand: true },
          where: { brand: { not: null } },
          orderBy: { _count: { brand: 'desc' } },
          take: 10,
        }),
        
        // Average price
        prisma.product.aggregate({
          _avg: { price: true },
          where: { isActive: true },
        }),
      ]);

      // Get category names for top categories
      const categoryIds = topCategories.map(c => c.categoryId).filter(Boolean);
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      });

      const topCategoriesWithNames = topCategories.map(tc => {
        const category = categories.find(c => c.id === tc.categoryId);
        return {
          categoryId: tc.categoryId!,
          categoryName: category?.name || 'Unknown',
          productCount: tc._count.categoryId,
        };
      });

      const topBrandsFormatted = topBrands.map(tb => ({
        brand: tb.brand!,
        productCount: tb._count.brand,
      }));

      return {
        totalProducts,
        activeProducts,
        inactiveProducts,
        featuredProducts,
        onSaleProducts,
        outOfStockProducts: 0, // TODO: Implement inventory tracking
        averagePrice: Number(avgPriceResult._avg.price) || 0,
        topCategories: topCategoriesWithNames,
        topBrands: topBrandsFormatted,
      };
    } catch (error) {
      logger.error('Failed to get product statistics', { error });
      throw error;
    }
  }

  /**
   * Search products with full-text search
   */
  async search(query: string, limit: number = 20): Promise<ProductWithRelations[]> {
    try {
      const products = await prisma.product.findMany({
        where: {
          AND: [
            { isActive: true },
            { status: ProductStatus.ACTIVE },
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { shortDescription: { contains: query, mode: 'insensitive' } },
                { brand: { contains: query, mode: 'insensitive' } },
                { sku: { contains: query, mode: 'insensitive' } },
                { tags: { hasSome: [query] } },
              ],
            },
          ],
        },
        include: {
          category: true,
          images: {
            take: 3,
            orderBy: { sortOrder: 'asc' },
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return products;
    } catch (error) {
      logger.error('Failed to search products', { error, query });
      throw error;
    }
  }

  /**
   * Check if SKU exists
   */
  async skuExists(sku: string, excludeId?: string): Promise<boolean> {
    try {
      const where: Prisma.ProductWhereInput = { sku };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const count = await prisma.product.count({ where });
      return count > 0;
    } catch (error) {
      logger.error('Failed to check SKU existence', { error, sku });
      throw error;
    }
  }

  /**
   * Generate unique slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Bulk update products
   */
  async bulkUpdate(ids: string[], data: Partial<UpdateProductInput>): Promise<number> {
    try {
      const result = await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      logger.info('Products bulk updated successfully', { 
        count: result.count, 
        productIds: ids 
      });
      
      return result.count;
    } catch (error) {
      logger.error('Failed to bulk update products', { error, ids, data });
      throw error;
    }
  }
}
