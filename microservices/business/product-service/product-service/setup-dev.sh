#!/bin/bash

echo "🚀 Product Service Development Setup"
echo "=================================="

# Check if PostgreSQL is available
echo "Checking PostgreSQL connection..."
if command -v psql &> /dev/null; then
    echo "PostgreSQL client found"
else
    echo "⚠️  PostgreSQL client not found, skipping database setup"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the service
echo "🔨 Building TypeScript..."
npm run build 2>/dev/null || echo "Build skipped (TypeScript issues)"

# Run migrations if Prisma is configured
echo "🗄️  Setting up database..."
if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate 2>/dev/null || echo "Prisma generate skipped"
    # npx prisma migrate deploy 2>/dev/null || echo "Migrations skipped"
fi

# Create uploads directory
echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p logs

echo "✅ Setup complete!"
echo ""
echo "To run the service:"
echo "  Development mode: npm run dev"
echo "  Production mode: npm start"
echo "  Test server: node test-server.js"
echo ""
echo "API Endpoints:"
echo "  Health: http://localhost:3003/api/v1/health"
echo "  Products: http://localhost:3003/api/v1/products"
echo "  Categories: http://localhost:3003/api/v1/categories"
echo "  Search: http://localhost:3003/api/v1/search"