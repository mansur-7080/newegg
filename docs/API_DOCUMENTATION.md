# UltraMarket Platform API Documentation

## Overview

The UltraMarket platform is a comprehensive e-commerce solution built with microservices architecture. This documentation provides detailed information about all available APIs, authentication, error handling, and integration guidelines.

## Base URL

- **Development**: `http://localhost:3000`
- **Staging**: `https://staging.ultramarket.com`
- **Production**: `https://api.ultramarket.com`

## Authentication

### JWT Token Authentication

All API endpoints require authentication using JWT tokens, except for public endpoints.

```http
Authorization: Bearer <your-jwt-token>
```

### Token Format

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "refreshToken": "refresh_token_here"
}
```

### Getting a Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  },
  "meta": {
    "requestId": "req_1234567890_abc123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

- **Standard**: 100 requests per 15 minutes
- **Authenticated**: 1000 requests per 15 minutes
- **Premium**: 5000 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## API Endpoints

### Authentication Service

#### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    }
  }
}
```

#### Register
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### User Service

#### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "US"
    },
    "preferences": {
      "language": "en",
      "currency": "USD",
      "timezone": "America/New_York"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Update User Profile
```http
PUT /users/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  }
}
```

### Product Service

#### Get Products
```http
GET /products?page=1&limit=20&category=electronics&sort=price&order=asc
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `category` (optional): Filter by category
- `brand` (optional): Filter by brand
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `sort` (optional): Sort field (name, price, rating, created_at)
- `order` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product_123",
        "name": "iPhone 15 Pro",
        "description": "Latest iPhone with advanced features",
        "price": 999.99,
        "originalPrice": 1099.99,
        "category": "electronics",
        "brand": "Apple",
        "images": [
          "https://example.com/iphone15pro_1.jpg",
          "https://example.com/iphone15pro_2.jpg"
        ],
        "specifications": {
          "color": "Titanium",
          "storage": "256GB",
          "screen": "6.1 inch"
        },
        "rating": 4.8,
        "reviewCount": 1250,
        "stock": 50,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get Product by ID
```http
GET /products/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "product_123",
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone with advanced features",
    "price": 999.99,
    "originalPrice": 1099.99,
    "category": "electronics",
    "brand": "Apple",
    "images": [
      "https://example.com/iphone15pro_1.jpg",
      "https://example.com/iphone15pro_2.jpg"
    ],
    "specifications": {
      "color": "Titanium",
      "storage": "256GB",
      "screen": "6.1 inch"
    },
    "rating": 4.8,
    "reviewCount": 1250,
    "stock": 50,
    "isActive": true,
    "variants": [
      {
        "id": "variant_1",
        "color": "Titanium",
        "storage": "128GB",
        "price": 899.99,
        "stock": 25
      },
      {
        "id": "variant_2",
        "color": "Titanium",
        "storage": "256GB",
        "price": 999.99,
        "stock": 50
      }
    ],
    "reviews": [
      {
        "id": "review_1",
        "userId": "user_123",
        "rating": 5,
        "comment": "Excellent product!",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Search Products
```http
GET /products/search?q=iphone&category=electronics&minPrice=500&maxPrice=1500
```

### Cart Service

#### Get Cart
```http
GET /cart
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "userId": "user_123",
    "items": [
      {
        "id": "cart_item_1",
        "productId": "product_123",
        "product": {
          "id": "product_123",
          "name": "iPhone 15 Pro",
          "price": 999.99,
          "image": "https://example.com/iphone15pro_1.jpg"
        },
        "quantity": 2,
        "price": 999.99,
        "subtotal": 1999.98
      }
    ],
    "subtotal": 1999.98,
    "tax": 159.99,
    "shipping": 0,
    "total": 2159.97,
    "itemCount": 2,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Add Item to Cart
```http
POST /cart/items
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "product_123",
  "quantity": 2,
  "variantId": "variant_1"
}
```

#### Update Cart Item
```http
PUT /cart/items/{itemId}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "quantity": 3
}
```

#### Remove Item from Cart
```http
DELETE /cart/items/{itemId}
Authorization: Bearer <token>
```

#### Clear Cart
```http
DELETE /cart
Authorization: Bearer <token>
```

### Order Service

#### Create Order
```http
POST /orders
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "items": [
    {
      "productId": "product_123",
      "quantity": 2,
      "variantId": "variant_1"
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US",
    "phone": "+1234567890"
  },
  "billingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "paymentMethod": {
    "type": "credit_card",
    "token": "tok_visa"
  },
  "couponCode": "SAVE10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_123",
    "userId": "user_123",
    "items": [
      {
        "productId": "product_123",
        "product": {
          "id": "product_123",
          "name": "iPhone 15 Pro",
          "price": 999.99,
          "image": "https://example.com/iphone15pro_1.jpg"
        },
        "quantity": 2,
        "price": 999.99,
        "subtotal": 1999.98
      }
    ],
    "subtotal": 1999.98,
    "tax": 159.99,
    "shipping": 0,
    "discount": 199.99,
    "total": 1959.98,
    "status": "pending",
    "paymentStatus": "pending",
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "US",
      "phone": "+1234567890"
    },
    "trackingNumber": null,
    "estimatedDelivery": "2024-01-20T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Get Orders
```http
GET /orders?page=1&limit=20&status=pending
Authorization: Bearer <token>
```

#### Get Order by ID
```http
GET /orders/{id}
Authorization: Bearer <token>
```

#### Cancel Order
```http
POST /orders/{id}/cancel
Authorization: Bearer <token>
```

