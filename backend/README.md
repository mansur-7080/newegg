# 🚀 UltraMarket Backend Gateway

Professional API Gateway for UltraMarket E-commerce Platform - Built with TypeScript, Express, and Microservices Architecture.

## 📋 Overview

This is the main API Gateway for the UltraMarket platform that routes requests to various microservices including:

- **Authentication Service** - User registration, login, JWT management
- **Product Service** - Product catalog, categories, search
- **Order Service** - Order management, cart operations
- **Payment Service** - Click.uz, Payme.uz payment processing
- **User Service** - Profile management, addresses, wishlist
- **Search Service** - Elasticsearch-powered product search
- **File Service** - File uploads, media management
- **Notification Service** - Email, SMS notifications

## 🏗️ Architecture

```
Frontend Apps → API Gateway → Microservices → Databases
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Authentication**: JWT
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston
- **Validation**: Joi
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier

## 📦 Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 14+
- Redis 6+
- npm 8.0.0 or higher

## ⚡ Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

```bash
# Copy production environment template
cp .env.production .env

# Generate secure passwords
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For REDIS_PASSWORD
```

### 3. Update Environment Variables

Edit `.env` file with your configuration:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ultramarket

# JWT Secrets (Use generated values above)
JWT_SECRET=your_secure_jwt_secret_here
JWT_REFRESH_SECRET=your_secure_refresh_secret_here

# Redis
REDIS_PASSWORD=your_redis_password_here

# Payment Gateways (Production credentials)
CLICK_SERVICE_ID=your_click_service_id
CLICK_SECRET_KEY=your_click_secret_key
PAYME_MERCHANT_ID=your_payme_merchant_id
PAYME_SECRET_KEY=your_payme_secret_key
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:5000`

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start with hot reload
npm run start:dev    # Start development mode

# Production
npm run build        # Build TypeScript
npm run start        # Start production server
npm run start:prod   # Build and start

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run with coverage

# Code Quality
npm run lint         # Lint and fix
npm run format       # Format code
npm run type-check   # TypeScript check

# Health Check
npm run health       # Check server health
```

## 🔐 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - Request throttling
- **JWT Authentication** - Stateless auth
- **Input Validation** - Joi schemas
- **Environment Validation** - Config validation
- **SQL Injection Protection** - Prisma ORM
- **XSS Protection** - Built-in Express security

## 📡 API Endpoints

### Health & Monitoring

```bash
GET  /health              # Simple health check
GET  /health/detailed     # Detailed health with services
GET  /health/ready        # Kubernetes readiness probe
GET  /health/live         # Kubernetes liveness probe
GET  /health/version      # API version info
GET  /health/metrics      # System metrics
```

### Authentication

```bash
POST /api/auth/register         # User registration
POST /api/auth/login           # User login
POST /api/auth/refresh         # Refresh token
POST /api/auth/logout          # User logout
POST /api/auth/forgot-password # Password reset
GET  /api/auth/me             # Current user
```

### Products

```bash
GET    /api/products           # Get all products
GET    /api/products/:id       # Get product by ID
POST   /api/products           # Create product (admin)
PUT    /api/products/:id       # Update product (admin)
DELETE /api/products/:id       # Delete product (admin)
GET    /api/categories         # Get categories
```

### Orders

```bash
GET    /api/orders             # Get user orders
GET    /api/orders/:id         # Get order by ID
POST   /api/orders             # Create order
PATCH  /api/orders/:id/status  # Update status (admin)
POST   /api/orders/:id/cancel  # Cancel order
```

### Payments

```bash
POST /api/payments                    # Create payment
GET  /api/payments/:id               # Get payment
POST /api/payments/click/prepare     # Click.uz webhook
POST /api/payments/click/complete    # Click.uz webhook
POST /api/payments/payme             # Payme.uz webhook
```

### Search

```bash
GET /api/search                 # Global search
GET /api/search/products        # Product search
GET /api/search/suggestions     # Search suggestions
```

## 🔄 Microservices Integration

The gateway forwards requests to microservices with:

- **Authentication** forwarding
- **User context** injection
- **Error handling** standardization
- **Timeout management**
- **Circuit breaker** patterns
- **Health checking**

### Service URLs Configuration

```env
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
PRODUCT_SERVICE_URL=http://localhost:3003
ORDER_SERVICE_URL=http://localhost:3004
PAYMENT_SERVICE_URL=http://localhost:3005
SEARCH_SERVICE_URL=http://localhost:3006
FILE_SERVICE_URL=http://localhost:3007
NOTIFICATION_SERVICE_URL=http://localhost:3008
```

## 💳 Payment Integration

### Click.uz Setup

1. Register at [click.uz](https://click.uz)
2. Get service credentials
3. Configure webhook URLs
4. Update environment variables

### Payme.uz Setup

1. Register at [payme.uz](https://payme.uz)
2. Get merchant credentials
3. Configure webhook endpoints
4. Update environment variables

## 📊 Monitoring & Logging

### Health Checks

- Database connectivity
- Redis connectivity
- Memory usage
- Event loop delay
- Service availability

### Logging

- Structured JSON logging
- Request/response logging
- Error tracking
- Performance metrics

### Metrics Endpoints

```bash
GET /health/metrics    # System metrics
GET /health/detailed   # Service health
```

## 🐳 Docker Support

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## 🚀 Production Deployment

### 1. Environment Setup

```bash
# Copy production config
cp .env.production .env

# Update with real credentials
# - Database connection
# - JWT secrets
# - Payment gateway credentials
# - SMTP configuration
```

### 2. Build & Start

```bash
npm run build
npm run start
```

### 3. Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name ultramarket-gateway

# Monitor
pm2 logs ultramarket-gateway
pm2 monit
```

### 4. Nginx Proxy

```nginx
server {
    listen 80;
    server_name api.ultramarket.uz;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Test connection
   psql -h localhost -U ultramarket_user -d ultramarket
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis status
   sudo systemctl status redis
   
   # Test connection
   redis-cli ping
   ```

3. **Microservice Unavailable**
   ```bash
   # Check service health
   curl http://localhost:3001/health
   
   # Check logs
   npm run logs
   ```

### Debug Mode

```bash
# Start with debug logging
LOG_LEVEL=debug npm run dev
```

## 📈 Performance

- **Request timeout**: 30 seconds
- **Rate limiting**: 100 requests/15 minutes (production)
- **Connection pooling**: Prisma managed
- **Redis caching**: Session storage
- **Compression**: Gzip enabled

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

## 📝 API Documentation

Visit `/api-docs` when server is running for Swagger documentation.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Write tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file

## 🆘 Support

- **Email**: dev@ultramarket.uz
- **Documentation**: [docs.ultramarket.uz](https://docs.ultramarket.uz)
- **Issues**: [GitHub Issues](https://github.com/ultramarket/backend/issues)

---

**Built with ❤️ by UltraMarket Team**