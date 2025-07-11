# 🚀 UltraMarket - Getting Started Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Development Setup](#development-setup)
5. [Running the Application](#running-the-application)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🛠️ Prerequisites

### System Requirements

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher
- **Docker**: Version 20.x or higher
- **Docker Compose**: Version 2.x or higher
- **Git**: Version 2.x or higher

### Required Services

- **PostgreSQL**: 14.x or higher
- **MongoDB**: 6.x or higher
- **Redis**: 7.x or higher
- **Elasticsearch**: 8.x or higher (optional)

### Development Tools

- **VS Code** (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - Docker
  - REST Client

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/ultramarket.git
cd ultramarket
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install shared library dependencies
cd libs/shared && npm install

# Install microservice dependencies
cd ../../microservices
for service in */; do
  if [ -f "$service/package.json" ]; then
    echo "Installing dependencies for $service"
    cd "$service" && npm install && cd ..
  fi
done

# Install frontend dependencies
cd ../frontend/web-app && npm install
cd ../admin-panel && npm install
```

### 3. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Application Settings
NODE_ENV=development
APP_VERSION=1.0.0
API_VERSION=v1
LOG_LEVEL=info

# Server Configuration
PORT=3000
HOST=localhost
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ultramarket
POSTGRES_USER=ultramarket_user
POSTGRES_PASSWORD=your_secure_password

MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=ultramarket_products
MONGODB_USERNAME=ultramarket_admin
MONGODB_PASSWORD=your_secure_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password

# JWT Configuration
JWT_ACCESS_SECRET=your_super_secure_jwt_access_secret_here
JWT_REFRESH_SECRET=your_super_secure_jwt_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Generate Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32
openssl rand -base64 32

# Generate database passwords
openssl rand -base64 16
```

---

## 🏗️ Development Setup

### 1. Database Setup

#### Using Docker (Recommended)

```bash
# Start required services
docker-compose up -d postgres mongodb redis elasticsearch

# Wait for services to be ready
docker-compose logs -f postgres
```

#### Manual Setup

```bash
# PostgreSQL
sudo -u postgres createdb ultramarket
sudo -u postgres createuser ultramarket_user
sudo -u postgres psql -c "ALTER USER ultramarket_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ultramarket TO ultramarket_user;"

# MongoDB
mongosh
use ultramarket_products
db.createUser({
  user: "ultramarket_admin",
  pwd: "your_password",
  roles: ["readWrite"]
})
```

### 2. Database Migrations

```bash
# Run migrations for all services
cd microservices/core/auth-service
npm run migrate

cd ../user-service
npm run migrate

cd ../../business/product-service
npm run migrate

cd ../order-service
npm run migrate

cd ../payment-service
npm run migrate
```

### 3. Seed Data

```bash
# Seed development data
cd microservices/core/auth-service
npm run seed

cd ../user-service
npm run seed

cd ../../business/product-service
npm run seed
```

---

## 🚀 Running the Application

### Development Mode

#### Option 1: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option 2: Manual Start

```bash
# Terminal 1: API Gateway
cd microservices/core/api-gateway
npm run dev

# Terminal 2: Auth Service
cd microservices/core/auth-service
npm run dev

# Terminal 3: User Service
cd microservices/core/user-service
npm run dev

# Terminal 4: Product Service
cd microservices/business/product-service
npm run dev

# Terminal 5: Order Service
cd microservices/business/order-service
npm run dev

# Terminal 6: Payment Service
cd microservices/business/payment-service
npm run dev

# Terminal 7: Frontend
cd frontend/web-app
npm run dev

# Terminal 8: Admin Panel
cd frontend/admin-panel
npm run dev
```

### Production Mode

```bash
# Build all services
npm run build:all

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests for specific service
cd microservices/core/auth-service
npm test

# Run tests with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- --grep "Authentication"
```

### E2E Tests

```bash
# Start services for E2E testing
docker-compose -f docker-compose.test.yml up -d

# Run E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- --spec "cypress/e2e/auth.cy.ts"
```

### Performance Tests

```bash
# Run load tests
npm run test:load

# Run stress tests
npm run test:stress
```

---

## 📊 Monitoring

### Health Checks

```bash
# Check API Gateway health
curl http://localhost:8000/health

# Check individual service health
curl http://localhost:3002/health  # Auth Service
curl http://localhost:3003/health  # Product Service
```

### Metrics

```bash
# View Prometheus metrics
curl http://localhost:9090/metrics

# View Grafana dashboards
open http://localhost:3001
```

### Logs

```bash
# View service logs
docker-compose logs -f auth-service
docker-compose logs -f product-service

# View application logs
tail -f logs/application.log
```

---

## 🚀 Deployment

### Development Deployment

```bash
# Build and deploy to development environment
npm run deploy:dev
```

### Staging Deployment

```bash
# Deploy to staging
npm run deploy:staging
```

### Production Deployment

```bash
# Deploy to production
npm run deploy:prod
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/

# Check deployment status
kubectl get pods -n ultramarket
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database connectivity
docker-compose exec postgres psql -U ultramarket_user -d ultramarket -c "SELECT 1;"

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

#### 2. Service Startup Issues

```bash
# Check service logs
docker-compose logs auth-service

# Restart specific service
docker-compose restart auth-service
```

#### 3. Port Conflicts

```bash
# Check port usage
lsof -i :3000
lsof -i :8000

# Kill process using port
kill -9 <PID>
```

#### 4. Memory Issues

```bash
# Check memory usage
docker stats

# Increase memory limits
docker-compose down
export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1
docker-compose up -d
```

### Performance Issues

```bash
# Monitor performance
npm run monitor

# Check slow queries
npm run analyze:queries

# Optimize database
npm run optimize:db
```

### Security Issues

```bash
# Run security audit
npm audit

# Fix security vulnerabilities
npm audit fix

# Run penetration tests
npm run test:security
```

---

## 📚 Additional Resources

### Documentation

- [API Documentation](./API_Complete_Documentation.md)
- [Architecture Overview](./architecture.md)
- [Security Guide](./security/SECURITY_FIXES.md)
- [Deployment Guide](./launch/go-live-checklist.md)

### Development Tools

- [VS Code Configuration](./.vscode/settings.json)
- [ESLint Configuration](./config/eslint/)
- [Prettier Configuration](./.prettierrc)
- [TypeScript Configuration](./config/typescript/)

### Monitoring & Observability

- [Grafana Dashboards](./infrastructure/monitoring/grafana/dashboards/)
- [Prometheus Configuration](./infrastructure/monitoring/)
- [Alerting Rules](./infrastructure/monitoring/alerts.yml)

### Testing

- [Test Configuration](./config/jest/)
- [E2E Test Examples](./tests/e2e/cypress/e2e/)
- [Performance Test Suite](./tests/performance/)

---

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm test
   npm run lint
   ```
5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request**

### Code Standards

- Follow [TypeScript best practices](https://www.typescriptlang.org/docs/)
- Use [ESLint](https://eslint.org/) for code linting
- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Write comprehensive tests
- Update documentation

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(auth): add JWT token refresh endpoint`
- `fix(product): resolve memory leak in product cache`
- `docs(api): update authentication documentation`

---

## 📞 Support

### Getting Help

- **Documentation**: Check the docs folder for detailed guides
- **Issues**: Create an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Security**: Report security issues to security@ultramarket.com

### Community

- **Slack**: Join our [Slack workspace](https://ultramarket.slack.com)
- **Discord**: Join our [Discord server](https://discord.gg/ultramarket)
- **Blog**: Read our [technical blog](https://blog.ultramarket.com)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Happy Coding! 🎉**

For more information, visit our [documentation site](https://docs.ultramarket.com) or contact us at support@ultramarket.com.