# 🚀 UltraMarket API - Complete Documentation

[![API Version](https://img.shields.io/badge/API-v1.0-blue.svg)](https://api.ultramarket.uz)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-green.svg)](https://swagger.io/specification/)
[![Production Ready](https://img.shields.io/badge/Production-Ready-brightgreen.svg)](https://api.ultramarket.uz)

> **Comprehensive API Documentation for UltraMarket E-commerce Platform**  
> RESTful API with OpenAPI 3.0 specification and real-time capabilities

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URLs & Environments](#base-urls--environments)
4. [Request/Response Format](#requestresponse-format)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [API Endpoints](#api-endpoints)
8. [WebSocket Events](#websocket-events)
9. [SDKs & Libraries](#sdks--libraries)
10. [Integration Examples](#integration-examples)
11. [Testing](#testing)
12. [Changelog](#changelog)

---

## 🌟 Overview

UltraMarket API provides a comprehensive set of RESTful endpoints for e-commerce operations, specifically designed for the Uzbekistan market. The API supports multiple authentication methods, real-time notifications, and integrates with local payment gateways and SMS services.

### 🎯 Key Features

- **RESTful Design** - Standard HTTP methods and status codes
- **OpenAPI 3.0** - Complete API specification
- **Real-time Events** - WebSocket support for live updates
- **Multi-language** - Uzbek, Russian, English support
- **Local Integrations** - Uzbekistan payment gateways and SMS
- **High Performance** - Sub-200ms response times
- **Enterprise Security** - OWASP compliant

### 📊 API Statistics

- **Total Endpoints**: 200+
- **Microservices**: 15+
- **Response Time**: < 200ms average
- **Uptime**: 99.9% SLA
- **Rate Limit**: 1000 requests/minute
- **API Version**: v1.0

---

## 🔐 Authentication

### Authentication Methods

UltraMarket API supports multiple authentication methods:

1. **JWT Bearer Token** (Recommended)
2. **API Key** (For server-to-server)
3. **OAuth 2.0** (For third-party integrations)

### JWT Authentication

```http
Authorization: Bearer <JWT_TOKEN>
```

#### Login Request

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Login Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "customer"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 3600
    }
  }
}
```

### Token Refresh

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### API Key Authentication

```http
X-API-Key: your_api_key_here
```

---

## 🌐 Base URLs & Environments

### Production

- **Base URL**: `https://api.ultramarket.uz`
- **WebSocket**: `wss://api.ultramarket.uz/ws`
- **Admin API**: `https://admin-api.ultramarket.uz`

### Staging

- **Base URL**: `https://staging-api.ultramarket.uz`
- **WebSocket**: `wss://staging-api.ultramarket.uz/ws`

### Development

- **Base URL**: `http://localhost:3000`
- **WebSocket**: `ws://localhost:3000/ws`

---

## 📝 Request/Response Format

### Request Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <JWT_TOKEN>
Accept-Language: uz|ru|en
X-Client-Version: 1.0.0
X-Platform: web|mobile|admin
```

### Standard Response Format

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456",
    "version": "1.0.0"
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## ⚠️ Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456"
  }
}
```

### HTTP Status Codes

| Status Code | Description           |
| ----------- | --------------------- |
| `200`       | Success               |
| `201`       | Created               |
| `400`       | Bad Request           |
| `401`       | Unauthorized          |
| `403`       | Forbidden             |
| `404`       | Not Found             |
| `409`       | Conflict              |
| `422`       | Validation Error      |
| `429`       | Rate Limit Exceeded   |
| `500`       | Internal Server Error |

### Error Codes

| Error Code               | Description                  |
| ------------------------ | ---------------------------- |
| `VALIDATION_ERROR`       | Input validation failed      |
| `AUTHENTICATION_ERROR`   | Authentication failed        |
| `AUTHORIZATION_ERROR`    | Insufficient permissions     |
| `RESOURCE_NOT_FOUND`     | Requested resource not found |
| `RATE_LIMIT_EXCEEDED`    | Too many requests            |
| `PAYMENT_ERROR`          | Payment processing failed    |
| `INVENTORY_ERROR`        | Insufficient stock           |
| `EXTERNAL_SERVICE_ERROR` | Third-party service error    |

---

## 🚦 Rate Limiting

### Rate Limits

| User Type         | Requests per Minute | Burst Limit |
| ----------------- | ------------------- | ----------- |
| **Anonymous**     | 100                 | 200         |
| **Authenticated** | 1000                | 2000        |
| **Premium**       | 5000                | 10000       |
| **API Key**       | 10000               | 20000       |

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

---

## 🔗 API Endpoints

### 🔐 Authentication & Authorization

#### User Registration

```http
POST /api/v1/auth/register
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": "+998901234567",
  "language": "uz"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+998901234567",
      "status": "pending_verification"
    },
    "message": "Verification code sent to phone"
  }
}
```

#### Phone Verification

```http
POST /api/v1/auth/verify-phone
```

**Request Body:**

```json
{
  "phone": "+998901234567",
  "verification_code": "123456"
}
```

#### Password Reset

```http
POST /api/v1/auth/forgot-password
```

**Request Body:**

```json
{
  "email": "john@example.com"
}
```

#### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <JWT_TOKEN>
```

---

### 👥 User Management

#### Get Current User

```http
GET /api/v1/users/me
Authorization: Bearer <JWT_TOKEN>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+998901234567",
    "avatar": "https://cdn.ultramarket.uz/avatars/user_123.jpg",
    "addresses": [
      {
        "id": "addr_123",
        "type": "home",
        "street": "Amir Temur ko'chasi 1",
        "city": "Tashkent",
        "region": "Tashkent",
        "postal_code": "100000",
        "is_default": true
      }
    ],
    "preferences": {
      "language": "uz",
      "currency": "UZS",
      "notifications": {
        "email": true,
        "sms": true,
        "push": true
      }
    }
  }
}
```

#### Update User Profile

```http
PUT /api/v1/users/me
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "name": "John Smith",
  "phone": "+998901234568",
  "preferences": {
    "language": "en",
    "notifications": {
      "email": true,
      "sms": false,
      "push": true
    }
  }
}
```

#### Add Address

```http
POST /api/v1/users/addresses
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "type": "work",
  "street": "Mustaqillik ko'chasi 15",
  "city": "Tashkent",
  "region": "Tashkent",
  "postal_code": "100000",
  "is_default": false
}
```

---

### 🛍️ Product Management

#### Get Products

```http
GET /api/v1/products
```

**Query Parameters:**

- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `category` (string): Filter by category ID
- `brand` (string): Filter by brand
- `min_price` (number): Minimum price filter
- `max_price` (number): Maximum price filter
- `sort` (string): Sort by (price_asc, price_desc, name_asc, name_desc, popularity, newest)
- `search` (string): Search query

**Example:**

```http
GET /api/v1/products?category=electronics&min_price=100000&max_price=500000&sort=price_asc&page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "prod_123",
      "name": "Samsung Galaxy S23",
      "slug": "samsung-galaxy-s23",
      "description": "Latest Samsung smartphone with advanced features",
      "price": 12500000,
      "original_price": 13000000,
      "currency": "UZS",
      "discount_percentage": 4,
      "images": [
        "https://cdn.ultramarket.uz/products/prod_123/image1.jpg",
        "https://cdn.ultramarket.uz/products/prod_123/image2.jpg"
      ],
      "category": {
        "id": "cat_electronics",
        "name": "Electronics",
        "slug": "electronics"
      },
      "brand": {
        "id": "brand_samsung",
        "name": "Samsung",
        "logo": "https://cdn.ultramarket.uz/brands/samsung.png"
      },
      "specifications": {
        "screen_size": "6.1 inch",
        "storage": "256GB",
        "ram": "8GB",
        "color": "Phantom Black"
      },
      "stock": {
        "quantity": 50,
        "status": "in_stock"
      },
      "rating": {
        "average": 4.5,
        "count": 128
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

#### Get Product Details

```http
GET /api/v1/products/{product_id}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Samsung Galaxy S23",
    "slug": "samsung-galaxy-s23",
    "description": "Latest Samsung smartphone with advanced features",
    "long_description": "Detailed product description with HTML formatting...",
    "price": 12500000,
    "original_price": 13000000,
    "currency": "UZS",
    "discount_percentage": 4,
    "images": [
      {
        "url": "https://cdn.ultramarket.uz/products/prod_123/image1.jpg",
        "alt": "Samsung Galaxy S23 front view",
        "order": 1
      }
    ],
    "category": {
      "id": "cat_electronics",
      "name": "Electronics",
      "slug": "electronics",
      "breadcrumb": ["Home", "Electronics", "Smartphones"]
    },
    "brand": {
      "id": "brand_samsung",
      "name": "Samsung",
      "logo": "https://cdn.ultramarket.uz/brands/samsung.png"
    },
    "specifications": {
      "screen_size": "6.1 inch",
      "storage": "256GB",
      "ram": "8GB",
      "color": "Phantom Black",
      "operating_system": "Android 14"
    },
    "variants": [
      {
        "id": "var_123_black",
        "name": "Phantom Black",
        "price": 12500000,
        "stock": 50,
        "sku": "SAM-S23-256-BLACK"
      }
    ],
    "stock": {
      "quantity": 50,
      "status": "in_stock",
      "warehouse": "Tashkent Main"
    },
    "rating": {
      "average": 4.5,
      "count": 128,
      "distribution": {
        "5": 65,
        "4": 40,
        "3": 15,
        "2": 5,
        "1": 3
      }
    },
    "reviews": [
      {
        "id": "rev_123",
        "user": {
          "name": "John D.",
          "verified": true
        },
        "rating": 5,
        "comment": "Excellent phone, very satisfied!",
        "created_at": "2024-01-10T15:30:00Z"
      }
    ],
    "related_products": [
      {
        "id": "prod_124",
        "name": "Samsung Galaxy S23+",
        "price": 15000000,
        "image": "https://cdn.ultramarket.uz/products/prod_124/thumb.jpg"
      }
    ],
    "seo": {
      "title": "Samsung Galaxy S23 - Buy Online | UltraMarket",
      "description": "Buy Samsung Galaxy S23 at best price in Uzbekistan",
      "keywords": ["Samsung", "Galaxy S23", "smartphone", "Android"]
    }
  }
}
```

#### Search Products

```http
GET /api/v1/products/search
```

**Query Parameters:**

- `q` (string): Search query
- `category` (string): Filter by category
- `filters` (object): Advanced filters

**Example:**

```http
GET /api/v1/products/search?q=samsung&category=electronics&filters[price_min]=1000000&filters[brand]=samsung
```

---

### 🗂️ Categories

#### Get Categories

```http
GET /api/v1/categories
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "cat_electronics",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and gadgets",
      "image": "https://cdn.ultramarket.uz/categories/electronics.jpg",
      "parent_id": null,
      "level": 0,
      "children": [
        {
          "id": "cat_smartphones",
          "name": "Smartphones",
          "slug": "smartphones",
          "parent_id": "cat_electronics",
          "level": 1,
          "product_count": 150
        }
      ],
      "product_count": 500,
      "is_active": true,
      "sort_order": 1
    }
  ]
}
```

#### Get Category Details

```http
GET /api/v1/categories/{category_id}
```

---

### 🛒 Shopping Cart

#### Get Cart

```http
GET /api/v1/cart
Authorization: Bearer <JWT_TOKEN>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "items": [
      {
        "id": "item_123",
        "product": {
          "id": "prod_123",
          "name": "Samsung Galaxy S23",
          "image": "https://cdn.ultramarket.uz/products/prod_123/thumb.jpg",
          "price": 12500000,
          "currency": "UZS"
        },
        "quantity": 1,
        "unit_price": 12500000,
        "total_price": 12500000,
        "added_at": "2024-01-15T10:00:00Z"
      }
    ],
    "summary": {
      "items_count": 1,
      "subtotal": 12500000,
      "tax": 1562500,
      "shipping": 50000,
      "discount": 0,
      "total": 14112500,
      "currency": "UZS"
    },
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Add to Cart

```http
POST /api/v1/cart/items
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "product_id": "prod_123",
  "quantity": 1,
  "variant_id": "var_123_black"
}
```

#### Update Cart Item

```http
PUT /api/v1/cart/items/{item_id}
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "quantity": 2
}
```

#### Remove from Cart

```http
DELETE /api/v1/cart/items/{item_id}
Authorization: Bearer <JWT_TOKEN>
```

#### Clear Cart

```http
DELETE /api/v1/cart
Authorization: Bearer <JWT_TOKEN>
```

---

### 📦 Order Management

#### Create Order

```http
POST /api/v1/orders
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "shipping_address": {
    "street": "Amir Temur ko'chasi 1",
    "city": "Tashkent",
    "region": "Tashkent",
    "postal_code": "100000",
    "phone": "+998901234567"
  },
  "billing_address": {
    "street": "Amir Temur ko'chasi 1",
    "city": "Tashkent",
    "region": "Tashkent",
    "postal_code": "100000"
  },
  "payment_method": "click",
  "shipping_method": "standard",
  "notes": "Please call before delivery"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "order_123",
    "order_number": "UM-2024-001",
    "status": "pending",
    "items": [
      {
        "id": "item_123",
        "product": {
          "id": "prod_123",
          "name": "Samsung Galaxy S23",
          "image": "https://cdn.ultramarket.uz/products/prod_123/thumb.jpg"
        },
        "quantity": 1,
        "unit_price": 12500000,
        "total_price": 12500000
      }
    ],
    "summary": {
      "subtotal": 12500000,
      "tax": 1562500,
      "shipping": 50000,
      "total": 14112500,
      "currency": "UZS"
    },
    "shipping_address": {
      "street": "Amir Temur ko'chasi 1",
      "city": "Tashkent",
      "region": "Tashkent",
      "postal_code": "100000",
      "phone": "+998901234567"
    },
    "payment": {
      "method": "click",
      "status": "pending",
      "payment_url": "https://checkout.click.uz/payment/123"
    },
    "created_at": "2024-01-15T10:30:00Z",
    "estimated_delivery": "2024-01-18T00:00:00Z"
  }
}
```

#### Get Orders

```http
GET /api/v1/orders
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**

