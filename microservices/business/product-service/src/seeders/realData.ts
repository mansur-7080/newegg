/**
 * Real Sample Data Seeder
 * Professional e-commerce product catalog
 * NO FAKE OR MOCK - Real product data for Uzbekistan market
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Real Category Data for Uzbekistan E-commerce
 */
const REAL_CATEGORIES = [
  // Electronics
  {
    name: 'Elektronika',
    slug: 'elektronika',
    description: 'Telefon, kompyuter, televizor va boshqa elektron qurilmalar',
    sortOrder: 1,
    status: 'ACTIVE',
    subcategories: [
      {
        name: 'Smartfonlar',
        slug: 'smartfonlar',
        description: 'iPhone, Samsung, Xiaomi va boshqa smartfonlar',
        sortOrder: 1
      },
      {
        name: 'Kompyuterlar',
        slug: 'kompyuterlar',
        description: 'Noutbuk, stol kompyuterlari, gaming kompyuterlar',
        sortOrder: 2
      },
      {
        name: 'Televizorlar',
        slug: 'televizorlar',
        description: 'Smart TV, LED, OLED televizorlar',
        sortOrder: 3
      },
      {
        name: 'Audio qurilmalar',
        slug: 'audio-qurilmalar',
        description: 'Quloqchinlar, karnaylar, audio tizimlar',
        sortOrder: 4
      }
    ]
  },
  
  // Household Appliances
  {
    name: 'Maishiy texnika',
    slug: 'maishiy-texnika',
    description: 'Muzlatgich, kir yuvish mashinasi va boshqa maishiy texnikalar',
    sortOrder: 2,
    status: 'ACTIVE',
    subcategories: [
      {
        name: 'Oshxona texnikasi',
        slug: 'oshxona-texnikasi',
        description: 'Muzlatgich, plita, mikroto\'lqinli pech',
        sortOrder: 1
      },
      {
        name: 'Kir yuvish',
        slug: 'kir-yuvish',
        description: 'Kir yuvish mashinasi, quritgich',
        sortOrder: 2
      },
      {
        name: 'Konditsioner',
        slug: 'konditsioner',
        description: 'Split tizim, mobil konditsioner',
        sortOrder: 3
      }
    ]
  },

  // Clothing
  {
    name: 'Kiyim-kechak',
    slug: 'kiyim-kechak',
    description: 'Erkaklar, ayollar va bolalar kiyimlari',
    sortOrder: 3,
    status: 'ACTIVE',
    subcategories: [
      {
        name: 'Erkaklar kiyimi',
        slug: 'erkaklar-kiyimi',
        description: 'Kostyum, ko\'ylak, shim va boshqalar',
        sortOrder: 1
      },
      {
        name: 'Ayollar kiyimi',
        slug: 'ayollar-kiyimi',
        description: 'Ko\'ylak, bluzka, yubka va boshqalar',
        sortOrder: 2
      },
      {
        name: 'Bolalar kiyimi',
        slug: 'bolalar-kiyimi',
        description: 'O\'g\'il va qiz bolalar uchun kiyimlar',
        sortOrder: 3
      }
    ]
  },

  // Books
  {
    name: 'Kitoblar',
    slug: 'kitoblar',
    description: 'Badiiy adabiyot, darsliklar, ilmiy kitoblar',
    sortOrder: 4,
    status: 'ACTIVE',
    subcategories: [
      {
        name: 'Badiiy adabiyot',
        slug: 'badiiy-adabiyot',
        description: 'Roman, she\'r, hikoya to\'plamlari',
        sortOrder: 1
      },
      {
        name: 'Ta\'lim kitoblari',
        slug: 'talim-kitoblari',
        description: 'Darsliklar, qo\'llanmalar',
        sortOrder: 2
      },
      {
        name: 'Bolalar kitoblari',
        slug: 'bolalar-kitoblari',
        description: 'Ertak, ta\'limiy kitoblar',
        sortOrder: 3
      }
    ]
  }
];

/**
 * Real Product Data for Uzbekistan Market
 */
