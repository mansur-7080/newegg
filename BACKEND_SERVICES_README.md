# UltraMarket Backend Services

Ushbu hujjat UltraMarket platformasining barcha backend servislarini va ularning API endpointlarini tavsiflab beradi.

## Servislar Ro'yxati

### Core Services (Asosiy Servislar)

#### 1. Auth Service (Port: 3002)
**Maqsad**: Autentifikatsiya va avtorizatsiya
**Endpointlar**:
- `GET /health` - Health check
- `POST /api/v1/auth/login` - Tizimga kirish
- `POST /api/v1/auth/register` - Ro'yxatdan o'tish
- `POST /api/v1/auth/refresh` - Token yangilash
- `POST /api/v1/auth/logout` - Tizimdan chiqish
- `GET /api/v1/auth/profile` - Profil ma'lumotlari

#### 2. User Service (Port: 3001)
**Maqsad**: Foydalanuvchilar boshqaruvi
**Endpointlar**: To'liq CRUD operatsiyalar

#### 3. API Gateway (Port: 8000)
**Maqsad**: Barcha servislarni birlashtirish va marshrutlashtirish
**Endpointlar**: Barcha servislar uchun proxy

### Business Services (Biznes Servislar)

#### 4. Product Service (Port: 3003)
**Maqsad**: Mahsulotlar boshqaruvi
**Endpointlar**: To'liq mahsulot CRUD, kategoriyalar, qidiruv

#### 5. Cart Service (Port: 3004)
**Maqsad**: Savatcha boshqaruvi
**Endpointlar**: Redis asosida professional cart management

#### 6. Order Service (Port: 3005)
**Maqsad**: Buyurtmalar boshqaruvi
**Endpointlar**:
- `POST /api/v1/orders` - Yangi buyurtma yaratish
- `GET /api/v1/orders/:id` - Buyurtma ma'lumotini olish
- `PATCH /api/v1/orders/:id/status` - Status yangilash
- `GET /api/v1/orders/user/:userId` - Foydalanuvchi buyurtmalari
- `POST /api/v1/orders/:id/cancel` - Buyurtmani bekor qilish
- Swagger dokumentatsiya: `/api-docs`

#### 7. Review Service (Port: 3010)
**Maqsad**: Mahsulot sharhlari
**Endpointlar**:
- `GET /api/v1/reviews` - Barcha sharhlar
- `POST /api/v1/reviews` - Yangi sharh
- `GET /api/v1/products/:productId/reviews` - Mahsulot sharhlari

#### 8. Shipping Service (Port: 3011)
**Maqsad**: Yetkazib berish boshqaruvi
**Endpointlar**:
- `GET /api/v1/shipping/rates` - Yetkazib berish tariflar
- `POST /api/v1/shipping/calculate` - Narx hisoblash
- `GET /api/v1/shipping/track/:trackingNumber` - Kuzatish
- `POST /api/v1/shipping/create` - Yetkazib berish yaratish

#### 9. Payment Service (Port: 3012)
**Maqsad**: To'lov tizimi
**Endpointlar**:
- `POST /api/v1/payments/process` - To'lovni amalga oshirish
- `GET /api/v1/payments/:transactionId` - To'lov ma'lumotlari
- `POST /api/v1/payments/:transactionId/refund` - Qaytarish
- `GET /api/v1/payments/methods` - To'lov usullari

#### 10. Inventory Service (Port: 3013)
**Maqsad**: Inventar boshqaruvi
**Endpointlar**:
- `GET /api/v1/inventory` - Barcha inventar
- `GET /api/v1/inventory/:productId` - Mahsulot inventari
- `POST /api/v1/inventory/:productId/reserve` - Rezerv qilish
- `POST /api/v1/inventory/check-availability` - Mavjudlik tekshirish

### Platform Services (Platforma Servislar)

#### 11. Search Service (Port: 3007)
**Maqsad**: Qidiruv tizimi
**Endpointlar**:
- `GET /api/v1/search` - Mahsulotlarni qidirish
- `GET /api/v1/search/suggestions` - Qidiruv takliflari
- `POST /api/v1/search/index` - Indekslash
- `DELETE /api/v1/search/index/:productId` - Indeksdan o'chirish

#### 12. Notification Service (Port: 3006)
**Maqsad**: Bildirishnomalar
**Endpointlar**:
- `POST /api/v1/notifications/send` - Bildirishnoma yuborish
- `GET /api/v1/notifications/:userId` - Foydalanuvchi bildirish
- `PUT /api/v1/notifications/:notificationId/read` - O'qilgan deb belgilash
- `POST /api/v1/notifications/bulk-send` - Ommaviy yuborish

