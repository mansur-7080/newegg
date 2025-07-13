#!/bin/bash

# ==============================================
# UltraMarket Production Configuration Fix
# Professional deployment configuration script
# ==============================================

set -e

echo "🔧 Starting UltraMarket Production Configuration Fix..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ==============================================
# 1. Fix Localhost Dependencies
# ==============================================

print_info "Fixing localhost dependencies in configuration files..."

# Replace localhost URLs with environment variables
find . -name "*.ts" -type f -exec sed -i 's/http:\/\/localhost:[0-9]*/process.env.SERVICE_URL || &/g' {} \;
find . -name "*.js" -type f -exec sed -i 's/http:\/\/localhost:[0-9]*/process.env.SERVICE_URL || &/g' {} \;

# Fix Redis connections
find . -name "*.ts" -type f -exec sed -i 's/redis:\/\/localhost:6379/process.env.REDIS_URL || &/g' {} \;
find . -name "*.js" -type f -exec sed -i 's/redis:\/\/localhost:6379/process.env.REDIS_URL || &/g' {} \;

# Fix MongoDB connections
find . -name "*.ts" -type f -exec sed -i 's/mongodb:\/\/localhost:27017/process.env.MONGODB_URI || &/g' {} \;
find . -name "*.js" -type f -exec sed -i 's/mongodb:\/\/localhost:27017/process.env.MONGODB_URI || &/g' {} \;

# Fix PostgreSQL connections
find . -name "*.ts" -type f -exec sed -i 's/postgresql:\/\/.*@localhost:5432/process.env.DATABASE_URL || &/g' {} \;
find . -name "*.js" -type f -exec sed -i 's/postgresql:\/\/.*@localhost:5432/process.env.DATABASE_URL || &/g' {} \;

print_status "Fixed localhost dependencies"

# ==============================================
# 2. Update Service URLs in Environment Files
# ==============================================

print_info "Updating service URLs in environment configurations..."

# Create production service URL mappings
cat > config/environments/service-urls.production.env << EOF
# ==============================================
# Production Service URLs
# ==============================================

# Core Services
AUTH_SERVICE_URL=http://auth-service:3001
USER_SERVICE_URL=http://user-service:3002
CONFIG_SERVICE_URL=http://config-service:3003
STORE_SERVICE_URL=http://store-service:3004

# Business Services
PRODUCT_SERVICE_URL=http://product-service:3010
CART_SERVICE_URL=http://cart-service:3011
ORDER_SERVICE_URL=http://order-service:3012
PAYMENT_SERVICE_URL=http://payment-service:3013
INVENTORY_SERVICE_URL=http://inventory-service:3014
REVIEW_SERVICE_URL=http://review-service:3015
SHIPPING_SERVICE_URL=http://shipping-service:3016

# Platform Services
SEARCH_SERVICE_URL=http://search-service:3020
ANALYTICS_SERVICE_URL=http://analytics-service:3021
NOTIFICATION_SERVICE_URL=http://notification-service:3022
FILE_SERVICE_URL=http://file-service:3023
CONTENT_SERVICE_URL=http://content-service:3024
AUDIT_SERVICE_URL=http://audit-service:3025

# External URLs
FRONTEND_URL=https://ultramarket.uz
ADMIN_URL=https://admin.ultramarket.uz
API_GATEWAY_URL=https://api.ultramarket.uz
EOF

print_status "Created production service URLs configuration"

# ==============================================
# 3. Fix Docker Compose for Production
# ==============================================

print_info "Updating Docker Compose for production..."

# Update docker-compose.production.yml with proper service names
sed -i 's/localhost/redis-cluster/g' docker-compose.production.yml
sed -i 's/127.0.0.1/postgres-cluster/g' docker-compose.production.yml

print_status "Updated Docker Compose configuration"

# ==============================================
# 4. Fix Kubernetes Service Names
# ==============================================

print_info "Updating Kubernetes configurations..."

# Update Kubernetes manifests with proper service names
find infrastructure/kubernetes -name "*.yaml" -type f -exec sed -i 's/localhost/cluster.local/g' {} \;

print_status "Updated Kubernetes configurations"

# ==============================================
# 5. Create Environment Validation Script
# ==============================================

print_info "Creating environment validation script..."

cat > scripts/production/validate-production-env.sh << 'EOF'
#!/bin/bash

# Production Environment Validation Script

echo "🔍 Validating Production Environment..."

