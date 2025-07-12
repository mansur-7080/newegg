#!/bin/bash

# UltraMarket Performance Optimization Script
# This script optimizes the entire platform for production performance

set -e

echo "🚀 Starting UltraMarket Performance Optimization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_ENV="production"
LOG_LEVEL="info"
MAX_WORKERS=4
MEMORY_LIMIT="2G"
CPU_LIMIT="2"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Database Optimization
optimize_databases() {
    print_status "Optimizing databases..."
    
    # PostgreSQL optimization
    print_status "Optimizing PostgreSQL..."
    docker exec ultramarket-postgres psql -U ultramarket -d ultramarket_main -c "
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
        CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
        CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
        CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
        CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        
        -- Analyze tables for better query planning
        ANALYZE users;
        ANALYZE orders;
        ANALYZE products;
        ANALYZE payments;
        ANALYZE categories;
        
        -- Vacuum to reclaim space
        VACUUM ANALYZE;
    "
    
    # MongoDB optimization
    print_status "Optimizing MongoDB..."
    docker exec ultramarket-mongodb mongosh --eval "
        // Create indexes for better performance
        db.products.createIndex({ 'name': 'text', 'description': 'text' });
        db.products.createIndex({ 'categoryId': 1 });
        db.products.createIndex({ 'price': 1 });
        db.products.createIndex({ 'isActive': 1 });
        db.products.createIndex({ 'isFeatured': 1 });
        db.products.createIndex({ 'createdAt': -1 });
        
        db.categories.createIndex({ 'slug': 1 });
        db.categories.createIndex({ 'parentId': 1 });
        
        // Optimize collections
        db.runCommand({ compact: 'products' });
        db.runCommand({ compact: 'categories' });
    "
    
    # Redis optimization
    print_status "Optimizing Redis..."
    docker exec ultramarket-redis redis-cli --eval /dev/stdin << 'EOF'
        -- Set memory policy
        CONFIG SET maxmemory-policy allkeys-lru
        
        -- Set memory limit
        CONFIG SET maxmemory 1gb
        
        -- Enable persistence
        CONFIG SET save "900 1 300 10 60 10000"
        
        -- Optimize for performance
        CONFIG SET tcp-keepalive 300
        CONFIG SET timeout 0
    EOF
    
    print_success "Database optimization completed"
}

