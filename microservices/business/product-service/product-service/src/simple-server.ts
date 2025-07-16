/**
 * Simple but Complete Product Service
 * Haqiqiy to'liq product service - TypeScript + Prisma + Express
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { PrismaClient } from '@prisma/client';
import { logger } from './shared';

// Initialize express app and Prisma
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UltraMarket Product Service API',
      version: '1.0.0',
      description: 'Haqiqiy to\'liq product service - TypeScript + Prisma',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ['./src/simple-server.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

/**
 * @swagger
 * /:
 *   get:
 *     summary: Service ma'lumotlari
 *     responses:
 *       200:
 *         description: Service info
 */
app.get('/', (req, res) => {
  res.json({
    service: 'UltraMarket Product Service',
    version: '1.0.0',
    status: 'running',
    technology: 'TypeScript + Prisma + Express',
    features: [
      'Products CRUD',
      'Categories CRUD', 
      'Search',
      'Pagination',
      'Swagger docs',
      'Database: SQLite/Prisma'
    ],
    endpoints: {
      docs: '/api-docs',
      health: '/health',
      products: '/api/products',
      categories: '/api/categories'
    }
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 */
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'product-service',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'product-service',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 */
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search } },
        { description: { contains: search } },
        { brand: { contains: search } }
      ]
    } : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          images: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 */
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        images: true,
        variants: true,
        reviews: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create new product
 */
app.post('/api/products', async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      categoryId,
      brand,
      sku,
      status = 'DRAFT',
      type = 'PHYSICAL'
    } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: parseFloat(price),
        categoryId,
        brand,
        sku,
        status,
        type
      },
      include: {
        category: true
      }
    });

    res.status(201).json(product);
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 */
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const result = categories.map(cat => ({
      ...cat,
      productCount: cat.products.length,
      products: undefined
    }));

    res.json(result);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create new category
 */
app.post('/api/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description
      }
    });

    res.status(201).json(category);
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { brand: { contains: query } }
        ]
      },
      include: {
        category: true
      },
      take: 20
    });

    res.json({
      query,
      results: products,
      count: products.length
    });
  } catch (error) {
    logger.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 UltraMarket Product Service running on port ${PORT}`);
    logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
    logger.info(`🔍 Health: http://localhost:${PORT}/health`);
  });
}

export default app;