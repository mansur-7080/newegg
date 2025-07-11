# 🚀 UltraMarket Backend - To'liq Professional Deployment Guide

## 📋 Tizim Tarkibi

UltraMarket backend tizimi quyidagi professional komponentlardan iborat:

### 🔐 **Core Services (Asosiy Servislar)**
- **Auth Service** - Authentication va Authorization
- **User Service** - Foydalanuvchi boshqaruvi
- **API Gateway** - Kong orqali routing va load balancing

### 🛍️ **Business Services (Biznes Servislari)**
- **Product Service** - Mahsulot katalogi va boshqaruvi
- **Order Service** - Buyurtma boshqaruvi
- **Payment Service** - To'lov tizimi (Stripe)
- **Cart Service** - Savat boshqaruvi
- **Inventory Service** - Ombor boshqaruvi

### 🏗️ **Platform Services (Platforma Servislari)**
- **Notification Service** - Bildirishnomalar
- **Search Service** - Qidiruv tizimi
- **Analytics Service** - Tahlil va hisobotlar
- **File Service** - Fayl boshqaruvi

### 🗄️ **Database Layer (Ma'lumotlar bazasi)**
- **PostgreSQL** - Asosiy ma'lumotlar bazasi
- **Redis** - Cache va session storage
- **Elasticsearch** - Qidiruv tizimi
- **MongoDB** - Document storage

---

## 🛠️ Professional Setup

### 1. **Environment Configuration**

```bash
# .env faylini yarating
cp env.example .env

# Muhim environment variables
DATABASE_URL="postgresql://username:password@localhost:5432/ultramarket"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secure-jwt-secret-key-32-characters"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-32-characters"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 2. **Database Setup**

```bash
# PostgreSQL database yarating
createdb ultramarket

# Prisma migrationlarni ishga tushiring
cd libs/shared
npx prisma migrate dev --name init
npx prisma generate

# Seed data qo'shing
npx prisma db seed
```

### 3. **Docker Setup**

```bash
# Development environment
docker-compose -f docker-compose.dev.yml up -d

# Production environment
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Service-by-Service Deployment

### **1. Auth Service Deployment**

```bash
cd microservices/core/auth-service

# Dependencies o'rnatish
npm install

# Build qilish
npm run build

# Environment setup
export NODE_ENV=production
export PORT=3002
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."
export JWT_REFRESH_SECRET="..."

# Service ishga tushirish
npm start
```

**Auth Service Endpoints:**
```
POST /api/v1/auth/register     - Foydalanuvchi ro'yxatdan o'tish
POST /api/v1/auth/login        - Tizimga kirish
POST /api/v1/auth/refresh      - Token yangilash
POST /api/v1/auth/logout       - Tizimdan chiqish
GET  /api/v1/auth/profile      - Profil ma'lumotlari
PUT  /api/v1/auth/profile      - Profil yangilash
PUT  /api/v1/auth/change-password - Parol o'zgartirish
```

### **2. Product Service Deployment**

```bash
cd microservices/business/product-service/product-service

# Dependencies o'rnatish
npm install

# Build qilish
npm run build

# Environment setup
export NODE_ENV=production
export PORT=3003
export DATABASE_URL="postgresql://..."
export REDIS_URL="redis://..."

# Service ishga tushirish
npm start
```

**Product Service Endpoints:**
```
GET    /api/v1/products           - Barcha mahsulotlar
GET    /api/v1/products/:id       - Bitta mahsulot
POST   /api/v1/products           - Yangi mahsulot (Admin/Seller)
PUT    /api/v1/products/:id       - Mahsulot yangilash
DELETE /api/v1/products/:id       - Mahsulot o'chirish
GET    /api/v1/categories         - Kategoriyalar
GET    /api/v1/search             - Mahsulot qidirish
GET    /api/v1/recommendations    - Tavsiyalar
```

### **3. Order Service Deployment**

```bash
cd microservices/business/order-service/order-service

# Dependencies o'rnatish
npm install

# Build qilish
npm run build

# Environment setup
export NODE_ENV=production
export PORT=3004
export DATABASE_URL="postgresql://..."
export REDIS_URL="redis://..."

# Service ishga tushirish
npm start
```

**Order Service Endpoints:**
```
POST   /api/v1/orders             - Yangi buyurtma
GET    /api/v1/orders             - Foydalanuvchi buyurtmalari
GET    /api/v1/orders/:id         - Bitta buyurtma
PUT    /api/v1/orders/:id/status  - Buyurtma holatini yangilash
DELETE /api/v1/orders/:id         - Buyurtmani bekor qilish
GET    /api/v1/orders/stats       - Buyurtma statistikasi (Admin)
```

### **4. Payment Service Deployment**

```bash
cd microservices/business/payment-service/payment-service

# Dependencies o'rnatish
npm install

# Build qilish
npm run build

# Environment setup
export NODE_ENV=production
export PORT=3005
export DATABASE_URL="postgresql://..."
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."

# Service ishga tushirish
npm start
```

**Payment Service Endpoints:**
```
POST   /api/v1/payments/intent    - To'lov intent yaratish
POST   /api/v1/payments/process   - To'lovni amalga oshirish
GET    /api/v1/payments/:id       - To'lov ma'lumotlari
GET    /api/v1/payments           - Foydalanuvchi to'lovlari
POST   /api/v1/payments/:id/refund - To'lovni qaytarish
POST   /api/v1/webhooks/stripe    - Stripe webhook
```

---

## 🐳 Docker Deployment

### **Development Environment**

