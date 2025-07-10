# 📁 UltraMarket E-Commerce Platform - Project Structure

## 🏗️ Root Directory Structure

```
UltraMarket/
├── 📁 .github/                    # GitHub workflows and templates
│   └── workflows/
│       └── main.yml              # CI/CD pipeline configuration
├── 📁 .vscode/                    # VS Code workspace settings
├── 📁 backend/                    # Backend microservices
│   ├── 📁 common/                # Shared utilities and types
│   ├── 📁 user-service/          # User management service
│   ├── 📁 product-service/       # Product catalog service
│   ├── 📁 order-service/         # Order management service
│   ├── 📁 cart-service/          # Shopping cart service
│   ├── 📁 payment-service/       # Payment processing service
│   ├── 📁 notification-service/  # Email/SMS notification service
│   └── 📁 search-service/        # Search and filtering service
├── 📁 config/                     # Configuration files
├── 📁 docs/                       # Project documentation
│   ├── architecture.md           # System architecture
│   ├── API_Specification.md      # API documentation
│   ├── Database_Schema.md        # Database schemas
│   ├── Development_Setup_Guide.md # Setup instructions
│   └── ...                       # Other documentation
├── 📁 frontend/                   # Frontend applications
│   ├── 📁 web-app/              # Main web application (React)
│   ├── 📁 admin-panel/          # Admin dashboard (React)
│   └── 📁 mobile-app/           # Mobile application (React Native)
├── 📁 infrastructure/             # Infrastructure as Code
│   ├── 📁 kubernetes/           # K8s manifests
│   ├── 📁 monitoring/           # Monitoring configurations
│   └── 📁 terraform/            # Cloud infrastructure
├── 📁 scripts/                    # Utility scripts
│   ├── start-dev.sh             # Linux/Mac startup script
│   ├── start-dev.ps1            # Windows startup script
│   └── setup-project.sh         # Initial setup script
├── 📁 tests/                      # End-to-end tests
├── 📄 .editorconfig              # Editor configuration
├── 📄 .gitignore                 # Git ignore rules
├── 📄 docker-compose.yml         # Docker services configuration
├── 📄 docker-compose.dev.yml     # Development Docker config
├── 📄 env.example                # Environment variables template
├── 📄 LICENSE                    # MIT License
├── 📄 Makefile                   # Make commands
├── 📄 PROJECT_STRUCTURE.md       # This file
└── 📄 README.md                  # Project overview
```

## 🔧 Backend Service Structure

Each microservice follows this structure:

```
backend/[service-name]/
├── 📁 src/
│   ├── 📁 controllers/          # Request handlers
│   ├── 📁 services/             # Business logic
│   ├── 📁 models/               # Data models
│   ├── 📁 routes/               # API routes
│   ├── 📁 middleware/           # Custom middleware
│   ├── 📁 utils/                # Utility functions
│   ├── 📁 validators/           # Request validation
│   ├── 📁 config/               # Service configuration
│   └── 📄 index.ts              # Entry point
├── 📁 prisma/                    # Database schema (if using Prisma)
│   ├── 📄 schema.prisma         # Prisma schema
│   └── 📁 migrations/           # Database migrations
├── 📁 tests/
│   ├── 📁 unit/                 # Unit tests
│   └── 📁 integration/          # Integration tests
├── 📄 .env.example              # Environment template
├── 📄 Dockerfile                # Production Docker image
├── 📄 Dockerfile.dev            # Development Docker image
├── 📄 package.json              # Dependencies
├── 📄 tsconfig.json             # TypeScript config
└── 📄 README.md                 # Service documentation
```

## 🎨 Frontend Application Structure

