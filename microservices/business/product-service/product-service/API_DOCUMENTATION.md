# Product Service API Documentation

## Base URL
```
http://localhost:3003/api/v1
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Health Check
Check service health status.

**GET** `/health`

Response:
```json
{
  "status": "healthy",
  "service": "product-service",
  "version": "1.0.0",
  "timestamp": "2025-01-16T06:00:00.000Z"
}
```

### Products

#### List Products
Get paginated list of products with filtering options.

**GET** `/products`

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search term
- `category` (string): Filter by category
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `sortBy` (string): Sort field (price, name, createdAt)
- `sortOrder` (string): Sort order (asc, desc)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Gaming Laptop",
      "price": 1299.99,
      "description": "High-performance gaming laptop",
      "category": "Electronics",
      "stock": 15
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

#### Get Product by ID
Get detailed product information.

**GET** `/products/:id`

Response:
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Gaming Laptop",
    "price": 1299.99,
    "description": "High-performance gaming laptop with RTX 4060",
    "category": "Electronics",
    "brand": "TechPro",
    "stock": 15,
    "images": ["image1.jpg", "image2.jpg"],
    "specifications": {
      "processor": "Intel i7-13700H",
      "ram": "16GB DDR5",
      "storage": "512GB NVMe SSD"
    }
  }
}
```

#### Create Product
Create a new product (Admin only).

**POST** `/products`

Request Body:
```json
{
  "name": "Product Name",
  "price": 99.99,
  "description": "Product description",
  "category": "Category",
  "brand": "Brand",
  "stock": 50,
  "images": ["image1.jpg"],
  "specifications": {}
}
```

#### Update Product
Update product details (Admin only).

**PUT** `/products/:id`

Request Body: Same as create product

#### Delete Product
Soft delete a product (Admin only).

**DELETE** `/products/:id`

### Categories

#### List Categories
Get all product categories.

**GET** `/categories`

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Electronics",
      "slug": "electronics",
      "productCount": 150
    }
  ]
}
```

### Search

#### Search Products
Full-text search across products.

**GET** `/search`

Query Parameters:
- `q` (string): Search query
- `limit` (number): Results limit

Response:
```json
{
  "success": true,
  "query": "laptop",
  "results": [
    {
      "id": "1",
      "name": "Gaming Laptop",
      "price": 1299.99,
      "category": "Electronics",
      "relevance": 0.95
    }
  ],
  "total": 1
}
```

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- Standard endpoints: 1000 requests per 15 minutes
- Authentication endpoints: 10 requests per 15 minutes

## Examples

### cURL Examples

List products:
```bash
curl http://localhost:3003/api/v1/products
```

Search products:
```bash
curl "http://localhost:3003/api/v1/search?q=laptop"
```

Create product (with auth):
```bash
curl -X POST http://localhost:3003/api/v1/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Product",
    "price": 99.99,
    "category": "Electronics"
  }'
```