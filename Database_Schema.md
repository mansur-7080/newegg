# E-Commerce Platform - Database Schema Document

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [PostgreSQL Schemas](#2-postgresql-schemas)
3. [MongoDB Collections](#3-mongodb-collections)
4. [Redis Data Structures](#4-redis-data-structures)
5. [Database Relationships](#5-database-relationships)
6. [Indexes and Performance](#6-indexes-and-performance)

---

## 1. Database Overview

### Database Distribution

| Service | Database | Type | Purpose |
|---------|----------|------|---------|
| User Service | PostgreSQL | RDBMS | Users, Auth, Addresses |
| Product Service | MongoDB | NoSQL | Products, Categories, Reviews |
| Order Service | PostgreSQL | RDBMS | Orders, Transactions |
| Cart Service | Redis | Cache | Session carts |
| Analytics | ClickHouse | OLAP | Analytics data |

---

## 2. PostgreSQL Schemas

### 2.1 User Service Database

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    role VARCHAR(50) DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
```

#### user_addresses
```sql
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- shipping, billing
    is_default BOOLEAN DEFAULT false,
    full_name VARCHAR(200) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(2) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_user_id ON user_addresses(user_id);
```

#### auth_tokens
```sql
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL, -- refresh, reset_password, verify_email
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_token_hash ON auth_tokens(token_hash);
```

### 2.2 Order Service Database

#### orders
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes TEXT,
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

#### order_items
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL,
    variant_id VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    product_image VARCHAR(500),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

#### payments
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    transaction_id VARCHAR(255),
    gateway_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
```

#### order_status_history
```sql
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_order_id ON order_status_history(order_id);
```

---

## 3. MongoDB Collections

### 3.1 Products Collection

```javascript
// products collection
{
  "_id": ObjectId(),
  "name": "iPhone 15 Pro",
  "slug": "iphone-15-pro",
  "description": "Latest iPhone with advanced features",
  "category": {
    "id": ObjectId(),
    "name": "Smartphones",
    "path": "Electronics > Smartphones"
  },
  "brand": "Apple",
  "price": {
    "amount": 999.99,
    "currency": "USD",
    "compareAt": 1099.99
  },
  "sku": "IPH15PRO128",
  "barcode": "123456789012",
  "weight": 0.187, // kg
  "dimensions": {
    "length": 14.66,
    "width": 7.06,
    "height": 0.81,
    "unit": "cm"
  },
  "images": [
    {
      "url": "https://cdn.example.com/product1.jpg",
      "alt": "Front view",
      "isPrimary": true,
      "order": 1
    }
  ],
  "variants": [
    {
      "_id": ObjectId(),
      "name": "128GB - Space Black",
      "sku": "IPH15PRO128BLK",
      "price": 999.99,
      "attributes": {
        "color": "Space Black",
        "storage": "128GB"
      },
      "inventory": {
        "quantity": 50,
        "reserved": 5
      }
    }
  ],
  "attributes": {
    "color": ["Space Black", "Silver", "Gold"],
    "storage": ["128GB", "256GB", "512GB"],
    "display": "6.1 inch",
    "processor": "A17 Pro"
  },
  "inventory": {
    "trackInventory": true,
    "quantity": 150,
    "reserved": 10,
    "warehouse": ["WH001", "WH002"]
  },
  "seo": {
    "title": "Buy iPhone 15 Pro - Best Price",
    "description": "Shop iPhone 15 Pro with free shipping",
    "keywords": ["iphone", "smartphone", "apple"]
  },
  "rating": {
    "average": 4.5,
    "count": 1250,
    "distribution": {
      "5": 750,
      "4": 300,
      "3": 100,
      "2": 50,
      "1": 50
    }
  },
  "tags": ["new", "featured", "bestseller"],
  "isActive": true,
  "isFeatured": true,
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "updatedAt": ISODate("2024-01-01T00:00:00Z")
}

// Indexes
db.products.createIndex({ "slug": 1 }, { unique: true })
db.products.createIndex({ "sku": 1 }, { unique: true })
db.products.createIndex({ "name": "text", "description": "text" })
db.products.createIndex({ "category.id": 1 })
db.products.createIndex({ "price.amount": 1 })
db.products.createIndex({ "isActive": 1, "createdAt": -1 })
```

### 3.2 Categories Collection

```javascript
// categories collection
{
  "_id": ObjectId(),
  "name": "Smartphones",
  "slug": "smartphones",
  "description": "Latest smartphones from top brands",
  "parentId": ObjectId(), // null for root categories
  "path": "Electronics > Smartphones",
  "level": 2,
  "image": {
    "url": "https://cdn.example.com/category.jpg",
    "alt": "Smartphones category"
  },
  "attributes": [
    {
      "name": "Brand",
      "type": "select",
      "options": ["Apple", "Samsung", "Google"]
    },
    {
      "name": "Storage",
      "type": "select",
      "options": ["64GB", "128GB", "256GB", "512GB"]
    }
  ],
  "seo": {
    "title": "Smartphones - Best Deals",
    "description": "Shop latest smartphones",
    "keywords": ["smartphones", "mobile phones"]
  },
  "isActive": true,
  "order": 1,
  "productCount": 450,
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "updatedAt": ISODate("2024-01-01T00:00:00Z")
}

// Indexes
db.categories.createIndex({ "slug": 1 }, { unique: true })
db.categories.createIndex({ "parentId": 1 })
db.categories.createIndex({ "path": 1 })
```

### 3.3 Reviews Collection

```javascript
// reviews collection
{
  "_id": ObjectId(),
  "productId": ObjectId(),
  "userId": "uuid-from-postgres",
  "userName": "John D.",
  "rating": 5,
  "title": "Amazing product!",
  "comment": "Best phone I've ever owned",
  "images": [
    "https://cdn.example.com/review1.jpg"
  ],
  "likes": 125,
  "dislikes": 5,
  "isVerifiedPurchase": true,
  "orderId": "uuid-from-postgres",
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "updatedAt": ISODate("2024-01-01T00:00:00Z")
}

// Indexes
db.reviews.createIndex({ "productId": 1, "createdAt": -1 })
db.reviews.createIndex({ "userId": 1 })
db.reviews.createIndex({ "rating": 1 })
```

---

## 4. Redis Data Structures

### 4.1 Shopping Cart

```redis
# Cart hash
cart:{sessionId} = {
  "userId": "uuid",
  "items": JSON.stringify([...]),
  "subtotal": "199.98",
  "updatedAt": "2024-01-01T00:00:00Z"
}
TTL: 7 days

# Cart items sorted set (for quick access)
cart:items:{sessionId} = [
  score: timestamp, member: productId
]
```

### 4.2 Session Management

```redis
# User session
session:{sessionId} = {
  "userId": "uuid",
  "email": "user@example.com",
  "role": "customer",
  "createdAt": "2024-01-01T00:00:00Z"
}
TTL: 24 hours

# Active sessions for user
user:sessions:{userId} = [sessionId1, sessionId2]
TTL: 24 hours
```

### 4.3 Product Cache

```redis
# Product detail cache
product:{productId} = JSON.stringify(productData)
TTL: 5 minutes

# Product list cache
products:list:{hash} = JSON.stringify(productsList)
TTL: 5 minutes

# Category products
category:products:{categoryId}:{page} = JSON.stringify(products)
TTL: 5 minutes
```

### 4.4 Rate Limiting

```redis
# API rate limiting
rate:limit:{userId}:{endpoint} = count
TTL: 1 hour

# Login attempts
login:attempts:{email} = count
TTL: 15 minutes
```

---

## 5. Database Relationships

### 5.1 Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐
│   users     │────────<│ user_addresses│
└─────────────┘         └──────────────┘
       │
       │
       ▼
┌─────────────┐         ┌──────────────┐
│   orders    │────────<│ order_items  │
└─────────────┘         └──────────────┘
       │
       │
       ▼
┌─────────────┐
│  payments   │
└─────────────┘

MongoDB Collections:
┌─────────────┐         ┌──────────────┐
│  products   │────────<│   reviews    │
└─────────────┘         └──────────────┘
       │
       ▼
┌─────────────┐
│ categories  │
└─────────────┘
```

### 5.2 Cross-Database References

- Order items reference products by MongoDB ObjectId
- Reviews reference users by PostgreSQL UUID
- Analytics events reference all entities

---

## 6. Indexes and Performance

### 6.1 PostgreSQL Optimization

```sql
-- Composite indexes for common queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_date_status ON orders(created_at DESC, status);

-- Partial indexes
CREATE INDEX idx_active_users ON users(email) WHERE is_active = true;
CREATE INDEX idx_pending_orders ON orders(created_at) WHERE status = 'pending';

-- Function-based index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

### 6.2 MongoDB Optimization

```javascript
// Compound indexes
db.products.createIndex({ "category.id": 1, "price.amount": 1, "isActive": 1 })
db.products.createIndex({ "isActive": 1, "isFeatured": 1, "createdAt": -1 })

// Text search index
db.products.createIndex({
  "name": "text",
  "description": "text",
  "tags": "text"
}, {
  weights: {
    "name": 10,
    "tags": 5,
    "description": 1
  }
})
```

### 6.3 Performance Best Practices

1. **Connection Pooling**
   - PostgreSQL: 100 connections max
   - MongoDB: 50 connections max
   - Redis: 20 connections max

2. **Query Optimization**
   - Use EXPLAIN ANALYZE for PostgreSQL
   - Use explain() for MongoDB
   - Avoid N+1 queries

3. **Caching Strategy**
   - Cache frequently accessed data in Redis
   - Use TTL appropriately
   - Implement cache invalidation

4. **Data Archival**
   - Archive orders older than 2 years
   - Move to cold storage
   - Keep summary data

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Next Review:** Quarterly

--- 