### Payment Service

#### Process Payment
```http
POST /payments
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "orderId": "order_123",
  "amount": 1959.98,
  "currency": "USD",
  "paymentMethod": {
    "type": "credit_card",
    "token": "tok_visa"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment_123",
    "orderId": "order_123",
    "amount": 1959.98,
    "currency": "USD",
    "status": "completed",
    "gateway": "stripe",
    "transactionId": "txn_123456789",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Get Payment Status
```http
GET /payments/{id}
Authorization: Bearer <token>
```

#### Refund Payment
```http
POST /payments/{id}/refund
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 1959.98,
  "reason": "Customer request"
}
```

### Review Service

#### Get Product Reviews
```http
GET /products/{productId}/reviews?page=1&limit=10&rating=5
```

#### Create Review
```http
POST /products/{productId}/reviews
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Excellent product! Highly recommended.",
  "images": [
    "https://example.com/review_image_1.jpg"
  ]
}
```

#### Update Review
```http
PUT /reviews/{id}
Authorization: Bearer <token>
```

#### Delete Review
```http
DELETE /reviews/{id}
Authorization: Bearer <token>
```

### Notification Service

#### Get Notifications
```http
GET /notifications?page=1&limit=20&unread=true
Authorization: Bearer <token>
```

#### Mark Notification as Read
```http
PUT /notifications/{id}/read
Authorization: Bearer <token>
```

#### Mark All Notifications as Read
```http
PUT /notifications/read-all
Authorization: Bearer <token>
```

### Search Service

#### Search Products
```http
GET /search?q=iphone&category=electronics&minPrice=500&maxPrice=1500&sort=relevance
```

**Query Parameters:**
- `q` (required): Search query
- `category` (optional): Filter by category
- `brand` (optional): Filter by brand
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `rating` (optional): Minimum rating
- `sort` (optional): Sort by (relevance, price, rating, newest)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "iphone",
    "results": [
      {
        "id": "product_123",
        "name": "iPhone 15 Pro",
        "description": "Latest iPhone with advanced features",
        "price": 999.99,
        "category": "electronics",
        "brand": "Apple",
        "rating": 4.8,
        "reviewCount": 1250,
        "image": "https://example.com/iphone15pro_1.jpg",
        "relevanceScore": 0.95
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    },
    "facets": {
      "categories": [
        { "name": "electronics", "count": 25 },
        { "name": "phones", "count": 20 }
      ],
      "brands": [
        { "name": "Apple", "count": 15 },
        { "name": "Samsung", "count": 10 }
      ],
      "priceRanges": [
        { "range": "500-1000", "count": 20 },
        { "range": "1000-1500", "count": 15 }
      ]
    }
  }
}
```

#### Get Search Suggestions
```http
GET /search/suggestions?q=iph
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "iphone 15 pro",
      "iphone 15",
      "iphone 14 pro",
      "iphone accessories"
    ]
  }
}
```

## Webhooks

### Webhook Configuration

Configure webhooks to receive real-time updates:

```http
POST /webhooks
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks",
  "events": ["order.created", "payment.completed", "order.shipped"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

| Event | Description | Payload |
|-------|-------------|---------|
| `order.created` | New order created | Order object |
| `order.updated` | Order status updated | Order object |
| `order.shipped` | Order shipped | Order object with tracking |
| `payment.completed` | Payment completed | Payment object |
| `payment.failed` | Payment failed | Payment object with error |
| `user.registered` | New user registered | User object |
| `product.updated` | Product updated | Product object |

### Webhook Security

Webhooks are signed with HMAC-SHA256:

```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');
```

## SDKs and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @ultramarket/sdk
```

```javascript
import { UltraMarketClient } from '@ultramarket/sdk';

const client = new UltraMarketClient({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Get products
const products = await client.products.list({
  category: 'electronics',
  limit: 20
});

// Create order
const order = await client.orders.create({
  items: [{ productId: 'product_123', quantity: 2 }],
  shippingAddress: { /* ... */ }
});
```

### Python SDK

```bash
pip install ultramarket-sdk
```

```python
from ultramarket import UltraMarketClient

client = UltraMarketClient(
    api_key='your-api-key',
    environment='production'
)

# Get products
products = client.products.list(
    category='electronics',
    limit=20
)

# Create order
order = client.orders.create({
    'items': [{'productId': 'product_123', 'quantity': 2}],
    'shippingAddress': { /* ... */ }
})
```

## Best Practices

### Error Handling

```javascript
try {
  const response = await fetch('/api/products');
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error.message);
  }
  
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Handle error appropriately
}
```

### Rate Limiting

```javascript
// Implement exponential backoff
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeRequest = async (url, options = {}) => {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || attempt * 1000;
        await delay(retryAfter);
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await delay(attempt * 1000);
    }
  }
};
```

### Caching

```javascript
// Implement caching for product data
const cache = new Map();

const getProduct = async (id) => {
  const cacheKey = `product_${id}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const response = await fetch(`/api/products/${id}`);
  const data = await response.json();
  
  cache.set(cacheKey, data);
  return data;
};
```

## Support

For API support and questions:

- **Email**: api-support@ultramarket.com
- **Documentation**: https://docs.ultramarket.com
- **Status Page**: https://status.ultramarket.com
- **GitHub**: https://github.com/ultramarket/api

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- Authentication and user management
- Product catalog and search
- Shopping cart functionality
- Order management
- Payment processing
- Review system
- Notification system