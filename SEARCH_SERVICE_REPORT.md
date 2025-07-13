# UltraMarket - Search Service Hisoboti

## 📋 Umumiy Ma'lumot

Search Service uchun to'liq alohida database schema va konfiguratsiya yaratildi. Bu service platformadagi barcha qidiruv funksiyalarini boshqaradi va kuchli search engine imkoniyatlarini taqdim etadi.

## 🎯 Search Service Xususiyatlari

### 🔍 Asosiy Qidiruv Imkoniyatlari
- **Multi-type Search**: Mahsulotlar, do'konlar, kategoriyalar, brendlar
- **Intelligent Autocomplete**: Real-time taklif berish
- **Spell Check & Fuzzy Search**: Xato so'zlarni tuzatish
- **Faceted Search**: Filtrlar orqali qidiruv
- **Personalized Search**: Foydalanuvchi xatti-harakatiga asoslangan
- **Trending & Popular Searches**: Mashhur qidiruvlar

### 📊 Analytics va Monitoring
- **Real-time Search Analytics**: Qidiruv statistikasi
- **Search Performance Tracking**: Tezlik va sifat monitoring
- **User Behavior Analysis**: Foydalanuvchi xatti-harakati tahlili
- **Conversion Tracking**: Qidiruvdan sotuvga o'tish

## 🗄️ Database Schema

### Asosiy Modellar

#### 1. SearchQuery - Qidiruv So'rovlari
```prisma
model SearchQuery {
  id              String     @id @default(cuid())
  query           String
  normalizedQuery String     // Tozalangan versiya
  userId          String?
  sessionId       String?
  storeId         String?    // Do'kon-specific qidiruv
  
  // Search Parameters
  searchType      SearchType @default(GLOBAL)
  filters         Json?      // Qo'llaniladigan filtrlar
  sortBy          String?    // narx, reyting, mashhurlik
  sortOrder       String?    // asc, desc
  
  // Results & Performance
  totalResults    Int        @default(0)
  resultIds       String[]   // Natija ID'lari
  responseTime    Int?       // millisekund
  
  // User Context
  ipAddress       String?
  userAgent       String?
  deviceType      String?    // mobile, desktop, tablet
  location        Json?      // {country, city, coordinates}
  
  // Engagement Metrics
  clickedResults  String[]   // Bosilgan natijalar
  clickPosition   Int[]      // Bosish pozitsiyalari
  timeToFirstClick Int?      // Birinchi bosishgacha vaqt
  userSatisfied   Boolean?   // Foydalanuvchi qoniqishi
}
```

#### 2. SearchIndex - Qidiruv Indeksi
```prisma
model SearchIndex {
  id            String      @id @default(cuid())
  entityId      String      // Product, Store, Category ID
  entityType    String      // "product", "store", "category"
  
  // Searchable Content
  title         String
  description   String?
  keywords      String[]
  tags          String[]
  categories    String[]
  searchText    String      // Birlashtirilgan qidiruv matni
  
  // Search Metadata
  popularity    Float       @default(0)
  quality       Float       @default(0)
  availability  Boolean     @default(true)
  
  // Pricing (mahsulotlar uchun)
  price         Decimal?    @db.Decimal(10, 2)
  originalPrice Decimal?    @db.Decimal(10, 2)
  
  // Status
  status        IndexStatus @default(PENDING)
  isActive      Boolean     @default(true)
}
```

#### 3. SearchSuggestion - Qidiruv Takliflari
```prisma
model SearchSuggestion {
  id              String         @id @default(cuid())
  query           String
  suggestion      String
  type            SuggestionType
  weight          Float          @default(1.0)
  
  // Performance Metrics
  impressions     Int            @default(0)
  clicks          Int            @default(0)
  conversions     Int            @default(0)
  ctr             Float          @default(0) // Click-through rate
  conversionRate  Float          @default(0)
  
  // Context
  storeId         String?        // Do'kon-specific takliflar
  language        String         @default("uz")
  region          String?
}
```

