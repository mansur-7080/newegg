/**
 * UltraMarket Product Service
 * Professional product management with Uzbekistan market specialization
 * 
 * Features:
 * - Real product CRUD with validation
 * - Uzbekistan market categories (Electronics, Clothing, Food, etc.)
 * - UZS currency calculations
 * - Local vendor management
 * - SEO optimization for Uzbek keywords
 * - Stock management
 * - Real search and filtering
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { NotFoundError, ValidationError, ConflictError } from '@ultramarket/shared/errors';
import { generateSlug } from '../utils/slug.utils';
import { optimizeImageUrls } from '../utils/image.utils';
import { calculateProductMetrics } from '../utils/metrics.utils';

const prisma = new PrismaClient();

// Uzbekistan-specific product categories
export const UZBEKISTAN_CATEGORIES = {
  ELECTRONICS: {
    id: 'electronics',
    nameUz: 'Elektronika',
    nameRu: 'Электроника',
    nameEn: 'Electronics',
    subcategories: [
      'smartphones', 'laptops', 'tablets', 'audio', 'tv-appliances', 
      'gaming', 'cameras', 'accessories', 'components'
    ]
  },
  CLOTHING: {
    id: 'clothing',
    nameUz: 'Kiyim-kechak',
    nameRu: 'Одежда',
    nameEn: 'Clothing',
    subcategories: [
      'mens-clothing', 'womens-clothing', 'kids-clothing', 'shoes', 
      'bags', 'accessories', 'traditional-wear'
    ]
  },
  HOME_GARDEN: {
    id: 'home-garden',
    nameUz: 'Uy va bog\'',
    nameRu: 'Дом и сад',
    nameEn: 'Home & Garden',
    subcategories: [
      'furniture', 'kitchen', 'decor', 'garden', 'tools', 'lighting'
    ]
  },
  FOOD_BEVERAGES: {
    id: 'food-beverages',
    nameUz: 'Oziq-ovqat',
    nameRu: 'Еда и напитки',
    nameEn: 'Food & Beverages',
    subcategories: [
      'groceries', 'beverages', 'snacks', 'organic', 'local-products'
    ]
  },
  BOOKS_MEDIA: {
    id: 'books-media',
    nameUz: 'Kitoblar va media',
    nameRu: 'Книги и медиа',
    nameEn: 'Books & Media',
    subcategories: [
      'books', 'ebooks', 'audiobooks', 'magazines', 'movies', 'music'
    ]
  },
  SPORTS_OUTDOORS: {
    id: 'sports-outdoors',
    nameUz: 'Sport va dam olish',
    nameRu: 'Спорт и отдых',
    nameEn: 'Sports & Outdoors',
    subcategories: [
      'fitness', 'outdoor-gear', 'sports-equipment', 'cycling', 'water-sports'
    ]
  },
  HEALTH_BEAUTY: {
    id: 'health-beauty',
    nameUz: 'Salomatlik va go\'zallik',
    nameRu: 'Здоровье и красота',
    nameEn: 'Health & Beauty',
    subcategories: [
      'skincare', 'makeup', 'health-supplements', 'personal-care', 'medical'
    ]
  },
  AUTOMOTIVE: {
    id: 'automotive',
    nameUz: 'Avtomobil',
    nameRu: 'Автомобильные товары',
    nameEn: 'Automotive',
    subcategories: [
      'parts', 'accessories', 'maintenance', 'tools', 'electronics'
    ]
  }
};

// Product status enum
export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED'
}

// Product creation interface
export interface CreateProductInput {
  name: string;
  nameUz?: string;
  nameRu?: string;
  description: string;
  descriptionUz?: string;
  descriptionRu?: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  brand: string;
  sku: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  currency: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  images: string[];
  thumbnail?: string;
  tags: string[];
  attributes: Record<string, any>;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  stock: number;
  minStock?: number;
  maxStock?: number;
  vendorId: string;
  isDigital?: boolean;
  shippingRequired?: boolean;
  status: ProductStatus;
  featured?: boolean;
  visibility: 'PUBLIC' | 'PRIVATE' | 'VENDOR_ONLY';
}

// Product update interface
export interface UpdateProductInput {
  name?: string;
  nameUz?: string;
  nameRu?: string;
  description?: string;
  descriptionUz?: string;
  descriptionRu?: string;
  shortDescription?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  price?: number;
  comparePrice?: number;
  costPrice?: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  images?: string[];
  thumbnail?: string;
  tags?: string[];
  attributes?: Record<string, any>;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  stock?: number;
  minStock?: number;
  maxStock?: number;
  isDigital?: boolean;
  shippingRequired?: boolean;
  status?: ProductStatus;
  featured?: boolean;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'VENDOR_ONLY';
}

// Product search filters
export interface ProductFilters {
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  vendorId?: string;
  featured?: boolean;
  inStock?: boolean;
  tags?: string[];
  search?: string;
}

// Product search options
export interface ProductSearchOptions {
  page: number;
  limit: number;
  filters: ProductFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Create a new product with comprehensive validation
 */
