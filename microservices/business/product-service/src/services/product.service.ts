/**
 * Product Service - REAL IMPLEMENTATION
 * Fixed to match actual Prisma schema exactly
 */

import { PrismaClient, Product, ProductStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateProductInput {
  name: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  barcode?: string;
  brand?: string;
  model?: string;
  weight?: number;
  dimensions?: any;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  currency?: string;
  categoryId: string;
  vendorId?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  tags?: string[];
  attributes?: any;
  specifications?: any;
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  images?: Array<{
    url: string;
    altText?: string;
    isMain?: boolean;
  }>;
  inventory?: {
    quantity: number;
    lowStockThreshold?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    location?: string;
    warehouse?: string;
  };
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  barcode?: string;
  brand?: string;
  model?: string;
  weight?: number;
  dimensions?: any;
  price?: number;
  comparePrice?: number;
  costPrice?: number;
  currency?: string;
  categoryId?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  tags?: string[];
  attributes?: any;
  specifications?: any;
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
}

/**
 * Create a new product
 */
export async function createProduct(input: CreateProductInput) {
  try {
    const product = await prisma.$transaction(async (tx) => {
      // Create product
      const newProduct = await tx.product.create({
        data: {
          name: input.name,
          slug: generateSlug(input.name),
          description: input.description,
          shortDescription: input.shortDescription,
          sku: input.sku,
          barcode: input.barcode,
          brand: input.brand,
          model: input.model,
          weight: input.weight ? new Prisma.Decimal(input.weight) : undefined,
          dimensions: input.dimensions,
          price: new Prisma.Decimal(input.price),
          comparePrice: input.comparePrice ? new Prisma.Decimal(input.comparePrice) : undefined,
          costPrice: input.costPrice ? new Prisma.Decimal(input.costPrice) : undefined,
          currency: input.currency || 'USD',
          categoryId: input.categoryId,
          vendorId: input.vendorId,
          status: input.status || 'DRAFT',
          isFeatured: input.isFeatured || false,
          isBestSeller: input.isBestSeller || false,
          isNewArrival: input.isNewArrival || false,
          isOnSale: input.isOnSale || false,
          salePercentage: input.salePercentage,
          saleStartDate: input.saleStartDate,
          saleEndDate: input.saleEndDate,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          metaKeywords: input.metaKeywords,
          tags: input.tags || [],
          attributes: input.attributes,
          specifications: input.specifications,
          warranty: input.warranty,
          returnPolicy: input.returnPolicy,
          shippingInfo: input.shippingInfo,
        },
        include: {
          category: true,
          vendor: true,
          images: true,
          inventory: true,
        }
      });

      // Create images if provided
      if (input.images && input.images.length > 0) {
        await tx.productImage.createMany({
          data: input.images.map((img, index) => ({
            productId: newProduct.id,
            url: img.url,
            altText: img.altText,
            sortOrder: index,
            isMain: img.isMain || index === 0,
          }))
        });
      }

      // Create inventory record
      if (input.inventory) {
        await tx.inventory.create({
          data: {
            productId: newProduct.id,
            quantity: input.inventory.quantity,
            availableQuantity: input.inventory.quantity,
            lowStockThreshold: input.inventory.lowStockThreshold || 10,
            reorderPoint: input.inventory.reorderPoint || 5,
            reorderQuantity: input.inventory.reorderQuantity || 50,
            location: input.inventory.location,
            warehouse: input.inventory.warehouse,
          }
        });
      }

      return newProduct;
    });

    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Find product by ID
 */
export async function findProductById(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        inventory: true,
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        variants: true,
      }
    });

    return product;
  } catch (error) {
    console.error('Error finding product:', error);
    throw error;
  }
}

/**
 * Find products with filters and pagination
 */
export async function findProducts(options: {
  page?: number;
  limit?: number;
  filters?: any;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    const {
      page = 1,
      limit = 20,
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const where: any = {
      isActive: true,
    };

    // Apply filters
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.brand) {
      where.brand = {
        contains: filters.brand,
        mode: 'insensitive'
      };
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) {
        where.price.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice) {
        where.price.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    if (filters.status) {
      where.status = filters.status;
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

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { shortDescription: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }

    // Execute query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          images: {
            where: { isMain: true },
            take: 1,
          },
          inventory: true,
          _count: {
            select: {
              reviews: true,
            }
          }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error finding products:', error);
    throw error;
  }
}

/**
 * Update product
 */
export async function updateProduct(id: string, input: UpdateProductInput) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.name ? generateSlug(input.name) : undefined,
        description: input.description,
        shortDescription: input.shortDescription,
        barcode: input.barcode,
        brand: input.brand,
        model: input.model,
        weight: input.weight ? new Prisma.Decimal(input.weight) : undefined,
        dimensions: input.dimensions,
        price: input.price ? new Prisma.Decimal(input.price) : undefined,
        comparePrice: input.comparePrice ? new Prisma.Decimal(input.comparePrice) : undefined,
        costPrice: input.costPrice ? new Prisma.Decimal(input.costPrice) : undefined,
        currency: input.currency,
        categoryId: input.categoryId,
        status: input.status,
        isFeatured: input.isFeatured,
        isBestSeller: input.isBestSeller,
        isNewArrival: input.isNewArrival,
        isOnSale: input.isOnSale,
        salePercentage: input.salePercentage,
        saleStartDate: input.saleStartDate,
        saleEndDate: input.saleEndDate,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        metaKeywords: input.metaKeywords,
        tags: input.tags,
        attributes: input.attributes,
        specifications: input.specifications,
        warranty: input.warranty,
        returnPolicy: input.returnPolicy,
        shippingInfo: input.shippingInfo,
      },
      include: {
        category: true,
        vendor: true,
        images: true,
        inventory: true,
      }
    });

    return product;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete product
 */
export async function deleteProduct(id: string) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isActive: false,
      }
    });

    return product;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Get product categories
 */
export async function getProductCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                status: 'ACTIVE'
              }
            }
          }
        },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}

/**
 * Get product brands
 */
export async function getProductBrands(categoryId?: string) {
  try {
    const where: any = {
      isActive: true,
      brand: { not: null }
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const brands = await prisma.product.findMany({
      where,
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' }
    });

    return brands.map(p => p.brand).filter(Boolean);
  } catch (error) {
    console.error('Error getting brands:', error);
    throw error;
  }
}

/**
 * Get product statistics
 */
export async function getProductStatistics(vendorId?: string) {
  try {
    const where: any = { isActive: true };
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [
      totalProducts,
      activeProducts,
      draftProducts,
      inactiveProducts,
      featuredProducts,
    ] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.product.count({ where: { ...where, status: 'DRAFT' } }),
      prisma.product.count({ where: { ...where, status: 'INACTIVE' } }),
      prisma.product.count({ where: { ...where, isFeatured: true } }),
    ]);

    return {
      totalProducts,
      activeProducts,
      draftProducts,
      inactiveProducts,
      featuredProducts,
    };
  } catch (error) {
    console.error('Error getting statistics:', error);
    throw error;
  }
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}