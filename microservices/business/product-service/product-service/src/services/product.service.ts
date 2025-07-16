import {
  Product,
  Prisma,
  ProductStatus as PrismaProductStatus,
  ProductType as PrismaProductType,
} from '@prisma/client';
import { ProductRepository } from '../repositories/product-repository';
import { CategoryRepository } from '../repositories/category-repository';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryParams,
  PaginatedResponse,
  ProductResponse,
  ProductStatus,
  ProductType,
} from '../models/product.model';
import { logger, AppError } from '../shared';
import db from '../lib/database';
import slugify from 'slugify';

// Map model enums to Prisma enums
const mapProductStatusToPrisma = (status?: ProductStatus): PrismaProductStatus | undefined => {
  if (!status) return undefined;

  switch (status) {
    case ProductStatus.DRAFT:
      return PrismaProductStatus.DRAFT;
    case ProductStatus.ACTIVE:
      return PrismaProductStatus.ACTIVE;
    case ProductStatus.ARCHIVED:
      return PrismaProductStatus.ARCHIVED;
    case ProductStatus.OUTOFSTOCK:
      return PrismaProductStatus.INACTIVE; // Map to closest Prisma equivalent
    case ProductStatus.COMINGSOON:
      return PrismaProductStatus.DRAFT; // Map to closest Prisma equivalent
    default:
      return undefined;
  }
};

const mapProductTypeToPrisma = (type?: ProductType): PrismaProductType | undefined => {
  if (!type) return undefined;

  switch (type) {
    case ProductType.PHYSICAL:
      return PrismaProductType.PHYSICAL;
    case ProductType.DIGITAL:
      return PrismaProductType.DIGITAL;
    case ProductType.SERVICE:
      return PrismaProductType.SERVICE;
    case ProductType.SUBSCRIPTION:
      return PrismaProductType.SERVICE; // Map to closest Prisma equivalent
    default:
      return undefined;
  }
};