export async function createProduct(input: CreateProductInput) {
  try {
    // Validate SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: input.sku }
    });

    if (existingSku) {
      throw new ConflictError(`Product with SKU "${input.sku}" already exists`);
    }

    // Generate SEO-friendly slug
    const slug = generateSlug(input.name);
    
    // Ensure slug uniqueness
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // Validate category
    const categoryExists = Object.values(UZBEKISTAN_CATEGORIES)
      .some(cat => cat.id === input.category);
    
    if (!categoryExists) {
      throw new ValidationError(`Invalid category: ${input.category}`);
    }

    // Process and optimize images
    const optimizedImages = await optimizeImageUrls(input.images);

    // Calculate product metrics
    const metrics = calculateProductMetrics({
      price: input.price,
      comparePrice: input.comparePrice,
      costPrice: input.costPrice,
    });

    // Create product with transaction
    const product = await prisma.$transaction(async (tx) => {
      // Create main product
      const newProduct = await tx.product.create({
        data: {
          name: input.name,
          nameUz: input.nameUz,
          nameRu: input.nameRu,
          description: input.description,
          descriptionUz: input.descriptionUz,
          descriptionRu: input.descriptionRu,
          shortDescription: input.shortDescription,
          slug: uniqueSlug,
          category: input.category,
          subcategory: input.subcategory,
          brand: input.brand,
          sku: input.sku,
          price: input.price,
          comparePrice: input.comparePrice,
          costPrice: input.costPrice,
          currency: input.currency || 'UZS',
          weight: input.weight,
          dimensions: input.dimensions as Prisma.JsonValue,
          images: optimizedImages,
          thumbnail: input.thumbnail || optimizedImages[0],
          tags: input.tags,
          attributes: input.attributes as Prisma.JsonValue,
          seoTitle: input.seoTitle || input.name,
          seoDescription: input.seoDescription || input.shortDescription || input.description.substring(0, 160),
          seoKeywords: input.seoKeywords || [],
          stock: input.stock,
          minStock: input.minStock || 0,
          maxStock: input.maxStock,
          vendorId: input.vendorId,
          isDigital: input.isDigital || false,
          shippingRequired: input.shippingRequired !== false,
          status: input.status,
          featured: input.featured || false,
          visibility: input.visibility || 'PUBLIC',
          profit: metrics.profit,
          profitMargin: metrics.profitMargin,
          discountPercentage: metrics.discountPercentage,
          views: 0,
          sales: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              businessName: true,
              location: true,
            }
          }
        }
      });

      // Create inventory entry
      await tx.inventory.create({
        data: {
          productId: newProduct.id,
          quantity: input.stock,
          reserved: 0,
          available: input.stock,
          location: 'WAREHOUSE_MAIN',
          updatedBy: input.vendorId,
        }
      });

      // Create product analytics entry
      await tx.productAnalytics.create({
        data: {
          productId: newProduct.id,
          views: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          createdAt: new Date(),
        }
      });

      return newProduct;
    });

    logger.info('Product created successfully', {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      vendorId: input.vendorId,
      operation: 'create_product'
    });

    return product;

  } catch (error) {
    logger.error('Error creating product', {
      error: error.message,
      input: { ...input, vendorId: '***' },
      operation: 'create_product'
    });
    throw error;
  }
}

/**
 * Find product by ID with comprehensive data
 */
