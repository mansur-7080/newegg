#!/bin/bash

# =============================================================================
# UltraMarket O'zbekistan Production Deployment Script
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV="uzbekistan"
PROJECT_NAME="ultramarket-uzbekistan"
DOMAIN="ultramarket.uz"
API_DOMAIN="api.ultramarket.uz"
ADMIN_DOMAIN="admin.ultramarket.uz"

# Directories
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="/backups/ultramarket"
LOG_DIR="/var/log/ultramarket"
SSL_DIR="/etc/ssl/ultramarket"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}UltraMarket O'zbekiston Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "Bu skriptni root sifatida ishlatmang!"
    fi
}

# Check system requirements
check_requirements() {
    log "Tizim talablarini tekshirish..."
    
    # Check for required commands
    local required_commands=("docker" "docker-compose" "git" "curl" "nginx")
    for cmd in "${required_commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd topilmadi. Iltimos avval o'rnating."
        fi
    done
    
    # Check disk space (minimum 10GB)
    local available_space=$(df / | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 10485760 ]]; then  # 10GB in KB
        error "Disk maydoni yetarli emas. Minimum 10GB kerak."
    fi
    
    # Check memory (minimum 4GB)
    local total_memory=$(free -m | awk 'NR==2{print $2}')
    if [[ $total_memory -lt 4000 ]]; then
        warning "RAM hajmi 4GB dan kam. Performance muammolari bo'lishi mumkin."
    fi
    
    log "Tizim talablari tekshirildi ✓"
}

# Setup directories
setup_directories() {
    log "Kataloglarni sozlash..."
    
    sudo mkdir -p "$BACKUP_DIR" "$LOG_DIR" "$SSL_DIR"
    sudo chown -R $USER:$USER "$BACKUP_DIR" "$LOG_DIR"
    sudo chmod 755 "$BACKUP_DIR" "$LOG_DIR"
    
    log "Kataloglar sozlandi ✓"
}

# Generate SSL certificates
setup_ssl() {
    log "SSL sertifikatlarini sozlash..."
    
    if [[ ! -f "$SSL_DIR/cert.pem" ]]; then
        log "Let's Encrypt sertifikatlarini yaratish..."
        
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Generate certificates for all domains
        sudo certbot --nginx -d $DOMAIN -d $API_DOMAIN -d $ADMIN_DOMAIN \
            --email admin@$DOMAIN --agree-tos --non-interactive --redirect
    else
        log "SSL sertifikatlari mavjud ✓"
    fi
}

# Setup environment variables
setup_environment() {
    log "Environment o'zgaruvchilarini sozlash..."
    
    # Copy Uzbekistan environment file
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        cp "$PROJECT_ROOT/config/environments/uzbekistan.env" "$PROJECT_ROOT/.env"
        log "Environment fayli yaratildi"
    fi
    
    # Generate random secrets if not set
    local env_file="$PROJECT_ROOT/.env"
    
    # JWT Secret
    if ! grep -q "JWT_SECRET=" "$env_file" || grep -q "your_jwt_secret" "$env_file"; then
        local jwt_secret=$(openssl rand -base64 64)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" "$env_file"
        log "JWT secret yangilandi"
    fi
    
    # Database passwords
    if ! grep -q "POSTGRES_PASSWORD=" "$env_file" || grep -q "ultramarket_secure_uzbekistan_2024" "$env_file"; then
        local postgres_password=$(openssl rand -base64 32)
        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$postgres_password/" "$env_file"
        sed -i "s/ultramarket_secure_uzbekistan_2024/$postgres_password/g" "$env_file"
        log "PostgreSQL parol yangilandi"
    fi
    
    # Redis password
    if ! grep -q "REDIS_PASSWORD=" "$env_file" || grep -q "ultramarket_redis_uzbekistan_2024" "$env_file"; then
        local redis_password=$(openssl rand -base64 32)
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$redis_password/" "$env_file"
        sed -i "s/ultramarket_redis_uzbekistan_2024/$redis_password/g" "$env_file"
        log "Redis parol yangilandi"
    fi
    
    log "Environment sozlandi ✓"
}

