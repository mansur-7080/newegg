/**
 * UltraMarket Product Service - Complete TypeScript Implementation
 * Professional product management microservice with full functionality
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc, { Options } from 'swagger-jsdoc';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Import custom types
import {
  ProductQueryParams,
  CategoryQueryParams,
  SearchQueryParams,
  CreateProductRequest,
  CreateCategoryRequest,
  ApiResponse,
  PaginatedResponse,
  SearchResponse,
  StatsResponse,
  HealthResponse,
  TypedRequest,
  TypedResponse,
  ValidationError,
  NotFoundError,
  DatabaseError,
  ServiceConfig
} from './types/product.types';

// Import validation middleware
import {
  validateCreateProduct,
  validateCreateCategory,
  validateProductQuery,
  validateSearchQuery,
  validateUUID,
  validatePriceRange,
  sanitizeInput
} from './middleware/validation.middleware';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma: PrismaClient = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'colorless'
});

// Configuration with type safety
const config: ServiceConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
  redisUrl: process.env.REDIS_URL,
  apiVersion: process.env.API_VERSION || 'v1'
};

// Professional logger with types
interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

const logger: Logger = {
  info: (message: string, ...args: any[]) => 
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => 
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => 
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => 
    config.nodeEnv === 'development' && console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`, ...args)
};

// Initialize Express app with types
const app: Application = express();

// Swagger configuration with proper typing
const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UltraMarket Product Service API',
      version: '2.0.0',
      description: 'Complete TypeScript + Prisma + Express microservice',
      contact: {
        name: 'UltraMarket Team',
        email: 'api@ultramarket.uz'
      }
    },
    servers: [
      { 
        url: `http://localhost:${config.port}`,
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Product: {
          type: 'object',
          required: ['name', 'price', 'sku', 'categoryId'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 2000 },
            price: { type: 'number', minimum: 0 },
            brand: { type: 'string', maxLength: 100 },
            sku: { type: 'string', minLength: 1, maxLength: 50 },
            status: { 
              type: 'string', 
              enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'],
              default: 'DRAFT'
            },
            type: { 
              type: 'string', 
              enum: ['PHYSICAL', 'DIGITAL', 'SERVICE'],
              default: 'PHYSICAL'
            }
          }
        },
        Category: {
          type: 'object',
          required: ['name'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            isActive: { type: 'boolean', default: true }
          }
        }
      }
    }
  },
  apis: ['./src/server.ts']
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Rate limiting with proper configuration
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// CORS configuration with type safety
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter);
app.use(sanitizeInput);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Service information
 *     tags: [Service]
 */