export async function findProductById(id: string, includeAnalytics: boolean = false) {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            businessName: true,
            location: true,
            rating: true,
            totalProducts: true,
          }
        },
        inventory: {
          select: {
            quantity: true,
            reserved: true,
            available: true,
            location: true,
            updatedAt: true,
          }
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            userId: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                avatar: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        analytics: includeAnalytics ? {
          select: {
            views: true,
            clicks: true,
            conversions: true,
            revenue: true,
            updatedAt: true,
          }
        } : false,
        _count: {
          select: {
            reviews: true,
            wishlistItems: true,
          }
        }
      }
    });

    if (!product) {
      return null;
    }

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    // Increment view count (async, don't wait)
    prisma.product.update({
      where: { id },
      data: { views: { increment: 1 } }
    }).catch(err => logger.warn('Failed to increment view count', { productId: id, error: err.message }));

    return {
      ...product,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: product._count.reviews,
      totalWishlisted: product._count.wishlistItems,
    };

  } catch (error) {
    logger.error('Error finding product by ID', {
      productId: id,
      error: error.message,
      operation: 'find_product_by_id'
    });
    throw error;
  }
}

/**
 * Find products with advanced filtering and pagination
 */
export async function findProducts(options: ProductSearchOptions) {
  try {
    const { page, limit, filters, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      status: { not: 'DISCONTINUED' },
    };

    // Apply filters
    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.subcategory) {
      where.subcategory = filters.subcategory;
    }

    if (filters.brand) {
      where.brand = { contains: filters.brand, mode: 'insensitive' };
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }

    if (filters.status) {
      where.status = filters.status as ProductStatus;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters.featured !== undefined) {
      where.featured = filters.featured;
    }

    if (filters.inStock) {
      where.stock = { gt: 0 };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { nameUz: { contains: searchTerm, mode: 'insensitive' } },
        { nameRu: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { descriptionUz: { contains: searchTerm, mode: 'insensitive' } },
        { descriptionRu: { contains: searchTerm, mode: 'insensitive' } },
        { brand: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { has: searchTerm } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Build order by
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    
    switch (sortBy) {
      case 'price':
        orderBy.price = sortOrder;
        break;
      case 'name':
        orderBy.name = sortOrder;
        break;
      case 'rating':
        orderBy.avgRating = sortOrder;
        break;
      case 'sales':
        orderBy.sales = sortOrder;
        break;
      case 'views':
        orderBy.views = sortOrder;
        break;
      case 'stock':
        orderBy.stock = sortOrder;
        break;
      case 'createdAt':
      default:
        orderBy.createdAt = sortOrder;
        break;
    }

    // Execute queries in parallel
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              businessName: true,
              location: true,
              rating: true,
            }
          },
          inventory: {
            select: {
              available: true,
            }
          },
          _count: {
            select: {
              reviews: true,
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    logger.debug('Products retrieved successfully', {
      total,
      page,
      limit,
      totalPages,
      filtersApplied: Object.keys(filters).length,
      operation: 'find_products'
    });

    return {
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev,
      },
      filters: filters,
    };

  } catch (error) {
    logger.error('Error finding products', {
      error: error.message,
      options,
      operation: 'find_products'
    });
    throw error;
  }
}

/**
 * Update product with validation
 */
export async function updateProduct(id: string, input: UpdateProductInput) {
  try {
    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    // Validate SKU uniqueness if provided
    if (input.sku && input.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: input.sku }
      });

      if (existingSku) {
        throw new ConflictError(`Product with SKU "${input.sku}" already exists`);
      }
    }

    // Generate new slug if name changed
    let slug = existingProduct.slug;
    if (input.name && input.name !== existingProduct.name) {
      const baseSlug = generateSlug(input.name);
      let uniqueSlug = baseSlug;
      let counter = 1;
      
      while (await prisma.product.findFirst({ 
        where: { 
          slug: uniqueSlug,
          id: { not: id }
        } 
      })) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      slug = uniqueSlug;
    }

    // Process images if provided
    const optimizedImages = input.images 
      ? await optimizeImageUrls(input.images)
      : undefined;

    // Calculate metrics if price changed
    const metrics = (input.price !== undefined || input.comparePrice !== undefined || input.costPrice !== undefined)
      ? calculateProductMetrics({
          price: input.price ?? existingProduct.price,
          comparePrice: input.comparePrice ?? existingProduct.comparePrice,
          costPrice: input.costPrice ?? existingProduct.costPrice,
        })
      : {};

    // Update product
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Update main product
      const product = await tx.product.update({
        where: { id },
        data: {
          ...input,
          slug,
          images: optimizedImages,
          thumbnail: input.thumbnail || (optimizedImages ? optimizedImages[0] : undefined),
          seoTitle: input.seoTitle || (input.name ? input.name : undefined),
          seoDescription: input.seoDescription || (input.shortDescription ? input.shortDescription : undefined),
          profit: metrics.profit,
          profitMargin: metrics.profitMargin,
          discountPercentage: metrics.discountPercentage,
          dimensions: input.dimensions as Prisma.JsonValue,
          attributes: input.attributes as Prisma.JsonValue,
          updatedAt: new Date(),
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              businessName: true,
              location: true,
            }
          }
        }
      });

      // Update inventory if stock changed
      if (input.stock !== undefined) {
        await tx.inventory.update({
          where: { productId: id },
          data: {
            quantity: input.stock,
            available: input.stock,
            updatedAt: new Date(),
          }
        });
      }

      return product;
    });

    logger.info('Product updated successfully', {
      productId: id,
      changes: Object.keys(input),
      operation: 'update_product'
    });

    return updatedProduct;

  } catch (error) {
    logger.error('Error updating product', {
      productId: id,
      error: error.message,
      operation: 'update_product'
    });
    throw error;
  }
}

