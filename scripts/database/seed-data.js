#!/usr/bin/env node

/**
 * UltraMarket Database Seeding Script
 * Seeds the database with sample data for development and testing
 */

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const { createClient } = require('redis');
const { Client } = require('@elastic/elasticsearch');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'ultramarket_db',
    user: process.env.POSTGRES_USER || 'ultramarket_user',
    password: process.env.POSTGRES_PASSWORD || 'ultramarket_password',
  },
  mongodb: {
    url: process.env.MONGO_URL || 'mongodb://localhost:27017/ultramarket_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },
};

// Sample data
const sampleData = {
  users: [
    {
      id: uuidv4(),
      email: 'admin@ultramarket.uz',
      phone: '+998901234567',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      isVerified: true,
    },
    {
      id: uuidv4(),
      email: 'user@ultramarket.uz',
      phone: '+998901234568',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer',
      isActive: true,
      isVerified: true,
    },
    {
      id: uuidv4(),
      email: 'vendor@ultramarket.uz',
      phone: '+998901234569',
      firstName: 'Vendor',
      lastName: 'User',
      role: 'vendor',
      isActive: true,
      isVerified: true,
    },
  ],
  categories: [
    {
      id: uuidv4(),
      name: 'Elektronika',
      nameUz: 'Elektronika',
      nameRu: 'Электроника',
      nameEn: 'Electronics',
      slug: 'elektronika',
      description: 'Barcha turdagi elektron qurilmalar',
      isActive: true,
      sortOrder: 1,
    },
    {
      id: uuidv4(),
      name: 'Kiyim-kechak',
      nameUz: 'Kiyim-kechak',
      nameRu: 'Одежда',
      nameEn: 'Clothing',
      slug: 'kiyim-kechak',
      description: 'Erkaklar va ayollar kiyimlari',
      isActive: true,
      sortOrder: 2,
    },
    {
      id: uuidv4(),
      name: 'Uy-joy',
      nameUz: 'Uy-joy',
      nameRu: 'Дом и сад',
      nameEn: 'Home & Garden',
      slug: 'uy-joy',
      description: "Uy va bog' uchun mahsulotlar",
      isActive: true,
      sortOrder: 3,
    },
    {
      id: uuidv4(),
      name: 'Sport',
      nameUz: 'Sport',
      nameRu: 'Спорт',
      nameEn: 'Sports',
      slug: 'sport',
      description: 'Sport anjomlari va kiyimlari',
      isActive: true,
      sortOrder: 4,
    },
    {
      id: uuidv4(),
      name: 'Avtomobil',
      nameUz: 'Avtomobil',
      nameRu: 'Автомобиль',
      nameEn: 'Automotive',
      slug: 'avtomobil',
      description: 'Avtomobil ehtiyot qismlari va aksessuarlar',
      isActive: true,
      sortOrder: 5,
    },
  ],
  products: [
    {
      id: uuidv4(),
      name: 'iPhone 15 Pro',
      nameUz: 'iPhone 15 Pro',
      nameRu: 'iPhone 15 Pro',
      nameEn: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description: 'Eng yangi iPhone modeli',
      price: 15000000, // 15,000,000 UZS
      discountPrice: 14000000,
      currency: 'UZS',
      sku: 'IPHONE15PRO128',
      barcode: '1234567890123',
      stock: 50,
      isActive: true,
      isFeatured: true,
      brand: 'Apple',
      weight: 0.187,
      dimensions: '146.6 x 70.6 x 7.65 mm',
      specifications: {
        display: '6.1-inch Super Retina XDR',
        processor: 'A17 Pro chip',
        storage: '128GB',
        camera: '48MP Main camera',
        battery: 'Up to 23 hours video playback',
        os: 'iOS 17',
      },
      images: [
        'https://cdn.ultramarket.uz/products/iphone-15-pro-1.jpg',
        'https://cdn.ultramarket.uz/products/iphone-15-pro-2.jpg',
        'https://cdn.ultramarket.uz/products/iphone-15-pro-3.jpg',
      ],
      tags: ['smartphone', 'apple', 'ios', 'premium'],
      seoTitle: 'iPhone 15 Pro - Eng yangi Apple smartfoni',
      seoDescription: 'iPhone 15 Pro - A17 Pro chip, 48MP kamera, titanium dizayn',
      seoKeywords: 'iphone, apple, smartphone, titanium, a17 pro',
    },
    {
      id: uuidv4(),
      name: 'Samsung Galaxy S24',
      nameUz: 'Samsung Galaxy S24',
      nameRu: 'Samsung Galaxy S24',
      nameEn: 'Samsung Galaxy S24',
      slug: 'samsung-galaxy-s24',
      description: 'Samsung flagman smartfoni',
      price: 12000000,
      discountPrice: 11500000,
      currency: 'UZS',
      sku: 'GALAXYS24256',
      barcode: '1234567890124',
      stock: 75,
      isActive: true,
      isFeatured: true,
      brand: 'Samsung',
      weight: 0.167,
      dimensions: '147.0 x 70.6 x 7.6 mm',
      specifications: {
        display: '6.2-inch Dynamic AMOLED 2X',
        processor: 'Snapdragon 8 Gen 3',
        storage: '256GB',
        camera: '50MP Triple camera',
        battery: '4000mAh',
        os: 'Android 14',
      },
      images: [
        'https://cdn.ultramarket.uz/products/galaxy-s24-1.jpg',
        'https://cdn.ultramarket.uz/products/galaxy-s24-2.jpg',
      ],
      tags: ['smartphone', 'samsung', 'android', 'flagship'],
      seoTitle: 'Samsung Galaxy S24 - Flagman smartfon',
      seoDescription: 'Samsung Galaxy S24 - Snapdragon 8 Gen 3, 50MP kamera',
      seoKeywords: 'samsung, galaxy, smartphone, android, snapdragon',
    },
    {
      id: uuidv4(),
      name: 'MacBook Pro 14"',
      nameUz: 'MacBook Pro 14"',
      nameRu: 'MacBook Pro 14"',
      nameEn: 'MacBook Pro 14"',
      slug: 'macbook-pro-14',
      description: 'Professional laptop Apple dan',
      price: 35000000,
      discountPrice: 33000000,
      currency: 'UZS',
      sku: 'MACBOOKPRO14M3',
      barcode: '1234567890125',
      stock: 25,
      isActive: true,
      isFeatured: true,
      brand: 'Apple',
      weight: 1.55,
      dimensions: '312.6 x 221.2 x 15.5 mm',
      specifications: {
        display: '14.2-inch Liquid Retina XDR',
        processor: 'Apple M3 chip',
        memory: '16GB',
        storage: '512GB SSD',
        graphics: '10-core GPU',
        battery: 'Up to 18 hours',
        os: 'macOS Sonoma',
      },
      images: [
        'https://cdn.ultramarket.uz/products/macbook-pro-14-1.jpg',
        'https://cdn.ultramarket.uz/products/macbook-pro-14-2.jpg',
      ],
      tags: ['laptop', 'apple', 'professional', 'macbook'],
      seoTitle: 'MacBook Pro 14" - Professional laptop',
      seoDescription: 'MacBook Pro 14" - Apple M3 chip, 16GB RAM, 512GB SSD',
      seoKeywords: 'macbook, apple, laptop, m3, professional',
    },
    {
      id: uuidv4(),
      name: 'Nike Air Max 270',
      nameUz: 'Nike Air Max 270',
      nameRu: 'Nike Air Max 270',
      nameEn: 'Nike Air Max 270',
      slug: 'nike-air-max-270',
      description: 'Zamonaviy sport poyabzal',
      price: 2500000,
      discountPrice: 2200000,
      currency: 'UZS',
      sku: 'NIKEAIRMAX270',
      barcode: '1234567890126',
      stock: 100,
      isActive: true,
      isFeatured: false,
      brand: 'Nike',
      weight: 0.8,
      dimensions: '30 x 20 x 15 cm',
      specifications: {
        material: 'Mesh va sintetik',
        sole: 'Air Max cushioning',
        closure: 'Lace-up',
        color: 'Black/White',
        gender: 'Unisex',
      },
      images: [
        'https://cdn.ultramarket.uz/products/nike-air-max-270-1.jpg',
        'https://cdn.ultramarket.uz/products/nike-air-max-270-2.jpg',
      ],
      tags: ['shoes', 'nike', 'sport', 'sneakers'],
      seoTitle: 'Nike Air Max 270 - Sport poyabzal',
      seoDescription: 'Nike Air Max 270 - Zamonaviy dizayn, Air Max cushioning',
      seoKeywords: 'nike, air max, sport, poyabzal, sneakers',
    },
    {
      id: uuidv4(),
      name: 'Artel Smart TV 55"',
      nameUz: 'Artel Smart TV 55"',
      nameRu: 'Artel Smart TV 55"',
      nameEn: 'Artel Smart TV 55"',
      slug: 'artel-smart-tv-55',
      description: "O'zbek brendining smart televizori",
      price: 8000000,
      discountPrice: 7500000,
      currency: 'UZS',
      sku: 'ARTELTV55SMART',
      barcode: '1234567890127',
      stock: 30,
      isActive: true,
      isFeatured: true,
      brand: 'Artel',
      weight: 15.2,
      dimensions: '1230 x 708 x 75 mm',
      specifications: {
        display: '55-inch 4K UHD',
        resolution: '3840 x 2160',
        smartOS: 'Android TV',
        connectivity: 'Wi-Fi, Bluetooth, HDMI, USB',
        audio: 'Dolby Digital',
        energyClass: 'A++',
      },
      images: [
        'https://cdn.ultramarket.uz/products/artel-tv-55-1.jpg',
        'https://cdn.ultramarket.uz/products/artel-tv-55-2.jpg',
      ],
      tags: ['tv', 'smart', 'artel', 'uzbekistan'],
      seoTitle: 'Artel Smart TV 55" - O\'zbek brendining televizori',
      seoDescription: 'Artel Smart TV 55" - 4K UHD, Android TV, Wi-Fi',
      seoKeywords: 'artel, smart tv, televizor, 4k, uzbekistan',
    },
  ],
  orders: [
    {
      id: uuidv4(),
      orderNumber: 'UM-2024-000001',
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'click',
      totalAmount: 15000000,
      currency: 'UZS',
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        phone: '+998901234568',
        address: 'Toshkent shahri, Chilonzor tumani, 1-kvartal',
        city: 'Toshkent',
        region: 'Toshkent',
        postalCode: '100000',
        country: 'Uzbekistan',
      },
      items: [
        {
          productId: 'product-1',
          productName: 'iPhone 15 Pro',
          quantity: 1,
          price: 15000000,
          totalPrice: 15000000,
        },
      ],
      notes: 'Tezroq yetkazib bering',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      updatedAt: new Date('2024-01-15T16:45:00Z'),
    },
    {
      id: uuidv4(),
      orderNumber: 'UM-2024-000002',
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'payme',
      totalAmount: 12000000,
      currency: 'UZS',
      shippingAddress: {
        firstName: 'Vendor',
        lastName: 'User',
        phone: '+998901234569',
        address: "Samarqand shahri, Registon ko'chasi, 25-uy",
        city: 'Samarqand',
        region: 'Samarqand',
        postalCode: '140000',
        country: 'Uzbekistan',
      },
      items: [
        {
          productId: 'product-2',
          productName: 'Samsung Galaxy S24',
          quantity: 1,
          price: 12000000,
          totalPrice: 12000000,
        },
      ],
      notes: '',
      createdAt: new Date('2024-01-16T14:20:00Z'),
      updatedAt: new Date('2024-01-16T14:20:00Z'),
    },
  ],
  reviews: [
    {
      id: uuidv4(),
      productId: 'product-1',
      userId: 'user-1',
      rating: 5,
      title: 'Ajoyib telefon!',
      comment: "iPhone 15 Pro haqiqatan ham zo'r. Kamera sifati va tezligi juda yaxshi.",
      isVerified: true,
      isApproved: true,
      helpfulCount: 12,
      createdAt: new Date('2024-01-17T09:15:00Z'),
    },
    {
      id: uuidv4(),
      productId: 'product-2',
      userId: 'user-2',
      rating: 4,
      title: 'Yaxshi telefon',
      comment: 'Samsung Galaxy S24 yaxshi telefon, lekin batareya hayoti biroz kam.',
      isVerified: true,
      isApproved: true,
      helpfulCount: 8,
      createdAt: new Date('2024-01-18T11:30:00Z'),
    },
  ],
  notificationTemplates: [
    {
      id: uuidv4(),
      name: 'welcome_email',
      type: 'email',
      subject: 'UltraMarket-ga xush kelibsiz!',
      content: `
        <h1>Salom {{firstName}}!</h1>
        <p>UltraMarket-ga xush kelibsiz! Sizning akkauntingiz muvaffaqiyatli yaratildi.</p>
        <p>Endi siz bizning platformamizda xarid qilishingiz mumkin.</p>
        <a href="{{frontendUrl}}/products">Mahsulotlarni ko'rish</a>
      `,
      language: 'uz',
      isActive: true,
    },
    {
      id: uuidv4(),
      name: 'order_confirmation',
      type: 'email',
      subject: 'Buyurtmangiz tasdiqlandi - {{orderNumber}}',
      content: `
        <h1>Buyurtmangiz tasdiqlandi!</h1>
        <p>Hurmatli {{firstName}}, sizning {{orderNumber}} raqamli buyurtmangiz tasdiqlandi.</p>
        <p>Umumiy summa: {{totalAmount}} {{currency}}</p>
        <p>Yetkazib berish manzili: {{shippingAddress}}</p>
        <p>Buyurtmangizni kuzatish uchun <a href="{{frontendUrl}}/orders/{{orderId}}">bu yerga bosing</a></p>
      `,
      language: 'uz',
      isActive: true,
    },
    {
      id: uuidv4(),
      name: 'sms_verification',
      type: 'sms',
      subject: '',
      content: 'UltraMarket tasdiqlash kodi: {{code}}. Uni hech kimga bermang!',
      language: 'uz',
      isActive: true,
    },
  ],
};