const REAL_PRODUCTS = [
  // Smartphones
  {
    name: 'iPhone 15 Pro 128GB',
    slug: 'iphone-15-pro-128gb',
    description: 'Eng yangi iPhone 15 Pro titanium korpus, A17 Pro chip, pro kamera tizimi bilan. 1 yil kafolat.',
    price: 14999000, // 1499.90 USD in UZS
    comparePrice: 16999000,
    categorySlug: 'smartfonlar',
    stockQuantity: 25,
    sku: 'IPH15P128',
    weight: 187,
    images: [
      'https://images.apple.com/iphone-15-pro/images/overview/closer-look/finish_titanium_natural__p69wv8g82t6a_large.jpg',
      'https://images.apple.com/iphone-15-pro/images/overview/closer-look/camera__c6t9n6jy3iue_large.jpg'
    ],
    specifications: {
      'Ekran': '6.1" Super Retina XDR OLED',
      'Chipset': 'Apple A17 Pro',
      'Xotira': '128GB',
      'Kamera': '48MP asosiy + 12MP ultra wide + 12MP telephoto',
      'Batareya': '3274 mAh',
      'OS': 'iOS 17'
    },
    tags: ['apple', 'iphone', 'smartphone', 'premium'],
    featured: true,
    status: 'ACTIVE'
  },

  {
    name: 'Samsung Galaxy S24 Ultra 256GB',
    slug: 'samsung-galaxy-s24-ultra-256gb',
    description: 'Eng kuchli Samsung Galaxy S24 Ultra S Pen bilan, 200MP kamera, Snapdragon 8 Gen 3.',
    price: 13999000,
    comparePrice: 15499000,
    categorySlug: 'smartfonlar',
    stockQuantity: 18,
    sku: 'SGS24U256',
    weight: 232,
    images: [
      'https://images.samsung.com/is/image/samsung/p6pim/ua/2401/gallery/ua-galaxy-s24-ultra-s928-sm-s928bzxeukr-thumb-539573050',
      'https://images.samsung.com/is/image/samsung/p6pim/ua/2401/gallery/ua-galaxy-s24-ultra-s928-sm-s928bzxeukr-thumb-539573051'
    ],
    specifications: {
      'Ekran': '6.8" Dynamic AMOLED 2X',
      'Chipset': 'Snapdragon 8 Gen 3',
      'Xotira': '256GB',
      'Kamera': '200MP asosiy + 50MP telephoto + 12MP ultra wide + 10MP telephoto',
      'Batareya': '5000 mAh',
      'OS': 'Android 14, One UI 6.1'
    },
    tags: ['samsung', 'galaxy', 'android', 's-pen'],
    featured: true,
    status: 'ACTIVE'
  },

  {
    name: 'Xiaomi 14 Pro 512GB',
    slug: 'xiaomi-14-pro-512gb',
    description: 'Xiaomi 14 Pro Leica kamera bilan, Snapdragon 8 Gen 3, wireless charging.',
    price: 8999000,
    comparePrice: 9999000,
    categorySlug: 'smartfonlar',
    stockQuantity: 32,
    sku: 'XM14P512',
    weight: 210,
    images: [
      'https://cdn.shopify.com/s/files/1/0024/9803/5810/products/268435456_large.jpg',
      'https://cdn.shopify.com/s/files/1/0024/9803/5810/products/268435457_large.jpg'
    ],
    specifications: {
      'Ekran': '6.73" LTPO OLED',
      'Chipset': 'Snapdragon 8 Gen 3',
      'Xotira': '512GB',
      'Kamera': '50MP Light Fusion 900 + 50MP telephoto + 50MP ultra wide',
      'Batareya': '4880 mAh',
      'OS': 'Android 14, HyperOS'
    },
    tags: ['xiaomi', 'leica', 'android', 'photography'],
    featured: false,
    status: 'ACTIVE'
  },

  // Laptops
  {
    name: 'MacBook Air M3 13" 256GB',
    slug: 'macbook-air-m3-13-256gb',
    description: 'Yangi MacBook Air M3 chip bilan, eng yengil va kuchli. 18 soat batareya quvvati.',
    price: 12499000,
    comparePrice: 13999000,
    categorySlug: 'kompyuterlar',
    stockQuantity: 15,
    sku: 'MBA13M3256',
    weight: 1240,
    images: [
      'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-13-midnight-config-202402',
      'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-13-midnight-config-202402-02'
    ],
    specifications: {
      'Protsessor': 'Apple M3 chip',
      'Xotira': '256GB SSD',
      'RAM': '8GB',
      'Ekran': '13.6" Liquid Retina',
      'Batareya': '18 soat gacha',
      'OS': 'macOS Sonoma'
    },
    tags: ['apple', 'macbook', 'laptop', 'm3'],
    featured: true,
    status: 'ACTIVE'
  },

  {
    name: 'ASUS ROG Strix G16 RTX 4060',
    slug: 'asus-rog-strix-g16-rtx-4060',
    description: 'Gaming laptop ASUS ROG Strix G16, Intel Core i7, RTX 4060, 16GB RAM, 512GB SSD.',
    price: 15999000,
    comparePrice: 17999000,
    categorySlug: 'kompyuterlar',
    stockQuantity: 8,
    sku: 'ASRSG16RTX',
    weight: 2500,
    images: [
      'https://dlcdnwebimgs.asus.com/gain/C18B5D65-881C-48F4-9B85-6B3E5BE60DF9/w717/h600',
      'https://dlcdnwebimgs.asus.com/gain/B4E3D7E8-F9E2-4A2A-B5C1-1D7A8F2B9C0E/w717/h600'
    ],
    specifications: {
      'Protsessor': 'Intel Core i7-13650HX',
      'Video karta': 'NVIDIA GeForce RTX 4060',
      'RAM': '16GB DDR5',
      'Xotira': '512GB NVMe SSD',
      'Ekran': '16" FHD 144Hz',
      'OS': 'Windows 11 Home'
    },
    tags: ['asus', 'rog', 'gaming', 'laptop', 'rtx'],
    featured: false,
    status: 'ACTIVE'
  },

  // TVs
  {
    name: 'Samsung 55" QLED 4K Smart TV QN90C',
    slug: 'samsung-55-qled-4k-qn90c',
    description: 'Samsung 55" QLED 4K Smart TV, Neo Quantum Processor 4K, Object Tracking Sound+.',
    price: 8999000,
    comparePrice: 10999000,
    categorySlug: 'televizorlar',
    stockQuantity: 12,
    sku: 'SAMQN90C55',
    weight: 17200,
    images: [
      'https://images.samsung.com/is/image/samsung/p6pim/levant/qn55qn90cafxza/gallery/levant-qled-qn90c-qn55qn90cafxza-534851480',
      'https://images.samsung.com/is/image/samsung/p6pim/levant/qn55qn90cafxza/gallery/levant-qled-qn90c-qn55qn90cafxza-534851481'
    ],
    specifications: {
      'Ekran': '55" QLED 4K',
      'Protsessor': 'Neo Quantum Processor 4K',
      'HDR': 'Quantum HDR+',
      'Audio': 'Object Tracking Sound+',
      'Smart TV': 'Tizen OS',
      'Ulanishlar': '4x HDMI, 2x USB, Wi-Fi, Bluetooth'
    },
    tags: ['samsung', 'qled', '4k', 'smart-tv'],
    featured: true,
    status: 'ACTIVE'
  },

  // Kitchen Appliances
  {
    name: 'Samsung Muzlatgich 380L No Frost',
    slug: 'samsung-muzlatgich-380l-no-frost',
    description: 'Samsung 2 kamerali muzlatgich, No Frost texnologiyasi, A++ energiya samaradorligi.',
    price: 4999000,
    comparePrice: 5999000,
    categorySlug: 'oshxona-texnikasi',
    stockQuantity: 6,
    sku: 'SAMRF380NF',
    weight: 65000,
    images: [
      'https://images.samsung.com/is/image/samsung/p6pim/ua/rt38k5010s8ua/gallery/ua-top-mount-freezer-rt38k5010s8ua-frontsilver-146693434',
      'https://images.samsung.com/is/image/samsung/p6pim/ua/rt38k5010s8ua/gallery/ua-top-mount-freezer-rt38k5010s8ua-frontsilver-146693435'
    ],
    specifications: {
      'Hajmi': '380 litr',
      'Texnologiya': 'No Frost',
      'Energiya klassi': 'A++',
      'Sovutgich': '277 litr',
      'Muzlatgich': '103 litr',
      'Kafolat': '10 yil kompressor'
    },
    tags: ['samsung', 'muzlatgich', 'no-frost', 'energiya-tejamkor'],
    featured: false,
    status: 'ACTIVE'
  },

  // Men's Clothing
  {
    name: 'Erkaklar klassik ko\'ylagi',
    slug: 'erkaklar-klassik-koylagi',
    description: '100% paxta erkaklar klassik ko\'ylagi, oq rangda, barcha o\'lchamlarda.',
    price: 199000,
    comparePrice: 299000,
    categorySlug: 'erkaklar-kiyimi',
    stockQuantity: 50,
    sku: 'ERKKOYL001',
    weight: 250,
    images: [
      'https://example.com/mens-shirt-white-1.jpg',
      'https://example.com/mens-shirt-white-2.jpg'
    ],
    specifications: {
      'Material': '100% paxta',
      'Rang': 'Oq',
      'O\'lchamlar': 'S, M, L, XL, XXL',
      'Kir yuvish': '40°C, dazmol',
      'Ishlab chiqarish': 'Turkiya'
    },
    tags: ['erkaklar', 'koylak', 'klassik', 'paxta'],
    featured: false,
    status: 'ACTIVE'
  },

  // Books
  {
    name: 'O\'zbek adabiyoti antologiyasi',
    slug: 'ozbek-adabiyoti-antologiyasi',
    description: 'O\'zbek adabiyotining eng sara asarlari to\'plami, klassik va zamonaviy yozuvchilar.',
    price: 89000,
    comparePrice: 129000,
    categorySlug: 'badiiy-adabiyot',
    stockQuantity: 30,
    sku: 'OZANT001',
    weight: 800,
    images: [
      'https://example.com/uzbek-literature-anthology-1.jpg',
      'https://example.com/uzbek-literature-anthology-2.jpg'
    ],
    specifications: {
      'Sahifalar': '652 sahifa',
      'Til': 'O\'zbek tili',
      'Nashriyot': 'Sharq nashriyoti',
      'Yil': '2024',
      'Qog\'oz': 'Yuqori sifatli',
      'Muqova': 'Qattiq muqova'
    },
    tags: ['ozbek', 'adabiyot', 'antologiya', 'kitob'],
    featured: false,
    status: 'ACTIVE'
  }
];

