const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database fayli
const dbPath = path.join(__dirname, 'ultramarket.db');

// Database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ SQLite database connected:', dbPath);
    initializeTables();
  }
});

// Tables yaratish
function initializeTables() {
  // Users table - YANGI
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      city TEXT DEFAULT 'Toshkent',
      role TEXT DEFAULT 'customer',
      isVerified BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Users table error:', err);
    else console.log('✅ Users table ready');
  });

  // Categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nameUz TEXT NOT NULL,
      productCount INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Categories table error:', err);
    else console.log('✅ Categories table ready');
  });

  // Stores table
  db.run(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      rating REAL DEFAULT 0,
      productCount INTEGER DEFAULT 0,
      isVerified BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Stores table error:', err);
    else console.log('✅ Stores table ready');
  });

  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nameUz TEXT NOT NULL,
      price INTEGER NOT NULL,
      originalPrice INTEGER,
      discount INTEGER,
      image TEXT,
      rating REAL DEFAULT 0,
      reviewCount INTEGER DEFAULT 0,
      category TEXT NOT NULL,
      storeId TEXT NOT NULL,
      isInStock BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (storeId) REFERENCES stores(id)
    )
  `, (err) => {
    if (err) console.error('Products table error:', err);
    else console.log('✅ Products table ready');
  });

  // Cart table
  db.run(`
    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      price INTEGER NOT NULL,
      addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `, (err) => {
    if (err) console.error('Cart table error:', err);
    else console.log('✅ Cart table ready');
  });

  // Ma'lumotlar qo'shish (biraz kechiktirish bilan)
  setTimeout(() => {
    insertInitialData();
  }, 1000);
}

// Boshlang'ich ma'lumotlar
function insertInitialData() {
  console.log('📦 Boshlang\'ich ma\'lumotlar yuklanmoqda...');
  
  // Categories
  const categories = [
    { id: 'electronics', name: 'Electronics', nameUz: 'Elektronika', productCount: 25000 },
    { id: 'fashion', name: 'Fashion', nameUz: 'Kiyim-kechak', productCount: 18000 },
    { id: 'home', name: 'Home & Garden', nameUz: 'Uy-ro\'zg\'or', productCount: 9500 },
    { id: 'automotive', name: 'Automotive', nameUz: 'Avtomobil', productCount: 4500 }
  ];

  categories.forEach(cat => {
    db.run(`
      INSERT OR REPLACE INTO categories (id, name, nameUz, productCount) 
      VALUES (?, ?, ?, ?)
    `, [cat.id, cat.name, cat.nameUz, cat.productCount], (err) => {
      if (err) console.error('Category insert error:', err);
    });
  });

  // Stores
  const stores = [
    {
      id: 'techstore',
      name: 'TechStore UZ',
      description: 'Eng yangi texnologiyalar',
      location: 'Toshkent',
      rating: 4.9,
      productCount: 1250,
      isVerified: 1
    },
    {
      id: 'samsung-store',
      name: 'Samsung Official',
      description: 'Rasmiy Samsung do\'koni',
      location: 'Toshkent',
      rating: 4.8,
      productCount: 890,
      isVerified: 1
    },
    {
      id: 'fashion-plaza',
      name: 'Fashion Plaza',
      description: 'Zamonaviy kiyim-kechak',
      location: 'Toshkent',
      rating: 4.7,
      productCount: 650,
      isVerified: 1
    }
  ];

  stores.forEach(store => {
    db.run(`
      INSERT OR REPLACE INTO stores (id, name, description, location, rating, productCount, isVerified) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [store.id, store.name, store.description, store.location, store.rating, store.productCount, store.isVerified], (err) => {
      if (err) console.error('Store insert error:', err);
    });
  });

  // Products
  const products = [
    {
      id: '1',
      name: 'iPhone 15 Pro Max',
      nameUz: 'iPhone 15 Pro Max',
      price: 14500000,
      originalPrice: 16000000,
      discount: 9,
      image: '/products/iphone-15.jpg',
      rating: 4.8,
      reviewCount: 234,
      category: 'Smartfonlar',
      storeId: 'techstore',
      isInStock: 1
    },
    {
      id: '2',
      name: 'Samsung Galaxy S24',
      nameUz: 'Samsung Galaxy S24',
      price: 12000000,
      originalPrice: 13500000,
      discount: 11,
      image: '/products/samsung-s24.jpg',
      rating: 4.7,
      reviewCount: 189,
      category: 'Smartfonlar',
      storeId: 'samsung-store',
      isInStock: 1
    },
    {
      id: '3',
      name: 'MacBook Air M3',
      nameUz: 'MacBook Air M3',
      price: 18900000,
      originalPrice: null,
      discount: null,
      image: '/products/macbook-air.jpg',
      rating: 4.9,
      reviewCount: 156,
      category: 'Noutbuklar',
      storeId: 'techstore',
      isInStock: 1
    },
    {
      id: '4',
      name: 'Nike Air Max 90',
      nameUz: 'Nike Air Max 90',
      price: 1850000,
      originalPrice: 2200000,
      discount: 16,
      image: '/products/nike-shoes.jpg',
      rating: 4.6,
      reviewCount: 342,
      category: 'Poyafzal',
      storeId: 'fashion-plaza',
      isInStock: 1
    },
    {
      id: '5',
      name: 'Sony WH-1000XM5',
      nameUz: 'Sony WH-1000XM5 quloqchin',
      price: 4500000,
      originalPrice: 5200000,
      discount: 13,
      image: '/products/sony-headphones.jpg',
      rating: 4.8,
      reviewCount: 128,
      category: 'Audio',
      storeId: 'techstore',
      isInStock: 1
    }
  ];

  products.forEach(product => {
    db.run(`
      INSERT OR REPLACE INTO products 
      (id, name, nameUz, price, originalPrice, discount, image, rating, reviewCount, category, storeId, isInStock) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      product.id, product.name, product.nameUz, product.price, 
      product.originalPrice, product.discount, product.image, 
      product.rating, product.reviewCount, product.category, 
      product.storeId, product.isInStock
    ], (err) => {
      if (err) console.error('Product insert error:', err);
    });
  });

  console.log('✅ Database ma\'lumotlari yuklandi');
}

// Database functions
const dbOperations = {
  // Users - YANGI AUTH FUNCTIONS
  createUser: (userData) => {
    return new Promise((resolve, reject) => {
      const { email, password, firstName, lastName, phone, address, city } = userData;
      
      db.run(`
        INSERT INTO users (email, password, firstName, lastName, phone, address, city) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [email, password, firstName, lastName, phone, address, city], function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            reject(new Error('Bu email allaqachon ro\'yxatdan o\'tgan'));
          } else {
            reject(err);
          }
        } else {
          resolve({ id: this.lastID, email });
        }
      });
    });
  },

  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, email, firstName, lastName, phone, address, city, role, isVerified, createdAt FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Categories
  getCategories: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM categories ORDER BY productCount DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Products
  getProducts: (params = {}) => {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT p.*, s.name as storeName, s.location as storeLocation, s.rating as storeRating, s.isVerified as storeVerified
        FROM products p 
        JOIN stores s ON p.storeId = s.id 
        WHERE p.isInStock = 1
      `;
      
      const queryParams = [];
      
      if (params.category) {
        query += ' AND p.category LIKE ?';
        queryParams.push(`%${params.category}%`);
      }
      
      if (params.search) {
        query += ' AND (p.name LIKE ? OR p.nameUz LIKE ? OR p.category LIKE ?)';
        queryParams.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
      }
      
      query += ' ORDER BY p.rating DESC, p.reviewCount DESC';
      
      if (params.limit) {
        query += ' LIMIT ?';
        queryParams.push(parseInt(params.limit));
      }

      db.all(query, queryParams, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Store ma'lumotlarini qo'shish
          const products = rows.map(row => ({
            id: row.id,
            name: row.name,
            nameUz: row.nameUz,
            price: row.price,
            originalPrice: row.originalPrice,
            discount: row.discount,
            image: row.image,
            rating: row.rating,
            reviewCount: row.reviewCount,
            category: row.category,
            isInStock: row.isInStock,
            store: {
              id: row.storeId,
              name: row.storeName,
              location: row.storeLocation,
              rating: row.storeRating,
              isVerified: row.storeVerified
            }
          }));
          resolve(products);
        }
      });
    });
  },

  getProduct: (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT p.*, s.name as storeName, s.location as storeLocation, s.rating as storeRating, s.isVerified as storeVerified
        FROM products p 
        JOIN stores s ON p.storeId = s.id 
        WHERE p.id = ?
      `;
      
      db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          const product = {
            id: row.id,
            name: row.name,
            nameUz: row.nameUz,
            price: row.price,
            originalPrice: row.originalPrice,
            discount: row.discount,
            image: row.image,
            rating: row.rating,
            reviewCount: row.reviewCount,
            category: row.category,
            isInStock: row.isInStock,
            store: {
              id: row.storeId,
              name: row.storeName,
              location: row.storeLocation,
              rating: row.storeRating,
              isVerified: row.storeVerified
            }
          };
          resolve(product);
        } else {
          resolve(null);
        }
      });
    });
  },

  // Stores
  getStores: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM stores ORDER BY rating DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getStore: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM stores WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Search
  search: (query) => {
    return new Promise((resolve, reject) => {
      const searchQuery = `
        SELECT p.*, s.name as storeName, s.location as storeLocation, s.rating as storeRating, s.isVerified as storeVerified
        FROM products p 
        JOIN stores s ON p.storeId = s.id 
        WHERE (p.name LIKE ? OR p.nameUz LIKE ? OR p.category LIKE ?) 
        AND p.isInStock = 1
        ORDER BY p.rating DESC
        LIMIT 20
      `;
      
      const searchTerm = `%${query}%`;
      
      db.all(searchQuery, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const products = rows.map(row => ({
            id: row.id,
            name: row.name,
            nameUz: row.nameUz,
            price: row.price,
            originalPrice: row.originalPrice,
            discount: row.discount,
            image: row.image,
            rating: row.rating,
            reviewCount: row.reviewCount,
            category: row.category,
            isInStock: row.isInStock,
            store: {
              id: row.storeId,
              name: row.storeName,
              location: row.storeLocation,
              rating: row.storeRating,
              isVerified: row.storeVerified
            }
          }));
          resolve(products);
        }
      });
    });
  },

  // Cart
  getCart: () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT c.*, p.name, p.nameUz, p.image, p.rating, s.name as storeName
        FROM cart c
        JOIN products p ON c.productId = p.id
        JOIN stores s ON p.storeId = s.id
        ORDER BY c.addedAt DESC
      `;
      
      db.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const cartItems = rows.map(row => ({
            id: row.id,
            productId: row.productId,
            quantity: row.quantity,
            price: row.price,
            addedAt: row.addedAt,
            product: {
              name: row.name,
              nameUz: row.nameUz,
              image: row.image,
              rating: row.rating
            },
            store: {
              name: row.storeName
            }
          }));
          resolve(cartItems);
        }
      });
    });
  },

  addToCart: (productId, quantity = 1) => {
    return new Promise((resolve, reject) => {
      // Avval mahsulot narxini olish
      db.get('SELECT price FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
          reject(err);
        } else if (!product) {
          reject(new Error('Mahsulot topilmadi'));
        } else {
          // Savatchada bor-yo'qligini tekshirish
          db.get('SELECT * FROM cart WHERE productId = ?', [productId], (err, existing) => {
            if (err) {
              reject(err);
            } else if (existing) {
              // Miqdorni yangilash
              db.run(
                'UPDATE cart SET quantity = quantity + ? WHERE productId = ?',
                [quantity, productId],
                function(err) {
                  if (err) reject(err);
                  else resolve({ message: 'Mahsulot miqdori yangilandi' });
                }
              );
            } else {
              // Yangi qo'shish
              db.run(
                'INSERT INTO cart (productId, quantity, price) VALUES (?, ?, ?)',
                [productId, quantity, product.price],
                function(err) {
                  if (err) reject(err);
                  else resolve({ message: 'Mahsulot savatga qo\'shildi' });
                }
              );
            }
          });
        }
      });
    });
  },

  // Stats
  getStats: () => {
    return new Promise((resolve, reject) => {
      const queries = [
        'SELECT COUNT(*) as totalProducts FROM products',
        'SELECT COUNT(*) as totalStores FROM stores',
        'SELECT COUNT(*) as totalCategories FROM categories',
        'SELECT COUNT(*) as totalUsers FROM users'
      ];
      
      Promise.all(queries.map(query => {
        return new Promise((resolve, reject) => {
          db.get(query, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      })).then(results => {
        resolve({
          totalProducts: results[0].totalProducts,
          totalStores: results[1].totalStores,
          totalCategories: results[2].totalCategories,
          totalUsers: results[3].totalUsers,
          platform: 'UltraMarket',
          region: 'O\'zbekiston',
          currency: 'UZS',
          features: [
            'Bepul yetkazib berish',
            'Xavfsiz to\'lov',
            '24/7 yordam',
            'Click, Payme, Apelsin'
          ]
        });
      }).catch(reject);
    });
  }
};

module.exports = { db, dbOperations };