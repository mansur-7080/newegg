#!/bin/bash

# UltraMarket Backend - To'liq o'rnatish scripti
# Bu script barcha backend servislarini o'rnatadi va sozlaydi

set -e

echo "🚀 UltraMarket Backend - To'liq o'rnatish boshlandi..."

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Loglar
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Xatoliklar uchun trap
trap 'log_error "Script xatolik bilan to'\''xtadi. Qator: $LINENO"' ERR

# Talablar tekshiruvi
check_requirements() {
    log_info "Talablar tekshirilmoqda..."
    
    # Docker tekshiruvi
    if ! command -v docker &> /dev/null; then
        log_error "Docker o'rnatilmagan. Iltimos Docker'ni o'rnating."
        exit 1
    fi
    
    # Docker Compose tekshiruvi
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose o'rnatilmagan. Iltimos Docker Compose'ni o'rnating."
        exit 1
    fi
    
    # Node.js tekshiruvi
    if ! command -v node &> /dev/null; then
        log_error "Node.js o'rnatilmagan. Iltimos Node.js'ni o'rnating."
        exit 1
    fi
    
    # npm tekshiruvi
    if ! command -v npm &> /dev/null; then
        log_error "npm o'rnatilmagan. Iltimos npm'ni o'rnating."
        exit 1
    fi
    
    log_success "Barcha talablar bajarilgan"
}

# Environment o'zgaruvchilarini o'rnatish
setup_environment() {
    log_info "Environment o'zgaruvchilari o'rnatilmoqda..."
    
    # Development environment file yaratish
    if [ ! -f ".env.development" ]; then
        cp "config/environments/development.env" ".env.development"
        log_success ".env.development yaratildi"
    fi
    
    # Production environment file yaratish
    if [ ! -f ".env.production" ]; then
        cp "config/environments/production.env" ".env.production"
        log_success ".env.production yaratildi"
    fi
    
    # Environment o'zgaruvchisini o'rnatish
    export NODE_ENV=${NODE_ENV:-development}
    log_info "Environment: $NODE_ENV"
}

# Dependencies o'rnatish
install_dependencies() {
    log_info "Dependencies o'rnatilmoqda..."
    
    # Root dependencies
    npm install
    
    # Microservices dependencies
    services=(
        "microservices/core/auth-service"
        "microservices/core/api-gateway"
        "microservices/business/product-service"
        "microservices/business/order-service"
        "microservices/business/cart-service"
        "microservices/business/payment-service"
        "microservices/platform/search-service"
        "microservices/platform/file-service"
        "microservices/platform/notification-service"
        "microservices/platform/audit-service"
        "microservices/analytics/performance-optimization-service"
    )
    
    for service in "${services[@]}"; do
        if [ -d "$service" ] && [ -f "$service/package.json" ]; then
            log_info "Installing dependencies for $service..."
            (cd "$service" && npm install)
            log_success "Dependencies installed for $service"
        fi
    done
    
    log_success "Barcha dependencies o'rnatildi"
}

# Ma'lumotlar bazalarini o'rnatish
setup_databases() {
    log_info "Ma'lumotlar bazalari o'rnatilmoqda..."
    
    # Docker containers'ni ishga tushirish
    docker-compose -f config/docker/docker-compose.databases.yml up -d
    
    # Ma'lumotlar bazalarining tayyor bo'lishini kutish
    log_info "Ma'lumotlar bazalarining tayyor bo'lishini kutish..."
    sleep 30
    
    # PostgreSQL connection test
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker exec ultramarket_postgres pg_isready -h localhost -p 5432 -U ultramarket_user &> /dev/null; then
            log_success "PostgreSQL tayyor"
            break
        fi
        ((attempt++))
        log_info "PostgreSQL kutilmoqda... ($attempt/$max_attempts)"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "PostgreSQL ulanishda xatolik"
        exit 1
    fi
    
    # MongoDB connection test
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker exec ultramarket_mongo mongo --eval "db.adminCommand('ping')" &> /dev/null; then
            log_success "MongoDB tayyor"
            break
        fi
        ((attempt++))
        log_info "MongoDB kutilmoqda... ($attempt/$max_attempts)"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "MongoDB ulanishda xatolik"
        exit 1
    fi
    
    # Redis connection test
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker exec ultramarket_redis redis-cli ping &> /dev/null; then
            log_success "Redis tayyor"
            break
        fi
        ((attempt++))
        log_info "Redis kutilmoqda... ($attempt/$max_attempts)"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Redis ulanishda xatolik"
        exit 1
    fi
    
    # Elasticsearch connection test
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "http://localhost:9200/_cluster/health" &> /dev/null; then
            log_success "Elasticsearch tayyor"
            break
        fi
        ((attempt++))
        log_info "Elasticsearch kutilmoqda... ($attempt/$max_attempts)"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Elasticsearch ulanishda xatolik"
        exit 1
    fi
    
    log_success "Barcha ma'lumotlar bazalari tayyor"
}