# Setup databases
setup_databases() {
    log "Ma'lumotlar bazalarini sozlash..."
    
    # Start database services
    cd "$PROJECT_ROOT"
    docker-compose -f config/docker/docker-compose.uzbekistan.yml up -d postgres mongodb redis elasticsearch
    
    # Wait for services to be ready
    log "Ma'lumotlar bazalari ishga tushishini kutish..."
    sleep 30
    
    # Run database migration
    log "Ma'lumotlar bazasi migration..."
    docker-compose -f config/docker/docker-compose.uzbekistan.yml exec -T postgres \
        psql -U ultramarket_user -d ultramarket_uzbekistan -f /docker-entrypoint-initdb.d/01-uzbekistan-migration.sql
    
    log "Ma'lumotlar bazalari sozlandi ✓"
}

# Build and deploy services
deploy_services() {
    log "Servislarni deploy qilish..."
    
    cd "$PROJECT_ROOT"
    
    # Build all services
    log "Docker image'larni build qilish..."
    docker-compose -f config/docker/docker-compose.uzbekistan.yml build --no-cache
    
    # Start all services
    log "Barcha servislarni ishga tushirish..."
    docker-compose -f config/docker/docker-compose.uzbekistan.yml up -d
    
    # Wait for services to be healthy
    log "Servislar tayyor bo'lishini kutish..."
    sleep 60
    
    # Health check
    local services=("api-gateway" "auth-service" "user-service" "product-service" "cart-service" "order-service")
    for service in "${services[@]}"; do
        local health_check=$(docker-compose -f config/docker/docker-compose.uzbekistan.yml ps $service | grep "Up")
        if [[ -z "$health_check" ]]; then
            warning "$service servisi ishlamayapti"
        else
            log "$service servisi ishlamoqda ✓"
        fi
    done
    
    log "Servislar deploy qilindi ✓"
}

# Setup Nginx reverse proxy
setup_nginx() {
    log "Nginx konfiguratsiyasini sozlash..."
    
    # Create Nginx configuration
    cat > /tmp/ultramarket.nginx.conf << 'EOF'
# UltraMarket O'zbekiston Nginx Configuration

upstream api_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
}

upstream web_backend {
    least_conn;
    server 127.0.0.1:3100 max_fails=3 fail_timeout=30s;
}

