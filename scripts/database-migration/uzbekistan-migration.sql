-- UltraMarket O'zbekiston Migration Script
-- Bu skript mavjud ma'lumotlar bazasini O'zbekiston bozori uchun moslashtiradi

-- ==========================================
-- 1. USER TABLE UPDATES
-- ==========================================

-- User jadvaliga O'zbek telefon va address maydonlarini qo'shish
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone_uzbek" VARCHAR(20);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address_region" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address_district" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address_mahalla" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address_street" VARCHAR(200);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address_house" VARCHAR(50);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address_apartment" VARCHAR(50);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address_postal_code" VARCHAR(10);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address_landmark" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "delivery_instructions" TEXT;

-- Mavjud address ma'lumotlarini yangi formatga ko'chirish
UPDATE "User" 
SET 
    "address_region" = CASE 
        WHEN "address" LIKE '%Tashkent%' OR "address" LIKE '%Toshkent%' THEN 'Toshkent shahri'
        WHEN "address" LIKE '%Samarkand%' OR "address" LIKE '%Samarqand%' THEN 'Samarqand'
        WHEN "address" LIKE '%Bukhara%' OR "address" LIKE '%Buxoro%' THEN 'Buxoro'
        WHEN "address" LIKE '%Andijan%' OR "address" LIKE '%Andijon%' THEN 'Andijon'
        WHEN "address" LIKE '%Fergana%' OR "address" LIKE '%Farg''ona%' THEN 'Farg''ona'
        WHEN "address" LIKE '%Namangan%' THEN 'Namangan'
        ELSE 'Toshkent shahri'
    END,
    "address_street" = COALESCE("address", 'Aniqlanmagan ko''cha'),
    "address_house" = '1',
    "phone_uzbek" = CASE 
        WHEN "phone" LIKE '+998%' THEN "phone"
        WHEN "phone" LIKE '998%' THEN '+' || "phone"
        ELSE '+998901234567'
    END
WHERE "address" IS NOT NULL;

-- ==========================================
-- 2. PAYMENT METHODS TABLE
-- ==========================================

-- Yangi O'zbek to'lov usullari jadvali yaratish
CREATE TABLE IF NOT EXISTS "UzbekPaymentMethod" (
    "id" SERIAL PRIMARY KEY,
    "code" VARCHAR(50) UNIQUE NOT NULL,
    "name_uz" VARCHAR(100) NOT NULL,
    "name_ru" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "description_uz" TEXT,
    "description_ru" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "processing_fee_percent" DECIMAL(5,2) DEFAULT 0,
    "min_amount" INTEGER DEFAULT 0,
    "max_amount" INTEGER DEFAULT 999999999,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- O'zbek to'lov usullarini qo'shish
INSERT INTO "UzbekPaymentMethod" ("code", "name_uz", "name_ru", "name_en", "description_uz", "description_ru", "processing_fee_percent") VALUES
('CLICK', 'Click to''lov tizimi', 'Платежная система Click', 'Click Payment System', 'Tezkor va xavfsiz to''lov Click ilovasi orqali', 'Быстрая и безопасная оплата через приложение Click', 0.5),
('PAYME', 'Payme to''lov tizimi', 'Платежная система Payme', 'Payme Payment System', 'Payme ilovasi orqali qulay to''lov', 'Удобная оплата через приложение Payme', 0.5),
('UZCARD', 'Uzcard bank kartasi', 'Банковская карта Uzcard', 'Uzcard Bank Card', 'Mahalliy Uzcard kartasi bilan to''lov', 'Оплата местной картой Uzcard', 1.0),
('HUMO', 'Humo bank kartasi', 'Банковская карта Humo', 'Humo Bank Card', 'Humo kartasi bilan xavfsiz to''lov', 'Безопасная оплата картой Humo', 1.0),
('CASH_ON_DELIVERY', 'Yetkazib berganda to''lash', 'Оплата при доставке', 'Cash on Delivery', 'Mahsulotni qabul qilganingizda to''lang', 'Оплачивайте при получении товара', 0);

-- ==========================================
-- 3. ORDER TABLE UPDATES
-- ==========================================

-- Order jadvaliga yangi ustunlar qo'shish
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) DEFAULT 'UZS';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "payment_method_uzbek" VARCHAR(50);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "delivery_region" VARCHAR(100);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "delivery_district" VARCHAR(100);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "delivery_mahalla" VARCHAR(100);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "delivery_street" VARCHAR(200);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "delivery_house" VARCHAR(50);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "delivery_instructions" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "estimated_delivery_date" DATE;