# Database migratsiyalarini ishga tushirish
run_migrations() {
    log_info "Database migratsiyalari ishga tushirilmoqda..."
    
    # PostgreSQL migratsiyalari
    docker exec ultramarket_postgres psql -U ultramarket_user -d ultramarket_db -f /docker-entrypoint-initdb.d/init.sql
    
    # MongoDB migratsiyalari
    docker exec ultramarket_mongo mongo ultramarket_db --eval "
        db.createCollection('products');
        db.createCollection('orders');
        db.createCollection('users');
        db.createCollection('categories');
        
        // Indexlar yaratish
        db.products.createIndex({ name: 'text', description: 'text' });
        db.products.createIndex({ category: 1, price: 1 });
        db.products.createIndex({ createdAt: -1 });
        
        db.orders.createIndex({ userId: 1, createdAt: -1 });
        db.orders.createIndex({ status: 1 });
        
        db.users.createIndex({ email: 1 }, { unique: true });
        db.users.createIndex({ phone: 1 }, { unique: true });
    "
    
    log_success "Database migratsiyalari bajarildi"
}

# Elasticsearch indekslarini yaratish
setup_elasticsearch() {
    log_info "Elasticsearch indekslari yaratilmoqda..."
    
    # Products indeksi
    curl -X PUT "localhost:9200/products" -H 'Content-Type: application/json' -d'
    {
        "settings": {
            "number_of_shards": 2,
            "number_of_replicas": 1,
            "analysis": {
                "analyzer": {
                    "uzbek_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "stop"]
                    }
                }
            }
        },
        "mappings": {
            "properties": {
                "name": {
                    "type": "text",
                    "analyzer": "uzbek_analyzer"
                },
                "description": {
                    "type": "text",
                    "analyzer": "uzbek_analyzer"
                },
                "category": {
                    "type": "keyword"
                },
                "price": {
                    "type": "float"
                },
                "brand": {
                    "type": "keyword"
                },
                "specifications": {
                    "type": "object"
                },
                "createdAt": {
                    "type": "date"
                }
            }
        }
    }'
    
    # Orders indeksi
    curl -X PUT "localhost:9200/orders" -H 'Content-Type: application/json' -d'
    {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 1
        },
        "mappings": {
            "properties": {
                "userId": {
                    "type": "keyword"
                },
                "status": {
                    "type": "keyword"
                },
                "totalAmount": {
                    "type": "float"
                },
                "createdAt": {
                    "type": "date"
                }
            }
        }
    }'
    
    log_success "Elasticsearch indekslari yaratildi"
}

# MinIO bucketlarini yaratish
setup_minio() {
    log_info "MinIO bucketlari yaratilmoqda..."
    
    # MinIO client o'rnatish
    if ! command -v mc &> /dev/null; then
        curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
        chmod +x mc
        sudo mv mc /usr/local/bin/
    fi
    
    # MinIO alias yaratish
    mc alias set ultramarket http://localhost:9000 ultramarket_user ultramarket_password
    
    # Bucketlar yaratish
    mc mb ultramarket/products
    mc mb ultramarket/avatars
    mc mb ultramarket/documents
    mc mb ultramarket/backups
    
    # Bucket policy o'rnatish
    mc policy set public ultramarket/products
    mc policy set private ultramarket/avatars
    mc policy set private ultramarket/documents
    mc policy set private ultramarket/backups
    
    log_success "MinIO bucketlari yaratildi"
}

# Servislarni build qilish
build_services() {
    log_info "Servislar build qilinmoqda..."
    
    # TypeScript build
    npm run build
    
    # Docker images build qilish
    services=(
        "auth-service"
        "api-gateway"
        "product-service"
        "order-service"
        "cart-service"
        "payment-service"
        "search-service"
        "file-service"
        "notification-service"
        "audit-service"
        "performance-optimization-service"
    )
    
    for service in "${services[@]}"; do
        if [ -f "microservices/*/Dockerfile" ]; then
            docker build -t "ultramarket/$service:latest" -f "microservices/*/Dockerfile" .
            log_success "Docker image built for $service"
        fi
    done
    
    log_success "Barcha servislar build qilindi"
}

# Test ishga tushirish
run_tests() {
    log_info "Testlar ishga tushirilmoqda..."
    
    # Unit testlar
    npm run test
    
    # Integration testlar
    npm run test:integration
    
    # E2E testlar
    npm run test:e2e
    
    log_success "Barcha testlar muvaffaqiyatli o'tdi"
}

