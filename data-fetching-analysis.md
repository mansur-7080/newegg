# UltraMarket - Data Ma'lumotlarni O'qish va Olish Usullari (Data Fetching Analysis)

Bu UltraMarket loyihasida ma'lumotlarni o'qish va olish usullarining to'liq tahlili hisoblanadi.

## Asosiy Ma'lumotlar Bazasi Usullari (Database Patterns)

### 1. PostgreSQL + Prisma ORM
**Joylashuvi:** `libs/shared/src/database.js`

**Asosiy usullar:**
- `findMany()` - ko'plab yozuvlarni topish
- `findUnique()` - noyob yozuvni topish  
- `findFirst()` - birinchi yozuvni topish
- `count()` - yozuvlar sonini sanash
- Raw SQL so'rovlar `$queryRaw` va `$executeRaw` orqali

**Misol kod:**
```javascript
// Sahifalangan so'rov (Paginated Query)
async paginatedQuery(model, options) {
  const { page = 1, limit = 20, where, orderBy, include, select } = options;
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      include,
      select,
      skip,
      take: limit,
    }),
    model.count({ where }),
  ]);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
```

**Qiziqarli xususiyatlar:**
- Avtomatik ulanish monitoringi
- Sekin so'rovlarni kuzatish
- Indeks statistikalarini olish
- Tranzaksiya boshqaruvi

### 2. MongoDB Queries
**Joylashuvi:** `microservices/business/product-service/`

**Asosiy usullar:**
- `find()` - ko'plab hujjatlarni topish
- `findOne()` - bitta hujjatni topish
- `aggregate()` - murakkab ma'lumotlarni jamlash
- `sort()` va `limit()` - tartiblash va cheklash

**Misol kod:**
```javascript
// PC Builder xizmatida
const builds = await Build.find({ userId }).sort({ updatedAt: -1 });
const compatibleComponents = await ComponentModel.find(filter).sort({ price: 1 }).limit(10);
```

## Frontend Ma'lumot Olish Usullari (Frontend Data Fetching)

### 1. React Query (@tanstack/react-query)
**Joylashuvi:** Frontend komponentlarida

**Asosiy foydalanish:**
```typescript
// Mahsulot ma'lumotlarini olish
const { data, isLoading, error } = useQuery({
  queryKey: ['product', id],
  queryFn: () => fetchProductById(id),
  enabled: !!id
});

// Sharhlarni olish
const { data: reviews, isLoading: areReviewsLoading } = useQuery(
  ['reviews', productId],
  () => fetchProductReviews(productId)
);
```

### 2. React Hooks (useState, useEffect)
**Asosiy pattern:**
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await api.getData();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, []);
```

### 3. HTTP Client Usullari

**Axios va Fetch API:**
- Penetratsiya testlarida: `axios.create()`
- Performance testlarida: `fetch()` API
- Load testlarida: k6 HTTP moduli

## API Endpoint Ma'lumot Almashuv Usullari

### HTTP So'rovlar Turlari:

1. **GET so'rovlar** - ma'lumotlarni o'qish
   - `/api/v1/products` - mahsulotlar ro'yxati
   - `/api/v1/products/:id` - mahsulot tafsilotlari
   - `/api/v1/categories` - kategoriyalar
   - `/api/v1/search` - qidiruv

2. **POST so'rovlar** - ma'lumot yaratish
   - `/api/v1/auth/login` - tizimga kirish
   - `/api/v1/cart/items` - savat elementini qo'shish
   - `/api/v1/orders` - buyurtma berish

3. **PUT/PATCH so'rovlar** - ma'lumotni yangilash
   - `/api/v1/cart/update` - savat yangilash
   - `/api/v1/users/profile` - profil yangilash

## Load Testing orqali Ma'lumot So'rovlari

**K6 Load Testing Script misollari:**
```javascript
// Asosiy mahsulotlar sahifasi
const response = http.get(`${baseUrl}/api/v1/products?page=1&limit=20`);

// Qidiruv so'rovi
const searchResponse = http.get(`${baseUrl}/api/v1/search?q=${searchTerm}&page=1&limit=10`);

// Foydalanuvchi autentifikatsiyasi
const loginResponse = http.post(`${baseUrl}/api/v1/auth/login`, JSON.stringify(loginData));
```

## Maxsus Usullar (Specialized Patterns)

### 1. PC Builder Compatibility Check
```javascript
async validateCompatibility(components) {
  // CPU va Motherboard socket mos kelishini tekshirish
  if (components.cpu && components.motherboard) {
    const cpuSocket = components.cpu.specifications.socket;
    const motherboardSocket = components.motherboard.specifications.socket;
    
    if (cpuSocket !== motherboardSocket) {
      issues.push({
        type: 'critical',
        message: `CPU socket (${cpuSocket}) is not compatible...`,
        components: ['cpu', 'motherboard'],
      });
    }
  }
}
```

### 2. Bulk Operations (Ommaviy Operatsiyalar)
```javascript
// Ko'plab elementlarni bir vaqtda yaratish
async bulkCreate(model, data) {
  return await model.createMany({
    data,
    skipDuplicates: true,
  });
}

// Ko'plab elementlarni yangilash
async bulkUpdate(model, data) {
  const updates = data.map((item) => {
    const { id, ...updateData } = item;
    return model.update({
      where: { id },
      data: updateData,
    });
  });
  return await Promise.all(updates);
}
```

## Ma'lumotlar Bazasi Monitoring va Diagnostika

### Sekin So'rovlarni Kuzatish:
```sql
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10
```

### Indeks Foydalanish Statistikasi:
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
```

## Xavfsizlik va Performance Optimizatsiyasi

### 1. SQL Injection himoyasi
- Parametrlashtirilgan so'rovlar ishlatish
- Prisma ORM orqali avtomatik sanitizatsiya

### 2. Ma'lumotlar Keshlash
- Redis orqali tez-tez so'raladigan ma'lumotlarni keshlash
- Browser-side keshlash React Query orqali

### 3. Sahifalash (Pagination)
- Katta ma'lumotlar to'plamini kichik qismlarga bo'lish
- `skip` va `take` parametrlari ishlatish

## Xulosa

UltraMarket loyihasida ma'lumotlarni olish uchun turli xil usullar qo'llaniladi:

1. **Backend:** PostgreSQL + Prisma ORM, MongoDB queries
2. **Frontend:** React Query, useState/useEffect hooks
3. **API:** RESTful endpoints with HTTP methods
4. **Testing:** K6 load testing, comprehensive API testing
5. **Monitoring:** Database performance monitoring, slow query detection

Loyiha zamonaviy web application uchun eng yaxshi amaliyotlarni qo'llaydi va yuqori performance, xavfsizlik va scalability ni ta'minlaydi.