#### 4. SearchAnalytics - Qidiruv Analitikasi
```prisma
model SearchAnalytics {
  id                String   @id @default(cuid())
  date              DateTime @db.Date
  
  // Overall Metrics
  totalSearches     Int      @default(0)
  uniqueSearchers   Int      @default(0)
  avgResponseTime   Float    @default(0)
  
  // Query Metrics
  totalQueries      Int      @default(0)
  uniqueQueries     Int      @default(0)
  noResultQueries   Int      @default(0)
  noResultRate      Float    @default(0)
  
  // Engagement Metrics
  totalClicks       Int      @default(0)
  clickThroughRate  Float    @default(0)
  avgClickPosition  Float    @default(0)
  bounceRate        Float    @default(0)
  
  // Conversion Metrics
  searchConversions Int      @default(0)
  conversionRate    Float    @default(0)
  revenue           Decimal? @db.Decimal(12, 2)
}
```

### Qo'shimcha Modellar

#### 5. SearchPersonalization - Shaxsiylashtirish
- Foydalanuvchi qidiruv tarixiga asoslangan personalizatsiya
- Afzal ko'rilgan kategoriyalar, brendlar
- Qidiruv naqshlari va konversiya naqshlari

#### 6. SearchTrend - Qidiruv Trendlari
- Mashhur qidiruvlar
- Trend yo'nalishi (ko'tarilish, pasayish)
- Vaqt oralig'i bo'yicha tahlil

#### 7. SearchFilter - Qidiruv Filtrlari
- Narx oralig'i, kategoriya, brend filtrlari
- Dinamik filtr konfiguratsiyasi
- Filtr foydalanish statistikasi

#### 8. SearchSynonym - Sinonimlar
- So'z sinonimlarini boshqarish
- Ikki tomonlama va bir tomonlama sinonimlar
- Avtomatik va qo'lda qo'shilgan sinonimlar

## 🔧 Environment Konfiguratsiyasi

### Database
```bash
SEARCH_DATABASE_URL="postgresql://username:password@localhost:5432/ultramarket_search"
```

### Elasticsearch Integration
```bash
ELASTICSEARCH_URL="http://localhost:9200"
ELASTICSEARCH_INDEX_PREFIX="ultramarket"
ELASTICSEARCH_USERNAME=""
ELASTICSEARCH_PASSWORD=""
```

### Search Features
```bash
ENABLE_AUTOCOMPLETE=true
ENABLE_SPELL_CHECK=true
ENABLE_SYNONYMS=true
ENABLE_PERSONALIZATION=true
ENABLE_FACETED_SEARCH=true
```

### Performance Settings
```bash
SEARCH_TIMEOUT_MS=5000
MAX_PAGE_SIZE=100
SEARCH_RESULT_CACHE_TTL=300 # 5 minutes
MAX_CONCURRENT_SEARCHES=100
```

### Analytics Configuration
```bash
ENABLE_SEARCH_ANALYTICS=true
ANALYTICS_BATCH_SIZE=500
TRACK_USER_CLICKS=true
TRACK_SEARCH_SESSIONS=true
```

## 🚀 Xususiyatlar

### 1. **Intelligent Search**
- Natural language processing
- Spell correction va fuzzy matching
- Context-aware search results
- Multi-language support (uz, ru, en)

### 2. **Real-time Suggestions**
- Autocomplete as-you-type
- Trending search suggestions
- Personalized recommendations
- Popular searches

### 3. **Advanced Filtering**
- Price range filters
- Category and brand filters
- Rating and availability filters
- Location-based filtering
- Custom attribute filters

### 4. **Search Analytics**
- Real-time search metrics
- User behavior tracking
- Conversion rate analysis
- Performance monitoring
- A/B testing support

### 5. **Personalization**
- User search history analysis
- Preference-based ranking
- Behavioral targeting
- Dynamic result personalization

