# 🏪 UltraMarket Store Service

Multi-vendor store management service for UltraMarket platform.

## 🚀 Features

- **Store Management**: Create, update, delete stores
- **Multi-vendor Support**: Support for multiple store owners
- **Store Verification**: Admin verification system
- **Analytics**: Store performance analytics
- **Staff Management**: Store staff roles and permissions
- **Product Management**: Store-specific product management
- **Order Management**: Store order processing
- **Categories**: Store-specific categories

## 📁 Project Structure

```
src/
├── controllers/         # HTTP request handlers
├── services/           # Business logic
├── models/            # Data models (Prisma)
├── middleware/        # Custom middleware
├── routes/           # API routes
├── utils/            # Utility functions
├── config/           # Configuration files
└── index.ts          # Application entry point
```

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
```

2. Setup environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Setup database:
```bash
npx prisma generate
npx prisma db push
```

4. Start development server:
```bash
npm run dev
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | redis://localhost:6379 |
| `JWT_SECRET` | JWT secret key | - |
| `PORT` | Server port | 3004 |
| `NODE_ENV` | Environment | development |

## 📚 API Endpoints

### Stores
- `GET /api/stores` - Get all stores
- `POST /api/stores` - Create new store
- `GET /api/stores/:id` - Get store by ID
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store
- `POST /api/stores/:id/verify` - Verify store (Admin only)
- `GET /api/stores/:id/stats` - Get store statistics

### Products
- `GET /api/stores/:storeId/products` - Get store products
- `POST /api/stores/:storeId/products` - Create product
- `PUT /api/stores/:storeId/products/:productId` - Update product
- `DELETE /api/stores/:storeId/products/:productId` - Delete product

### Orders
- `GET /api/stores/:storeId/orders` - Get store orders
- `GET /api/stores/:storeId/orders/:orderId` - Get order details
- `PUT /api/stores/:storeId/orders/:orderId/status` - Update order status

### Analytics
- `GET /api/stores/:storeId/analytics/dashboard` - Analytics dashboard
- `GET /api/stores/:storeId/analytics/sales` - Sales analytics
- `GET /api/stores/:storeId/analytics/products` - Product analytics

## 🔒 Authentication

All endpoints require JWT authentication except:
- `GET /api/stores` (public store listing)
- `GET /api/stores/:id` (public store details)
- `GET /api/stores/slug/:slug` (public store by slug)

## 🏗️ Database Schema

### Store Model
- Basic store information (name, description, contact)
- Owner relationship
- Verification status
- Statistics (products, orders, revenue)
- Social media links
- Business information

### Related Models
- User (store owner)
- Product (store products)
- Order (store orders)
- StoreCategory (store categories)
- StoreReview (store reviews)
- StoreStaff (store team)
- StoreSetting (store settings)
- StoreAnalytics (daily metrics)

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
docker build -t ultramarket/store-service .

# Run container
docker run -p 3004:3004 ultramarket/store-service
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 📊 Monitoring

Service includes:
- Health check endpoint: `/health`
- Request logging
- Error tracking
- Performance metrics

## 🔧 Development

```bash
# Start in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format
```

## 🚀 Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Run database migrations:
```bash
npx prisma db push
```

4. Start the service:
```bash
npm start
```

## 📝 License

MIT License - see LICENSE file for details.