- `status` (string): Filter by status
- `page` (integer): Page number
- `limit` (integer): Items per page

#### Get Order Details

```http
GET /api/v1/orders/{order_id}
Authorization: Bearer <JWT_TOKEN>
```

#### Cancel Order

```http
POST /api/v1/orders/{order_id}/cancel
Authorization: Bearer <JWT_TOKEN>
```

---

### 💳 Payment Processing

#### Process Payment

```http
POST /api/v1/payments/process
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "order_id": "order_123",
  "payment_method": "click",
  "return_url": "https://ultramarket.uz/orders/order_123/success",
  "cancel_url": "https://ultramarket.uz/orders/order_123/cancel"
}
```

#### Click Payment Integration

```http
POST /api/v1/payments/click/prepare
```

**Request Body:**

```json
{
  "order_id": "order_123",
  "amount": 14112500,
  "return_url": "https://ultramarket.uz/payment/success"
}
```

#### Payme Payment Integration

```http
POST /api/v1/payments/payme/create
```

#### Payment Status Check

```http
GET /api/v1/payments/{payment_id}/status
Authorization: Bearer <JWT_TOKEN>
```

---

### 📱 Notifications

#### Get Notifications

```http
GET /api/v1/notifications
Authorization: Bearer <JWT_TOKEN>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "type": "order_status",
      "title": "Order Shipped",
      "message": "Your order #UM-2024-001 has been shipped",
      "data": {
        "order_id": "order_123",
        "tracking_number": "TR123456789"
      },
      "read": false,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### Mark as Read

```http
PUT /api/v1/notifications/{notification_id}/read
Authorization: Bearer <JWT_TOKEN>
```

#### Send SMS Notification

```http
POST /api/v1/notifications/sms
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "phone": "+998901234567",
  "message": "Your order has been confirmed",
  "template": "order_confirmation"
}
```

---

### 🔍 Search & Analytics

#### Advanced Search

```http
GET /api/v1/search
```

**Query Parameters:**

- `q` (string): Search query
- `type` (string): Search type (products, categories, brands)
- `filters` (object): Advanced filters

#### Search Suggestions

```http
GET /api/v1/search/suggestions
```

**Query Parameters:**

- `q` (string): Partial query

#### Analytics Tracking

```http
POST /api/v1/analytics/track
```

**Request Body:**

```json
{
  "event": "product_view",
  "data": {
    "product_id": "prod_123",
    "category": "electronics",
    "user_id": "user_123"
  }
}
```

---

### 📊 Reviews & Ratings

#### Get Product Reviews

```http
GET /api/v1/products/{product_id}/reviews
```

#### Add Review

```http
POST /api/v1/products/{product_id}/reviews
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**