app.get('/', (req: Request, res: Response) => {
  const serviceInfo = {
    service: '🚀 UltraMarket Product Service',
    version: '2.0.0',
    status: 'RUNNING',
    technology: 'TypeScript + Prisma + Express + SQLite',
    description: 'Complete TypeScript professional product management microservice',
    features: [
      '✅ TypeScript with strict type checking',
      '✅ Products CRUD with validation',
      '✅ Categories management',
      '✅ Advanced search & filtering',
      '✅ Professional error handling',
      '✅ API rate limiting',
      '✅ Security headers (Helmet)',
      '✅ Swagger OpenAPI documentation',
      '✅ Request/Response logging',
      '✅ Database ORM (Prisma)',
      '✅ Input validation & sanitization',
      '✅ Complete TypeScript migration'
    ],
    endpoints: {
      docs: '/api-docs',
      health: '/health',
      products: '/api/products',
      categories: '/api/categories',
      search: '/api/search',
      stats: '/api/stats'
    },
    database: 'SQLite',
    orm: 'Prisma',
    environment: config.nodeEnv
  };
  
  res.json(serviceInfo);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get service statistics
    const [productCount, categoryCount] = await Promise.all([
      prisma.product.count(),
      prisma.category.count()
    ]);
    
    const healthData: HealthResponse = {
      status: '✅ HEALTHY',
      service: 'product-service',
      database: '✅ CONNECTED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      stats: {
        products: productCount,
        categories: categoryCount
      }
    };
    
    res.json({
      success: true,
      data: healthData
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    
    const errorData: HealthResponse = {
      status: '❌ ERROR',
      service: 'product-service',
      database: '❌ DISCONNECTED',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json({
      success: false,
      data: errorData,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products with pagination and filtering
 *     tags: [Products]
 */
app.get('/api/products', validateProductQuery, async (req: Request, res: Response) => {
  try {
    // Type-safe query parameter parsing (already validated by middleware)
    const page: number = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit: number = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search: string | undefined = req.query.search as string;
    const categoryFilter: string | undefined = req.query.category as string;
    const statusFilter: string | undefined = req.query.status as string;
    const skip: number = (page - 1) * limit;

    // Build where clause with type safety
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { brand: { contains: search } }
      ];
    }
    
    if (categoryFilter) {
      where.categoryId = categoryFilter;
    }
    
    if (statusFilter && ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(statusFilter)) {
      where.status = statusFilter;
    }

    // Execute queries with proper error handling
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          },
          images: {
            select: { id: true, url: true, altText: true, isMain: true },
            where: { isMain: true },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    const totalPages: number = Math.ceil(total / limit);

    const response: PaginatedResponse = {
      success: true,
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      query: {
        search,
        category: categoryFilter,
        status: statusFilter
      }
    };

    res.json(response);
    
    logger.info(`Fetched ${products.length} products (page ${page}/${totalPages})`);
    
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 */
app.get('/api/products/:id', validateUUID('id'), async (req: Request, res: Response) => {
  try {
    const productId: string = req.params.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: product
    });
    
    logger.info(`Fetched product: ${product.name}`);
    
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 */
app.post('/api/products', validateCreateProduct, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      categoryId,
      brand,
      sku,
      status = 'DRAFT',
      type = 'PHYSICAL',
      weight,
      dimensions,
      shortDescription,
      metaTitle,
      metaDescription,
      warranty,
      attributes,
      specifications
    } = req.body;

    // Check if category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        error: 'Category not found',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    // Generate slug
    const slug: string = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim(),
        shortDescription: shortDescription?.trim(),
        price: Number(price),
        categoryId,
        brand: brand?.trim(),
        sku: sku.trim(),
        status,
        type,
        weight: weight ? Number(weight) : undefined,
        dimensions: dimensions ? JSON.stringify(dimensions) : null,
        metaTitle: metaTitle?.trim(),
        metaDescription: metaDescription?.trim(),
        warranty: warranty?.trim(),
        attributes: attributes ? JSON.stringify(attributes) : null,
        specifications: specifications ? JSON.stringify(specifications) : null
      },
      include: {
        category: true
      }
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
    
    logger.info(`Created product: ${product.name} (ID: ${product.id})`);
    
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({
        success: false,
        error: 'Product with this SKU or slug already exists',
        code: 'DUPLICATE_ENTRY'
      });
    } else {
      logger.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 */
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: {
          select: { id: true },
          where: { isActive: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const result = categories.map(cat => ({
      ...cat,
      productCount: cat.products.length,
      products: undefined // Remove products array, only keep count
    }));

    res.json({
      success: true,
      data: result
    });
    
    logger.info(`Fetched ${categories.length} categories`);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create new category
 *     tags: [Categories]
 */
app.post('/api/categories', validateCreateCategory, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    const slug: string = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim()
      }
    });

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
    
    logger.info(`Created category: ${category.name}`);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({
        success: false,
        error: 'Category with this name or slug already exists',
        code: 'DUPLICATE_ENTRY'
      });
    } else {
      logger.error('Error creating category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create category',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search products
 *     tags: [Search]
 */
app.get('/api/search', validateSearchQuery, async (req: Request, res: Response) => {
  try {
    const query: string = req.query.q as string;
    const limit: number = Math.min(parseInt(req.query.limit as string) || 20, 50);
    
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { brand: { contains: query } }
        ],
        isActive: true
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        query,
        results: products,
        count: products.length,
        message: `Found ${products.length} products`
      }
    });
    
    logger.info(`Search "${query}" returned ${products.length} results`);
  } catch (error) {
    logger.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: {
        query: req.query.q as string,
        results: [],
        count: 0
      }
    });
  }
});

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Get service statistics
 *     tags: [Statistics]
 */
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalProducts,
      activeProducts,
      totalCategories,
      recentProducts
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count(),
      prisma.product.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          active: activeProducts,
          recent: recentProducts
        },
        categories: totalCategories,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'UltraMarket Product Service API - TypeScript',
  customfavIcon: '/favicon.ico'
}));

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: {
      docs: '/api-docs',
      health: '/health',
      products: '/api/products',
      categories: '/api/categories',
      search: '/api/search',
      stats: '/api/stats'
    }
  });
});

// Global error handler with TypeScript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = config.nodeEnv === 'development' ? err.message : 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await prisma.$disconnect();
    logger.info('Database connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server only if not in test environment
if (config.nodeEnv !== 'test') {
  app.listen(config.port, () => {
    logger.info('='.repeat(60));
    logger.info(`🚀 UltraMarket Product Service (Complete TypeScript)`);
    logger.info(`📡 Port: ${config.port}`);
    logger.info(`🌍 Environment: ${config.nodeEnv}`);
    logger.info(`🔧 Technology: TypeScript + Prisma + Express`);
    logger.info(`📚 API Docs: http://localhost:${config.port}/api-docs`);
    logger.info(`🔍 Health: http://localhost:${config.port}/health`);
    logger.info(`📦 Products: http://localhost:${config.port}/api/products`);
    logger.info(`🏷️  Categories: http://localhost:${config.port}/api/categories`);
    logger.info(`🔎 Search: http://localhost:${config.port}/api/search`);
    logger.info(`📊 Stats: http://localhost:${config.port}/api/stats`);
    logger.info('='.repeat(60));
    logger.info('✅ Complete TypeScript service ready for requests!');
  });
}

export default app;