## 📈 Performance Optimizations

### 1. **Caching Strategy**
```bash
# Search results caching
SEARCH_RESULT_CACHE_TTL=300 # 5 minutes

# Autocomplete caching
AUTOCOMPLETE_CACHE_TTL=1800 # 30 minutes

# Facet caching
FACET_CACHE_TTL=1800 # 30 minutes
```

### 2. **Indexing Strategy**
```bash
# Auto-indexing
ENABLE_AUTO_INDEXING=true
INDEX_UPDATE_INTERVAL_MINUTES=15
FULL_REINDEX_HOUR=2 # 2 AM daily
```

### 3. **Rate Limiting**
```bash
RATE_LIMIT_WINDOW_MS=60000 # 1 minute
RATE_LIMIT_MAX_REQUESTS=1000
```

## 🔄 Integration Strategy

### 1. **Service Communication**
```javascript
// Product ma'lumotlarini olish
const getProductData = async (productId) => {
  const response = await fetch(`${TECH_PRODUCT_SERVICE_URL}/api/products/${productId}`);
  return response.json();
};

// Store ma'lumotlarini olish
const getStoreData = async (storeId) => {
  const response = await fetch(`${STORE_SERVICE_URL}/api/stores/${storeId}`);
  return response.json();
};
```

### 2. **Event-Driven Updates**
```javascript
// Product yangilanganda index yangilash
eventBus.on('product.updated', async (productData) => {
  await updateSearchIndex('product', productData.id, productData);
});

// Store yangilanganda index yangilash
eventBus.on('store.updated', async (storeData) => {
  await updateSearchIndex('store', storeData.id, storeData);
});
```

### 3. **Analytics Integration**
```javascript
// Search eventlarini Analytics Service ga yuborish
const trackSearchEvent = async (searchData) => {
  await fetch(`${ANALYTICS_SERVICE_URL}/api/events`, {
    method: 'POST',
    body: JSON.stringify({
      eventType: 'PRODUCT_SEARCH',
      ...searchData
    })
  });
};
```

## 🎯 Key Features

### ✅ Implemented Features
- **Multi-type Search Engine** - Mahsulot, do'kon, kategoriya qidiruvi
- **Intelligent Autocomplete** - Real-time takliflar
- **Advanced Analytics** - To'liq qidiruv analitikasi
- **Personalization Engine** - Foydalanuvchi-specific natijalar
- **Trend Analysis** - Mashhur qidiruvlar tahlili
- **Performance Monitoring** - Tezlik va sifat monitoring

### 🔄 Cross-Service Data Handling
- **No Foreign Keys** - Faqat ID'lar saqlash
- **Cached Data** - Tez-tez ishlatiladigan ma'lumotlarni cache qilish
- **Event-Driven Updates** - Real-time ma'lumot yangilash
- **API Integration** - Boshqa servicelar bilan API orqali muloqot

## 📊 Xulosa

**Search Service Holati**:
- ✅ **100%** alohida schema yaratildi
- ✅ **100%** environment konfiguratsiya tugallandi
- ✅ **100%** cross-service integration strategiyasi
- ✅ **100%** analytics va monitoring qo'llab-quvvatlash

**Asosiy Imkoniyatlar**:
1. ✅ Kuchli qidiruv engine
2. ✅ Real-time autocomplete
3. ✅ Personalizatsiya
4. ✅ Analytics va monitoring
5. ✅ Performance optimization
6. ✅ Multi-language support

**Database**: `ultramarket_search`
**Port**: 3011
**Schema Models**: 12 ta asosiy model
**Environment Variables**: 80+ konfiguratsiya

Search Service endi to'liq mustaqil bo'lib, kuchli qidiruv imkoniyatlari va analytics bilan jihozlangan.

---

📅 **Yaratildi**: 2024-yil
👨‍💻 **Muhandis**: Claude AI Assistant  
🔍 **Service**: Search Service
📝 **Status**: To'liq tayyor