```json
{
  "rating": 5,
  "title": "Excellent product!",
  "comment": "Very satisfied with this purchase. Highly recommended!",
  "images": ["https://cdn.ultramarket.uz/reviews/review_123/image1.jpg"]
}
```

---

### 🏪 Vendor Management

#### Get Vendors

```http
GET /api/v1/vendors
```

#### Get Vendor Details

```http
GET /api/v1/vendors/{vendor_id}
```

#### Vendor Products

```http
GET /api/v1/vendors/{vendor_id}/products
```

---

### 📈 Admin APIs

#### Dashboard Statistics

```http
GET /api/v1/admin/dashboard/stats
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

#### Manage Products

```http
GET /api/v1/admin/products
POST /api/v1/admin/products
PUT /api/v1/admin/products/{product_id}
DELETE /api/v1/admin/products/{product_id}
```

#### Manage Orders

```http
GET /api/v1/admin/orders
PUT /api/v1/admin/orders/{order_id}/status
```

#### Manage Users

```http
GET /api/v1/admin/users
PUT /api/v1/admin/users/{user_id}/status
```

---

## 🔌 WebSocket Events

### Connection

```javascript
const socket = io('wss://api.ultramarket.uz', {
  auth: {
    token: 'your_jwt_token',
  },
});
```

### Event Types

#### Order Updates

```javascript
socket.on('order_status_changed', (data) => {
  console.log('Order status updated:', data);
  // data: { order_id, status, message }
});
```

#### Inventory Updates

```javascript
socket.on('product_stock_changed', (data) => {
  console.log('Stock updated:', data);
  // data: { product_id, stock, status }
});
```

#### Real-time Notifications

```javascript
socket.on('notification', (data) => {
  console.log('New notification:', data);
  // data: { type, title, message, data }
});
```

#### Price Changes

```javascript
socket.on('price_changed', (data) => {
  console.log('Price updated:', data);
  // data: { product_id, old_price, new_price }
});
```

---

## 📚 SDKs & Libraries

### JavaScript/Node.js SDK

```bash
npm install @ultramarket/sdk
```

```javascript
import UltraMarket from '@ultramarket/sdk';

