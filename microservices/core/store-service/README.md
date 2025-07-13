# UltraMarket Store Service

Multi-vendor store management service for the UltraMarket e-commerce platform.

## Features

- Store CRUD operations
- Store analytics and reporting
- Multi-vendor support
- Store owner management
- Product catalog management
- Order management

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Store Management
- `GET /api/stores` - Get all stores
- `GET /api/stores/:id` - Get store by ID
- `POST /api/stores` - Create new store
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### Analytics
- `GET /api/stores/:id/analytics` - Get store analytics

## Database Schema

### Models
- **Store** - Store information
- **User** - Store owners and customers
- **Product** - Store products
- **Category** - Product categories
- **Order** - Customer orders
- **OrderItem** - Order line items

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp ../../../config/environments/development.env.example .env
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

### Running the Service

#### Development
```bash
npm run dev
```

#### Production
```bash
npm run build
npm start
```

### Testing
```bash
npm test
npm run test:coverage
```

### Docker
```bash
npm run docker:build
npm run docker:run
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3004 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `NODE_ENV` | Environment | development |

## API Documentation

### Create Store
```bash
POST /api/stores
Content-Type: application/json

{
  "name": "My Store",
  "description": "Store description",
  "ownerId": 1,
  "address": "Store address",
  "phone": "+998901234567",
  "email": "store@example.com"
}
```

### Get Store Analytics
```bash
GET /api/stores/1/analytics
```

Response:
```json
{
  "success": true,
  "data": {
    "totalProducts": 150,
    "totalOrders": 1250,
    "totalRevenue": 45000000,
    "monthlyGrowth": 12.5,
    "topProducts": [...]
  }
}
```

## Monitoring

- Health check endpoint: `/health`
- Logs: `logs/store-service.log`
- Metrics: Prometheus format

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License