export class ProductService {
  private productRepository: ProductRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.productRepository = new ProductRepository();
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * Get products with pagination and filtering
   */
  async getProducts(queryParams: ProductQueryParams): Promise<PaginatedResponse<ProductResponse>> {
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
        tags,
      } = queryParams;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.ProductWhereInput = { isActive };

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
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
        const prismaStatus = mapProductStatusToPrisma(status);
        if (prismaStatus) {
          where.status = prismaStatus;
        }
      }

      if (type) {
        const prismaType = mapProductTypeToPrisma(type);
        if (prismaType) {
          where.type = prismaType;
        }
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
      const orderBy: Prisma.ProductOrderByWithRelationInput = {};
      orderBy[sortBy] = sortOrder;

      // Query products with pagination
      const [products, total] = await Promise.all([
        this.productRepository.findMany({
          skip,
          take: limit,
          where,
          orderBy,
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
        this.productRepository.count({ where }),
      ]);

      // Transform products to responses
      const productResponses = products.map((product) => this.mapProductToResponse(product));

      return {
        items: productResponses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in getProducts service', { error, queryParams });
      throw error;
    }
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: string): Promise<ProductResponse> {
    try {
      const product = await this.productRepository.findUnique({
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
        throw new AppError(404, 'Product not found');
      }

      return this.mapProductToResponse(product);
    } catch (error) {
      logger.error('Error in getProductById service', { error, id });
      throw error;
    }
  }

  /**
   * Get a single product by slug
   */
  async getProductBySlug(slug: string): Promise<ProductResponse> {
    try {
      const product = await this.productRepository.findUnique({
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
        throw new AppError(404, 'Product not found');
      }

      return this.mapProductToResponse(product);
    } catch (error) {
      logger.error('Error in getProductBySlug service', { error, slug });
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductDto, userId: string): Promise<ProductResponse> {
    try {
      // Generate slug from name
      const slug = slugify(data.name, { lower: true, strict: true });

      // Check if slug already exists
      const existingProduct = await this.productRepository.findUnique({
        where: { slug },
      });

      if (existingProduct) {
        throw new AppError(400, 'Product with this name already exists');
      }

      // Check if SKU already exists
      const existingSku = await this.productRepository.findUnique({
        where: { sku: data.sku },
      });

      if (existingSku) {
        throw new AppError(400, 'Product with this SKU already exists');
      }

      // Create product data
      const productData: Prisma.ProductCreateInput = {
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        sku: data.sku,
        barcode: data.barcode,
        brand: data.brand,
        model: data.model,
        weight: data.weight,
        dimensions: data.dimensions,
        price: data.price,
        comparePrice: data.comparePrice,
        costPrice: data.costPrice,
        currency: data.currency || 'USD',
        status: data.status ? mapProductStatusToPrisma(data.status) : PrismaProductStatus.DRAFT,
        type: data.type ? mapProductTypeToPrisma(data.type) : PrismaProductType.PHYSICAL,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isFeatured: data.isFeatured || false,
        tags: data.tags || [],
        attributes: data.attributes,
        specifications: data.specifications,
        warranty: data.warranty,
        returnPolicy: data.returnPolicy,
        shippingInfo: data.shippingInfo,
        category: {
          connect: { id: data.categoryId },
        },
        vendor: userId ? {
          connect: { id: userId },
        } : undefined,
      };

      const product = await this.productRepository.create({
        data: productData,
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

      logger.info('Product created successfully', { productId: product.id, userId });
      return this.mapProductToResponse(product);
    } catch (error) {
      logger.error('Error in createProduct service', { error, data, userId });
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    id: string,
    data: UpdateProductDto,
    userId: string
  ): Promise<ProductResponse> {
    try {
      // Check if product exists
      const existingProduct = await this.productRepository.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new AppError(404, 'Product not found');
      }

      // Generate new slug if name is being updated
      let slug = existingProduct.slug;
      if (data.name && data.name !== existingProduct.name) {
        slug = slugify(data.name, { lower: true, strict: true });

        // Check if new slug already exists
        const slugExists = await this.productRepository.findUnique({
          where: { slug },
        });

        if (slugExists && slugExists.id !== id) {
          throw new AppError(400, 'Product with this name already exists');
        }
      }

      // Check if SKU is being updated and already exists
      if (data.sku && data.sku !== existingProduct.sku) {
        const skuExists = await this.productRepository.findUnique({
          where: { sku: data.sku },
        });

        if (skuExists) {
          throw new AppError(400, 'Product with this SKU already exists');
        }
      }

      // Prepare update data
      const updateData: Prisma.ProductUpdateInput = {
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        sku: data.sku,
        barcode: data.barcode,
        brand: data.brand,
        model: data.model,
        weight: data.weight,
        dimensions: data.dimensions,
        price: data.price,
        comparePrice: data.comparePrice,
        costPrice: data.costPrice,
        currency: data.currency,
        status: data.status ? mapProductStatusToPrisma(data.status) : undefined,
        type: data.type ? mapProductTypeToPrisma(data.type) : undefined,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        tags: data.tags,
        attributes: data.attributes,
        specifications: data.specifications,
        warranty: data.warranty,
        returnPolicy: data.returnPolicy,
        shippingInfo: data.shippingInfo,
      };

      // Update category if provided
      if (data.categoryId) {
        updateData.category = {
          connect: { id: data.categoryId },
        };
      }

      const updatedProduct = await this.productRepository.update({
        where: { id },
        data: updateData,
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

      logger.info('Product updated successfully', { productId: id, userId });
      return this.mapProductToResponse(updatedProduct);
    } catch (error) {
      logger.error('Error in updateProduct service', { error, id, data, userId });
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string, userId: string): Promise<void> {
    try {
      // Check if product exists
      const existingProduct = await this.productRepository.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new AppError(404, 'Product not found');
      }

      // Soft delete by setting isActive to false
      await this.productRepository.update({
        where: { id },
        data: { isActive: false },
      });

      logger.info('Product deleted successfully', { productId: id, userId });
    } catch (error) {
      logger.error('Error in deleteProduct service', { error, id, userId });
      throw error;
    }
  }

  /**
   * Map Prisma product to response format
   */
  private mapProductToResponse(product: any): ProductResponse {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      sku: product.sku,
      barcode: product.barcode,
      brand: product.brand,
      model: product.model,
      weight: product.weight ? Number(product.weight) : null,
      dimensions: product.dimensions,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      currency: product.currency,
      status: product.status,
      type: product.type,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      isBestSeller: product.isBestSeller,
      isNewArrival: product.isNewArrival,
      isOnSale: product.isOnSale,
      salePercentage: product.salePercentage,
      saleStartDate: product.saleStartDate,
      saleEndDate: product.saleEndDate,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      metaKeywords: product.metaKeywords,
      tags: product.tags,
      attributes: product.attributes,
      specifications: product.specifications,
      warranty: product.warranty,
      returnPolicy: product.returnPolicy,
      shippingInfo: product.shippingInfo,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      publishedAt: product.publishedAt,
      categoryId: product.categoryId,
      vendorId: product.vendorId,
      category: product.category,
    };
  }
}
