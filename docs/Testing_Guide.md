# UltraMarket Test Qo'llanmasi

Bu qo'llanma UltraMarket e-commerce platformasi uchun testlarni qanday o'tkazish bo'yicha qo'llanmani o'z ichiga oladi.

## Test turlari

UltraMarket loyihasida quyidagi test turlari mavjud:

1. **Unit testlar** - alohida komponentlar va servislarni tekshirish
2. **Integration testlar** - mikroservislar o'rtasidagi integratsiyani tekshirish
3. **E2E testlar** - to'liq foydalanuvchi jarayonini tekshirish
4. **Performance testlar** - tizim ishlashini va yuklanishga chidamliligini tekshirish

## Test ishga tushirish

### Unit testlar

Har bir mikroservisning unit testlarini alohida ishga tushirish uchun:

```bash
# Product Service testlari
cd microservices/business/product-service/product-service
npm test

# Order Service testlari
cd microservices/business/order-service/order-service
npm test

# Cart Service testlari
cd microservices/business/cart-service/cart-service
npm test
```

Barcha servislar testlarini bir vaqtda ishga tushirish uchun:

```bash
npm run test:all
```

### E2E testlar

E2E testlarni ishga tushirish uchun Cypress yordamida:

```bash
cd tests/e2e
npm install  # Faqat birinchi marta
npm run cypress:open  # Visual mode
npm run cypress:run  # Headless mode
```

### Performance testlar

K6 bilan performance testlarini ishga tushirish:

```bash
cd tests/performance
k6 run stress-test.js  # Stress test
k6 run spike-test.js  # Spike test
k6 run endurance-test.js  # Endurance test
```

## VS Code Tasks

Loyiha VS Code tasks orqali testlarni tezda ishga tushirish imkonini beradi:

- `Test All Services` - barcha servislar testlarini ishga tushiradi
- `Test Product Service` - faqat product service testlarini ishga tushiradi
- `Test Order Service` - faqat order service testlarini ishga tushiradi
- `Test Cart Service` - faqat cart service testlarini ishga tushiradi
- `Run E2E Tests` - barcha E2E testlarni headless rejimda ishga tushiradi
- `Open Cypress` - Cypress testlarni visual rejimda ishga tushiradi
- `Run Performance Tests` - K6 stress testlarini ishga tushiradi

## Test natijalarini tahlil qilish

Unit test natijalari jest report formatida chiqariladi va coverage ma'lumotlari ham ko'rsatiladi.

E2E testlari natijalari Cypress dashboard orqali ko'rilishi mumkin.

Performance test natijalari K6 tomonidan terminal va JSON formatda chiqariladi.

## Test strategiyasi

UltraMarket loyihasi quyidagi test strategiyasiga amal qiladi:

- Unit testlar: 70% coverage
- Integration testlar: 20% coverage
- E2E testlar: 10% coverage

Barcha yangi funksionalliklar uchun testlar yozilishi kerak va PR qabul qilishdan oldin o'tkazilishi kerak.