const client = new UltraMarket({
  apiKey: 'your_api_key',
  baseURL: 'https://api.ultramarket.uz'
});

// Get products
const products = await client.products.list({
  category: 'electronics',
  limit: 20
});

// Create order
const order = await client.orders.create({
  items: [{ product_id: 'prod_123', quantity: 1 }],
  shipping_address: { ... }
});
```

### Python SDK

```bash
pip install ultramarket-sdk
```

```python
from ultramarket import UltraMarket

client = UltraMarket(
    api_key='your_api_key',
    base_url='https://api.ultramarket.uz'
)

# Get products
products = client.products.list(category='electronics', limit=20)

# Create order
order = client.orders.create({
    'items': [{'product_id': 'prod_123', 'quantity': 1}],
    'shipping_address': { ... }
})
```

### PHP SDK

```bash
composer require ultramarket/sdk
```

```php
<?php
use UltraMarket\Client;

$client = new Client([
    'api_key' => 'your_api_key',
    'base_url' => 'https://api.ultramarket.uz'
]);

// Get products
$products = $client->products->list([
    'category' => 'electronics',
    'limit' => 20
]);

// Create order
$order = $client->orders->create([
    'items' => [['product_id' => 'prod_123', 'quantity' => 1]],
    'shipping_address' => [ ... ]
]);
```

---

## 🔧 Integration Examples

### E-commerce Integration

#### Product Catalog Integration

```javascript
// Fetch and display products
async function loadProducts() {
  try {
    const response = await fetch('https://api.ultramarket.uz/api/v1/products', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (data.success) {
      displayProducts(data.data);
    }
  } catch (error) {
    console.error('Error loading products:', error);
  }
}
```

#### Shopping Cart Integration

```javascript
// Add item to cart
async function addToCart(productId, quantity) {
  try {
    const response = await fetch(
      'https://api.ultramarket.uz/api/v1/cart/items',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      updateCartUI(data.data);
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
  }
}
```

### Payment Integration

#### Click Payment

```javascript
async function processClickPayment(orderId, amount) {
  try {
    const response = await fetch(
      'https://api.ultramarket.uz/api/v1/payments/click/prepare',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          amount: amount,
          return_url: 'https://yoursite.com/payment/success',
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      // Redirect to Click payment page
      window.location.href = data.data.payment_url;
    }
  } catch (error) {
    console.error('Error processing payment:', error);
  }
}
```

### Mobile App Integration

#### React Native Example

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

class UltraMarketAPI {
  constructor() {
    this.baseURL = 'https://api.ultramarket.uz';
  }

  async getAuthToken() {
    return await AsyncStorage.getItem('auth_token');
  }

  async request(endpoint, options = {}) {
    const token = await this.getAuthToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    return response.json();
  }

  async getProducts(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.request(`/api/v1/products?${queryString}`);
  }
}
```

---

## 🧪 Testing

### Postman Collection

Import our comprehensive Postman collection:

```
https://api.ultramarket.uz/docs/postman/collection.json
```

### cURL Examples

#### Authentication

```bash
curl -X POST https://api.ultramarket.uz/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Get Products

```bash
curl -X GET "https://api.ultramarket.uz/api/v1/products?category=electronics&limit=10" \
  -H "Accept: application/json"
```

#### Create Order

```bash
curl -X POST https://api.ultramarket.uz/api/v1/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipping_address": {
      "street": "Amir Temur ko'\''chasi 1",
      "city": "Tashkent",
      "region": "Tashkent",
      "postal_code": "100000"
    },
    "payment_method": "click"
  }'