# Check required environment variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "REDIS_URL"
    "MONGODB_URI"
    "JWT_SECRET"
    "CLICK_MERCHANT_ID"
    "PAYME_MERCHANT_ID"
    "ESKIZ_EMAIL"
    "SMTP_USER"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo "✅ All required environment variables are set"

# Check for localhost references
if grep -r "localhost" config/environments/production.env 2>/dev/null; then
    echo "⚠️  Found localhost references in production config"
    exit 1
fi

echo "✅ No localhost references found in production config"

# Validate service connectivity
echo "🔍 Testing service connectivity..."

# Test database connections
if ! timeout 10 bash -c "</dev/tcp/${POSTGRES_HOST:-postgres-cluster}/5432"; then
    echo "❌ Cannot connect to PostgreSQL"
    exit 1
fi

if ! timeout 10 bash -c "</dev/tcp/${REDIS_HOST:-redis-cluster}/6379"; then
    echo "❌ Cannot connect to Redis"
    exit 1
fi

echo "✅ All services are reachable"
echo "🎉 Production environment validation passed!"
EOF

chmod +x scripts/production/validate-production-env.sh

print_status "Created environment validation script"

# ==============================================
# 6. Update Package.json Scripts
# ==============================================

print_info "Updating package.json scripts for production..."

# Update main package.json with production scripts
cat > temp_package_scripts.json << 'EOF'
{
  "scripts": {
    "start:prod": "npm run build && npm run start:services:prod",
    "start:services:prod": "concurrently \"npm run start:auth:prod\" \"npm run start:gateway:prod\" \"npm run start:product:prod\" \"npm run start:order:prod\" \"npm run start:payment:prod\" \"npm run start:search:prod\" \"npm run start:file:prod\" \"npm run start:notification:prod\" \"npm run start:analytics:prod\" \"npm run start:store:prod\"",
    "start:analytics:prod": "cd microservices/analytics/analytics-service && npm run start:prod",
    "start:store:prod": "cd microservices/core/store-service && npm run start:prod",
    "validate:prod": "./scripts/production/validate-production-env.sh",
    "deploy:prod": "./scripts/production/production-config-fix.sh && npm run validate:prod && npm run start:prod"
  }
}
EOF

# Merge with existing package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const newScripts = JSON.parse(fs.readFileSync('temp_package_scripts.json', 'utf8'));
pkg.scripts = { ...pkg.scripts, ...newScripts.scripts };
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

rm temp_package_scripts.json

print_status "Updated package.json scripts"

# ==============================================
# 7. Create Production Health Check
# ==============================================

print_info "Creating production health check endpoint..."

cat > scripts/production/health-check.sh << 'EOF'
#!/bin/bash

# Production Health Check Script

echo "🏥 Running UltraMarket Health Check..."

SERVICES=(
    "auth-service:3001"
    "user-service:3002"
    "config-service:3003"
    "store-service:3004"
    "product-service:3010"
    "cart-service:3011"
    "order-service:3012"
    "payment-service:3013"
    "analytics-service:3021"
)

FAILED_SERVICES=()

for service in "${SERVICES[@]}"; do
    service_name=$(echo $service | cut -d: -f1)
    service_port=$(echo $service | cut -d: -f2)
    
    echo "Checking $service_name..."
    
    if curl -f -s "http://$service/health" > /dev/null; then
        echo "✅ $service_name is healthy"
    else
        echo "❌ $service_name is not responding"
        FAILED_SERVICES+=("$service_name")
    fi
done

if [[ ${#FAILED_SERVICES[@]} -gt 0 ]]; then
    echo "❌ Health check failed. Unhealthy services:"
    printf '   - %s\n' "${FAILED_SERVICES[@]}"
    exit 1
fi

echo "🎉 All services are healthy!"
EOF

chmod +x scripts/production/health-check.sh

print_status "Created production health check"

# ==============================================
# 8. Summary
# ==============================================

echo ""
echo "🎉 Production Configuration Fix Completed!"
echo ""
echo "✅ Fixed localhost dependencies"
echo "✅ Updated service URLs for production"
echo "✅ Fixed Docker Compose configuration"
echo "✅ Updated Kubernetes manifests"
echo "✅ Created environment validation script"
echo "✅ Updated package.json scripts"
echo "✅ Created production health check"
echo ""
echo "📋 Next Steps:"
echo "1. Copy config/environments/production.env.example to production.env"
echo "2. Fill in actual production values (remove \${PLACEHOLDER} values)"
echo "3. Run: npm run validate:prod"
echo "4. Deploy: npm run deploy:prod"
echo ""
print_warning "Remember to set actual production environment variables!"
print_warning "Never commit production.env file to version control!"
echo ""