// Database connections
let pgClient, mongoClient, redisClient, esClient;

async function connectDatabases() {
  console.log("🔌 Ma'lumotlar bazalariga ulanish...");

  // PostgreSQL
  pgClient = new Pool(config.postgres);
  await pgClient.connect();
  console.log('✅ PostgreSQL ga ulandi');

  // MongoDB
  mongoClient = new MongoClient(config.mongodb.url);
  await mongoClient.connect();
  console.log('✅ MongoDB ga ulandi');

  // Redis
  redisClient = createClient(config.redis);
  await redisClient.connect();
  console.log('✅ Redis ga ulandi');

  // Elasticsearch
  esClient = new Client(config.elasticsearch);
  await esClient.ping();
  console.log('✅ Elasticsearch ga ulandi');
}

async function seedPostgreSQL() {
  console.log("🌱 PostgreSQL ma'lumotlarini to'ldirish...");

  // Seed users
  for (const user of sampleData.users) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await pgClient.query(
      `
      INSERT INTO users (id, email, phone, first_name, last_name, password_hash, role, is_active, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `,
      [
        user.id,
        user.email,
        user.phone,
        user.firstName,
        user.lastName,
        hashedPassword,
        user.role,
        user.isActive,
        user.isVerified,
      ]
    );
  }

  // Seed categories
  for (const category of sampleData.categories) {
    await pgClient.query(
      `
      INSERT INTO categories (id, name, name_uz, name_ru, name_en, slug, description, is_active, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (slug) DO NOTHING
    `,
      [
        category.id,
        category.name,
        category.nameUz,
        category.nameRu,
        category.nameEn,
        category.slug,
        category.description,
        category.isActive,
        category.sortOrder,
      ]
    );
  }

  // Seed products
  for (const product of sampleData.products) {
    await pgClient.query(
      `
      INSERT INTO products (id, name, name_uz, name_ru, name_en, slug, description, price, discount_price, currency, sku, barcode, stock, is_active, is_featured, brand, weight, dimensions, specifications, images, tags, seo_title, seo_description, seo_keywords, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW())
      ON CONFLICT (slug) DO NOTHING
    `,
      [
        product.id,
        product.name,
        product.nameUz,
        product.nameRu,
        product.nameEn,
        product.slug,
        product.description,
        product.price,
        product.discountPrice,
        product.currency,
        product.sku,
        product.barcode,
        product.stock,
        product.isActive,
        product.isFeatured,
        product.brand,
        product.weight,
        product.dimensions,
        JSON.stringify(product.specifications),
        JSON.stringify(product.images),
        JSON.stringify(product.tags),
        product.seoTitle,
        product.seoDescription,
        product.seoKeywords,
      ]
    );
  }

  // Seed orders
  for (const order of sampleData.orders) {
    await pgClient.query(
      `
      INSERT INTO orders (id, order_number, user_id, status, payment_status, payment_method, total_amount, currency, shipping_address, items, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (order_number) DO NOTHING
    `,
      [
        order.id,
        order.orderNumber,
        sampleData.users[1].id,
        order.status,
        order.paymentStatus,
        order.paymentMethod,
        order.totalAmount,
        order.currency,
        JSON.stringify(order.shippingAddress),
        JSON.stringify(order.items),
        order.notes,
        order.createdAt,
        order.updatedAt,
      ]
    );
  }

  // Seed notification templates
  for (const template of sampleData.notificationTemplates) {
    await pgClient.query(
      `
      INSERT INTO notification_templates (id, name, type, subject, content, language, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (name, type) DO NOTHING
    `,
      [
        template.id,
        template.name,
        template.type,
        template.subject,
        template.content,
        template.language,
        template.isActive,
      ]
    );
  }

  console.log("✅ PostgreSQL ma'lumotlari to'ldirildi");
}

