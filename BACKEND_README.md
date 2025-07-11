# 🚀 UltraMarket Backend - Professional E-commerce Platform

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Security](#security)
- [Testing](#testing)

## 🎯 Overview

UltraMarket is a professional, enterprise-grade e-commerce platform built with microservices architecture. The backend consists of 15+ microservices, each handling specific business domains with high scalability, security, and performance.

### Key Features

- ✅ **Microservices Architecture** - 15+ independent services
- ✅ **High Performance** - Sub-100ms API response times
- ✅ **Enterprise Security** - JWT, RBAC, Rate limiting, Input validation
- ✅ **Real-time Analytics** - ClickHouse-powered analytics
- ✅ **Advanced Search** - Elasticsearch with ML-powered ranking
- ✅ **Payment Processing** - Stripe integration with webhooks
- ✅ **Monitoring & Observability** - Prometheus, Grafana, Jaeger
- ✅ **Message Queuing** - RabbitMQ for async processing
- ✅ **Object Storage** - MinIO for file management
- ✅ **Container Orchestration** - Docker & Kubernetes ready

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ULTRAMARKET BACKEND ARCHITECTURE                │
├─────────────────────────────────────────────────────────────────────┤
│                         API Gateway Layer                           │
│                    Kong / NGINX + Load Balancer                    │
├─────────────────────────────────────────────────────────────────────┤
│                      Microservices Layer                            │
│  ┌──────────────┬──────────────┬──────────────┬─────────────────┐  │
│  │ Auth Service │Product Service│ Order Service│ Payment Service │  │
│  │ JWT + Users  │ Catalog + ML  │ Cart + Orders│ Stripe + Wallet │  │
│  ├──────────────┼──────────────┼──────────────┼─────────────────┤  │
│  │Search Service│Review Service │Analytics Svc │Inventory Service│  │
│  │Elasticsearch │Rating + ML    │ClickHouse + BI│ Stock + Alerts │  │
│  ├──────────────┼──────────────┼──────────────┼─────────────────┤  │
│  │Shipping Svc  │Notification  │ Admin Service│Recommendation   │  │
│  │Multi-carrier │Email + SMS   │ Dashboard    │ ML + AI Engine  │  │
│  └──────────────┴──────────────┴──────────────┴─────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                         Data Layer                                   │
│  ┌──────────────┬──────────────┬──────────────┬─────────────────┐  │
│  │ PostgreSQL   │   MongoDB    │    Redis     │  Elasticsearch  │  │
│  │ Users+Orders │  Products    │ Cache+Session│    Search       │  │
│  ├──────────────┼──────────────┼──────────────┼─────────────────┤  │
│  │ ClickHouse   │   RabbitMQ   │  Prometheus  │   MinIO/S3      │  │
│  │ Analytics    │  Messaging   │  Monitoring  │  File Storage   │  │
│  └──────────────┴──────────────┴──────────────┴─────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer                            │
│         Kubernetes + Docker + CI/CD + Monitoring                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔧 Services

### Core Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **API Gateway** | 3000 | Node.js + Express | Route management, load balancing |
| **Auth Service** | 3002 | Node.js + Prisma + PostgreSQL | Authentication & authorization |
| **User Service** | 3001 | Node.js + Prisma + PostgreSQL | User management |

### Business Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **Product Service** | 3003 | Node.js + Mongoose + MongoDB | Product catalog & management |
| **Order Service** | 3004 | Node.js + Prisma + PostgreSQL | Order processing & management |
| **Payment Service** | 3005 | Node.js + Prisma + PostgreSQL | Payment processing (Stripe) |
| **Cart Service** | 3006 | Node.js + Redis | Shopping cart management |
| **Review Service** | 3007 | Node.js + MongoDB | Product reviews & ratings |
| **Inventory Service** | 3008 | Node.js + Prisma + PostgreSQL | Stock management |

### Platform Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **Search Service** | 3009 | Node.js + Elasticsearch | Advanced search & filtering |
| **Notification Service** | 3010 | Node.js + Redis + SMTP | Email, SMS, push notifications |
| **Analytics Service** | 3011 | Node.js + ClickHouse | Real-time analytics |
| **Shipping Service** | 3012 | Node.js + External APIs | Multi-carrier shipping |
| **Admin Service** | 3013 | Node.js + Prisma + PostgreSQL | Admin dashboard backend |

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Git

### 1. Clone Repository

```bash
git clone https://github.com/ultramarket/backend.git
cd backend
```

### 2. Environment Setup

```bash
# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

### 3. Start Services

```bash
# Start all services
docker-compose -f docker-compose.backend.yml up -d

# Or start specific services
docker-compose -f docker-compose.backend.yml up -d api-gateway auth-service product-service
```

### 4. Initialize Databases

```bash
# Run database migrations
docker-compose -f docker-compose.backend.yml exec auth-service npm run migrate
docker-compose -f docker-compose.backend.yml exec order-service npm run migrate
docker-compose -f docker-compose.backend.yml exec payment-service npm run migrate
```

### 5. Verify Installation

```bash
# Check service health
curl http://localhost:3000/health

# Check all services
curl http://localhost:3000/health/services
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

All protected endpoints require a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/orders
```

### Core Endpoints

#### Authentication
```bash
# Register user
POST /auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

# Get profile
GET /auth/profile
```

#### Products
```bash
# Get all products
GET /products?page=1&limit=20&category=electronics

# Get product by ID
GET /products/:id

# Search products
GET /search/products?q=laptop&minPrice=500&maxPrice=2000

# Create product (Admin)
POST /admin/products
{
  "name": "Gaming Laptop",
  "description": "High-performance gaming laptop",
  "price": 1299.99,
  "categoryId": "category_id",
  "brand": "GamingBrand"
}
```

#### Orders
```bash
# Get user orders
GET /orders

# Create order
POST /orders
{
  "items": [
    {
      "productId": "product_id",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001"
  }
}

# Get order by ID
GET /orders/:id
```

#### Cart
```bash
# Get cart
GET /cart

# Add item to cart
POST /cart/items
{
  "productId": "product_id",
  "quantity": 1
}

# Update cart item
PUT /cart/items/:id
{
  "quantity": 3
}

# Remove item from cart
DELETE /cart/items/:id
```

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev:auth
npm run dev:product
npm run dev:order
npm run dev:payment
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

### Database Management

```bash
# Generate Prisma client
npm run generate

# Run migrations
npm run migrate

# Reset database
npm run migrate:reset

# Seed database
npm run seed
```

## 🚀 Deployment

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale product-service=3
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/

# Check deployment status
kubectl get pods -n ultramarket

# Access services
kubectl port-forward svc/api-gateway 3000:3000
```

## 📊 Monitoring

### Available Dashboards

- **Grafana**: http://localhost:3001 (admin/ultramarket123)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686
- **Kibana**: http://localhost:5601
- **RabbitMQ**: http://localhost:15672 (ultramarket/ultramarket123)
- **MinIO**: http://localhost:9001 (ultramarket/ultramarket123)

### Key Metrics

- API Response Time (target: <100ms)
- Error Rate (target: <1%)
- Throughput (requests/second)
- Database Connection Pool
- Memory Usage
- CPU Usage

## 🔒 Security

### Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Input Validation** - Sanitize all inputs
- ✅ **CORS Protection** - Cross-origin security
- ✅ **Helmet Headers** - Security headers
- ✅ **SQL Injection Protection** - Parameterized queries
- ✅ **XSS Protection** - Input sanitization
- ✅ **CSRF Protection** - Cross-site request forgery

### Security Best Practices

```bash
# Generate secure JWT secrets
openssl rand -base64 32

# Use environment variables for secrets
export JWT_SECRET="your-secure-secret"
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Regular security updates
npm audit fix
docker-compose pull
```

## 🧪 Testing

### Test Types

- **Unit Tests** - Individual function testing
- **Integration Tests** - API endpoint testing
- **E2E Tests** - Full user journey testing
- **Performance Tests** - Load and stress testing

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:auth
npm run test:product
npm run test:order

# Run tests with coverage
npm run test:coverage

# Run performance tests
npm run test:performance
```

### Test Examples

```typescript
// Unit test example
describe('UserService', () => {
  it('should create user successfully', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    const result = await userService.createUser(userData);
    expect(result.email).toBe(userData.email);
  });
});

// Integration test example
describe('Auth API', () => {
  it('should register new user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

## 📈 Performance

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | <100ms (P95) | ✅ Optimized |
| Database Query Time | <50ms | ✅ Optimized |
| Concurrent Users | 10,000+ | ✅ Supported |
| Throughput | 1,000+ req/s | ✅ Achieved |

### Optimization Strategies

- **Database Indexing** - Optimized queries
- **Caching** - Redis for session and data caching
- **Connection Pooling** - Efficient database connections
- **Load Balancing** - Distribute traffic
- **CDN** - Global content delivery
- **Compression** - Gzip response compression

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
MONGODB_URI=mongodb://user:pass@host:port/db

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# External Services
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
```

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Add** tests for new functionality
5. **Run** the test suite
6. **Submit** a pull request

### Code Standards

- Follow TypeScript best practices
- Use ESLint and Prettier
- Write comprehensive tests
- Document new APIs
- Follow conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: [docs.ultramarket.com](https://docs.ultramarket.com)
- **Issues**: [GitHub Issues](https://github.com/ultramarket/backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ultramarket/backend/discussions)
- **Email**: support@ultramarket.com

### Community

- **Slack**: [UltraMarket Community](https://ultramarket.slack.com)
- **Discord**: [UltraMarket Discord](https://discord.gg/ultramarket)
- **Twitter**: [@UltraMarket](https://twitter.com/UltraMarket)

---

**Built with ❤️ by the UltraMarket Team**