#### 13. Content Service (Port: 3014)
**Maqsad**: Kontent boshqaruvi
**Endpointlar**:
- `GET /api/v1/content/pages/:slug` - Sahifa kontenti
- `GET /api/v1/content/banners` - Bannerlar
- `GET /api/v1/content/blog` - Blog maqolalar
- `POST /api/v1/content/pages` - Yangi sahifa yaratish

#### 14. File Service (Port: 3018)
**Maqsad**: Fayl boshqaruvi
**Endpointlar**:
- `POST /api/v1/files/upload` - Fayl yuklash
- `GET /api/v1/files/:fileId` - Fayl ma'lumotlari
- `DELETE /api/v1/files/:fileId` - Faylni o'chirish
- `POST /api/v1/files/:fileId/resize` - Rasmni o'lchamini o'zgartirish
- `GET /api/v1/files/presigned-url` - Presigned URL

### Analytics Services (Analitika Servislar)

#### 15. Analytics Service (Port: 3015)
**Maqsad**: Analitika va hisobotlar
**Endpointlar**:
- `GET /api/v1/analytics/dashboard` - Dashboard analitika
- `GET /api/v1/analytics/sales` - Sotuv analitikasi
- `GET /api/v1/analytics/users` - Foydalanuvchi analitikasi
- `POST /api/v1/analytics/track` - Hodisalarni kuzatish
- `GET /api/v1/analytics/reports/:reportType` - Hisobotlar

### ML-AI Services (Sun'iy Intellekt)

#### 16. Recommendation Service (Port: 3016)
**Maqsad**: Mahsulot tavsiyalari
**Endpointlar**:
- `GET /api/v1/recommendations/user/:userId` - Foydalanuvchi uchun tavsiyalar
- `GET /api/v1/recommendations/product/:productId/similar` - O'xshash mahsulotlar
- `GET /api/v1/recommendations/trending` - Mashhur mahsulotlar
- `POST /api/v1/recommendations/feedback` - Feedback berish
- `GET /api/v1/recommendations/cart/:userId/suggestions` - Savatcha asosida tavsiyalar

#### 17. Fraud Detection Service (Port: 3017)
**Maqsad**: Firibgarlik aniqlash
**Endpointlar**:
- `POST /api/v1/fraud/check-transaction` - Tranzaksiya tekshirish
- `POST /api/v1/fraud/check-user` - Foydalanuvchi tekshirish
- `GET /api/v1/fraud/alerts` - Ogohlantirish xabarlar
- `POST /api/v1/fraud/report` - Hisobot berish
- `GET /api/v1/fraud/statistics` - Statistika

### Admin Services (Admin Servislar)

#### 18. Admin Service (Port: 3019)
**Maqsad**: Admin panel boshqaruvi
**Endpointlar**:
- `GET /api/v1/admin/dashboard` - Admin dashboard
- `GET /api/v1/admin/users` - Barcha foydalanuvchilar
- `PUT /api/v1/admin/users/:userId/status` - Foydalanuvchi statusini yangilash
- `GET /api/v1/admin/orders` - Barcha buyurtmalar
- `GET /api/v1/admin/services/health` - Servislar holati
- `POST /api/v1/admin/announcements` - E'lonlar yaratish

## Ishga Tushirish

### Docker Compose orqali
```bash
docker-compose -f config/docker/docker-compose.services.yml up
```

### Alohida servislarni ishga tushirish
```bash
cd microservices/[service-category]/[service-name]
npm install
npm run dev
```

## Ma'lumotlar Bazasi

- **PostgreSQL** (Port: 5432): User, Order, Auth servislar uchun
- **MongoDB** (Port: 27017): Product servis uchun
- **Redis** (Port: 6379): Cart servis va kesh uchun

## Monitoring va Health Check

Har bir servis `/health` endpointiga ega:
- Auth: http://localhost:3002/health
- User: http://localhost:3001/health
- Product: http://localhost:3003/health
- Va boshqalar...

## API Gateway orqali kirish

Barcha servislar API Gateway (Port: 8000) orqali mavjud:
- http://localhost:8000/api/auth/* - Auth servis
- http://localhost:8000/api/users/* - User servis
- http://localhost:8000/api/products/* - Product servis
- Va boshqalar...

## Keyingi Bosqichlar

1. **Haqiqiy biznes logika** - Hozirda mock data qaytaradi
2. **Database integration** - Haqiqiy ma'lumotlar bazasi bilan integratsiya
3. **Authentication middleware** - Servislararo autentifikatsiya
4. **Error handling** - Professional xatolik boshqaruvi
5. **Logging va monitoring** - Prometheus, Grafana integratsiyasi
6. **Test coverage** - Unit va integration testlar
7. **CI/CD pipeline** - Avtomatik deployment

## Hujjatlar

- Order Service Swagger: http://localhost:3005/api-docs
- Qolgan servislar uchun Swagger hujjatlari qo'shilmoqda...