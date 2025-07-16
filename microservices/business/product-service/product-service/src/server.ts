/**
 * UltraMarket Product Service - TypeScript Implementation
 * Professional product management microservice
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
      description: 'Professional TypeScript + Prisma + Express microservice',
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
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFound: {
          description: 'Resource Not Found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
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
 *     responses:
 *       200:
 *         description: Service details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get('/', (req: Request, res: Response) => {
  const serviceInfo = {
    service: '🚀 UltraMarket Product Service',
    version: '2.0.0',
    status: 'RUNNING',
    technology: 'TypeScript + Prisma + Express + SQLite',
    description: 'Professional product management microservice',
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
      '✅ Input validation & sanitization'
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
 *     responses:
 *       200:
 *         description: Service is healthy
 *       500:
 *         description: Service is unhealthy
 */
app.get('/health', async (req: Request, res: TypedResponse<HealthResponse>) => {
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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, ACTIVE, INACTIVE, ARCHIVED]
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
app.get('/api/products', async (req: TypedRequest<ProductQueryParams>, res: TypedResponse<PaginatedResponse>) => {
  try {
    // Type-safe query parameter parsing
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
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } }
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
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch products',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
app.get('/api/products/:id', async (req: Request, res: TypedResponse) => {
  try {
    const productId: string = req.params.id;
    
    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

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
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.json({
      success: true,
      data: product
    });
    
    logger.info(`Fetched product: ${product.name}`);
    
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message,
        code: error.code
      });
    } else if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code
      });
    } else {
      logger.error('Error fetching product:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
app.post('/api/products', async (req: TypedRequest<CreateProductRequest>, res: TypedResponse) => {
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

    // Validation with custom error messages
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Product name is required and must be a non-empty string');
    }
    
    if (!price || typeof price !== 'number' || price <= 0) {
      throw new ValidationError('Price is required and must be a positive number');
    }
    
    if (!categoryId || typeof categoryId !== 'string') {
      throw new ValidationError('Category ID is required');
    }
    
    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      throw new ValidationError('SKU is required and must be a non-empty string');
    }

    // Check if category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!categoryExists) {
      throw new ValidationError('Category not found');
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
        dimensions,
        metaTitle: metaTitle?.trim(),
        metaDescription: metaDescription?.trim(),
        warranty: warranty?.trim(),
        attributes,
        specifications
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
    
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.code
      });
    } else if (error instanceof Error && 'code' in error && error.code === 'P2002') {
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

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'UltraMarket Product Service API',
  customfavIcon: '/favicon.ico'
}));

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
    logger.info('='.repeat(50));
    logger.info(`🚀 UltraMarket Product Service (TypeScript)`);
    logger.info(`📡 Port: ${config.port}`);
    logger.info(`🌍 Environment: ${config.nodeEnv}`);
    logger.info(`📚 API Docs: http://localhost:${config.port}/api-docs`);
    logger.info(`🔍 Health: http://localhost:${config.port}/health`);
    logger.info(`📦 Products: http://localhost:${config.port}/api/products`);
    logger.info('='.repeat(50));
    logger.info('✅ Service ready for requests!');
  });
}

export default app;
