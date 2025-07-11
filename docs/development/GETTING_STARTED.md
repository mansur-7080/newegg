# 🚀 Getting Started with UltraMarket

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker** & Docker Compose ([Download](https://docker.com/))
- **Git** ([Download](https://git-scm.com/))

## Quick Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ultramarket/platform.git
cd platform
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Generate secure secrets (optional, for production)
npm run generate-secrets
```

### 3. Install Dependencies

```bash
# Install all dependencies
npm run deps:install
```

### 4. Start Development Environment

#### Option A: Docker (Recommended)

```bash
# Start all services with Docker Compose
npm run docker:dev
```

#### Option B: Local Development

```bash
# Start backend services
npm run dev:services

# In another terminal, start frontend
npm run dev:frontend
```

### 5. Access Applications

Once everything is running, you can access:

- **Web App**: http://localhost:3000
- **Admin Panel**: http://localhost:3001
- **API Gateway**: http://localhost:8080
- **API Documentation**: http://localhost:8080/docs

## Development Workflow

### Project Structure

```
UltraMarket/
├── 📁 docs/                  # Documentation
├── 📁 config/               # Configuration files
├── 📁 scripts/              # Utility scripts
├── 📁 microservices/        # Backend services
├── 📁 frontend/             # Frontend applications
├── 📁 libs/                 # Shared libraries
├── 📁 infrastructure/       # Infrastructure as code
└── 📁 tests/                # Test suites
```

### Available Commands

#### Development

```bash
npm run dev                  # Start all services
npm run dev:services         # Start backend services only
npm run dev:frontend         # Start frontend apps only
```

#### Testing

```bash
npm run test                 # Run all tests
npm run test:unit            # Unit tests
npm run test:integration     # Integration tests
npm run test:e2e             # End-to-end tests
```

#### Building

```bash
npm run build                # Build all services
npm run build:frontend       # Build frontend only
npm run build:services       # Build backend only
```

#### Code Quality

```bash
npm run lint                 # Lint all code
npm run lint:fix             # Fix linting issues
npm run format               # Format code
npm run type-check           # TypeScript check
```

## Configuration Files

All configuration files are organized in the `config/` directory:

- **`config/docker/`** - Docker Compose files
- **`config/jest/`** - Jest testing configuration
- **`config/typescript/`** - TypeScript configuration
- **`config/eslint/`** - ESLint configuration
- **`config/babel/`** - Babel configuration

## Next Steps

1. **Read the [Development Guide](DEVELOPMENT_GUIDE.md)** for detailed development instructions
2. **Check the [Architecture Overview](../architecture/SYSTEM_OVERVIEW.md)** to understand the system
3. **Review the [API Documentation](../architecture/API_SPECIFICATION.md)** for API details
4. **Follow the [Testing Guide](TESTING_GUIDE.md)** for testing best practices

## Need Help?

- 📚 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/ultramarket/platform/issues)
- 💬 [Join Discord](https://discord.gg/ultramarket)
