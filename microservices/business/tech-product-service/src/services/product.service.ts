import { PrismaClient, Product, ProductStatus, Prisma } from '@prisma/client';
import { getPrismaClient } from '../config/database';
import { logger } from '../utils/logger';

export interface CreateProductData {
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  price: number;
  salePrice?: number;
  currency?: string;
  stock: number;
  minStock?: number;
  categoryId: string;
  brandId: string;
  specifications?: { name: string; value: string; unit?: string; group?: string }[];
  images?: { url: string; altText?: string; isPrimary?: boolean }[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string;
}

export interface ProductFilters {
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  status?: ProductStatus;
  featured?: boolean;
  search?: string;
}

export interface ProductQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  include?: {
    category?: boolean;
    brand?: boolean;
    images?: boolean;
    specifications?: boolean;
    reviews?: boolean;
  };
}

export class ProductService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      // Generate slug if not provided
      const slug = data.slug || this.generateSlug(data.name);

      // Check if slug already exists
      const existingProduct = await this.prisma.product.findUnique({
        where: { slug },
      });

      if (existingProduct) {
        throw new Error(`Product with slug "${slug}" already exists`);
      }

      // Check if SKU already exists
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: data.sku },
      });

      if (existingSku) {
        throw new Error(`Product with SKU "${data.sku}" already exists`);
      }

      const product = await this.prisma.product.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          shortDescription: data.shortDescription,
          sku: data.sku,
          price: new Prisma.Decimal(data.price),
          salePrice: data.salePrice ? new Prisma.Decimal(data.salePrice) : null,
          currency: data.currency || 'UZS',
          stock: data.stock,
          minStock: data.minStock || 0,
          categoryId: data.categoryId,
          brandId: data.brandId,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          metaKeywords: data.metaKeywords,
          images: data.images ? {
            create: data.images.map((img, index) => ({
              url: img.url,
              altText: img.altText,
              isPrimary: img.isPrimary || index === 0,
              order: index,
            })),
          } : undefined,
          specifications: data.specifications ? {
            create: data.specifications.map((spec, index) => ({
              name: spec.name,
              value: spec.value,
              unit: spec.unit,
              group: spec.group,
              order: index,
            })),
          } : undefined,
        },
        include: {
          category: true,
          brand: true,
          images: true,
          specifications: true,
        },
      });

      logger.info('Product created successfully', { productId: product.id, sku: product.sku });
      return product;
    } catch (error) {
      logger.error('Failed to create product', error);
      throw error;
    }
  }

  async getProducts(filters: ProductFilters = {}, options: ProductQueryOptions = {}): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        include = {},
      } = options;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.ProductWhereInput = {
        deletedAt: null,
      };

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.brandId) {
        where.brandId = filters.brandId;
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

      if (filters.inStock) {
        where.stock = { gt: 0 };
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.featured !== undefined) {
        where.featured = filters.featured;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Execute queries
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            category: include.category,
            brand: include.brand,
            images: include.images,
            specifications: include.specifications,
            reviews: include.reviews,
          },
        }),
        this.prisma.product.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        products,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to get products', error);
      throw error;
    }
  }

  async getProductById(id: string, include: ProductQueryOptions['include'] = {}): Promise<Product | null> {
    try {
      const product = await this.prisma.product.findFirst({
        where: { 
          id,
          deletedAt: null,
        },
        include: {
          category: include.category,
          brand: include.brand,
          images: include.images,
          specifications: include.specifications,
          reviews: include.reviews,
        },
      });

      if (product) {
        // Increment view count
        await this.prisma.product.update({
          where: { id },
          data: { views: { increment: 1 } },
        });
      }

      return product;
    } catch (error) {
      logger.error('Failed to get product by ID', error);
      throw error;
    }
  }

  async getProductBySlug(slug: string, include: ProductQueryOptions['include'] = {}): Promise<Product | null> {
    try {
      const product = await this.prisma.product.findFirst({
        where: { 
          slug,
          deletedAt: null,
        },
        include: {
          category: include.category,
          brand: include.brand,
          images: include.images,
          specifications: include.specifications,
          reviews: include.reviews,
        },
      });

      if (product) {
        // Increment view count
        await this.prisma.product.update({
          where: { id: product.id },
          data: { views: { increment: 1 } },
        });
      }

      return product;
    } catch (error) {
      logger.error('Failed to get product by slug', error);
      throw error;
    }
  }

  async updateProduct(data: UpdateProductData): Promise<Product> {
    try {
      const { id, ...updateData } = data;

      // Check if product exists
      const existingProduct = await this.prisma.product.findFirst({
        where: { id, deletedAt: null },
      });

      if (!existingProduct) {
        throw new Error(`Product with ID "${id}" not found`);
      }

      // Check slug uniqueness if updating
      if (updateData.slug && updateData.slug !== existingProduct.slug) {
        const slugExists = await this.prisma.product.findUnique({
          where: { slug: updateData.slug },
        });

        if (slugExists) {
          throw new Error(`Product with slug "${updateData.slug}" already exists`);
        }
      }

      // Check SKU uniqueness if updating
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuExists = await this.prisma.product.findUnique({
          where: { sku: updateData.sku },
        });

        if (skuExists) {
          throw new Error(`Product with SKU "${updateData.sku}" already exists`);
        }
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: {
          name: updateData.name,
          slug: updateData.slug,
          description: updateData.description,
          shortDescription: updateData.shortDescription,
          sku: updateData.sku,
          price: updateData.price ? new Prisma.Decimal(updateData.price) : undefined,
          salePrice: updateData.salePrice ? new Prisma.Decimal(updateData.salePrice) : undefined,
          currency: updateData.currency,
          stock: updateData.stock,
          minStock: updateData.minStock,
          categoryId: updateData.categoryId,
          brandId: updateData.brandId,
          metaTitle: updateData.metaTitle,
          metaDescription: updateData.metaDescription,
          metaKeywords: updateData.metaKeywords,
        },
        include: {
          category: true,
          brand: true,
          images: true,
          specifications: true,
        },
      });

      logger.info('Product updated successfully', { productId: product.id });
      return product;
    } catch (error) {
      logger.error('Failed to update product', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      const existingProduct = await this.prisma.product.findFirst({
        where: { id, deletedAt: null },
      });

      if (!existingProduct) {
        throw new Error(`Product with ID "${id}" not found`);
      }

      // Soft delete
      await this.prisma.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      logger.info('Product deleted successfully', { productId: id });
    } catch (error) {
      logger.error('Failed to delete product', error);
      throw error;
    }
  }

  async updateStock(id: string, quantity: number): Promise<Product> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: { stock: quantity },
      });

      logger.info('Product stock updated', { productId: id, newStock: quantity });
      return product;
    } catch (error) {
      logger.error('Failed to update product stock', error);
      throw error;
    }
  }

  async getFeaturedProducts(limit: number = 10, categoryId?: string): Promise<Product[]> {
    try {
      const whereConditions: any = {
        featured: true,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      };

      if (categoryId) {
        whereConditions.categoryId = categoryId;
      }

      return await this.prisma.product.findMany({
        where: whereConditions,
        take: limit,
        include: {
          category: true,
          brand: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get featured products', error);
      throw error;
    }
  }

  async getTopRatedProducts(limit: number = 10, categoryId?: string): Promise<Product[]> {
    try {
      const whereConditions: any = {
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        rating: { not: null },
      };

      if (categoryId) {
        whereConditions.categoryId = categoryId;
      }

      return await this.prisma.product.findMany({
        where: whereConditions,
        take: limit,
        include: {
          category: true,
          brand: true,
          images: true,
        },
        orderBy: [
          { rating: 'desc' },
          { reviewCount: 'desc' },
        ],
      });
    } catch (error) {
      logger.error('Failed to get top rated products', error);
      throw error;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async getFilteredProducts(filters: ProductFilters & { 
    condition?: string;
    specifications?: Record<string, any>;
  }, options: ProductQueryOptions = {}): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    availableFilters: any;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions: any = {
        status: 'ACTIVE',
      };

      if (filters.categoryId) whereConditions.categoryId = filters.categoryId;
      if (filters.brandId) whereConditions.brandId = filters.brandId;
      if (filters.minPrice) whereConditions.price = { ...whereConditions.price, gte: filters.minPrice };
      if (filters.maxPrice) whereConditions.price = { ...whereConditions.price, lte: filters.maxPrice };
      if (filters.inStock) whereConditions.stock = { gt: 0 };
      if (filters.condition) whereConditions.condition = filters.condition;

      // Add specification filters
      if (filters.specifications && Object.keys(filters.specifications).length > 0) {
        whereConditions.specifications = {
          some: {
            OR: Object.entries(filters.specifications).map(([name, value]) => ({
              name,
              value: Array.isArray(value) ? { in: value } : value
            }))
          }
        };
      }

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where: whereConditions,
          include: {
            category: true,
            brand: true,
            images: true,
            specifications: true,
          },
          orderBy: { [options.sortBy || 'createdAt']: options.sortOrder || 'desc' },
          skip: offset,
          take: limit,
        }),
        this.prisma.product.count({ where: whereConditions })
      ]);

      // Get available filters for faceted search
      const availableFilters = await this.getAvailableFilters(whereConditions);

      return {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        availableFilters,
      };
    } catch (error) {
      logger.error('Failed to get filtered products', error);
      throw error;
    }
  }



  async compareProducts(productIds: string[]): Promise<{
    products: any[];
    comparison: {
      specifications: Record<string, Record<string, any>>;
      prices: Record<string, number>;
      ratings: Record<string, number>;
    };
  }> {
    try {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          category: true,
          brand: true,
          specifications: true,
          reviews: { select: { rating: true } }
        }
      });

      // Build comparison data
      const specifications: Record<string, Record<string, any>> = {};
      const prices: Record<string, number> = {};
      const ratings: Record<string, number> = {};

      products.forEach(product => {
        prices[product.id] = product.price;
        
        const avgRating = product.reviews.length > 0 
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length 
          : 0;
        ratings[product.id] = avgRating;

        product.specifications.forEach(spec => {
          if (!specifications[spec.name]) {
            specifications[spec.name] = {};
          }
          specifications[spec.name][product.id] = {
            value: spec.value,
            unit: spec.unit
          };
        });
      });

      return {
        products,
        comparison: {
          specifications,
          prices,
          ratings,
        }
      };
    } catch (error) {
      logger.error('Failed to compare products', error);
      throw error;
    }
  }

  async getRelatedProducts(productId: string, limit: number = 6, type: string = 'similar'): Promise<Product[]> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { category: true }
      });

      if (!product) return [];

      let whereConditions: any = {
        status: 'ACTIVE',
        id: { not: productId }
      };

      switch (type) {
        case 'similar':
          whereConditions.categoryId = product.categoryId;
          break;
        case 'brand':
          whereConditions.brandId = product.brandId;
          break;
        case 'price_range':
          const priceRange = product.price * 0.3; // 30% price range
          whereConditions.price = {
            gte: product.price - priceRange,
            lte: product.price + priceRange
          };
          break;
        default:
          whereConditions.categoryId = product.categoryId;
      }

      return await this.prisma.product.findMany({
        where: whereConditions,
        include: {
          category: true,
          brand: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to get related products', error);
      throw error;
    }
  }

  async getProductAnalytics(productId: string, period: string = '30d'): Promise<{
    views: number;
    sales: number;
    revenue: number;
    conversionRate: number;
    topSearchTerms: string[];
    performanceScore: number;
  }> {
    try {
      // This would typically query analytics tables
      // For now, return mock analytics data
      return {
        views: Math.floor(Math.random() * 10000),
        sales: Math.floor(Math.random() * 100),
        revenue: Math.floor(Math.random() * 1000000),
        conversionRate: Math.random() * 10,
        topSearchTerms: ['gaming', 'processor', 'intel', 'performance'],
        performanceScore: Math.floor(Math.random() * 100),
      };
    } catch (error) {
      logger.error('Failed to get product analytics', error);
      throw error;
    }
  }

  private async getAvailableFilters(baseWhereConditions: any): Promise<any> {
    try {
      const [brands, categories, priceRange] = await Promise.all([
        this.prisma.product.groupBy({
          by: ['brandId'],
          where: baseWhereConditions,
          _count: true,
        }).then(async (groups) => {
          const brandIds = groups.map(g => g.brandId).filter(Boolean);
          const brands = await this.prisma.brand.findMany({
            where: { id: { in: brandIds } },
            select: { id: true, name: true }
          });
          return groups.map(group => ({
            id: group.brandId,
            name: brands.find(b => b.id === group.brandId)?.name || 'Unknown',
            count: group._count
          }));
        }),
        
        this.prisma.product.groupBy({
          by: ['categoryId'],
          where: baseWhereConditions,
          _count: true,
        }).then(async (groups) => {
          const categoryIds = groups.map(g => g.categoryId).filter(Boolean);
          const categories = await this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true }
          });
          return groups.map(group => ({
            id: group.categoryId,
            name: categories.find(c => c.id === group.categoryId)?.name || 'Unknown',
            count: group._count
          }));
        }),

        this.prisma.product.aggregate({
          where: baseWhereConditions,
          _min: { price: true },
          _max: { price: true },
        })
      ]);

      return {
        brands,
        categories,
        priceRange: {
          min: priceRange._min.price || 0,
          max: priceRange._max.price || 0,
        }
      };
    } catch (error) {
      logger.error('Failed to get available filters', error);
      return { brands: [], categories: [], priceRange: { min: 0, max: 0 } };
    }
  }
}