/**
 * Delete product (soft delete)
 */
export async function deleteProduct(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Soft delete by setting status to DISCONTINUED
    const deletedProduct = await prisma.product.update({
      where: { id },
      data: {
        status: ProductStatus.DISCONTINUED,
        visibility: 'PRIVATE',
        updatedAt: new Date(),
      }
    });

    logger.info('Product deleted successfully', {
      productId: id,
      name: product.name,
      operation: 'delete_product'
    });

    return deletedProduct;

  } catch (error) {
    logger.error('Error deleting product', {
      productId: id,
      error: error.message,
      operation: 'delete_product'
    });
    throw error;
  }
}

/**
 * Search products with advanced text search
 */
export async function searchProducts(query: string, filters: ProductFilters = {}, options: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = options;
  
  return findProducts({
    page,
    limit,
    filters: { ...filters, search: query },
    sortBy: 'relevance',
    sortOrder: 'desc'
  });
}

/**
 * Get product categories with statistics
 */
export async function getProductCategories() {
  try {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      where: {
        status: { notIn: ['DISCONTINUED'] },
        visibility: 'PUBLIC',
      },
      _count: {
        category: true,
      },
    });

    const categoryStats = categories.map(cat => {
      const categoryInfo = Object.values(UZBEKISTAN_CATEGORIES)
        .find(c => c.id === cat.category);
      
      return {
        id: cat.category,
        name: categoryInfo?.nameEn || cat.category,
        nameUz: categoryInfo?.nameUz,
        nameRu: categoryInfo?.nameRu,
        productCount: cat._count.category,
        subcategories: categoryInfo?.subcategories || [],
      };
    });

    return categoryStats;

  } catch (error) {
    logger.error('Error getting product categories', {
      error: error.message,
      operation: 'get_product_categories'
    });
    throw error;
  }
}

/**
 * Get product brands with statistics
 */
export async function getProductBrands(category?: string) {
  try {
    const where: Prisma.ProductWhereInput = {
      status: { notIn: ['DISCONTINUED'] },
      visibility: 'PUBLIC',
    };

    if (category) {
      where.category = category;
    }

    const brands = await prisma.product.groupBy({
      by: ['brand'],
      where,
      _count: {
        brand: true,
      },
      orderBy: {
        _count: {
          brand: 'desc',
        }
      },
    });

    return brands.map(brand => ({
      name: brand.brand,
      productCount: brand._count.brand,
    }));

  } catch (error) {
    logger.error('Error getting product brands', {
      error: error.message,
      category,
      operation: 'get_product_brands'
    });
    throw error;
  }
}

/**
 * Get product statistics for admin/vendor
 */
export async function getProductStatistics(vendorId?: string) {
  try {
    const where: Prisma.ProductWhereInput = {};
    
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      totalValue,
      avgPrice,
      topCategories,
    ] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.product.count({ where: { ...where, stock: 0 } }),
      prisma.product.aggregate({
        where,
        _sum: { price: true },
      }),
      prisma.product.aggregate({
        where,
        _avg: { price: true },
      }),
      prisma.product.groupBy({
        by: ['category'],
        where,
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      draftProducts: totalProducts - activeProducts,
      totalValue: totalValue._sum.price || 0,
      avgPrice: avgPrice._avg.price || 0,
      topCategories: topCategories.map(cat => ({
        category: cat.category,
        count: cat._count.category,
      })),
    };

  } catch (error) {
    logger.error('Error getting product statistics', {
      error: error.message,
      vendorId,
      operation: 'get_product_statistics'
    });
    throw error;
  }
}