```bash
# Barcha servislarni ishga tushirish
docker-compose -f docker-compose.dev.yml up -d

# Loglarni ko'rish
docker-compose -f docker-compose.dev.yml logs -f

# Servislarni to'xtatish
docker-compose -f docker-compose.dev.yml down
```

### **Production Environment**

```bash
# Production build
docker-compose -f docker-compose.prod.yml build

# Production ishga tushirish
docker-compose -f docker-compose.prod.yml up -d

# Health check
docker-compose -f docker-compose.prod.yml ps
```

---

## ☸️ Kubernetes Deployment

### **1. Namespace yaratish**

```yaml
# kubernetes/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ultramarket
  labels:
    name: ultramarket
```

### **2. Database Deployment**

```yaml
# kubernetes/databases.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: ultramarket
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: "ultramarket"
        - name: POSTGRES_USER
          value: "ultramarket_user"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
```

### **3. Service Deployment**

```yaml
# kubernetes/auth-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: ultramarket
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: ultramarket/auth-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## 🔒 Security Configuration

### **1. JWT Configuration**

```typescript
// JWT secret generation
const crypto = require('crypto');
const jwtSecret = crypto.randomBytes(32).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');

console.log('JWT_SECRET:', jwtSecret);
console.log('JWT_REFRESH_SECRET:', jwtRefreshSecret);
```

### **2. Database Security**

```sql
-- PostgreSQL security setup
CREATE USER ultramarket_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE ultramarket TO ultramarket_user;
GRANT USAGE ON SCHEMA public TO ultramarket_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ultramarket_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ultramarket_user;
```

### **3. Rate Limiting**

```typescript
// API Gateway rate limiting
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/auth', authLimiter);
```

---

## 📊 Monitoring va Logging

### **1. Prometheus Configuration**

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3002']
    metrics_path: '/metrics'

  - job_name: 'product-service'
    static_configs:
      - targets: ['product-service:3003']
    metrics_path: '/metrics'

  - job_name: 'order-service'
    static_configs:
      - targets: ['order-service:3004']
    metrics_path: '/metrics'
```

### **2. Grafana Dashboards**

```json
// monitoring/grafana/dashboards/ultramarket-dashboard.json
{
  "dashboard": {
    "title": "UltraMarket System Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{service}}"
          }
        ]
      }
    ]
  }
}
```

---

## 🧪 Testing

### **1. Unit Tests**

```bash
# Auth Service tests
cd microservices/core/auth-service
npm run test

# Product Service tests
cd microservices/business/product-service/product-service
npm run test

# Order Service tests
cd microservices/business/order-service/order-service
npm run test
```

### **2. Integration Tests**

```bash
# API integration tests
cd tests/integration
npm run test

# Database integration tests
npm run test:db
```

### **3. Load Testing**

```bash
# K6 load testing
cd tests/performance
k6 run load-test.js

# Artillery load testing
artillery run artillery-config.yml
```

---

## 🔄 CI/CD Pipeline

### **1. GitHub Actions**

```yaml
# .github/workflows/ci.yml
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
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run test
    - run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-docker@v3
    - run: docker build -t ultramarket/auth-service ./microservices/core/auth-service
    - run: docker build -t ultramarket/product-service ./microservices/business/product-service/product-service
    - run: docker build -t ultramarket/order-service ./microservices/business/order-service/order-service

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - run: kubectl apply -f kubernetes/
```

---

## 🚨 Troubleshooting

### **1. Common Issues**

```bash
# Database connection error
docker logs postgres
docker exec -it postgres psql -U ultramarket_user -d ultramarket

# Service not starting
docker logs auth-service
docker exec -it auth-service npm run dev

# Memory issues
docker stats
kubectl top pods -n ultramarket
```

### **2. Health Checks**

```bash
# Service health checks
curl http://localhost:3002/health  # Auth Service
curl http://localhost:3003/health  # Product Service
curl http://localhost:3004/health  # Order Service
curl http://localhost:3005/health  # Payment Service

# Database health check
docker exec -it postgres pg_isready -U ultramarket_user

# Redis health check
docker exec -it redis redis-cli ping
```

---

## 📈 Performance Optimization

### **1. Database Optimization**

```sql
-- Indexes for better performance
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_order_id ON payments(order_id);

-- Partitioning for large tables
CREATE TABLE orders_2024 PARTITION OF orders
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### **2. Caching Strategy**

```typescript
// Redis caching
import { redis } from '@ultramarket/shared/cache';

// Cache product data
const getProduct = async (id: string) => {
  const cached = await redis.get(`product:${id}`);
  if (cached) return JSON.parse(cached);
  
  const product = await prisma.product.findUnique({ where: { id } });
  await redis.setex(`product:${id}`, 3600, JSON.stringify(product));
  return product;
};
```

---

## 🎯 Production Checklist

- [ ] Environment variables to'g'ri sozlangan
- [ ] Database migrationlar bajarilgan
- [ ] SSL sertifikatlari o'rnatilgan
- [ ] Monitoring va logging sozlangan
- [ ] Backup strategiyasi ishlab chiqilgan
- [ ] Security audit o'tkazilgan
- [ ] Load testing bajarilgan
- [ ] Documentation yangilangan
- [ ] Team training o'tkazilgan

---

## 📞 Support

Agar muammolar bo'lsa:

1. **Logs ko'rish**: `docker logs <service-name>`
2. **Health check**: `curl http://localhost:<port>/health`
3. **Database check**: `docker exec -it postgres psql -U ultramarket_user -d ultramarket`
4. **Documentation**: `/docs` papkasida

---

**🎉 Tabriklaymiz! UltraMarket backend tizimi to'liq professional darajada ishga tushirildi!**