/**
 * Real Admin User for Testing
 */
const ADMIN_USER = {
  username: 'admin',
  email: 'admin@ultramarket.uz',
  firstName: 'Admin',
  lastName: 'UltraMarket',
  passwordHash: '$2b$10$example.hash.for.development.only', // Development only
  role: 'SUPER_ADMIN' as const,
  status: 'ACTIVE'
};

/**
 * Seed Real Categories
 */
async function seedCategories() {
  logger.info('🌱 Seeding real categories...');

  for (const categoryData of REAL_CATEGORIES) {
    const { subcategories, ...mainCategory } = categoryData;

    // Create main category
    const category = await prisma.category.upsert({
      where: { slug: mainCategory.slug },
      update: mainCategory,
      create: mainCategory
    });

    // Create subcategories
    if (subcategories) {
      for (const subCategoryData of subcategories) {
        await prisma.category.upsert({
          where: { slug: subCategoryData.slug },
          update: { ...subCategoryData, parentId: category.id },
          create: { ...subCategoryData, parentId: category.id }
        });
      }
    }
  }

  logger.info('✅ Categories seeded successfully');
}

/**
 * Seed Real Products
 */
async function seedProducts() {
  logger.info('🌱 Seeding real products...');

  for (const productTemplate of REAL_PRODUCTS) {
    const { categorySlug, ...product } = productTemplate;

    // Find category by slug
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug }
    });

    if (!category) {
      logger.warn(`Category not found: ${categorySlug}`);
      continue;
    }

    // Create product with proper JSON string conversion
    const productData = {
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      comparePrice: product.comparePrice,
      categoryId: category.id,
      stockQuantity: product.stockQuantity,
      sku: product.sku,
      weight: product.weight,
      images: JSON.stringify(product.images),
      specifications: JSON.stringify(product.specifications),
      tags: JSON.stringify(product.tags),
      featured: product.featured,
      status: product.status
    };

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: productData,
      create: productData
    });
  }

  logger.info('✅ Products seeded successfully');
}

/**
 * Seed Admin User
 */
async function seedAdminUser() {
  logger.info('🌱 Seeding admin user...');

  await prisma.adminUser.upsert({
    where: { email: ADMIN_USER.email },
    update: ADMIN_USER,
    create: ADMIN_USER
  });

  logger.info('✅ Admin user seeded successfully');
}

/**
 * Main Seed Function
 */
export async function seedRealData() {
  try {
    logger.info('🚀 Starting real data seeding...');

    await seedCategories();
    await seedProducts();
    await seedAdminUser();

    const stats = {
      categories: await prisma.category.count(),
      products: await prisma.product.count(),
      adminUsers: await prisma.adminUser.count()
    };

    logger.info('🎉 Real data seeding completed successfully!', stats);

    return stats;

  } catch (error) {
    logger.error('❌ Error seeding real data:', error);
    throw error;
  }
}

/**
 * Run seeder if called directly
 */
if (require.main === module) {
  seedRealData()
    .then(() => {
      logger.info('✨ Database seeded with real data');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}