-- Mavjud orderlarni UZS valyutasiga o'tkazish (1 USD = 12300 UZS)
UPDATE "Order" 
SET 
    "total" = "total" * 12300,
    "currency" = 'UZS',
    "payment_method_uzbek" = CASE 
        WHEN "paymentMethod" = 'CARD' THEN 'UZCARD'
        WHEN "paymentMethod" = 'PAYPAL' THEN 'CLICK'
        ELSE 'CASH_ON_DELIVERY'
    END
WHERE "currency" IS NULL OR "currency" != 'UZS';

-- ==========================================
-- 4. PRODUCT PRICING UPDATES
-- ==========================================

-- Product jadvaliga UZS narx ustuni qo'shish
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "price_uzs" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "original_price_uzs" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) DEFAULT 'UZS';

-- Mavjud mahsulot narxlarini UZS ga o'tkazish
UPDATE "Product" 
SET 
    "price_uzs" = ROUND("price" * 12300),
    "original_price_uzs" = ROUND(COALESCE("originalPrice", "price") * 12300),
    "currency" = 'UZS'
WHERE "price_uzs" IS NULL;

-- Asosiy narx ustunlarini yangilash
UPDATE "Product" 
SET 
    "price" = "price_uzs",
    "originalPrice" = "original_price_uzs"
WHERE "price_uzs" IS NOT NULL;

-- ==========================================
-- 5. DELIVERY REGIONS TABLE
-- ==========================================

-- O'zbekiston viloyatlari jadvali
CREATE TABLE IF NOT EXISTS "UzbekRegion" (
    "id" SERIAL PRIMARY KEY,
    "code" VARCHAR(10) UNIQUE NOT NULL,
    "name_uz" VARCHAR(100) NOT NULL,
    "name_ru" VARCHAR(100) NOT NULL,
    "postal_code_prefix" VARCHAR(5),
    "is_active" BOOLEAN DEFAULT true,
    "delivery_fee" INTEGER DEFAULT 25000,
    "delivery_days" INTEGER DEFAULT 3
);

-- Viloyatlarni qo'shish
INSERT INTO "UzbekRegion" ("code", "name_uz", "name_ru", "postal_code_prefix", "delivery_fee", "delivery_days") VALUES
('TSH', 'Toshkent shahri', 'Ташкент город', '100', 15000, 1),
('TOS', 'Toshkent viloyati', 'Ташкентская область', '111', 20000, 2),
('SAM', 'Samarqand', 'Самарканд', '140', 30000, 3),
('BUX', 'Buxoro', 'Бухара', '200', 35000, 4),
('AND', 'Andijon', 'Андижан', '170', 30000, 3),
('FAR', 'Farg''ona', 'Фергана', '150', 30000, 3),
('NAM', 'Namangan', 'Наманган', '160', 30000, 3),
('QAS', 'Qashqadaryo', 'Кашкадарья', '180', 35000, 4),
('SUR', 'Surxondaryo', 'Сурхандарья', '190', 40000, 5),
('JIZ', 'Jizzax', 'Джизак', '130', 25000, 3),
('SIR', 'Sirdaryo', 'Сырдарья', '120', 25000, 3),
('NAV', 'Navoiy', 'Навои', '210', 35000, 4),
('XOR', 'Xorazm', 'Хорезм', '220', 40000, 5),
('QOR', 'Qoraqalpog''iston', 'Каракалпакстан', '230', 45000, 6);