# Tizim salomatligini tekshirish
health_check() {
    log_info "Tizim salomatligi tekshirilmoqda..."
    
    # Database connections
    if docker exec ultramarket_postgres pg_isready -h localhost -p 5432 -U ultramarket_user &> /dev/null; then
        log_success "✓ PostgreSQL ulanishi ishlayapti"
    else
        log_error "✗ PostgreSQL ulanishi ishlamayapti"
    fi
    
    if docker exec ultramarket_mongo mongo --eval "db.adminCommand('ping')" &> /dev/null; then
        log_success "✓ MongoDB ulanishi ishlayapti"
    else
        log_error "✗ MongoDB ulanishi ishlamayapti"
    fi
    
    if docker exec ultramarket_redis redis-cli ping &> /dev/null; then
        log_success "✓ Redis ulanishi ishlayapti"
    else
        log_error "✗ Redis ulanishi ishlamayapti"
    fi
    
    if curl -s "http://localhost:9200/_cluster/health" &> /dev/null; then
        log_success "✓ Elasticsearch ulanishi ishlayapti"
    else
        log_error "✗ Elasticsearch ulanishi ishlamayapti"
    fi
    
    if curl -s "http://localhost:9000/minio/health/live" &> /dev/null; then
        log_success "✓ MinIO ulanishi ishlayapti"
    else
        log_error "✗ MinIO ulanishi ishlamayapti"
    fi
    
    log_success "Tizim salomatligi tekshirildi"
}

# Servislarni ishga tushirish
start_services() {
    log_info "Servislar ishga tushirilmoqda..."
    
    # Development mode
    if [ "$NODE_ENV" = "development" ]; then
        npm run start:dev
    else
        npm run start:prod
    fi
    
    log_success "Servislar ishga tushirildi"
}

# Monitoring o'rnatish
setup_monitoring() {
    log_info "Monitoring o'rnatilmoqda..."
    
    # Prometheus va Grafana
    docker-compose -f infrastructure/monitoring/docker-compose.monitoring.yml up -d
    
    log_success "Monitoring o'rnatildi"
    log_info "Grafana: http://localhost:3000 (admin/admin)"
    log_info "Prometheus: http://localhost:9090"
}

# Backup o'rnatish
setup_backup() {
    log_info "Backup tizimi o'rnatilmoqda..."
    
    # Backup script'ni executable qilish
    chmod +x infrastructure/disaster-recovery/automated-backup.sh
    
    # Cron job qo'shish
    (crontab -l 2>/dev/null; echo "0 2 * * * /path/to/ultramarket/infrastructure/disaster-recovery/automated-backup.sh") | crontab -
    
    log_success "Backup tizimi o'rnatildi"
}

# Asosiy funksiya
main() {
    echo "=================================="
    echo "🏪 UltraMarket Backend Setup"
    echo "=================================="
    
    check_requirements
    setup_environment
    install_dependencies
    setup_databases
    run_migrations
    setup_elasticsearch
    setup_minio
    build_services
    
    # Testlar (ixtiyoriy)
    if [ "$1" = "--with-tests" ]; then
        run_tests
    fi
    
    health_check
    setup_monitoring
    setup_backup
    
    echo "=================================="
    echo "🎉 UltraMarket Backend muvaffaqiyatli o'rnatildi!"
    echo "=================================="
    echo ""
    echo "📋 Servis URL'lari:"
    echo "• API Gateway: http://localhost:3000"
    echo "• Auth Service: http://localhost:3001"
    echo "• Product Service: http://localhost:3002"
    echo "• Order Service: http://localhost:3003"
    echo "• Payment Service: http://localhost:3004"
    echo "• Search Service: http://localhost:3005"
    echo "• File Service: http://localhost:3006"
    echo "• Notification Service: http://localhost:3007"
    echo ""
    echo "🗄️ Ma'lumotlar bazalari:"
    echo "• PostgreSQL: localhost:5432"
    echo "• MongoDB: localhost:27017"
    echo "• Redis: localhost:6379"
    echo "• Elasticsearch: localhost:9200"
    echo "• MinIO: localhost:9000"
    echo ""
    echo "📊 Monitoring:"
    echo "• Grafana: http://localhost:3000"
    echo "• Prometheus: http://localhost:9090"
    echo ""
    echo "🚀 Servislarni ishga tushirish uchun:"
    echo "npm run start:dev"
    echo ""
    echo "📚 Hujjatlar:"
    echo "docs/API_Complete_Documentation.md"
    echo ""
    
    if [ "$1" = "--start" ]; then
        start_services
    fi
}

# Script'ni ishga tushirish
main "$@" 