```
frontend/web-app/
├── 📁 public/                    # Static assets
├── 📁 src/
│   ├── 📁 assets/               # Images, fonts, etc.
│   ├── 📁 components/           # Reusable components
│   │   ├── 📁 common/          # Common components
│   │   ├── 📁 layout/          # Layout components
│   │   └── 📁 features/        # Feature-specific components
│   ├── 📁 pages/                # Page components
│   ├── 📁 hooks/                # Custom React hooks
│   ├── 📁 services/             # API services
│   ├── 📁 store/                # Redux store
│   │   ├── 📁 slices/          # Redux slices
│   │   └── 📄 index.ts         # Store configuration
│   ├── 📁 styles/               # Global styles
│   ├── 📁 types/                # TypeScript types
│   ├── 📁 utils/                # Utility functions
│   ├── 📄 App.tsx               # Main App component
│   ├── 📄 index.tsx             # Entry point
│   └── 📄 vite-env.d.ts        # Vite types
├── 📄 .eslintrc.json            # ESLint config
├── 📄 .prettierrc               # Prettier config
├── 📄 Dockerfile                # Production Docker image
├── 📄 Dockerfile.dev            # Development Docker image
├── 📄 index.html                # HTML template
├── 📄 package.json              # Dependencies
├── 📄 tailwind.config.js        # Tailwind CSS config
├── 📄 tsconfig.json             # TypeScript config
├── 📄 tsconfig.node.json        # Node TypeScript config
└── 📄 vite.config.ts            # Vite configuration
```

## 🗄️ Database Structure

### PostgreSQL (Relational Data)
- Users and authentication
- Orders and transactions
- Inventory management
- Reviews and ratings

### MongoDB (Document Store)
- Product catalog
- Product attributes
- Categories and tags
- Shopping sessions

### Redis (Cache & Sessions)
- Session management
- Shopping cart data
- API response caching
- Rate limiting

### Elasticsearch (Search)
- Product search index
- Full-text search
- Faceted navigation
- Search analytics

## 🔐 Configuration Files

### Environment Variables (.env)
```bash
# Database
DATABASE_URL=postgresql://...
MONGODB_URL=mongodb://...
REDIS_URL=redis://...

# Services
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
# ... other services

# External APIs
STRIPE_SECRET_KEY=...
AWS_ACCESS_KEY_ID=...
# ... other APIs
```

### Docker Compose Services
- PostgreSQL
- MongoDB
- Redis
- Elasticsearch
- Kafka + Zookeeper
- Prometheus + Grafana
- Kong API Gateway
- MinIO (S3 alternative)

## 📝 Development Workflow

1. **Clone repository**
   ```bash
   git clone https://github.com/mansur-7080/UltraMarket.git
   cd UltraMarket
   ```

2. **Setup environment**
   ```bash
   cp env.example .env
   # Edit .env with your values
   ```

3. **Start services**
   ```bash
   # Windows
   .\scripts\start-dev.ps1
   
   # Linux/Mac
   ./scripts/start-dev.sh
   ```

4. **Access services**
   - Frontend: http://localhost:3000
   - Admin: http://localhost:3100
   - API: http://localhost:8000
   - Grafana: http://localhost:3000

## 🚀 Deployment Structure

```
deployment/
├── 📁 kubernetes/
│   ├── 📁 base/               # Base configurations
│   ├── 📁 overlays/           # Environment-specific
│   │   ├── 📁 development/
│   │   ├── 📁 staging/
│   │   └── 📁 production/
│   └── 📄 kustomization.yaml
├── 📁 helm/                    # Helm charts
└── 📁 terraform/              # Infrastructure as Code
    ├── 📁 modules/
    ├── 📁 environments/
    └── 📄 main.tf
```

## 📊 Monitoring & Logging

- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **ELK Stack**: Centralized logging
- **Jaeger**: Distributed tracing
- **Sentry**: Error tracking

## 🔄 CI/CD Pipeline

GitHub Actions workflow:
1. Code quality checks (ESLint, Prettier)
2. Run tests (Unit, Integration)
3. Build Docker images
4. Push to registry
5. Deploy to Kubernetes
6. Run E2E tests
7. Monitor deployment

## 📚 Additional Resources

- [Architecture Documentation](docs/architecture.md)
- [API Specification](docs/API_Specification.md)
- [Development Guide](docs/Development_Setup_Guide.md)
- [Security Checklist](docs/Security_Checklist.md)
- [Testing Strategy](docs/Testing_Strategy.md) 