# 📚 UltraMarket API Complete Documentation

## 📋 Overview

**Version:** 2.0.0  
**Base URL:** `https://api.ultramarket.com/v1`  
**Authentication:** JWT Bearer Token  
**Content-Type:** `application/json`

---

## 🔐 Authentication

### JWT Authentication

All API endpoints (except public ones) require JWT authentication via Bearer token.

```http
Authorization: Bearer <jwt_token>
```

### Token Structure

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "CUSTOMER|SELLER|ADMIN|SUPER_ADMIN",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## 🏗️ Microservices Architecture

| Service              | Base URL                | Port | Description        |
| -------------------- | ----------------------- | ---- | ------------------ |
| API Gateway          | `/api/v1`               | 3000 | Main entry point   |
| User Service         | `/api/v1/users`         | 3001 | User management    |
| Auth Service         | `/api/v1/auth`          | 3002 | Authentication     |
| Product Service      | `/api/v1/products`      | 3003 | Product catalog    |
| Order Service        | `/api/v1/orders`        | 3004 | Order management   |
| Cart Service         | `/api/v1/cart`          | 3005 | Shopping cart      |
| Payment Service      | `/api/v1/payments`      | 3006 | Payment processing |
| Notification Service | `/api/v1/notifications` | 3009 | Notifications      |
| Search Service       | `/api/v1/search`        | 3010 | Search & filtering |

---

## 👤 User Service API

