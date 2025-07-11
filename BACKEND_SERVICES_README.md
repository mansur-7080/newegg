# UltraMarket Backend Services

Professional microservices architecture for UltraMarket e-commerce platform with comprehensive authentication, product management, order processing, and analytics.

## 🏗️ Architecture Overview

UltraMarket backend is built using a microservices architecture with the following components:

### Core Services
- **Auth Service** - User authentication, authorization, and session management
- **User Service** - User profile management and user-related operations
- **API Gateway** - Kong-based gateway for routing and rate limiting

### Business Services
- **Product Service** - Product catalog, categories, and inventory management
- **Order Service** - Order processing, cart management, and order lifecycle
- **Payment Service** - Payment processing and transaction management
- **Cart Service** - Shopping cart functionality
- **Inventory Service** - Stock management and inventory tracking

### Platform Services
- **Search Service** - Product search and filtering
- **Notification Service** - Email, SMS, and push notifications
- **File Service** - File upload and media management
- **Content Service** - CMS and content management

### Analytics & AI Services
- **Analytics Service** - Business intelligence and reporting
- **Recommendation Service** - AI-powered product recommendations
- **Fraud Detection Service** - Security and fraud prevention

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. **Clone and Setup**
```bash
git clone <repository-url>
cd UltraMarket
```

2. **Environment Configuration**
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start Development Environment**
```bash
# Start all services
docker-compose -f config/docker/docker-compose.dev.yml up -d

# Or start specific services
docker-compose -f config/docker/docker-compose.dev.yml up auth-service product-service order-service
```

4. **Database Setup**
```bash
# Run database migrations
docker-compose -f config/docker/docker-compose.dev.yml exec auth-service npm run migrate:dev
docker-compose -f config/docker/docker-compose.dev.yml exec product-service npm run migrate:dev
```

5. **Access Services**
- API Gateway: http://localhost:8000
- Auth Service: http://localhost:3001
- Product Service: http://localhost:3003
- Order Service: http://localhost:3004
- Grafana Dashboard: http://localhost:3000 (admin/admin)
- Adminer (Database): http://localhost:8080
- Redis Commander: http://localhost:8081

## 📋 Service Details

### Authentication Service (`auth-service`)

**Port:** 3001

**Features:**
- User registration and login
- JWT token management
- Password reset and email verification
- Role-based access control
- Session management

**Endpoints:**
```
POST /api/v1/auth/register     - Register new user
POST /api/v1/auth/login        - User login
POST /api/v1/auth/refresh      - Refresh access token
POST /api/v1/auth/logout       - User logout
GET  /api/v1/auth/profile      - Get user profile
PUT  /api/v1/auth/profile      - Update user profile
POST /api/v1/auth/change-password - Change password
GET  /api/v1/auth/verify-email/:token - Verify email
```

**Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ultramarket
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EMAIL_VERIFICATION_SECRET=your-email-verification-secret
JWT_PASSWORD_RESET_SECRET=your-password-reset-secret
REDIS_URL=redis://localhost:6379
```

### Product Service (`product-service`)

**Port:** 3003

**Features:**
- Product CRUD operations
- Category management
- Inventory tracking
- Product search and filtering
- Vendor management

**Endpoints:**
```
GET    /api/v1/products           - Get all products
GET    /api/v1/products/:id       - Get product by ID
POST   /api/v1/products           - Create new product
PUT    /api/v1/products/:id       - Update product
DELETE /api/v1/products/:id       - Delete product
GET    /api/v1/categories         - Get categories
GET    /api/v1/search             - Search products
```

**Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ultramarket
REDIS_URL=redis://localhost:6379
```

### Order Service (`order-service`)

**Port:** 3004

**Features:**
- Order creation and management
- Shopping cart operations
- Order status tracking
- Payment integration
- Inventory updates

**Endpoints:**
```
GET    /api/v1/orders             - Get all orders
GET    /api/v1/orders/:id         - Get order by ID
POST   /api/v1/orders             - Create new order
PUT    /api/v1/orders/:id/status  - Update order status
GET    /api/v1/cart               - Get cart items
POST   /api/v1/cart               - Add item to cart
PUT    /api/v1/cart/:id           - Update cart item
DELETE /api/v1/cart/:id           - Remove from cart
DELETE /api/v1/cart               - Clear cart
```

### Payment Service (`payment-service`)

**Port:** 3005

**Features:**
- Payment processing (Stripe integration)
- Webhook handling
- Transaction management
- Refund processing

**Endpoints:**
```
POST /api/v1/payments/create      - Create payment intent
POST /api/v1/payments/confirm     - Confirm payment
POST /api/v1/payments/refund      - Process refund
POST /api/v1/webhooks/stripe      - Stripe webhook
```

## 🗄️ Database Schema

The system uses PostgreSQL with the following main tables:

### Users & Authentication
- `users` - User accounts and profiles
- `user_sessions` - JWT session management

### Products & Catalog
- `products` - Product information
- `categories` - Product categories (nested set model)
- `product_variants` - Product variants and options
- `product_views` - Product view tracking

### Orders & Transactions
- `orders` - Order information
- `order_items` - Order line items
- `cart_items` - Shopping cart items
- `inventory_transactions` - Stock movement tracking

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication with access and refresh tokens
- Role-based access control (Customer, Vendor, Admin, Super Admin)
- Session management with Redis
- Password hashing with bcrypt
- Email verification and password reset

### API Security
- Rate limiting with Kong API Gateway
- CORS configuration
- Input validation and sanitization
- SQL injection prevention with Prisma ORM
- XSS protection with helmet middleware

### Data Protection
- Encrypted sensitive data
- Audit logging
- GDPR compliance features
- Data retention policies

## 📊 Monitoring & Observability

### Metrics Collection
- Prometheus for metrics collection
- Custom business metrics
- Performance monitoring
- Error tracking

### Logging
- Structured logging with Winston
- Log aggregation
- Error tracking and alerting

### Health Checks
- Service health endpoints
- Database connectivity checks
- External service monitoring

## 🧪 Testing

### Test Types
- Unit tests with Jest
- Integration tests
- API tests with Supertest
- Performance tests with k6

### Running Tests
```bash
# Run all tests
npm test

# Run specific service tests
cd microservices/core/auth-service
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

### Production Deployment
```bash
# Build production images
docker-compose -f config/docker/docker-compose.prod.yml build

# Deploy to production
docker-compose -f config/docker/docker-compose.prod.yml up -d
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/

# Check deployment status
kubectl get pods -n ultramarket
```

## 🔧 Development

### Adding New Services
1. Create service directory in `microservices/`
2. Add Dockerfile and package.json
3. Update docker-compose files
4. Add service to API Gateway configuration
5. Create database migrations

### Code Standards
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Conventional commits
- API documentation with OpenAPI/Swagger

### Development Workflow
1. Feature branch creation
2. Development with hot reload
3. Testing and validation
4. Code review
5. Merge to main branch

## 📚 API Documentation

### Authentication
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Handling
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

---

**UltraMarket Backend** - Professional e-commerce microservices platform