```

### Testing Environment

- **Base URL**: `https://staging-api.ultramarket.uz`
- **Test Cards**: Available in staging environment
- **Mock Data**: Pre-populated test data available

---

## 📋 Changelog

### Version 1.0.0 (2024-01-15)

- ✅ Initial API release
- ✅ Complete authentication system
- ✅ Product catalog and search
- ✅ Shopping cart and orders
- ✅ Payment gateway integrations
- ✅ Notification system
- ✅ Admin APIs
- ✅ WebSocket support

### Version 1.1.0 (Planned)

- 🔄 Enhanced search with AI
- 🔄 Advanced analytics
- 🔄 Mobile app optimizations
- 🔄 Performance improvements

---

## 📞 Support

### API Support

- **Email**: api-support@ultramarket.uz
- **Documentation**: https://docs.ultramarket.uz
- **Status Page**: https://status.ultramarket.uz

### Integration Help

- **Discord**: https://discord.gg/ultramarket
- **Stack Overflow**: Tag your questions with `ultramarket-api`
- **GitHub Issues**: https://github.com/ultramarket/api/issues

---

## 📄 License

This API documentation is provided under the MIT License. See [LICENSE](LICENSE) for details.

---

**🚀 UltraMarket API - Built for the Uzbekistan market with ❤️**

_Last updated: $(date)_  
_API Version: 1.0.0_  
_Documentation Version: 1.0.0_