### **POST /api/v1/auth/register**

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER",
      "isEmailVerified": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "User registered successfully"
}
```

### **POST /api/v1/auth/login**

Authenticate user and get tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER",
      "lastLoginAt": "2024-01-15T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### **GET /api/v1/users/profile**

Get current user profile.

**Headers:**

```http
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "role": "CUSTOMER",
    "isEmailVerified": true,
    "addresses": [
      {
        "id": "address-uuid",
        "type": "SHIPPING",
        "street1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA",
        "isDefault": true
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 🛍️ Product Service API

### **GET /api/v1/products**

Get paginated list of products with filtering.

**Query Parameters:**

- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Items per page
- `category` (string): Filter by category ID
- `search` (string): Search in name/description
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sortBy` (string): Sort field (price, name, createdAt)
- `sortOrder` (string): asc or desc

**Example Request:**

```http
GET /api/v1/products?page=1&limit=20&category=electronics&minPrice=100&maxPrice=1000&sortBy=price&sortOrder=asc
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product-uuid",
        "name": "iPhone 15 Pro",
        "description": "Latest iPhone with advanced features",
        "price": 999.99,
        "compareAtPrice": 1099.99,
        "sku": "IPHONE15PRO-128GB",
        "category": {
          "id": "category-uuid",
          "name": "Smartphones",
          "slug": "smartphones"
        },
        "brand": {
          "id": "brand-uuid",
          "name": "Apple"
        },
        "images": ["https://cdn.ultramarket.com/products/iphone15pro-1.jpg"],
        "inventory": {
          "quantity": 50,
          "inStock": true
        },
        "rating": {
          "average": 4.8,
          "count": 245
        },
        "isActive": true,
        "isFeatured": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
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

### **GET /api/v1/products/:id**

Get single product details.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "product-uuid",
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone with advanced features and A17 Pro chip",
    "price": 999.99,
    "compareAtPrice": 1099.99,
    "sku": "IPHONE15PRO-128GB",
    "specifications": {
      "display": "6.1-inch Super Retina XDR",
      "storage": "128GB",
      "camera": "48MP Main + 12MP Ultra Wide",
      "processor": "A17 Pro chip"
    },
    "category": {
      "id": "category-uuid",
      "name": "Smartphones",
      "slug": "smartphones",
      "breadcrumb": ["Electronics", "Mobile Phones", "Smartphones"]
    },
    "brand": {
      "id": "brand-uuid",
      "name": "Apple",
      "logo": "https://cdn.ultramarket.com/brands/apple.jpg"
    },
    "images": [
      "https://cdn.ultramarket.com/products/iphone15pro-1.jpg",
      "https://cdn.ultramarket.com/products/iphone15pro-2.jpg"
    ],
    "variants": [
      {
        "id": "variant-uuid",
        "name": "128GB Natural Titanium",
        "price": 999.99,
        "sku": "IPHONE15PRO-128GB-NT",
        "attributes": {
          "storage": "128GB",
          "color": "Natural Titanium"
        },
        "inventory": {
          "quantity": 50,
          "inStock": true
        }
      }
    ],
    "inventory": {
      "totalQuantity": 150,
      "inStock": true,
      "lowStockThreshold": 10
    },
    "seo": {
      "title": "iPhone 15 Pro - Latest Apple Smartphone",
      "description": "Buy iPhone 15 Pro with A17 Pro chip, advanced camera system",
      "keywords": ["iPhone", "Apple", "smartphone", "A17 Pro"]
    },
    "reviews": {
      "average": 4.8,
      "count": 245,
      "distribution": {
        "5": 180,
        "4": 45,
        "3": 15,
        "2": 3,
        "1": 2
      }
    },
    "relatedProducts": ["product-uuid-1", "product-uuid-2"],
    "isActive": true,
    "isFeatured": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 🛒 Cart Service API

### **GET /api/v1/cart**

Get current user's cart.

**Headers:**

```http
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "cart-uuid",
    "userId": "user-uuid",
    "items": [
      {
        "id": "item-uuid",
        "productId": "product-uuid",
        "productName": "iPhone 15 Pro",
        "variantId": "variant-uuid",
        "sku": "IPHONE15PRO-128GB",
        "price": 999.99,
        "originalPrice": 1099.99,
        "quantity": 2,
        "maxQuantity": 5,
        "image": "https://cdn.ultramarket.com/products/iphone15pro-thumb.jpg",
        "variant": {
          "storage": "128GB",
          "color": "Natural Titanium"
        },
        "subtotal": 1999.98,
        "addedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "summary": {
      "itemCount": 2,
      "subtotal": 1999.98,
      "tax": 159.99,
      "shipping": 0.0,
      "discount": 100.0,
      "total": 2059.97
    },
    "appliedCoupons": [
      {
        "code": "WELCOME10",
        "discount": 100.0,
        "type": "FIXED_AMOUNT"
      }
    ],
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2024-01-16T10:30:00.000Z"
  }
}
```

### **POST /api/v1/cart/items**

Add item to cart.

**Request Body:**

```json
{
  "productId": "product-uuid",
  "variantId": "variant-uuid",
  "quantity": 2
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "item": {
      "id": "item-uuid",
      "productId": "product-uuid",
      "quantity": 2,
      "addedAt": "2024-01-15T10:30:00.000Z"
    },
    "cart": {
      "itemCount": 3,
      "total": 2559.97
    }
  },
  "message": "Item added to cart successfully"
}
```

---

## 📦 Order Service API

### **POST /api/v1/orders**

Create new order from cart.

**Request Body:**

```json
{
  "shippingAddressId": "address-uuid",
  "billingAddressId": "address-uuid",
  "paymentMethodId": "payment-method-uuid",
  "notes": "Please deliver after 5 PM"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-2024-001234",
    "status": "PENDING",
    "items": [
      {
        "id": "order-item-uuid",
        "productId": "product-uuid",
        "productName": "iPhone 15 Pro",
        "sku": "IPHONE15PRO-128GB",
        "price": 999.99,
        "quantity": 2,
        "subtotal": 1999.98
      }
    ],
    "summary": {
      "subtotal": 1999.98,
      "tax": 159.99,
      "shipping": 0.0,
      "discount": 100.0,
      "total": 2059.97
    },
    "shipping": {
      "address": {
        "street1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA"
      },
      "method": "STANDARD",
      "estimatedDelivery": "2024-01-20T00:00:00.000Z"
    },
    "payment": {
      "method": "CREDIT_CARD",
      "status": "PENDING"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Order created successfully"
}
```

### **GET /api/v1/orders/:id**

Get order details.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "orderNumber": "ORD-2024-001234",
    "status": "SHIPPED",
    "tracking": {
      "number": "1Z999AA1234567890",
      "carrier": "UPS",
      "url": "https://www.ups.com/track?tracknum=1Z999AA1234567890"
    },
    "timeline": [
      {
        "status": "PENDING",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "note": "Order placed"
      },
      {
        "status": "CONFIRMED",
        "timestamp": "2024-01-15T11:00:00.000Z",
        "note": "Payment confirmed"
      },
      {
        "status": "PROCESSING",
        "timestamp": "2024-01-15T14:00:00.000Z",
        "note": "Order being prepared"
      },
      {
        "status": "SHIPPED",
        "timestamp": "2024-01-16T09:00:00.000Z",
        "note": "Order shipped via UPS"
      }
    ],
    "items": [
      {
        "id": "order-item-uuid",
        "productId": "product-uuid",
        "productName": "iPhone 15 Pro",
        "image": "https://cdn.ultramarket.com/products/iphone15pro-thumb.jpg",
        "sku": "IPHONE15PRO-128GB",
        "price": 999.99,
        "quantity": 2,
        "subtotal": 1999.98
      }
    ],
    "summary": {
      "subtotal": 1999.98,
      "tax": 159.99,
      "shipping": 0.0,
      "discount": 100.0,
      "total": 2059.97
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T09:00:00.000Z"
  }
}
```

---

## 💳 Payment Service API

### **POST /api/v1/payments/intent**

Create payment intent for order.

**Request Body:**

```json
{
  "orderId": "order-uuid",
  "amount": 2059.97,
  "currency": "USD",
  "paymentMethod": "STRIPE"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_1234567890",
    "clientSecret": "pi_1234567890_secret_abc123",
    "amount": 2059.97,
    "currency": "USD",
    "status": "requires_payment_method"
  }
}
```

---

## 🔍 Search Service API

### **GET /api/v1/search**

Search products with advanced filtering.

**Query Parameters:**

- `q` (string): Search query
- `category` (string): Category filter
- `brand` (string): Brand filter
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `rating` (number): Minimum rating
- `inStock` (boolean): Only in-stock items
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**

```json
{
  "success": true,
  "data": {
    "query": "iphone",
    "results": [
      {
        "id": "product-uuid",
        "name": "iPhone 15 Pro",
        "price": 999.99,
        "image": "https://cdn.ultramarket.com/products/iphone15pro-thumb.jpg",
        "rating": 4.8,
        "reviewCount": 245,
        "inStock": true,
        "relevanceScore": 0.95
      }
    ],
    "facets": {
      "categories": [
        {
          "id": "smartphones",
          "name": "Smartphones",
          "count": 25
        }
      ],
      "brands": [
        {
          "id": "apple",
          "name": "Apple",
          "count": 15
        }
      ],
      "priceRanges": [
        {
          "min": 0,
          "max": 500,
          "count": 10
        },
        {
          "min": 500,
          "max": 1000,
          "count": 20
        }
      ]
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    },
    "suggestions": ["iphone 15", "iphone pro", "iphone 14"]
  }
}
```

---

## 📊 Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Please provide a valid email address"
      }
    ],
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-uuid"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Invalid or missing authentication
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict (e.g., duplicate email)
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable

---

## 🔄 Rate Limiting

### Limits

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **Search**: 200 requests per 15 minutes per user
- **Cart operations**: 50 requests per 5 minutes per user

### Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
Retry-After: 900
```

