# 🔧 UltraMarket Loyihasini Tuzatish - YO'L XARITASI

## ⚡ **BIRINCHI NAVBAT - KRITIK MUAMMOLAR (1-2 hafta)**

### 🔒 **1. SECURITY - ENG MUHIM!**

#### A) Parollarni o'zgartirish
```bash
# 1. Yangi .env fayllar yarating
cp env.example .env.production
cp env.example .env.development

# 2. Kuchli parollar generate qiling
openssl rand -base64 32    # PostgreSQL uchun
openssl rand -base64 32    # MongoDB uchun  
openssl rand -base64 32    # MinIO uchun
openssl rand -base64 64    # JWT secret uchun
```

#### B) Environment fayllarini to'g'irlash
```javascript
// .env.production
DATABASE_URL="postgresql://ultramarket_user:KUCHLI_PAROL_123@localhost:5432/ultramarket_prod"
JWT_SECRET="JUDA_KUCHLI_JWT_SECRET_256_BIT"
MONGODB_URI="mongodb://ultramarket_mongo:KUCHLI_MONGO_PAROL@localhost:27017/ultramarket"
MINIO_ACCESS_KEY="ultramarket_minio_user"
MINIO_SECRET_KEY="JUDA_KUCHLI_MINIO_SECRET"
REDIS_PASSWORD="KUCHLI_REDIS_PAROL"
```

#### C) Default admin parollarni o'zgartirish
```yaml
# docker-compose.prod.yml ichida
environment:
  - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}    # .env dan oling
  - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
  - MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
```

### 🛠️ **2. ASOSIY BACKEND KODLARNI YARATISH**

#### A) Backend papkasiga asosiy fayllar
```bash
# 1. Backend strukturasini yarating
mkdir -p backend/src/{controllers,routes,middleware,models,services,utils}

# 2. Asosiy fayllar (TypeScript!)
touch backend/src/index.ts
touch backend/src/database.ts  
touch backend/src/auth.ts
```

#### B) Main backend server (backend/src/index.ts)
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));

// Routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

### 🗃️ **3. DATABASE MIGRATSIYA VA SETUP**

#### A) Prisma schema ni to'g'irlash
```prisma
// libs/shared/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Hashed password
  role      Role     @default(USER)
  profile   Profile?
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Product {
  id          String   @id @default(cuid())
  name        String
  description String?
  price       Decimal
  category    String
  stock       Int
  images      String[]
  orders      OrderItem[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Boshqa modellar...
```

