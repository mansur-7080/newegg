/**
 * UltraMarket Store Service
 * Professional store management service for multi-vendor platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { createClient } from 'redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import './types/express';

// Load environment variables
config();

const app = express();
const PORT = process.env.STORE_SERVICE_PORT || 3030;
const prisma = new PrismaClient();
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Redis connection
redis.connect().catch(console.error);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // requests per window
  message: 'Juda ko\'p so\'rov yuborildi, keyinroq urinib ko\'ring.',
});
app.use(limiter);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/stores/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari qabul qilinadi!'));
    }
  }
});

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token talab qilinadi' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Yaroqsiz token' });
  }
};

// Store interfaces
interface StoreData {
  name: string;
  description: string;
  ownerId: string;
  category: string;
  address: {
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  businessInfo: {
    registrationNumber: string;
    taxNumber: string;
    bankAccount: string;
    bankName: string;
  };
  settings: {
    isActive: boolean;
    allowReturns: boolean;
    returnPolicyDays: number;
    minOrderAmount: number;
    freeShippingThreshold: number;
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'store-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Store CRUD operations

// 1. Do'kon yaratish
app.post('/stores', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const storeData: StoreData = req.body;
    
    // Validation
    if (!storeData.name || !storeData.ownerId || !storeData.category) {
      return res.status(400).json({ 
        error: 'Do\'kon nomi, egasi va kategoriya majburiy' 
      });
    }

    // Check if user already has a store
    const existingStore = await prisma.store.findFirst({
      where: { ownerId: storeData.ownerId }
    });

    if (existingStore) {
      return res.status(409).json({ 
        error: 'Foydalanuvchi allaqachon do\'konga ega' 
      });
    }

    const store = await prisma.store.create({
      data: {
        name: storeData.name,
        slug: storeData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: storeData.description,
        ownerId: storeData.ownerId,
        category: storeData.category,
        logo: req.file?.filename,
        address: storeData.address,
        contact: storeData.contact,
        businessInfo: storeData.businessInfo,
        settings: storeData.settings,
        status: 'PENDING_APPROVAL',
        isActive: false,
        rating: 0,
        totalReviews: 0,
        totalSales: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Cache store data
    await redis.setEx(`store:${store.id}`, 3600, JSON.stringify(store));

    res.status(201).json({
      message: 'Do\'kon muvaffaqiyatli yaratildi',
      store
    });

  } catch (error) {
    console.error('Store creation error:', error);
    res.status(500).json({ error: 'Do\'kon yaratishda xatolik yuz berdi' });
  }
});

// 2. Do'konlarni olish (pagination bilan)
app.get('/stores', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const status = req.query.status as string || 'ACTIVE';
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    const skip = (page - 1) * limit;

    const where: any = {
      status,
      isActive: true
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              products: true,
              orders: true
            }
          }
        }
      }),
      prisma.store.count({ where })
    ]);

    res.json({
      stores,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        limit,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Stores fetch error:', error);
    res.status(500).json({ error: 'Do\'konlarni olishda xatolik' });
  }
});

// 3. Bitta do'konni olish
app.get('/stores/:id', async (req, res) => {
  try {
    const storeId = req.params.id;

    // Try cache first
    const cached = await redis.get(`store:${storeId}`);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        },
        products: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            category: true,
            images: true
          }
        },
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true
          }
        }
      }
    });

    if (!store) {
      return res.status(404).json({ error: 'Do\'kon topilmadi' });
    }

    // Cache for 1 hour
    await redis.setEx(`store:${storeId}`, 3600, JSON.stringify(store));

    res.json(store);

  } catch (error) {
    console.error('Store fetch error:', error);
    res.status(500).json({ error: 'Do\'konni olishda xatolik' });
  }
});

// 4. Do'konni yangilash
app.put('/stores/:id', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const storeId = req.params.id;
    const updateData = req.body;

    // Check ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      return res.status(404).json({ error: 'Do\'kon topilmadi' });
    }

    if (store.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Ruxsat berilmagan' });
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        ...updateData,
        logo: req.file?.filename || store.logo,
        updatedAt: new Date()
      }
    });

    // Update cache
    await redis.setEx(`store:${storeId}`, 3600, JSON.stringify(updatedStore));

    res.json({
      message: 'Do\'kon yangilandi',
      store: updatedStore
    });

  } catch (error) {
    console.error('Store update error:', error);
    res.status(500).json({ error: 'Do\'konni yangilashda xatolik' });
  }
});

// 5. Do'kon statistikasi
app.get('/stores/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const storeId = req.params.id;
    const dateFrom = req.query.from as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = req.query.to as string || new Date().toISOString();

    // Check ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      return res.status(404).json({ error: 'Do\'kon topilmadi' });
    }

    if (store.ownerId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Ruxsat berilmagan' });
    }

    const analytics = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as average_order_value,
        COUNT(DISTINCT o.user_id) as unique_customers,
        COUNT(DISTINCT p.id) as total_products
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE p.store_id = ${storeId}
      AND o.created_at >= ${dateFrom}
      AND o.created_at <= ${dateTo}
    `;

    res.json({
      analytics: analytics[0],
      period: { from: dateFrom, to: dateTo }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Analitika olishda xatolik' });
  }
});

// 6. Do'kon kategoriyalari
app.get('/store-categories', async (req, res) => {
  try {
    const categories = [
      { id: 'electronics', name: 'Elektronika', nameUz: 'Elektronika' },
      { id: 'clothing', name: 'Kiyim-kechak', nameUz: 'Kiyim-kechak' },
      { id: 'home-garden', name: 'Uy va bog\'', nameUz: 'Uy va bog\'' },
      { id: 'sports', name: 'Sport', nameUz: 'Sport' },
      { id: 'books', name: 'Kitoblar', nameUz: 'Kitoblar' },
      { id: 'automotive', name: 'Avtomobil', nameUz: 'Avtomobil' },
      { id: 'beauty', name: 'Go\'zallik', nameUz: 'Go\'zallik' },
      { id: 'food', name: 'Oziq-ovqat', nameUz: 'Oziq-ovqat' },
      { id: 'pharmacy', name: 'Farmatsiya', nameUz: 'Farmatsiya' },
      { id: 'services', name: 'Xizmatlar', nameUz: 'Xizmatlar' }
    ];

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Kategoriyalarni olishda xatolik' });
  }
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Ichki server xatoligi',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🏪 Store Service ishga tushdi: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;