async function seedMongoDB() {
  console.log("🌱 MongoDB ma'lumotlarini to'ldirish...");

  const db = mongoClient.db();

  // Seed products in MongoDB (for flexible data)
  const productsCollection = db.collection('products');
  for (const product of sampleData.products) {
    await productsCollection.updateOne(
      { _id: product.id },
      {
        $set: {
          ...product,
          _id: product.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  // Seed reviews
  const reviewsCollection = db.collection('reviews');
  for (const review of sampleData.reviews) {
    await reviewsCollection.updateOne(
      { _id: review.id },
      {
        $set: {
          ...review,
          _id: review.id,
          createdAt: review.createdAt,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  // Seed analytics data
  const analyticsCollection = db.collection('analytics');
  const analyticsData = [
    {
      _id: uuidv4(),
      type: 'page_view',
      page: '/products',
      userId: sampleData.users[1].id,
      timestamp: new Date(),
      metadata: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ip: '192.168.1.1',
        referer: 'https://google.com',
      },
    },
    {
      _id: uuidv4(),
      type: 'product_view',
      productId: sampleData.products[0].id,
      userId: sampleData.users[1].id,
      timestamp: new Date(),
      metadata: {
        duration: 45000,
        scrollDepth: 80,
      },
    },
  ];

  for (const data of analyticsData) {
    await analyticsCollection.updateOne({ _id: data._id }, { $set: data }, { upsert: true });
  }

  console.log("✅ MongoDB ma'lumotlari to'ldirildi");
}

async function seedRedis() {
  console.log("🌱 Redis ma'lumotlarini to'ldirish...");

  // Cache some frequently accessed data
  for (const product of sampleData.products.slice(0, 3)) {
    await redisClient.setEx(`product:${product.id}`, 3600, JSON.stringify(product));
  }

  // Cache categories
  await redisClient.setEx('categories:all', 3600, JSON.stringify(sampleData.categories));

  // Set some counters
  await redisClient.set('stats:total_products', sampleData.products.length);
  await redisClient.set('stats:total_users', sampleData.users.length);
  await redisClient.set('stats:total_orders', sampleData.orders.length);

  console.log("✅ Redis ma'lumotlari to'ldirildi");
}

async function seedElasticsearch() {
  console.log("🌱 Elasticsearch ma'lumotlarini to'ldirish...");

  // Create products index if it doesn't exist
  const indexExists = await esClient.indices.exists({ index: 'products' });
  if (!indexExists) {
    await esClient.indices.create({
      index: 'products',
      body: {
        settings: {
          analysis: {
            analyzer: {
              uzbek_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop'],
              },
            },
          },
        },
        mappings: {
          properties: {
            name: { type: 'text', analyzer: 'uzbek_analyzer' },
            nameUz: { type: 'text', analyzer: 'uzbek_analyzer' },
            nameRu: { type: 'text', analyzer: 'russian' },
            nameEn: { type: 'text', analyzer: 'english' },
            description: { type: 'text', analyzer: 'uzbek_analyzer' },
            price: { type: 'float' },
            discountPrice: { type: 'float' },
            brand: { type: 'keyword' },
            category: { type: 'keyword' },
            tags: { type: 'keyword' },
            isActive: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            stock: { type: 'integer' },
            createdAt: { type: 'date' },
          },
        },
      },
    });
  }

  // Index products
  for (const product of sampleData.products) {
    await esClient.index({
      index: 'products',
      id: product.id,
      body: {
        ...product,
        createdAt: new Date(),
      },
    });
  }

  // Refresh index
  await esClient.indices.refresh({ index: 'products' });

  console.log("✅ Elasticsearch ma'lumotlari to'ldirildi");
}

async function createSampleFiles() {
  console.log('📁 Namuna fayllarini yaratish...');

  const sampleDir = path.join(__dirname, '../sample-data');
  if (!fs.existsSync(sampleDir)) {
    fs.mkdirSync(sampleDir, { recursive: true });
  }

  // Create sample JSON files
  fs.writeFileSync(
    path.join(sampleDir, 'products.json'),
    JSON.stringify(sampleData.products, null, 2)
  );

  fs.writeFileSync(path.join(sampleDir, 'users.json'), JSON.stringify(sampleData.users, null, 2));

  fs.writeFileSync(path.join(sampleDir, 'orders.json'), JSON.stringify(sampleData.orders, null, 2));

  // Create sample CSV file
  const csvHeaders = 'id,name,price,brand,category,stock\n';
  const csvData = sampleData.products
    .map((p) => `${p.id},${p.name},${p.price},${p.brand},Electronics,${p.stock}`)
    .join('\n');

  fs.writeFileSync(path.join(sampleDir, 'products.csv'), csvHeaders + csvData);

  console.log('✅ Namuna fayllar yaratildi');
}

async function closeDatabases() {
  console.log("🔌 Ma'lumotlar bazalari ulanishini yopish...");

  if (pgClient) await pgClient.end();
  if (mongoClient) await mongoClient.close();
  if (redisClient) await redisClient.quit();

  console.log('✅ Barcha ulanishlar yopildi');
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log("🌱 UltraMarket ma'lumotlar bazasini to'ldirish boshlandi...");
    console.log('==========================================');

    await connectDatabases();
    await seedPostgreSQL();
    await seedMongoDB();
    await seedRedis();
    await seedElasticsearch();
    await createSampleFiles();

    console.log('==========================================');
    console.log("🎉 Ma'lumotlar bazasi muvaffaqiyatli to'ldirildi!");
    console.log('');
    console.log("📊 To'ldirilgan ma'lumotlar:");
    console.log(`   • Foydalanuvchilar: ${sampleData.users.length}`);
    console.log(`   • Kategoriyalar: ${sampleData.categories.length}`);
    console.log(`   • Mahsulotlar: ${sampleData.products.length}`);
    console.log(`   • Buyurtmalar: ${sampleData.orders.length}`);
    console.log(`   • Sharhlar: ${sampleData.reviews.length}`);
    console.log(`   • Notification templatelar: ${sampleData.notificationTemplates.length}`);
    console.log('');
    console.log("🔐 Default login ma'lumotlari:");
    console.log('   • Admin: admin@ultramarket.uz / password123');
    console.log('   • User: user@ultramarket.uz / password123');
    console.log('   • Vendor: vendor@ultramarket.uz / password123');
    console.log('');
    console.log('🚀 Endi backend servislarini ishga tushiring: npm run start:dev');
  } catch (error) {
    console.error('❌ Xatolik yuz berdi:', error);
    process.exit(1);
  } finally {
    await closeDatabases();
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleData };
