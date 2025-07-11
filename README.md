# 🚀 UltraMarket Enterprise E-commerce Platform

[![Build Status](https://github.com/ultramarket/ultramarket-enterprise/workflows/CI/badge.svg)](https://github.com/ultramarket/ultramarket-enterprise/actions)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=ultramarket_enterprise&metric=security_rating)](https://sonarcloud.io/dashboard?id=ultramarket_enterprise)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ultramarket_enterprise&metric=coverage)](https://sonarcloud.io/dashboard?id=ultramarket_enterprise)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

> **Enterprise-grade e-commerce platform** built with modern microservices architecture, designed for scalability, performance, and reliability.

## 🌟 Features

### 🛡️ **Security & Authentication**

- **JWT-based authentication** with refresh tokens
- **Role-based access control** (RBAC)
- **Rate limiting** and DDoS protection
- **Input validation** and sanitization
- **SQL injection** protection
- **XSS prevention** with CSP headers

### 🏗️ **Architecture**

- **Microservices architecture** with 15+ services
- **API Gateway** with Kong for routing and load balancing
- **Event-driven architecture** with Apache Kafka
- **CQRS pattern** for read/write separation
- **Database per service** pattern
- **Circuit breaker** pattern for fault tolerance

### 📊 **Performance & Scalability**

- **Multi-level caching** (Redis, in-memory)
- **Database optimization** with indexes and partitioning
- **Horizontal scaling** with Kubernetes
- **CDN integration** for static assets
- **Load balancing** with health checks
- **Performance monitoring** with Prometheus

### 💳 **Business Features**

- **Multi-vendor marketplace** support
- **Advanced product catalog** with variants
- **Real-time inventory** management
- **Multiple payment gateways** (Stripe, PayPal, etc.)
- **Dynamic pricing** engine
- **Order management** system
- **Shipping integration** with multiple carriers
- **Analytics and reporting** dashboard

### 🛠️ **Developer Experience**

- **TypeScript** throughout the codebase
- **Professional logging** with structured JSON
- **Comprehensive testing** (unit, integration, e2e)
- **API documentation** with Swagger/OpenAPI
- **Docker containerization** for all services
- **Kubernetes deployment** configurations
- **CI/CD pipeline** with GitHub Actions

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App]
        MOBILE[Mobile App]
        ADMIN[Admin Panel]
    end

    subgraph "API Gateway"
        KONG[Kong Gateway]
    end

    subgraph "Core Services"
        AUTH[Auth Service]
        USER[User Service]
        PRODUCT[Product Service]
        ORDER[Order Service]
        PAYMENT[Payment Service]
        CART[Cart Service]
    end

    subgraph "Platform Services"
        NOTIFICATION[Notification Service]
        SEARCH[Search Service]
        ANALYTICS[Analytics Service]
        FILE[File Service]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        MONGO[(MongoDB)]
        REDIS[(Redis)]
        ELASTIC[(Elasticsearch)]
    end

    subgraph "Message Queue"
        KAFKA[Apache Kafka]
    end

    subgraph "Monitoring"
        PROMETHEUS[Prometheus]
        GRAFANA[Grafana]
        JAEGER[Jaeger]
    end

    WEB --> KONG
    MOBILE --> KONG
    ADMIN --> KONG

    KONG --> AUTH
    KONG --> USER
    KONG --> PRODUCT
    KONG --> ORDER
    KONG --> PAYMENT
    KONG --> CART

    AUTH --> POSTGRES
    USER --> POSTGRES
    PRODUCT --> POSTGRES
    ORDER --> POSTGRES
    PAYMENT --> POSTGRES
    CART --> REDIS

    SEARCH --> ELASTIC
    ANALYTICS --> MONGO

    ORDER --> KAFKA
    PAYMENT --> KAFKA
    NOTIFICATION --> KAFKA

    PROMETHEUS --> GRAFANA
```

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **Docker** >= 20.10.0
- **Docker Compose** >= 2.0.0
- **Kubernetes** >= 1.24.0 (for production)
- **Git** >= 2.30.0

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/ultramarket/ultramarket-enterprise.git
cd ultramarket-enterprise
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Install dependencies
npm run deps:install

# Build shared libraries
npm run build:libs
```

### 3. Start Development Environment

```bash
# Start all services with Docker Compose
npm run docker:dev

# Or start individual services
npm run dev:services
npm run dev:frontend
```

### 4. Access the Applications

- **Web App**: http://localhost:3000
- **Admin Panel**: http://localhost:3001
- **API Gateway**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🛠️ Development

### Project Structure

```
ultramarket-enterprise/
├── 📁 frontend/                 # Frontend applications
│   ├── 📁 web-app/             # Customer-facing web app
│   ├── 📁 admin-panel/         # Admin dashboard
│   └── 📁 mobile-app/          # Mobile app (React Native)
├── 📁 microservices/           # Backend microservices
│   ├── 📁 core/                # Core services
│   │   ├── 📁 auth-service/    # Authentication
│   │   ├── 📁 user-service/    # User management
│   │   └── 📁 api-gateway/     # API Gateway
│   ├── 📁 business/            # Business logic services
│   │   ├── 📁 product-service/ # Product catalog
│   │   ├── 📁 order-service/   # Order management
│   │   ├── 📁 payment-service/ # Payment processing
│   │   └── 📁 cart-service/    # Shopping cart
│   └── 📁 platform/            # Platform services
│       ├── 📁 notification-service/
│       ├── 📁 search-service/
│       └── 📁 analytics-service/
├── 📁 libs/                    # Shared libraries
│   ├── 📁 shared/              # Common utilities
│   ├── 📁 types/               # TypeScript types
│   └── 📁 ui-components/       # Reusable UI components
├── 📁 infrastructure/          # Infrastructure as code
│   ├── 📁 kubernetes/          # K8s manifests
│   ├── 📁 terraform/           # Terraform configs
│   └── 📁 monitoring/          # Monitoring configs
├── 📁 tests/                   # Test suites
│   ├── 📁 e2e/                 # End-to-end tests
│   ├── 📁 integration/         # Integration tests
│   └── 📁 performance/         # Performance tests
└── 📁 docs/                    # Documentation
```

### Available Scripts

```bash
# Development
npm run dev                     # Start all services
npm run dev:services           # Start backend services
npm run dev:frontend          # Start frontend apps

# Building
npm run build                  # Build all services
npm run build:libs            # Build shared libraries
npm run build:services        # Build backend services
npm run build:frontend        # Build frontend apps

# Testing
npm run test                   # Run all tests
npm run test:unit             # Unit tests
npm run test:integration      # Integration tests
npm run test:e2e              # End-to-end tests
npm run test:coverage         # Test coverage

# Code Quality
npm run lint                   # Lint all code
npm run lint:fix              # Fix linting issues
npm run type-check            # TypeScript type checking
npm run format                # Format code with Prettier

# Docker
npm run docker:build          # Build Docker images
npm run docker:dev            # Start development environment
npm run docker:prod           # Start production environment
npm run docker:clean          # Clean Docker resources

# Database
npm run db:migrate            # Run database migrations
npm run db:seed               # Seed database with test data
npm run db:reset              # Reset database
npm run db:studio             # Open database studio

# Kubernetes
npm run k8s:deploy            # Deploy to Kubernetes
npm run k8s:delete            # Delete from Kubernetes
npm run k8s:logs              # View logs

# Monitoring
npm run monitoring:start      # Start monitoring stack
npm run monitoring:stop       # Stop monitoring stack
npm run health:check          # Check service health
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v2

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ultramarket
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/ultramarket
ELASTICSEARCH_URL=http://localhost:9200

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# External Services
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=your-paypal-client-id
SENDGRID_API_KEY=your-sendgrid-api-key
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Monitoring
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
JAEGER_URL=http://localhost:14268

# Security
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### Service Configuration

Each service has its own configuration file in `config/` directory:

- `database.config.ts` - Database connections
- `redis.config.ts` - Redis configuration
- `auth.config.ts` - Authentication settings
- `payment.config.ts` - Payment gateway settings

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e               # End-to-end tests

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run performance tests
npm run test:performance
```

### Test Coverage

Current test coverage:

- **Unit Tests**: 85%
- **Integration Tests**: 70%
- **E2E Tests**: 60%
- **Overall Coverage**: 75%

### Writing Tests

```typescript
// Example unit test
import { UserService } from '../user.service';
import { testDataGenerator } from '@ultramarket/shared/testing';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  it('should create a new user', async () => {
    const userData = testDataGenerator.user();
    const user = await userService.create(userData);

    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
  });
});
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build production images
npm run docker:build

# Start production environment
npm run docker:prod

# Scale services
docker-compose up -d --scale product-service=3
```

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
npm run k8s:deploy

# Check deployment status
kubectl get pods -n ultramarket

# View logs
kubectl logs -f deployment/api-gateway -n ultramarket

# Scale deployment
kubectl scale deployment product-service --replicas=5 -n ultramarket
```

### Production Checklist

- [ ] **Environment variables** configured
- [ ] **Database migrations** applied
- [ ] **SSL certificates** installed
- [ ] **Monitoring** configured
- [ ] **Backup strategy** implemented
- [ ] **Load balancer** configured
- [ ] **CDN** configured
- [ ] **Security scanning** completed

## 📊 Monitoring & Observability

### Metrics

- **Prometheus** for metrics collection
- **Grafana** for visualization
- **Custom dashboards** for business metrics

### Logging

- **Structured JSON logging** with Winston
- **Centralized logging** with ELK stack
- **Log aggregation** across all services

### Tracing

- **Distributed tracing** with Jaeger
- **Request tracking** across services
- **Performance profiling**

### Health Checks

```bash
# Check service health
curl http://localhost:8000/health

# Check specific service
curl http://localhost:3001/api/health

# View health dashboard
open http://localhost:3000/admin/health
```

## 🔒 Security

### Security Features

- **HTTPS everywhere** with TLS 1.3
- **JWT authentication** with secure cookies
- **Rate limiting** per IP and user
- **Input validation** and sanitization
- **SQL injection** protection
- **XSS prevention** with CSP headers
- **CSRF protection** with tokens
- **Security headers** with Helmet.js

### Security Scanning

```bash
# Run security audit
npm run security:audit

# Fix security issues
npm run security:fix

# Run penetration testing
npm run security:scan
```

### Security Best Practices

1. **Never commit secrets** to version control
2. **Use environment variables** for configuration
3. **Implement proper authentication** and authorization
4. **Validate all inputs** on client and server
5. **Use HTTPS** for all communications
6. **Keep dependencies updated**
7. **Monitor for security vulnerabilities**

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Add** tests for new functionality
5. **Run** the test suite
6. **Submit** a pull request

### Code Style

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Conventional commits** for commit messages

### Pull Request Process

1. **Update** documentation if needed
2. **Add** tests for new features
3. **Ensure** all tests pass
4. **Get** approval from maintainers
5. **Merge** after approval

## 📚 Documentation

- **[API Documentation](docs/API_Complete_Documentation.md)** - Complete API reference
- **[Architecture Guide](docs/architecture.md)** - System architecture details
- **[Deployment Guide](docs/deployment.md)** - Production deployment
- **[Security Guide](docs/security.md)** - Security best practices
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute

## 🆘 Support

### Getting Help

- **📧 Email**: support@ultramarket.com
- **💬 Discord**: [UltraMarket Community](https://discord.gg/ultramarket)
- **🐛 Issues**: [GitHub Issues](https://github.com/ultramarket/ultramarket-enterprise/issues)
- **📖 Documentation**: [docs.ultramarket.com](https://docs.ultramarket.com)

### FAQ

**Q: How do I add a new microservice?**
A: Follow our [Microservice Guide](docs/microservices.md) for step-by-step instructions.

**Q: How do I deploy to production?**
A: Check our [Deployment Guide](docs/deployment.md) for production deployment steps.

**Q: How do I contribute to the project?**
A: See our [Contributing Guide](CONTRIBUTING.md) for contribution guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React** team for the amazing frontend framework
- **Node.js** community for the robust backend platform
- **TypeScript** team for type safety
- **Docker** for containerization
- **Kubernetes** for orchestration
- **All contributors** who made this project possible

---

<div align="center">
  <h3>Built with ❤️ by the UltraMarket Team</h3>
  <p>
    <a href="https://ultramarket.com">Website</a> •
    <a href="https://docs.ultramarket.com">Documentation</a> •
    <a href="https://github.com/ultramarket/ultramarket-enterprise">GitHub</a> •
    <a href="https://twitter.com/ultramarket">Twitter</a>
  </p>
</div>
