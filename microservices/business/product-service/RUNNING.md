# Product Service - Running Guide

## 🚀 Service muvaffaqiyatli ishga tushdi!

### Service ma'lumotlari:
- **Port**: 3001
- **Status**: ✅ RUNNING
- **Database**: SQLite (development)
- **ORM**: Prisma

### Mavjud endpoint lar:

1. **Home** - `GET http://localhost:3001/`
   ```json
   {
     "service": "product-service",
     "version": "1.0.0",
     "status": "running",
     "message": "UltraMarket Product Service is running!"
   }
   ```

2. **Health Check** - `GET http://localhost:3001/health`
   ```json
   {
     "status": "ok",
     "service": "product-service",
     "timestamp": "2025-07-16T07:00:23.810Z"
   }
   ```

3. **Products List** - `GET http://localhost:3001/api/products`
   ```json
   {
     "products": [
       {
         "id": "1",
         "name": "MacBook Pro 16\"",
         "price": 2500,
         "category": "laptops",
         "brand": "Apple"
       }
     ],
     "total": 2
   }
   ```

### Ishga tushirish buyruqlari:

```bash
# Oddiy ishga tushirish
cd microservices/business/product-service/product-service
node start.js

# Development mode
npm run dev

# Database migratsiyasi
npx prisma migrate dev

# Database studio
npx prisma studio
```

### Test qilish:
```bash
# Service tekshirish
curl http://localhost:3001/

# Mahsulotlar ro'yxati
curl http://localhost:3001/api/products
```