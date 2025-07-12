// MongoDB Initialization Script for UltraMarket
// Initialize replica set and create databases with optimized indexes

// Initialize replica set
rs.initiate({
  _id: 'ultramarket-replica-set',
  members: [
    {
      _id: 0,
      host: 'mongodb-primary:27017',
      priority: 1,
    },
  ],
});

// Wait for replica set to be ready
sleep(5000);

// Switch to admin database and create users
db = db.getSiblingDB('admin');

// Create root user
db.createUser({
  user: 'ultramarket_admin',
  pwd: 'mongodb_secure_password',
  roles: [{ role: 'root', db: 'admin' }],
});

// Create application user
db.createUser({
  user: 'ultramarket_app',
  pwd: 'app_secure_password',
  roles: [
    { role: 'readWrite', db: 'ultramarket_products' },
    { role: 'readWrite', db: 'ultramarket_inventory' },
    { role: 'readWrite', db: 'ultramarket_analytics' },
    { role: 'readWrite', db: 'ultramarket_content' },
  ],
});

// Create read-only user for analytics
db.createUser({
  user: 'analytics_reader',
  pwd: 'analytics_readonly_password',
  roles: [
    { role: 'read', db: 'ultramarket_products' },
    { role: 'read', db: 'ultramarket_inventory' },
    { role: 'read', db: 'ultramarket_analytics' },
    { role: 'read', db: 'ultramarket_content' },
  ],
});

// Initialize Products Database
db = db.getSiblingDB('ultramarket_products');

// Create collections with validation
db.createCollection('products', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'sku', 'price', 'category', 'status'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Product name is required',
        },
        sku: {
          bsonType: 'string',
          description: 'SKU is required and must be unique',
        },
        price: {
          bsonType: 'number',
          minimum: 0,
          description: 'Price must be a positive number',
        },
        category: {
          bsonType: 'string',
          description: 'Category is required',
        },
        status: {
          bsonType: 'string',
          enum: ['active', 'inactive', 'draft', 'archived'],
          description: 'Status must be one of: active, inactive, draft, archived',
        },
      },
    },
  },
});

// Create indexes for products
db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ name: 'text', description: 'text' });
db.products.createIndex({ category: 1 });
db.products.createIndex({ brand: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ status: 1 });
db.products.createIndex({ tags: 1 });
db.products.createIndex({ createdAt: 1 });
db.products.createIndex({ updatedAt: 1 });
db.products.createIndex({ vendorId: 1 });
db.products.createIndex({ isFeatured: 1 });
db.products.createIndex({ isActive: 1 });
db.products.createIndex({ rating: 1 });
db.products.createIndex({ category: 1, brand: 1 });
db.products.createIndex({ category: 1, price: 1 });
db.products.createIndex({ status: 1, isActive: 1 });

// Create categories collection
db.createCollection('categories', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'slug'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Category name is required',
        },
        slug: {
          bsonType: 'string',
          description: 'Slug is required and must be unique',
        },
      },
    },
  },
});

// Create indexes for categories
db.categories.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ name: 1 });
db.categories.createIndex({ parentId: 1 });
db.categories.createIndex({ isActive: 1 });
db.categories.createIndex({ sortOrder: 1 });

// Create brands collection
db.createCollection('brands');
db.brands.createIndex({ name: 1 }, { unique: true });
db.brands.createIndex({ slug: 1 }, { unique: true });
db.brands.createIndex({ isActive: 1 });

// Create reviews collection
db.createCollection('reviews');
db.reviews.createIndex({ productId: 1 });
db.reviews.createIndex({ userId: 1 });
db.reviews.createIndex({ rating: 1 });
db.reviews.createIndex({ createdAt: 1 });
db.reviews.createIndex({ isApproved: 1 });
db.reviews.createIndex({ productId: 1, userId: 1 }, { unique: true });

// Initialize Inventory Database
db = db.getSiblingDB('ultramarket_inventory');

// Create inventory collection
db.createCollection('inventory', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['productId', 'sku', 'quantity'],
      properties: {
        productId: {
          bsonType: 'string',
          description: 'Product ID is required',
        },
        sku: {
          bsonType: 'string',
          description: 'SKU is required',
        },
        quantity: {
          bsonType: 'number',
          minimum: 0,
          description: 'Quantity must be a non-negative number',
        },
      },
    },
  },
});

// Create indexes for inventory
db.inventory.createIndex({ productId: 1 }, { unique: true });
db.inventory.createIndex({ sku: 1 }, { unique: true });
db.inventory.createIndex({ quantity: 1 });
db.inventory.createIndex({ warehouseId: 1 });
db.inventory.createIndex({ lastUpdated: 1 });
db.inventory.createIndex({ isActive: 1 });

// Create inventory movements collection
db.createCollection('inventory_movements');
db.inventory_movements.createIndex({ productId: 1 });
db.inventory_movements.createIndex({ sku: 1 });
db.inventory_movements.createIndex({ type: 1 });
db.inventory_movements.createIndex({ createdAt: 1 });
db.inventory_movements.createIndex({ warehouseId: 1 });

// Initialize Analytics Database
db = db.getSiblingDB('ultramarket_analytics');

// Create analytics collections
db.createCollection('product_views');
db.product_views.createIndex({ productId: 1 });
db.product_views.createIndex({ userId: 1 });
db.product_views.createIndex({ sessionId: 1 });
db.product_views.createIndex({ timestamp: 1 });
db.product_views.createIndex({ date: 1 });

db.createCollection('search_queries');
db.search_queries.createIndex({ query: 1 });
db.search_queries.createIndex({ userId: 1 });
db.search_queries.createIndex({ timestamp: 1 });
db.search_queries.createIndex({ resultsCount: 1 });

db.createCollection('user_sessions');
db.user_sessions.createIndex({ userId: 1 });
db.user_sessions.createIndex({ sessionId: 1 }, { unique: true });
db.user_sessions.createIndex({ startTime: 1 });
db.user_sessions.createIndex({ endTime: 1 });

// Initialize Content Database
db = db.getSiblingDB('ultramarket_content');

// Create content collections
db.createCollection('pages');
db.pages.createIndex({ slug: 1 }, { unique: true });
db.pages.createIndex({ title: 1 });
db.pages.createIndex({ status: 1 });
db.pages.createIndex({ publishedAt: 1 });

db.createCollection('banners');
db.banners.createIndex({ position: 1 });
db.banners.createIndex({ isActive: 1 });
db.banners.createIndex({ startDate: 1 });
db.banners.createIndex({ endDate: 1 });

db.createCollection('navigation');
db.navigation.createIndex({ type: 1 });
db.navigation.createIndex({ parentId: 1 });
db.navigation.createIndex({ sortOrder: 1 });
db.navigation.createIndex({ isActive: 1 });

print('MongoDB initialization completed successfully!');
print(
  'Created databases: ultramarket_products, ultramarket_inventory, ultramarket_analytics, ultramarket_content'
);
print('Created users: ultramarket_admin, ultramarket_app, analytics_reader');
print('Created collections with optimized indexes');
