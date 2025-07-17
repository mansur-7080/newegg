# UltraMarket Product Service

Professional product catalog and inventory management microservice built with Node.js, TypeScript, and PostgreSQL.

## Features

- **Product Management**: CRUD operations for products
- **Category Management**: Hierarchical category structure
- **Advanced Filtering**: Search, pagination, sorting
- **Inventory Tracking**: Stock management
- **Product Variants**: Multiple variants per product
- **Review System**: Customer reviews and ratings
- **Price History**: Track price changes
- **Slug Generation**: SEO-friendly URLs
- **Validation**: Comprehensive input validation
- **Authentication**: JWT-based authentication
- **Rate Limiting**: API rate limiting
- **Logging**: Structured logging with Winston
- **Testing**: Comprehensive test coverage

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Framework**: Express.js
- **Validation**: Joi
- **Testing**: Jest
- **Documentation**: Swagger/OpenAPI

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Docker (optional)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Start development server:
```bash
npm run dev
```

## API Endpoints

### Products

- `GET /api/v1/products` - Get products with filtering and pagination
- `GET /api/v1/products/:id` - Get product by ID
- `GET /api/v1/products/slug/:slug` - Get product by slug
- `POST /api/v1/products` - Create new product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product

### Categories

- `GET /api/v1/categories` - Get categories with filtering
- `GET /api/v1/categories/tree` - Get category tree
- `GET /api/v1/categories/:id` - Get category by ID
- `POST /api/v1/categories` - Create new category
- `PUT /api/v1/categories/:id` - Update category
- `DELETE /api/v1/categories/:id` - Delete category

## Environment Variables

```env
NODE_ENV=development
PORT=3003
DATABASE_URL=postgresql://username:password@localhost:5432/database
REDIS_URL=redis://localhost:6379
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

## Docker

### Development

```bash
# Build and run with Docker Compose
docker-compose -f config/docker/docker-compose.dev.yml up product-service
```

### Production

```bash
# Build production image
docker build -t ultramarket-product-service .

# Run container
docker run -p 3003:3003 ultramarket-product-service
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Run tests and linting
6. Submit pull request

## License

Private - UltraMarket Platform