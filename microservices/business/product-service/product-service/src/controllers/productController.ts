import { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { logger } from '@ultramarket/shared/logging/logger';
import { prisma } from '@ultramarket/shared/database';
import { 
  BadRequestError, 
  NotFoundError, 
  ValidationError,
  ForbiddenError 
} from '@ultramarket/shared/errors';
import { UserRole } from '@ultramarket/shared/types';

export class ProductController {
  // Get all products with pagination and filtering
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid query parameters', errors.array());
      }

      const {
        page = 1,
        limit = 20,
        category,
        brand,
        minPrice,
        maxPrice,
        inStock,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        isActive: true,
      };

      if (category) {
        where.categoryId = category;
      }

      if (brand) {
        where.brand = brand;
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice as string);
        if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
      }

      if (inStock === 'true') {
        where.stockQuantity = { gt: 0 };
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { brand: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Get products with count
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: true,
            images: true,
            specifications: true,
            reviews: {
              where: { isApproved: true },
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
          orderBy: { [sortBy as string]: sortOrder },
          skip,
          take: limitNum,
        }),
        prisma.product.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      logger.info('Products retrieved successfully', {
        count: products.length,
        total,
        page: pageNum,
        operation: 'get_products'
      });

      res.status(200).json({
        success: true,
        data: {
          products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1,
          },
        },
      });

    } catch (error) {
      next(error);
    }
  }

  // Get single product by ID
  static async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          images: true,
          specifications: true,
          reviews: {
            where: { isApproved: true },
            include: { 
              user: { 
                select: { 
                  firstName: true, 
                  lastName: true,
                  id: true 
                } 
              } 
            },
            orderBy: { createdAt: 'desc' },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              rating: true,
            }
          }
        },
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      if (!product.isActive) {
        throw new NotFoundError('Product is not available');
      }

      // Increment view count
      await prisma.product.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });

      logger.info('Product retrieved successfully', {
        productId: id,
        operation: 'get_product'
      });

      res.status(200).json({
        success: true,
        data: { product },
      });

    } catch (error) {
      next(error);
    }
  }

  // Create new product (Admin/Seller only)
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const {
        name,
        description,
        price,
        stockQuantity,
        categoryId,
        brand,
        sku,
        specifications,
        images,
        vendorId,
      } = req.body;

      // Check if user has permission
      if (!req.user || ![UserRole.ADMIN, UserRole.SELLER, UserRole.SUPER_ADMIN].includes(req.user.role as UserRole)) {
        throw new ForbiddenError('Insufficient permissions to create product');
      }

      // Validate category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new BadRequestError('Category not found');
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          name,
          description,
          price: parseFloat(price),
          stockQuantity: parseInt(stockQuantity),
          categoryId,
          brand,
          sku,
          vendorId: vendorId || req.user.id,
          specifications: specifications || {},
          images: images || [],
          isActive: true,
          createdBy: req.user.id,
        },
        include: {
          category: true,
          images: true,
          specifications: true,
        },
      });

      logger.info('Product created successfully', {
        productId: product.id,
        createdBy: req.user.id,
        operation: 'create_product'
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });

    } catch (error) {
      next(error);
    }
  }

  // Update product (Admin/Seller only)
  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      const { id } = req.params;
      const updateData = req.body;

      // Check if user has permission
      if (!req.user || ![UserRole.ADMIN, UserRole.SELLER, UserRole.SUPER_ADMIN].includes(req.user.role as UserRole)) {
        throw new ForbiddenError('Insufficient permissions to update product');
      }

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: { vendor: true },
      });

      if (!existingProduct) {
        throw new NotFoundError('Product not found');
      }

      // Check if user can update this product (vendor or admin)
      if (req.user.role !== UserRole.ADMIN && 
          req.user.role !== UserRole.SUPER_ADMIN && 
          existingProduct.vendorId !== req.user.id) {
        throw new ForbiddenError('You can only update your own products');
      }

      // Update product
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...updateData,
          price: updateData.price ? parseFloat(updateData.price) : undefined,
          stockQuantity: updateData.stockQuantity ? parseInt(updateData.stockQuantity) : undefined,
          updatedBy: req.user.id,
        },
        include: {
          category: true,
          images: true,
          specifications: true,
        },
      });

      logger.info('Product updated successfully', {
        productId: id,
        updatedBy: req.user.id,
        operation: 'update_product'
      });

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product: updatedProduct },
      });

    } catch (error) {
      next(error);
    }
  }

  // Delete product (Admin/Seller only)
  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if user has permission
      if (!req.user || ![UserRole.ADMIN, UserRole.SELLER, UserRole.SUPER_ADMIN].includes(req.user.role as UserRole)) {
        throw new ForbiddenError('Insufficient permissions to delete product');
      }

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: { vendor: true },
      });

      if (!existingProduct) {
        throw new NotFoundError('Product not found');
      }

      // Check if user can delete this product (vendor or admin)
      if (req.user.role !== UserRole.ADMIN && 
          req.user.role !== UserRole.SUPER_ADMIN && 
          existingProduct.vendorId !== req.user.id) {
        throw new ForbiddenError('You can only delete your own products');
      }

      // Soft delete product
      await prisma.product.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: req.user.id,
        },
      });

      logger.info('Product deleted successfully', {
        productId: id,
        deletedBy: req.user.id,
        operation: 'delete_product'
      });

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });

    } catch (error) {
      next(error);
    }
  }

  // Get product categories
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      logger.info('Categories retrieved successfully', {
        count: categories.length,
        operation: 'get_categories'
      });

      res.status(200).json({
        success: true,
        data: { categories },
      });

    } catch (error) {
      next(error);
    }
  }

  // Create category (Admin only)
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Invalid input data', errors.array());
      }

      // Check if user has permission
      if (!req.user || ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role as UserRole)) {
        throw new ForbiddenError('Insufficient permissions to create category');
      }

      const { name, description, parentId } = req.body;

      // Check if category already exists
      const existingCategory = await prisma.category.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });

      if (existingCategory) {
        throw new BadRequestError('Category with this name already exists');
      }

      // Create category
      const category = await prisma.category.create({
        data: {
          name,
          description,
          parentId,
          isActive: true,
          createdBy: req.user.id,
        },
      });

      logger.info('Category created successfully', {
        categoryId: category.id,
        createdBy: req.user.id,
        operation: 'create_category'
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category },
      });

    } catch (error) {
      next(error);
    }
  }

  // Search products
  static async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, category, brand, minPrice, maxPrice, sortBy = 'relevance' } = req.query;

      if (!q) {
        throw new BadRequestError('Search query is required');
      }

      // Build search query
      const where: any = {
        isActive: true,
        OR: [
          { name: { contains: q as string, mode: 'insensitive' } },
          { description: { contains: q as string, mode: 'insensitive' } },
          { brand: { contains: q as string, mode: 'insensitive' } },
          { sku: { contains: q as string, mode: 'insensitive' } },
        ],
      };

      if (category) where.categoryId = category;
      if (brand) where.brand = brand;
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice as string);
        if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
      }

      // Determine sort order
      let orderBy: any = {};
      switch (sortBy) {
        case 'price_asc':
          orderBy.price = 'asc';
          break;
        case 'price_desc':
          orderBy.price = 'desc';
          break;
        case 'name_asc':
          orderBy.name = 'asc';
          break;
        case 'name_desc':
          orderBy.name = 'desc';
          break;
        case 'created_desc':
          orderBy.createdAt = 'desc';
          break;
        default:
          // Default to relevance (view count)
          orderBy.viewCount = 'desc';
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true,
          specifications: true,
        },
        orderBy,
        take: 50, // Limit search results
      });

      logger.info('Product search completed', {
        query: q,
        results: products.length,
        operation: 'search_products'
      });

      res.status(200).json({
        success: true,
        data: {
          query: q,
          products,
          total: products.length,
        },
      });

    } catch (error) {
      next(error);
    }
  }

  // Get product recommendations
  static async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, categoryId, limit = 10 } = req.query;

      let where: any = {
        isActive: true,
      };

      if (productId) {
        // Get recommendations based on current product
        const currentProduct = await prisma.product.findUnique({
          where: { id: productId as string },
          select: { categoryId: true, brand: true },
        });

        if (currentProduct) {
          where.OR = [
            { categoryId: currentProduct.categoryId },
            { brand: currentProduct.brand },
          ];
          where.NOT = { id: productId };
        }
      } else if (categoryId) {
        where.categoryId = categoryId;
      }

      const recommendations = await prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true,
        },
        orderBy: [
          { viewCount: 'desc' },
          { rating: 'desc' },
          { createdAt: 'desc' },
        ],
        take: parseInt(limit as string),
      });

      logger.info('Product recommendations retrieved', {
        count: recommendations.length,
        operation: 'get_recommendations'
      });

      res.status(200).json({
        success: true,
        data: { recommendations },
      });

    } catch (error) {
      next(error);
    }
  }
}

// Validation middleware
export const getProductsValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sortBy').optional().isIn(['name', 'price', 'createdAt', 'rating', 'viewCount']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

export const createProductValidation = [
  body('name').notEmpty().trim().isLength({ min: 3, max: 200 }),
  body('description').notEmpty().trim().isLength({ min: 10, max: 2000 }),
  body('price').isFloat({ min: 0 }),
  body('stockQuantity').isInt({ min: 0 }),
  body('categoryId').notEmpty().isUUID(),
  body('brand').optional().trim(),
  body('sku').optional().trim(),
  body('specifications').optional().isObject(),
  body('images').optional().isArray(),
];

export const updateProductValidation = [
  body('name').optional().trim().isLength({ min: 3, max: 200 }),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('categoryId').optional().isUUID(),
  body('brand').optional().trim(),
  body('sku').optional().trim(),
  body('specifications').optional().isObject(),
  body('images').optional().isArray(),
];

export const createCategoryValidation = [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('parentId').optional().isUUID(),
];

export const searchProductsValidation = [
  query('q').notEmpty().trim().isLength({ min: 2 }),
  query('category').optional().isUUID(),
  query('brand').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sortBy').optional().isIn(['relevance', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'created_desc']),
];