-- ==========================================
-- 6. UZBEK DELIVERY PROVIDERS
-- ==========================================

CREATE TABLE IF NOT EXISTS "UzbekDeliveryProvider" (
    "id" SERIAL PRIMARY KEY,
    "code" VARCHAR(50) UNIQUE NOT NULL,
    "name_uz" VARCHAR(100) NOT NULL,
    "name_ru" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "website" VARCHAR(200),
    "is_active" BOOLEAN DEFAULT true,
    "base_fee" INTEGER DEFAULT 25000,
    "per_kg_fee" INTEGER DEFAULT 5000,
    "max_weight" DECIMAL(5,2) DEFAULT 30.0,
    "coverage_regions" TEXT[], -- Array of region codes
    "tracking_url_template" VARCHAR(500)
);

-- Yetkazib berish provayderlarini qo'shish
INSERT INTO "UzbekDeliveryProvider" ("code", "name_uz", "name_ru", "phone", "website", "base_fee", "coverage_regions", "tracking_url_template") VALUES
('EXPRESS24', 'Express24', 'Экспресс24', '+998712052424', 'express24.uz', 20000, '{TSH,TOS,SAM,BUX,AND,FAR,NAM}', 'https://express24.uz/track/{tracking_number}'),
('UZPOST', 'Uzbekiston Post', 'Узбекистан Почта', '+998712441010', 'pochta.uz', 15000, '{TSH,TOS,SAM,BUX,AND,FAR,NAM,QAS,SUR,JIZ,SIR,NAV,XOR,QOR}', 'https://pochta.uz/track/{tracking_number}'),
('YANDEX', 'Yandex Delivery', 'Яндекс Доставка', '+998712345678', 'yandex.uz', 25000, '{TSH,TOS,SAM}', 'https://delivery.yandex.uz/track/{tracking_number}'),
('LOCAL', 'Mahalliy yetkazib berish', 'Местная доставка', '+998712000000', NULL, 30000, '{TSH,TOS,SAM,BUX,AND,FAR,NAM,QAS,SUR,JIZ,SIR,NAV,XOR,QOR}', NULL);

-- ==========================================
-- 7. PHONE OPERATORS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS "UzbekPhoneOperator" (
    "id" SERIAL PRIMARY KEY,
    "code" VARCHAR(10) UNIQUE NOT NULL,
    "name_uz" VARCHAR(50) NOT NULL,
    "name_ru" VARCHAR(50) NOT NULL,
    "prefixes" VARCHAR(20)[] NOT NULL,
    "is_active" BOOLEAN DEFAULT true
);

-- Telefon operatorlarini qo'shish
INSERT INTO "UzbekPhoneOperator" ("code", "name_uz", "name_ru", "prefixes") VALUES
('UCELL', 'Ucell', 'Ucell', '{90,91,93,94,99}'),
('BEELINE', 'Beeline', 'Билайн', '{90,91,93,94,99}'),
('UZMOBILE', 'UzMobile', 'УзМобайл', '{95,99}'),
('PERFECTUM', 'Perfectum Mobile', 'Перфектум Мобайл', '{97}'),
('HUMANS', 'Humans', 'Хуманс', '{97}');

-- ==========================================
-- 8. SYSTEM CONFIGURATION
-- ==========================================