upstream admin_backend {
    least_conn;
    server 127.0.0.1:3101 max_fails=3 fail_timeout=30s;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=payment_limit:10m rate=2r/s;

# Main website - ultramarket.uz
server {
    listen 80;
    listen [::]:80;
    server_name ultramarket.uz www.ultramarket.uz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ultramarket.uz www.ultramarket.uz;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/ultramarket.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ultramarket.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://web_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Accept-Language $http_accept_language;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|tar|gz)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}

# API - api.ultramarket.uz
server {
    listen 80;
    listen [::]:80;
    server_name api.ultramarket.uz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.ultramarket.uz;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/ultramarket.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ultramarket.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Rate limiting
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API specific headers
        proxy_set_header Accept application/json;
        proxy_set_header Content-Type application/json;
    }

    # Payment webhooks with special rate limiting
    location /api/v1/payments/webhooks/ {
        limit_req zone=payment_limit burst=5 nodelay;
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin Panel - admin.ultramarket.uz
server {
    listen 80;
    listen [::]:80;
    server_name admin.ultramarket.uz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.ultramarket.uz;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/ultramarket.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ultramarket.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # IP whitelist for admin (uncomment and configure as needed)
    # allow 192.168.1.0/24;
    # deny all;

    location / {
        proxy_pass http://admin_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    # Install Nginx configuration
    sudo cp /tmp/ultramarket.nginx.conf /etc/nginx/sites-available/ultramarket
    sudo ln -sf /etc/nginx/sites-available/ultramarket /etc/nginx/sites-enabled/
    
    # Remove default Nginx configuration
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    log "Nginx sozlandi ✓"
}

# Setup monitoring
setup_monitoring() {
    log "Monitoring tizimini sozlash..."
    
    # Create monitoring script
    cat > /tmp/ultramarket-monitor.sh << 'EOF'
#!/bin/bash

# UltraMarket Health Monitor Script

SERVICES=("api-gateway" "auth-service" "user-service" "product-service" "cart-service" "order-service")
LOG_FILE="/var/log/ultramarket/health-check.log"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID}"

check_service() {
    local service=$1
    local status=$(docker ps --filter "name=$service" --format "{{.Status}}")
    
    if [[ "$status" == *"Up"* ]]; then
        return 0
    else
        return 1
    fi
}

send_telegram_alert() {
    local message=$1
    if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d "chat_id=$TELEGRAM_CHAT_ID" \
            -d "text=🚨 UltraMarket Alert: $message" \
            -d "parse_mode=HTML"
    fi
}

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Main health check
for service in "${SERVICES[@]}"; do
    if ! check_service "$service"; then
        message="$service servisi ishlamayapti!"
        log_message "ERROR: $message"
        send_telegram_alert "$message"
        
        # Try to restart the service
        cd /opt/ultramarket
        docker-compose -f config/docker/docker-compose.uzbekistan.yml restart "$service"
        sleep 30
        
        if check_service "$service"; then
            restart_message="$service servisi qayta ishga tushirildi"
            log_message "INFO: $restart_message"
            send_telegram_alert "$restart_message"
        fi
    else
        log_message "OK: $service servisi ishlayapti"
    fi
done

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 85 ]]; then
    message="Disk maydoni ${DISK_USAGE}% to'lgan!"
    log_message "WARNING: $message"
    send_telegram_alert "$message"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [[ $MEMORY_USAGE -gt 90 ]]; then
    message="RAM ${MEMORY_USAGE}% ishlatilmoqda!"
    log_message "WARNING: $message"
    send_telegram_alert "$message"
fi
EOF

    # Install monitoring script
    sudo cp /tmp/ultramarket-monitor.sh /usr/local/bin/ultramarket-monitor
    sudo chmod +x /usr/local/bin/ultramarket-monitor
    
    # Setup cron job for monitoring
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/ultramarket-monitor") | crontab -
    
    log "Monitoring sozlandi ✓"
}

# Setup backup system
setup_backup() {
    log "Backup tizimini sozlash..."
    
    # Create backup script
    cat > /tmp/ultramarket-backup.sh << 'EOF'
#!/bin/bash

# UltraMarket Backup Script

BACKUP_DIR="/backups/ultramarket"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_CONTAINER="ultramarket-postgres-uz"
MONGO_CONTAINER="ultramarket-mongo-uz"

# PostgreSQL backup
docker exec $POSTGRES_CONTAINER pg_dump -U ultramarket_user -d ultramarket_uzbekistan | \
    gzip > "$BACKUP_DIR/postgres_$DATE.sql.gz"

# MongoDB backup
docker exec $MONGO_CONTAINER mongodump --uri="mongodb://ultramarket_user:password@localhost:27017/ultramarket_uzbekistan" \
    --archive | gzip > "$BACKUP_DIR/mongodb_$DATE.archive.gz"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

    # Install backup script
    sudo cp /tmp/ultramarket-backup.sh /usr/local/bin/ultramarket-backup
    sudo chmod +x /usr/local/bin/ultramarket-backup
    
    # Setup daily backup cron job
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/ultramarket-backup") | crontab -
    
    log "Backup tizimi sozlandi ✓"
}

# Post-deployment verification
verify_deployment() {
    log "Deployment tekshiruvi..."
    
    # Test main website
    local web_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN")
    if [[ "$web_status" == "200" ]]; then
        log "Web sayt ishlayapti ✓"
    else
        error "Web sayt ishlamayapti (HTTP $web_status)"
    fi
    
    # Test API
    local api_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_DOMAIN/health")
    if [[ "$api_status" == "200" ]]; then
        log "API ishlayapti ✓"
    else
        error "API ishlamayapti (HTTP $api_status)"
    fi
    
    # Test admin panel
    local admin_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$ADMIN_DOMAIN")
    if [[ "$admin_status" == "200" ]]; then
        log "Admin panel ishlayapti ✓"
    else
        warning "Admin panel ishlamayapti (HTTP $admin_status)"
    fi
    
    log "Deployment muvaffaqiyatli tugallandi! ✅"
}

# Cleanup function
cleanup() {
    log "Vaqtinchalik fayllarni tozalash..."
    rm -f /tmp/ultramarket.nginx.conf /tmp/ultramarket-monitor.sh /tmp/ultramarket-backup.sh
}

# Main deployment function
main() {
    log "UltraMarket O'zbekiston deployment boshlandi..."
    
    check_root
    check_requirements
    setup_directories
    setup_ssl
    setup_environment
    setup_databases
    deploy_services
    setup_nginx
    setup_monitoring
    setup_backup
    verify_deployment
    cleanup
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Deployment muvaffaqiyatli tugallandi!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${BLUE}🌐 Web sayt: https://$DOMAIN${NC}"
    echo -e "${BLUE}🔧 API: https://$API_DOMAIN${NC}"
    echo -e "${BLUE}👨‍💼 Admin: https://$ADMIN_DOMAIN${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Run main function
main "$@" 