# 2. Application Performance Optimization
optimize_applications() {
    print_status "Optimizing application performance..."
    
    # Node.js optimization
    print_status "Optimizing Node.js applications..."
    
    # Update package.json files with performance optimizations
    for service in microservices/*/; do
        if [ -f "$service/package.json" ]; then
            print_status "Optimizing $service"
            
            # Add performance scripts
            node -e "
                const fs = require('fs');
                const path = require('path');
                const pkgPath = path.join('$service', 'package.json');
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                
                pkg.scripts = pkg.scripts || {};
                pkg.scripts.start = 'NODE_ENV=production node --max-old-space-size=2048 dist/index.js';
                pkg.scripts.start:prod = 'NODE_ENV=production node --max-old-space-size=2048 --optimize-for-size dist/index.js';
                pkg.scripts.start:cluster = 'NODE_ENV=production node --max-old-space-size=2048 dist/index.js';
                
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
            "
        fi
    done
    
    # Frontend optimization
    print_status "Optimizing frontend applications..."
    
    # Web app optimization
    if [ -f "frontend/web-app/package.json" ]; then
        node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('frontend/web-app/package.json', 'utf8'));
            
            pkg.scripts = pkg.scripts || {};
            pkg.scripts.build = 'vite build --mode production';
            pkg.scripts.build:analyze = 'vite build --mode production --analyze';
            
            fs.writeFileSync('frontend/web-app/package.json', JSON.stringify(pkg, null, 2));
        "
    fi
    
    # Admin panel optimization
    if [ -f "frontend/admin-panel/package.json" ]; then
        node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('frontend/admin-panel/package.json', 'utf8'));
            
            pkg.scripts = pkg.scripts || {};
            pkg.scripts.build = 'vite build --mode production';
            pkg.scripts.build:analyze = 'vite build --mode production --analyze';
            
            fs.writeFileSync('frontend/admin-panel/package.json', JSON.stringify(pkg, null, 2));
        "
    fi
    
    print_success "Application optimization completed"
}

# 3. Docker Optimization
optimize_docker() {
    print_status "Optimizing Docker configuration..."
    
    # Update docker-compose.production.yml with performance optimizations
    cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  # API Gateway (Production) - Optimized
  api-gateway:
    build:
      context: .
      dockerfile: microservices/core/api-gateway/api-gateway/Dockerfile
      args:
        NODE_ENV: production
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - AUTH_SERVICE_URL=http://auth-service:3002
      - PRODUCT_SERVICE_URL=http://product-service:3003
      - ORDER_SERVICE_URL=http://order-service:3004
      - PAYMENT_SERVICE_URL=http://payment-service:3005
      - SEARCH_SERVICE_URL=http://product-service:3003
      - NOTIFICATION_SERVICE_URL=http://notification-service:3007
      - ANALYTICS_SERVICE_URL=http://analytics-service:3008
      - CORS_ORIGIN=https://ultramarket.uz,https://www.ultramarket.uz
      - RATE_LIMIT_WINDOW_MS=900000
      - RATE_LIMIT_MAX_REQUESTS=1000
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - CLUSTER_MODE=true
      - WORKER_COUNT=4
    depends_on:
      - auth-service
      - product-service
      - order-service
      - payment-service
      - notification-service
      - analytics-service
    networks:
      - ultramarket-network
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  # Auth Service (Production) - Optimized
  auth-service:
    build:
      context: .
      dockerfile: microservices/core/auth-service/Dockerfile
      args:
        NODE_ENV: production
    ports:
      - '3002:3002'
    environment:
      - NODE_ENV=production
      - PORT=3002
      - HOST=0.0.0.0
      - DATABASE_URL=postgresql://ultramarket:${POSTGRES_PASSWORD}@postgres:5432/ultramarket_auth
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_ACCESS_EXPIRES_IN=15m
      - JWT_REFRESH_EXPIRES_IN=7d
      - CORS_ORIGIN=https://ultramarket.uz
      - RATE_LIMIT_WINDOW_MS=900000
      - RATE_LIMIT_MAX_REQUESTS=100
      - EMAIL_HOST=${EMAIL_HOST}
      - EMAIL_PORT=${EMAIL_PORT}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
      - EMAIL_FROM=${EMAIL_FROM}
      - REDIS_URL=redis://redis:6379
      - CLUSTER_MODE=true
      - WORKER_COUNT=2
    depends_on:
      - postgres
      - redis
    networks:
      - ultramarket-network
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3002/health']
      interval: 30s
      timeout: 10s
      retries: 3
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  # Product Service (Production) - Optimized
  product-service:
    build:
      context: .
      dockerfile: microservices/business/product-service/product-service/Dockerfile
      args:
        NODE_ENV: production
    ports:
      - '3003:3003'
    environment:
      - NODE_ENV=production
      - PORT=3003
      - HOST=0.0.0.0
      - MONGODB_URI=mongodb://ultramarket:${MONGO_PASSWORD}@mongo:27017/ultramarket_products
      - DATABASE_URL=postgresql://ultramarket:${POSTGRES_PASSWORD}@postgres:5432/ultramarket_products
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=https://ultramarket.uz
      - RATE_LIMIT_WINDOW_MS=900000
      - RATE_LIMIT_MAX_REQUESTS=100
      - REDIS_URL=redis://redis:6379
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - CLUSTER_MODE=true
      - WORKER_COUNT=4
    depends_on:
      - mongo
      - postgres
      - redis
      - elasticsearch
    networks:
      - ultramarket-network
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3003/health']
      interval: 30s
      timeout: 10s
      retries: 3
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  # Frontend Web App (Production) - Optimized
  web-app:
    build:
      context: ./frontend/web-app
      dockerfile: Dockerfile.prod
      args:
        NODE_ENV: production
    ports:
      - '8080:80'
    environment:
      - VITE_API_URL=https://api.ultramarket.uz
      - VITE_APP_ENV=production
      - NGINX_WORKER_PROCESSES=4
      - NGINX_WORKER_CONNECTIONS=1024
    networks:
      - ultramarket-network
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:80']
      interval: 30s
      timeout: 10s
      retries: 3
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  # PostgreSQL Database (Production) - Optimized
  postgres:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_USER=ultramarket
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=ultramarket_main
      - POSTGRES_INITDB_ARGS="--encoding=UTF8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh
      - ./scripts/database/backup:/backup
      - ./config/postgres/postgresql.conf:/etc/postgresql/postgresql.conf
    command: >
      postgres
      -c shared_preload_libraries='pg_stat_statements'
      -c pg_stat_statements.track=all
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c work_mem=4MB
      -c min_wal_size=1GB
      -c max_wal_size=4GB
      -c max_worker_processes=8
      -c max_parallel_workers_per_gather=4
      -c max_parallel_workers=8
      -c max_parallel_maintenance_workers=4
    networks:
      - ultramarket-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ultramarket']
      interval: 30s
      timeout: 10s
      retries: 3
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  # Redis Cache (Production) - Optimized
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 1gb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
      --tcp-keepalive 300
      --timeout 0
      --tcp-backlog 511
      --databases 16
    volumes:
      - redis_data:/data
    networks:
      - ultramarket-network
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 512M
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 30s
      timeout: 10s
      retries: 3
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  # Nginx Reverse Proxy (Production) - Optimized
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./infrastructure/nginx/ssl:/etc/nginx/ssl
      - ./infrastructure/nginx/sites-enabled:/etc/nginx/sites-enabled
      - nginx_cache:/var/cache/nginx
      - nginx_logs:/var/log/nginx
    depends_on:
      - api-gateway
      - web-app
      - admin-panel
    networks:
      - ultramarket-network
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:80/health']
      interval: 30s
      timeout: 10s
      retries: 3
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  nginx_cache:
    driver: local
  nginx_logs:
    driver: local

networks:
  ultramarket-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
EOF
    
    print_success "Docker optimization completed"
}

# 4. Nginx Optimization
optimize_nginx() {
    print_status "Optimizing Nginx configuration..."
    
    # Create optimized nginx.conf
    cat > infrastructure/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
worker_cpu_affinity auto;
worker_rlimit_nofile 65536;

error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
    accept_mutex off;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream Definitions
    upstream api_backend {
        least_conn;
        server api-gateway:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    upstream web_backend {
        least_conn;
        server web-app:80 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    upstream admin_backend {
        least_conn;
        server admin-panel:80 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # Cache Settings
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=STATIC:10m inactive=7d use_temp_path=off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Main Server Block
    server {
        listen 80;
        server_name ultramarket.uz www.ultramarket.uz;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name ultramarket.uz www.ultramarket.uz;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/ultramarket.uz.crt;
        ssl_certificate_key /etc/nginx/ssl/ultramarket.uz.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Root location
        location / {
            proxy_pass http://web_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://web_backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary Accept-Encoding;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }

    # API Server Block
    server {
        listen 443 ssl http2;
        server_name api.ultramarket.uz;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/api.ultramarket.uz.crt;
        ssl_certificate_key /etc/nginx/ssl/api.ultramarket.uz.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API routes with rate limiting
        location /api/v1/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/v1/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }

    # Admin Panel Server Block
    server {
        listen 443 ssl http2;
        server_name admin.ultramarket.uz;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/admin.ultramarket.uz.crt;
        ssl_certificate_key /etc/nginx/ssl/admin.ultramarket.uz.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location / {
            proxy_pass http://admin_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
    
    print_success "Nginx optimization completed"
}

# 5. System Optimization
optimize_system() {
    print_status "Optimizing system settings..."
    
    # Increase file descriptor limits
    echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
    echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
    
    # Optimize kernel parameters
    cat > /tmp/sysctl.conf << 'EOF'
# Network optimization
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 2000000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_tw_recycle = 0
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr

# Memory optimization
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.overcommit_memory = 1

# File system optimization
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
EOF
    
    sudo cp /tmp/sysctl.conf /etc/sysctl.conf
    sudo sysctl -p
    
    print_success "System optimization completed"
}

# 6. Monitoring Setup
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    # Create monitoring directories
    mkdir -p infrastructure/monitoring/grafana/provisioning/datasources
    mkdir -p infrastructure/monitoring/grafana/provisioning/dashboards
    mkdir -p infrastructure/monitoring/grafana/dashboards
    
    # Create Grafana datasource configuration
    cat > infrastructure/monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
    
    # Create Grafana dashboard configuration
    cat > infrastructure/monitoring/grafana/provisioning/dashboards/dashboards.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'UltraMarket Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF
    
    print_success "Monitoring setup completed"
}

# 7. Performance Testing
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Install k6 if not present
    if ! command -v k6 &> /dev/null; then
        print_status "Installing k6..."
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    fi
    
    # Create performance test script
    cat > tests/performance/load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate should be below 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.ultramarket.uz';

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/v1/products`],
    ['GET', `${BASE_URL}/api/v1/products/1`],
    ['GET', `${BASE_URL}/api/v1/categories`],
    ['GET', `${BASE_URL}/api/v1/brands`],
  ]);

  responses.forEach((response) => {
    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!success);
  });

  sleep(1);
}
EOF
    
    # Run performance test
    print_status "Running load test..."
    k6 run tests/performance/load-test.js
    
    print_success "Performance testing completed"
}

# Main execution
main() {
    print_status "Starting UltraMarket Performance Optimization..."
    
    # Check if running as root for system optimizations
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root - system optimizations will be applied"
    else
        print_warning "Not running as root - system optimizations will be skipped"
    fi
    
    # Run optimizations
    optimize_databases
    optimize_applications
    optimize_docker
    optimize_nginx
    setup_monitoring
    
    if [[ $EUID -eq 0 ]]; then
        optimize_system
    fi
    
    # Run performance tests
    run_performance_tests
    
    print_success "🎉 UltraMarket Performance Optimization completed successfully!"
    print_status "Next steps:"
    echo "1. Review the generated configurations"
    echo "2. Test the optimized setup in staging"
    echo "3. Deploy to production with monitoring"
    echo "4. Monitor performance metrics in Grafana"
}

# Run main function
main "$@"