#### B) Migration qilish
```bash
cd libs/shared
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🚀 **IKKINCHI NAVBAT - CORE FEATURES (2-4 hafta)**

### 💳 **4. PAYMENT SISTEMANI REAL QILISH**

#### A) Click.uz integratsiyasi
```javascript
// microservices/business/payment-service/src/services/click.service.ts
export class ClickService {
  async initiatePayment(orderId: string, amount: number) {
    // HAQIQIY Click API integration
    const response = await fetch(`${process.env.CLICK_API_URL}/payment/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLICK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: process.env.CLICK_SERVICE_ID,
        amount: amount,
        order_id: orderId,
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
      })
    });
    
    if (!response.ok) {
      throw new Error('Payment initiation failed');
    }
    
    return await response.json();
  }
}
```

#### B) Payme integratsiyasi
```javascript
// microservices/business/payment-service/src/services/payme.service.ts
export class PaymeService {
  async createTransaction(orderId: string, amount: number) {
    // HAQIQIY Payme protocol
    const transaction = {
      id: generateTransactionId(),
      order_id: orderId,
      amount: amount * 100, // Payme tiyin da ishlaydi
      state: 'CREATED',
      created_at: Date.now()
    };
    
    // Database ga saqlash
    await this.saveTransaction(transaction);
    return transaction;
  }
}
```

### 🛒 **5. ORDERING SISTEMANI TO'G'IRLASH**

#### A) Real order controller
```typescript
// microservices/business/order-service/src/controllers/order.controller.ts
export class OrderController {
  async createOrder(req: Request, res: Response) {
    try {
      const { items, shippingAddress, paymentMethod } = req.body;
      const userId = req.user.id;
      
      // 1. Stock tekshirish
      for (const item of items) {
        const product = await this.productService.getById(item.productId);
        if (product.stock < item.quantity) {
          return res.status(400).json({
            error: `Product ${product.name} out of stock`
          });
        }
      }
      
      // 2. Order yaratish
      const order = await this.orderService.create({
        userId,
        items,
        shippingAddress,
        paymentMethod,
        status: 'PENDING'
      });
      
      // 3. Stock ni kamaytirish
      await this.updateProductStock(items);
      
      // 4. Payment yaratish
      const payment = await this.paymentService.initiate(order.id, order.total);
      
      res.status(201).json({ order, paymentUrl: payment.url });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

### 🧪 **6. TESTING QURISH**

#### A) Jest setup
```bash
npm install --save-dev jest @types/jest ts-jest supertest
```

#### B) Test fayllar yaratish
```javascript
// microservices/core/auth-service/src/__tests__/auth.test.ts
describe('Auth Service', () => {
  test('should register user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User'
      });
      
    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
  });
  
  test('should not register user with weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      });
      
    expect(response.status).toBe(400);
  });
});
```

---

## 🏗️ **UCHINCHI NAVBAT - PRODUCTION READY (4-6 hafta)**

### 📊 **7. MONITORING VA LOGGING**

#### A) Winston logger setup
```javascript
// libs/shared/src/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

#### B) Health check endpoints
```javascript
// Har bir mikroservised
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: process.env.APP_VERSION || '1.0.0'
  });
});
```

### 🔧 **8. CI/CD PIPELINE**

#### A) GitHub Actions
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          # Production deployment script
```

---

## 📋 **HAR BIR BOSQICH UCHUN CHECKLIST**

### ✅ **1-bosqich (Security) - MAJBURIY:**
- [ ] Barcha default parollar o'zgartirildi
- [ ] Environment variables to'g'ri sozlandi  
- [ ] .env fayllar .gitignore ga qo'shildi
- [ ] JWT secret kuchli qilib o'zgartirildi
- [ ] Database credentials yangilandi

### ✅ **2-bosqich (Backend Core):**
- [ ] Backend/src papkasi yaratildi
- [ ] Asosiy server fayli yozildi
- [ ] Database connection setup qilindi
- [ ] Basic API routes yaratildi
- [ ] Middleware lar qo'shildi

### ✅ **3-bosqich (Database):**
- [ ] Prisma schema to'g'irlandi
- [ ] Migration qilindi
- [ ] Seed data qo'shildi
- [ ] Database indexes qo'shildi

### ✅ **4-bosqich (Payment):**
- [ ] Click.uz integration
- [ ] Payme integration  
- [ ] Payment status tracking
- [ ] Webhook handling

### ✅ **5-bosqich (Testing):**
- [ ] Jest setup
- [ ] Unit testlar yozildi
- [ ] Integration testlar
- [ ] API testlar

### ✅ **6-bosqich (Production):**
- [ ] Docker setup
- [ ] Kubernetes manifests
- [ ] Monitoring setup
- [ ] CI/CD pipeline

---

## ⏰ **VAQT JADVALI:**

| Hafta | Ish | Natija |
|-------|-----|--------|
| 1 | Security + Backend Core | ✅ Xavfsiz loyiha |
| 2-3 | Database + API | ✅ Ishlaydigan backend |
| 4-5 | Payment + Order | ✅ To'liq funksional |
| 6-8 | Testing + Production | ✅ Production ready |

---

## 🎯 **ENG MUHIM:**

**BIRINCHI** - Security muammolarini hal qiling!
**IKKINCHI** - Backend core ni yarating!
**UCHINCHI** - Payment sistemani haqiqiy qiling!

**Bu yo'l xarita bo'yicha ishlasangiz, 2 oyda production ready loyihaga ega bo'lasiz!** 🚀