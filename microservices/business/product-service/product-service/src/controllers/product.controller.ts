import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';
import { AppError } from '@ultramarket/shared/errors';

const prisma = new PrismaClient();

export class ProductController {
  /**
   * Get all products with pagination and filtering
   */
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(400, 'Validation failed', 'VALIDATION_ERROR', errors.array());
      }

      const {
        page = 1,
        limit = 20,
        category,
        search,
        minPrice,
        maxPrice,
        status = 'active',
        sortBy = 'created_at',
        sortOrder = 'desc',
        vendor
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        is_active: true,
        status: status as string
      };

      if (category) {
        where.category_id = category as string;
      }

      if (vendor) {
        where.vendor_id = vendor as string;
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice as string);
        if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { sku: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Build order by
      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder as string;

      // Get products with category and vendor info
      const [products, total] = await Promise.all([
        prisma.products.findMany({
          where,
          include: {
            categories: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            users: {
              select: {
                id: true,
                email: true,
                username: true,
                first_name: true,
                last_name: true
              }
            }
          },
          orderBy,
          skip,
          take: limitNum
        }),
        prisma.products.count({ where })
      ]);

      const totalPages = Math.ceil(total / limitNum);

      logger.info('Products retrieved successfully', {
        count: products.length,
        total,
        page: pageNum,
        limit: limitNum
      });

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
          }
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
      const { id } = req.params;

      const product = await prisma.products.findFirst({
        where: {
          id,
          is_active: true
        },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true
            }
          },
          users: {
            select: {
              id: true,
              email: true,
              username: true,
              first_name: true,
              last_name: true
            }
          },
          product_variants: {
            where: { is_active: true },
            select: {
              id: true,
              sku: true,
              price: true,
              compare_price: true,
              stock_quantity: true,
              option_values: true
            }
          }
        }
      });

      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Increment view count
      await prisma.product_views.create({
        data: {
          product_id: id,
          user_id: (req as any).user?.id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        }
      });

      logger.info('Product retrieved successfully', { productId: id });

      res.json({
        success: true,
        data: { product }
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const userId = (req as any).user.id;
      const {
        name,
        description,
        short_description,
        category_id,
        price,
        compare_price,
        cost_price,
        currency = 'USD',
        weight,
        dimensions,
        status = 'draft',
        is_featured = false,
        is_digital = false,
        requires_shipping = true,
        stock_quantity = 0,
        track_inventory = true,
        allow_backorder = false,
        low_stock_threshold = 5,
        seo_title,
        seo_description,
        variants
      } = req.body;

      // Check if user is vendor or admin
      if (!['vendor', 'admin', 'super_admin'].includes((req as any).user.role)) {
        throw new ApiError(403, 'Only vendors can create products');
      }

      // Generate SKU if not provided
      const sku = req.body.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create product
      const product = await prisma.products.create({
        data: {
          name,
          slug: generateSlug(name),
          sku,
          description,
          short_description,
          category_id,
          vendor_id: userId,
          price: parseFloat(price),
          compare_price: compare_price ? parseFloat(compare_price) : null,
          cost_price: cost_price ? parseFloat(cost_price) : null,
          currency,
          weight: weight ? parseFloat(weight) : null,
          dimensions: dimensions ? JSON.stringify(dimensions) : null,
          status,
          is_featured,
          is_digital,
          requires_shipping,
          stock_quantity: parseInt(stock_quantity),
          track_inventory,
          allow_backorder,
          low_stock_threshold: parseInt(low_stock_threshold),
          seo_title,
          seo_description,
          published_at: status === 'active' ? new Date() : null
        },
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });

      // Create variants if provided
      if (variants && Array.isArray(variants)) {
        await Promise.all(
          variants.map((variant: any) =>
            prisma.product_variants.create({
              data: {
                product_id: product.id,
                sku: variant.sku,
                barcode: variant.barcode,
                price: parseFloat(variant.price),
                compare_price: variant.compare_price ? parseFloat(variant.compare_price) : null,
                cost_price: variant.cost_price ? parseFloat(variant.cost_price) : null,
                stock_quantity: parseInt(variant.stock_quantity || 0),
                weight: variant.weight ? parseFloat(variant.weight) : null,
                option_values: variant.option_values ? JSON.stringify(variant.option_values) : null
              }
            })
          )
        );
      }

      logger.info('Product created successfully', { 
        productId: product.id, 
        vendorId: userId 
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product }
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const { id } = req.params;
      const userId = (req as any).user.id;

      // Check if product exists and user has permission
      const existingProduct = await prisma.products.findUnique({
        where: { id },
        select: { vendor_id: true, status: true }
      });

      if (!existingProduct) {
        throw new ApiError(404, 'Product not found');
      }

      if (existingProduct.vendor_id !== userId && !['admin', 'super_admin'].includes((req as any).user.role)) {
        throw new ApiError(403, 'You can only update your own products');
      }

      const updateData: any = {};

      // Only update provided fields
      const allowedFields = [
        'name', 'description', 'short_description', 'category_id',
        'price', 'compare_price', 'cost_price', 'currency',
        'weight', 'dimensions', 'status', 'is_featured',
        'is_digital', 'requires_shipping', 'stock_quantity',
        'track_inventory', 'allow_backorder', 'low_stock_threshold',
        'seo_title', 'seo_description'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      // Handle special fields
      if (req.body.name) {
        updateData.slug = generateSlug(req.body.name);
      }

      if (req.body.dimensions) {
        updateData.dimensions = JSON.stringify(req.body.dimensions);
      }

      if (req.body.status === 'active' && existingProduct.status !== 'active') {
        updateData.published_at = new Date();
      }

      const product = await prisma.products.update({
        where: { id },
        data: updateData,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });

      logger.info('Product updated successfully', { productId: id });

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: { product }
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
      const { id } = req.params;
      const userId = (req as any).user.id;

      // Check if product exists and user has permission
      const product = await prisma.products.findUnique({
        where: { id },
        select: { vendor_id: true, name: true }
      });

      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      if (product.vendor_id !== userId && !['admin', 'super_admin'].includes((req as any).user.role)) {
        throw new ApiError(403, 'You can only delete your own products');
      }

      // Soft delete by setting is_active to false
      await prisma.products.update({
        where: { id },
        data: { is_active: false }
      });

      logger.info('Product deleted successfully', { 
        productId: id, 
        productName: product.name 
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
   * Get product categories
   */
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { parent_id, active = true } = req.query;

      const where: any = {};
      if (parent_id) {
        where.parent_id = parent_id as string;
      } else if (parent_id === null) {
        where.parent_id = null;
      }

      if (active === 'true') {
        where.is_active = true;
      }

      const categories = await prisma.categories.findMany({
        where,
        orderBy: [
          { sort_order: 'asc' },
          { name: 'asc' }
        ],
        include: {
          _count: {
            select: {
              products: true
            }
          }
        }
      });

      logger.info('Categories retrieved successfully', { count: categories.length });

      res.json({
        success: true,
        data: { categories }
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
      const { q, category, minPrice, maxPrice, limit = 10 } = req.query;

      if (!q) {
        throw new ApiError(400, 'Search query is required');
      }

      const where: any = {
        is_active: true,
        status: 'active',
        OR: [
          { name: { contains: q as string, mode: 'insensitive' } },
          { description: { contains: q as string, mode: 'insensitive' } },
          { sku: { contains: q as string, mode: 'insensitive' } }
        ]
      };

      if (category) {
        where.category_id = category as string;
      }

      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice as string);
        if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
      }

      const products = await prisma.products.findMany({
        where,
        include: {
          categories: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: [
          { is_featured: 'desc' },
          { created_at: 'desc' }
        ],
        take: parseInt(limit as string)
      });

      logger.info('Product search completed', { 
        query: q, 
        results: products.length 
      });

      res.json({
        success: true,
        data: {
          products,
          query: q,
          total: products.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

// Validation middleware
export const productValidation = [
  body('name').isLength({ min: 1, max: 500 }).withMessage('Product name is required and must be less than 500 characters'),
  body('category_id').isUUID().withMessage('Valid category ID is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'UZS']).withMessage('Valid currency is required'),
  body('status').optional().isIn(['draft', 'active', 'inactive']).withMessage('Valid status is required'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a non-negative number'),
  body('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer')
];

export const productUpdateValidation = [
  body('name').optional().isLength({ min: 1, max: 500 }).withMessage('Product name must be less than 500 characters'),
  body('category_id').optional().isUUID().withMessage('Valid category ID is required'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'UZS']).withMessage('Valid currency is required'),
  body('status').optional().isIn(['draft', 'active', 'inactive']).withMessage('Valid status is required'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a non-negative number'),
  body('low_stock_threshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer')
];

export const productQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be a non-negative number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be a non-negative number'),
  query('status').optional().isIn(['active', 'inactive', 'draft']).withMessage('Valid status is required'),
  query('sortBy').optional().isIn(['created_at', 'updated_at', 'name', 'price', 'stock_quantity']).withMessage('Valid sort field is required'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Valid sort order is required')
];

// Utility function to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}