-- Tizim konfiguratsiyasini yangilash
CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "key" VARCHAR(100) PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- O'zbekiston sozlamalarini qo'shish
INSERT INTO "SystemConfig" ("key", "value", "description") VALUES
('DEFAULT_CURRENCY', 'UZS', 'Asosiy valyuta - O''zbek so''mi'),
('TAX_RATE', '0.12', 'QQS stavkasi (12%)'),
('TIMEZONE', 'Asia/Tashkent', 'Toshkent vaqt zonasi'),
('MIN_ORDER_AMOUNT', '50000', 'Minimal buyurtma summasi (50,000 so''m)'),
('FREE_DELIVERY_THRESHOLD', '500000', 'Bepul yetkazib berish chegarasi (500,000 so''m)'),
('BUSINESS_HOURS_START', '09:00', 'Ish boshlanish vaqti'),
('BUSINESS_HOURS_END', '22:00', 'Ish tugash vaqti'),
('CUSTOMER_SERVICE_PHONE', '+998712000000', 'Mijozlar xizmati telefoni'),
('DEFAULT_LANGUAGE', 'uz', 'Asosiy til'),
('SUPPORTED_LANGUAGES', 'uz,ru,en', 'Qo''llab-quvvatlanadigan tillar')
ON CONFLICT ("key") DO UPDATE SET 
    "value" = EXCLUDED."value",
    "updated_at" = CURRENT_TIMESTAMP;

-- ==========================================
-- 9. CLEANUP AND OPTIMIZATION
-- ==========================================

-- Eski maydonlarni o'chirish (optional)
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "zipCode";
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "state";
-- ALTER TABLE "Order" DROP COLUMN IF EXISTS "shippingAddress";

-- Indekslar qo'shish
CREATE INDEX IF NOT EXISTS "idx_user_phone_uzbek" ON "User" ("phone_uzbek");
CREATE INDEX IF NOT EXISTS "idx_user_region" ON "User" ("address_region");
CREATE INDEX IF NOT EXISTS "idx_order_currency" ON "Order" ("currency");
CREATE INDEX IF NOT EXISTS "idx_order_payment_method" ON "Order" ("payment_method_uzbek");
CREATE INDEX IF NOT EXISTS "idx_product_price_uzs" ON "Product" ("price_uzs");

-- ==========================================
-- 10. DATA VALIDATION FUNCTIONS
-- ==========================================

-- O'zbek telefon raqamini validatsiya qilish funksiyasi
CREATE OR REPLACE FUNCTION validate_uzbek_phone(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- +998 prefiks bilan boshlangan va 12 ta raqamdan iborat bo'lishi kerak
    RETURN phone_number ~ '^\+998[0-9]{9}$' AND 
           SUBSTRING(phone_number, 5, 2) IN ('90', '91', '93', '94', '95', '97', '99');
END;
$$ LANGUAGE plpgsql;

-- O'zbek pochta kodini validatsiya qilish funksiyasi
CREATE OR REPLACE FUNCTION validate_uzbek_postal_code(postal_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- 6 ta raqamdan iborat bo'lishi kerak (masalan: 100000)
    RETURN postal_code ~ '^[0-9]{6}$';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- Migration yakunlanganligi haqida ma'lumot qo'shish
INSERT INTO "SystemConfig" ("key", "value", "description") VALUES
('UZBEKISTAN_MIGRATION_COMPLETED', CURRENT_TIMESTAMP::TEXT, 'O''zbekiston migration yakunlangan sana')
ON CONFLICT ("key") DO UPDATE SET 
    "value" = CURRENT_TIMESTAMP::TEXT,
    "updated_at" = CURRENT_TIMESTAMP;

-- Migration hisoboti
SELECT 
    'USERS' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "phone_uzbek" IS NOT NULL THEN 1 END) as uzbek_phone_set,
    COUNT(CASE WHEN "address_region" IS NOT NULL THEN 1 END) as uzbek_address_set
FROM "User"
UNION ALL
SELECT 
    'ORDERS' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "currency" = 'UZS' THEN 1 END) as uzs_currency,
    COUNT(CASE WHEN "payment_method_uzbek" IS NOT NULL THEN 1 END) as uzbek_payment_set
FROM "Order"
UNION ALL
SELECT 
    'PRODUCTS' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "price_uzs" IS NOT NULL THEN 1 END) as uzs_price_set,
    COUNT(CASE WHEN "currency" = 'UZS' THEN 1 END) as uzs_currency
FROM "Product";

COMMIT; 