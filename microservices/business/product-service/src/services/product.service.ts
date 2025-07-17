import { PrismaClient, Product, Category, ProductStatus, ProductType } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '@ultramarket/shared/logging/logger';
import { NotFoundError, ValidationError } from '@ultramarket/shared/errors';
import slugify from 'slugify';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus;
  type?: ProductType;
  isActive?: boolean;
  isFeatured?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
}

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
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
  currency: string;
  status: ProductStatus;
  type: ProductType;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  salePercentage?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  tags: string[];
  attributes?: any;
  specifications?: any;
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedProductResponse {
  products: ProductResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ProductService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async getProducts(filters: ProductFilters): Promise<PaginatedProductResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        brand,
        minPrice,
        maxPrice,
        status,
        type,
        isActive = true,
        isFeatured,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        tags
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { isActive };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (category) {
        where.categoryId = category;
      }

      if (brand) {
        where.brand = brand;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) {
          where.price.gte = minPrice;
        }
        if (maxPrice !== undefined) {
          where.price.lte = maxPrice;
        }
      }

      if (status) {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      if (isFeatured !== undefined) {
        where.isFeatured = isFeatured;
      }

      if (tags && tags.length > 0) {
        where.tags = {
          hasSome: tags,
        };
      }

      // Build order clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Execute queries
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
        this.prisma.product.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        products: products.map(this.formatProduct),
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      logger.error('Error fetching products', { error, filters });
      throw error;
    }
  }

  async getProductById(id: string): Promise<ProductResponse> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return this.formatProduct(product);
    } catch (error) {
      logger.error('Error fetching product by ID', { error, id });
      throw error;
    }
  }

  async getProductBySlug(slug: string): Promise<ProductResponse> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { slug },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return this.formatProduct(product);
    } catch (error) {
      logger.error('Error fetching product by slug', { error, slug });
      throw error;
    }
  }

  async createProduct(data: any): Promise<ProductResponse> {
    try {
      // Generate slug
      const slug = slugify(data.name, { lower: true, strict: true });

      // Check if slug already exists
      const existingProduct = await this.prisma.product.findUnique({
        where: { slug },
      });

      const finalSlug = existingProduct ? `${slug}-${Date.now()}` : slug;

      // Verify category exists
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new ValidationError('Category not found');
      }

      const product = await this.prisma.product.create({
        data: {
          ...data,
          slug: finalSlug,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      logger.info('Product created successfully', { productId: product.id });
      return this.formatProduct(product);
    } catch (error) {
      logger.error('Error creating product', { error, data });
      throw error;
    }
  }

  async updateProduct(id: string, data: any): Promise<ProductResponse> {
    try {
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new NotFoundError('Product not found');
      }

      // If name is being updated, update slug as well
      if (data.name && data.name !== existingProduct.name) {
        const slug = slugify(data.name, { lower: true, strict: true });
        const existingSlug = await this.prisma.product.findUnique({
          where: { slug },
        });

        if (existingSlug && existingSlug.id !== id) {
          data.slug = `${slug}-${Date.now()}`;
        } else {
          data.slug = slug;
        }
      }

      // If category is being updated, verify it exists
      if (data.categoryId && data.categoryId !== existingProduct.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: data.categoryId },
        });

        if (!category) {
          throw new ValidationError('Category not found');
        }
      }

      const product = await this.prisma.product.update({
        where: { id },
        data,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      logger.info('Product updated successfully', { productId: id });
      return this.formatProduct(product);
    } catch (error) {
      logger.error('Error updating product', { error, id, data });
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Soft delete - mark as inactive
      await this.prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          status: ProductStatus.ARCHIVED,
        },
      });

      logger.info('Product deleted successfully', { productId: id });
    } catch (error) {
      logger.error('Error deleting product', { error, id });
      throw error;
    }
  }

  private formatProduct(product: any): ProductResponse {
    return {
      ...product,
      price: parseFloat(product.price.toString()),
      comparePrice: product.comparePrice ? parseFloat(product.comparePrice.toString()) : null,
      costPrice: product.costPrice ? parseFloat(product.costPrice.toString()) : null,
      weight: product.weight ? parseFloat(product.weight.toString()) : null,
    };
  }
}

export const productService = new ProductService();