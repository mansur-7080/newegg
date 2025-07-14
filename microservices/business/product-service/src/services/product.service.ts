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
import { logger, NotFoundError, ValidationError, ConflictError } from '@ultramarket/shared';
import { generateSlug } from '../utils/slug.utils';
import { optimizeImageUrls } from '../utils/image.utils';
import { calculateProductMetrics } from '../utils/metrics.utils';

const prisma = new PrismaClient();

// Categories are now managed in the database
// This is kept for reference but not used in the code

// Product status enum (matching schema)
export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

// Product creation interface (matching schema)
export interface CreateProductInput {
  name: string;
  description?: string;
  shortDescription?: string;
  categoryId: string;
  brand?: string;
  model?: string;
  sku: string;
  barcode?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  currency?: string;
  weight?: number;
  dimensions?: Record<string, any>;
  images: Array<{ url: string; altText?: string; isMain?: boolean }>;
  tags: string[];
  attributes?: Record<string, any>;
  specifications?: Record<string, any>;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  vendorId?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  // Inventory fields
  quantity: number;
  lowStockThreshold?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  location?: string;
  warehouse?: string;
}

// Product update interface (matching schema)
export interface UpdateProductInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  brand?: string;
  model?: string;
  barcode?: string;
  price?: number;
  comparePrice?: number;
  costPrice?: number;
  currency?: string;
  weight?: number;
  dimensions?: Record<string, any>;
  tags?: string[];
  attributes?: Record<string, any>;
  specifications?: Record<string, any>;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
}

// Product search filters (matching schema)
export interface ProductFilters {
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  vendorId?: string;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
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

    // Validate category exists in database
    const categoryExists = await prisma.category.findUnique({
      where: { id: input.categoryId }
    });
    
    if (!categoryExists) {
      throw new ValidationError(`Invalid category ID: ${input.categoryId}`);
    }

    // Process and optimize images
    const imageUrls = input.images.map(img => typeof img === 'string' ? img : img.url);
    const optimizedImages = await optimizeImageUrls(imageUrls);

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
          description: input.description,
          shortDescription: input.shortDescription,
          slug: uniqueSlug,
          categoryId: input.categoryId,
          brand: input.brand,
          model: input.model,
          sku: input.sku,
          barcode: input.barcode,
          price: input.price,
          comparePrice: input.comparePrice,
          costPrice: input.costPrice,
          currency: input.currency || 'UZS',
          weight: input.weight,
          dimensions: input.dimensions as Prisma.JsonValue,
          tags: input.tags,
          attributes: input.attributes as Prisma.JsonValue,
          specifications: input.specifications as Prisma.JsonValue,
          metaTitle: input.metaTitle || input.name,
          metaDescription: input.metaDescription || input.shortDescription || input.description?.substring(0, 160),
          metaKeywords: input.metaKeywords,
          warranty: input.warranty,
          returnPolicy: input.returnPolicy,
          shippingInfo: input.shippingInfo,
          vendorId: input.vendorId,
          status: input.status || ProductStatus.DRAFT,
          isFeatured: input.isFeatured || false,
          isBestSeller: input.isBestSeller || false,
          isNewArrival: input.isNewArrival || false,
          isOnSale: input.isOnSale || false,
          salePercentage: input.salePercentage,
          saleStartDate: input.saleStartDate,
          saleEndDate: input.saleEndDate,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
          vendor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      });

      // Create product images
      if (input.images && input.images.length > 0) {
        const imageData = input.images.map((img, index) => ({
          productId: newProduct.id,
          url: typeof img === 'string' ? img : img.url,
          altText: typeof img === 'object' ? img.altText : `${input.name} image ${index + 1}`,
          sortOrder: index,
          isMain: typeof img === 'object' ? img.isMain : index === 0,
        }));

        await tx.productImage.createMany({
          data: imageData
        });
      }

      // Create inventory entry
      await tx.inventory.create({
        data: {
          productId: newProduct.id,
          quantity: input.quantity,
          reservedQuantity: 0,
          availableQuantity: input.quantity,
          lowStockThreshold: input.lowStockThreshold || 10,
          reorderPoint: input.reorderPoint || 5,
          reorderQuantity: input.reorderQuantity || 50,
          location: input.location,
          warehouse: input.warehouse,
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        vendor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          }
        },
        inventory: {
          select: {
            quantity: true,
            reservedQuantity: true,
            availableQuantity: true,
            lowStockThreshold: true,
            location: true,
            warehouse: true,
            updatedAt: true,
          }
        },
        images: {
          select: {
            id: true,
            url: true,
            altText: true,
            sortOrder: true,
            isMain: true,
          },
          orderBy: { sortOrder: 'asc' }
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            userId: true,
            isVerified: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            reviews: true,
            variants: true,
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

    return {
      ...product,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: product._count.reviews,
      totalVariants: product._count.variants,
      mainImage: product.images.find(img => img.isMain) || product.images[0],
      inStock: product.inventory ? product.inventory.availableQuantity > 0 : false,
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
      status: { not: 'ARCHIVED' },
      isActive: true,
    };

    // Apply filters
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
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

    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    if (filters.isBestSeller !== undefined) {
      where.isBestSeller = filters.isBestSeller;
    }

    if (filters.isNewArrival !== undefined) {
      where.isNewArrival = filters.isNewArrival;
    }

    if (filters.isOnSale !== undefined) {
      where.isOnSale = filters.isOnSale;
    }

    if (filters.inStock) {
      where.inventory = {
        availableQuantity: { gt: 0 }
      };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
        { brand: { contains: searchTerm, mode: 'insensitive' } },
        { model: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { has: searchTerm } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { barcode: { contains: searchTerm, mode: 'insensitive' } },
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
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
          vendor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            }
          },
          inventory: {
            select: {
              availableQuantity: true,
              lowStockThreshold: true,
            }
          },
          images: {
            select: {
              url: true,
              altText: true,
              isMain: true,
            },
            where: { isMain: true },
            take: 1,
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

    // Soft delete by setting status to ARCHIVED
    const deletedProduct = await prisma.product.update({
      where: { id },
      data: {
        status: ProductStatus.ARCHIVED,
        isActive: false,
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
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                status: { not: 'ARCHIVED' },
                isActive: true,
              }
            }
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      productCount: category._count.products,
      subcategories: category.children,
      parentId: category.parentId,
    }));

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
export async function getProductBrands(categoryId?: string) {
  try {
    const where: Prisma.ProductWhereInput = {
      status: { not: 'ARCHIVED' },
      isActive: true,
      brand: { not: null },
    };

    if (categoryId) {
      where.categoryId = categoryId;
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

    return brands
      .filter(brand => brand.brand !== null)
      .map(brand => ({
        name: brand.brand!,
        productCount: brand._count.brand,
      }));

  } catch (error) {
    logger.error('Error getting product brands', {
      error: error.message,
      categoryId,
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
      prisma.product.count({ 
        where: { 
          ...where, 
          inventory: { availableQuantity: 0 } 
        } 
      }),
      prisma.product.aggregate({
        where,
        _sum: { price: true },
      }),
      prisma.product.aggregate({
        where,
        _avg: { price: true },
      }),
      prisma.product.groupBy({
        by: ['categoryId'],
        where,
        _count: { categoryId: true },
        orderBy: { _count: { categoryId: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      draftProducts: totalProducts - activeProducts,
      totalValue: totalValue._sum.price || 0,
      avgPrice: Number(avgPrice._avg.price) || 0,
      topCategories: topCategories.map(cat => ({
        categoryId: cat.categoryId,
        count: cat._count.categoryId,
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