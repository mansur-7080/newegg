# E-Commerce Platform - API Specification Document

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication Service](#2-authentication-service)
3. [User Service](#3-user-service)
4. [Product Service](#4-product-service)
5. [Cart Service](#5-cart-service)
6. [Order Service](#6-order-service)
7. [Payment Service](#7-payment-service)
8. [Common Standards](#8-common-standards)

---

## 1. API Overview

### Base URLs
- Development: `http://localhost:8000/api/v1`
- Production: `https://api.ecommerce.com/api/v1`

### Authentication
```http
Authorization: Bearer <jwt_token>
```

---

## 2. Authentication Service

### Register User
**POST** `/auth/register`

Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com"
  }
}
```

### Login
**POST** `/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "customer"
    }
  }
}
```

---

## 3. User Service

### Get Profile
**GET** `/users/profile`

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Update Profile
**PUT** `/users/profile`

Request:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

---

## 4. Product Service

### Get Products
**GET** `/products?page=1&limit=20`

Response:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Product Name",
        "price": 99.99,
        "image": "url",
        "inStock": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

### Get Product Details
**GET** `/products/{id}`

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Product Name",
    "description": "Description",
    "price": 99.99,
    "images": ["url1", "url2"],
    "category": "Electronics",
    "inStock": true,
    "quantity": 50
  }
}
```

---

## 5. Cart Service

### Get Cart
**GET** `/cart`

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": "uuid",
        "name": "Product",
        "price": 99.99,
        "quantity": 2,
        "subtotal": 199.98
      }
    ],
    "total": 199.98
  }
}
```

### Add to Cart
**POST** `/cart/items`

Request:
```json
{
  "productId": "uuid",
  "quantity": 1
}
```

---

## 6. Order Service

### Create Order
**POST** `/orders`

Request:
```json
{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "zipCode": "10001"
  },
  "paymentMethodId": "uuid"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "orderNumber": "ORD-2024-0001",
    "status": "pending",
    "total": 199.98
  }
}
```

### Get Orders
**GET** `/orders`

Response:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "orderNumber": "ORD-2024-0001",
        "status": "delivered",
        "total": 199.98,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

## 7. Payment Service

### Process Payment
**POST** `/payments/process`

Request:
```json
{
  "orderId": "uuid",
  "paymentMethodId": "uuid",
  "amount": 199.98
}
```

Response:
```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "status": "completed",
    "transactionId": "txn_123"
  }
}
```

---

## 8. Common Standards

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### Pagination
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

### Rate Limiting
- Authenticated: 1000 req/hour
- Unauthenticated: 100 req/hour

--- 