---

## 📡 Webhooks

### Order Status Updates

```http
POST /your-webhook-endpoint
Content-Type: application/json
X-UltraMarket-Signature: sha256=abc123...

{
  "event": "order.status_changed",
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "ORD-2024-001234",
    "previousStatus": "PROCESSING",
    "currentStatus": "SHIPPED",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Payment Updates

```http
POST /your-webhook-endpoint
Content-Type: application/json
X-UltraMarket-Signature: sha256=abc123...

{
  "event": "payment.completed",
  "data": {
    "paymentId": "payment-uuid",
    "orderId": "order-uuid",
    "amount": 2059.97,
    "currency": "USD",
    "status": "COMPLETED",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 🔧 SDKs and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @ultramarket/sdk
```

```typescript
import { UltraMarketAPI } from '@ultramarket/sdk';

const api = new UltraMarketAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.ultramarket.com/v1',
});

// Get products
const products = await api.products.list({
  page: 1,
  limit: 20,
  category: 'electronics',
});

// Add to cart
await api.cart.addItem({
  productId: 'product-uuid',
  quantity: 2,
});
```

### Python SDK

```bash
pip install ultramarket-sdk
```

```python
from ultramarket import UltraMarketAPI

api = UltraMarketAPI(
    api_key='your-api-key',
    base_url='https://api.ultramarket.com/v1'
)

# Get products
products = api.products.list(
    page=1,
    limit=20,
    category='electronics'
)

# Create order
order = api.orders.create({
    'shipping_address_id': 'address-uuid',
    'payment_method_id': 'payment-uuid'
})
```

---

## 📝 OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

- **JSON**: `https://api.ultramarket.com/v1/openapi.json`
- **YAML**: `https://api.ultramarket.com/v1/openapi.yaml`
- **Interactive Docs**: `https://api.ultramarket.com/docs`

---

## 🧪 Testing

### Postman Collection

Import our Postman collection for easy API testing:

```
https://api.ultramarket.com/v1/postman-collection.json
```

### Test Environment

- **Base URL**: `https://api-staging.ultramarket.com/v1`
- **Test Cards**: Use Stripe test cards for payment testing
- **Test Users**: Pre-created test accounts available

---

## 📞 Support

- **Documentation**: https://docs.ultramarket.com
- **API Status**: https://status.ultramarket.com
- **Support Email**: api-support@ultramarket.com
- **Developer Slack**: https://ultramarket-dev.slack.com

---

**Last Updated:** 2024-01-15  
**API Version:** 2.0.0  
**Documentation Version:** 1.0.0
