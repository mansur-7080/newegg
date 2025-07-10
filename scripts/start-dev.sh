#!/bin/bash

echo "🚀 Starting UltraMarket E-Commerce Platform Development Environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Copy env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from env.example..."
    cp env.example .env
    echo "⚠️  Please update .env file with your configuration before running again."
    exit 1
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

echo "🚀 Starting services..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec -T user-service npm run migrate:dev || true
docker-compose exec -T order-service npm run migrate:dev || true
docker-compose exec -T payment-service npm run migrate:dev || true

# Show service status
echo "✅ Services are running!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🛡️ Admin Panel: http://localhost:3100"
echo "🌐 API Gateway: http://localhost:8000"
echo "📊 Grafana: http://localhost:3000 (admin/admin123)"
echo "📈 Prometheus: http://localhost:9090"
echo ""
echo "To view logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f"
echo "To stop services: docker-compose -f docker-compose.yml -f docker-compose.dev.yml down" 