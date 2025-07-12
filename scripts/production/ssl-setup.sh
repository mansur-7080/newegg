#!/bin/bash

# 🔐 UltraMarket Backend - SSL Certificate Setup Script
# Bu skript production domainlar uchun SSL sertifikatlarni o'rnatadi

set -e

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   🔐 SSL Setup Script                        ║"
echo "║              UltraMarket Backend SSL Configuration           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Konfiguratsiya
DOMAINS=(
    "api.ultramarket.uz"
    "admin.ultramarket.uz"
    "files.ultramarket.uz"
    "search.ultramarket.uz"
    "payments.ultramarket.uz"
    "notifications.ultramarket.uz"
    "analytics.ultramarket.uz"
    "monitoring.ultramarket.uz"
)

EMAIL="admin@ultramarket.uz"
WEBROOT="/var/www/certbot"
NGINX_CONF_DIR="/etc/nginx/sites-available"
CERT_DIR="/etc/letsencrypt/live"

# Funksiyalar
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

# Root huquqlarini tekshirish
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Bu skript root huquqlari bilan ishga tushirilishi kerak"
        exit 1
    fi
}

# Zarur paketlarni o'rnatish
install_dependencies() {
    log_info "Zarur paketlarni o'rnatish..."
    
    # Apt repository yangilash
    apt-get update
    
    # Certbot o'rnatish
    if ! command -v certbot &> /dev/null; then
        apt-get install -y certbot python3-certbot-nginx
        log_success "Certbot o'rnatildi"
    else
        log_info "Certbot allaqachon o'rnatilgan"
    fi
    
    # Nginx o'rnatish
    if ! command -v nginx &> /dev/null; then
        apt-get install -y nginx
        systemctl enable nginx
        systemctl start nginx
        log_success "Nginx o'rnatildi va ishga tushirildi"
    else
        log_info "Nginx allaqachon o'rnatilgan"
    fi
}

# Nginx konfiguratsiyasi yaratish
create_nginx_config() {
    local domain=$1
    local config_file="${NGINX_CONF_DIR}/${domain}"
    
    log_info "${domain} uchun Nginx konfiguratsiyasi yaratilmoqda..."
    
    cat > "${config_file}" << EOF
server {
    listen 80;
    server_name ${domain};
    
    # Certbot validation uchun
    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }
    
    # Barcha boshqa so'rovlarni HTTPS ga yo'naltirish
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF
    
    # Symbolic link yaratish
    ln -sf "${config_file}" "/etc/nginx/sites-enabled/${domain}"
    
    log_success "${domain} uchun Nginx konfiguratsiyasi yaratildi"
}

# SSL sertifikat olish
obtain_ssl_certificate() {
    local domain=$1
    
    log_info "${domain} uchun SSL sertifikat olinmoqda..."
    
    # Webroot directory yaratish
    mkdir -p "${WEBROOT}"
    
    # Certbot bilan sertifikat olish
    certbot certonly \
        --webroot \
        --webroot-path="${WEBROOT}" \
        --email="${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "${domain}"
    
    if [ $? -eq 0 ]; then
        log_success "${domain} uchun SSL sertifikat muvaffaqiyatli olindi"
    else
        log_error "${domain} uchun SSL sertifikat olishda xatolik"
        return 1
    fi
}

# HTTPS Nginx konfiguratsiyasi yaratish
create_https_nginx_config() {
    local domain=$1
    local config_file="${NGINX_CONF_DIR}/${domain}"
    
    log_info "${domain} uchun HTTPS Nginx konfiguratsiyasi yaratilmoqda..."
    
    # Backend port aniqlash
    local backend_port
    case "${domain}" in
        "api.ultramarket.uz")
            backend_port="8000"
            ;;
        "admin.ultramarket.uz")
            backend_port="3000"
            ;;
        "files.ultramarket.uz")
            backend_port="3009"
            ;;
        "search.ultramarket.uz")
            backend_port="3007"
            ;;
        "payments.ultramarket.uz")
            backend_port="3006"
            ;;
        "notifications.ultramarket.uz")
            backend_port="3008"
            ;;
        "analytics.ultramarket.uz")
            backend_port="3011"
            ;;
        "monitoring.ultramarket.uz")
            backend_port="3001"
            ;;
        *)
            backend_port="8000"
            ;;
    esac
    
    cat > "${config_file}" << EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name ${domain};
    
    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name ${domain};
    
    # SSL Configuration
    ssl_certificate ${CERT_DIR}/${domain}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/${domain}/privkey.pem;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate ${CERT_DIR}/${domain}/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
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
    
    # Client body size
    client_max_body_size 100M;
    
    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:${backend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:${backend_port}/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files (agar kerak bo'lsa)
    location /static/ {
        alias /var/www/ultramarket/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Favicon
    location /favicon.ico {
        alias /var/www/ultramarket/static/favicon.ico;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Robots.txt
    location /robots.txt {
        alias /var/www/ultramarket/static/robots.txt;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    log_success "${domain} uchun HTTPS Nginx konfiguratsiyasi yaratildi"
}

# Nginx konfiguratsiyasini test qilish
test_nginx_config() {
    log_info "Nginx konfiguratsiyasini test qilish..."
    
    if nginx -t; then
        log_success "Nginx konfiguratsiyasi to'g'ri"
        systemctl reload nginx
        log_success "Nginx qayta yuklandi"
    else
        log_error "Nginx konfiguratsiyasida xatolik"
        return 1
    fi
}

# SSL sertifikat avtomatik yangilanishini sozlash
setup_auto_renewal() {
    log_info "SSL sertifikat avtomatik yangilanishini sozlash..."
    
    # Crontab entry yaratish
    crontab_entry="0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx"
    
    # Mavjud crontab olish
    current_crontab=$(crontab -l 2>/dev/null || echo "")
    
    # Agar entry mavjud bo'lmasa, qo'shish
    if ! echo "$current_crontab" | grep -q "certbot renew"; then
        echo "$current_crontab" | { cat; echo "$crontab_entry"; } | crontab -
        log_success "SSL sertifikat avtomatik yangilanishi sozlandi"
    else
        log_info "SSL sertifikat avtomatik yangilanishi allaqachon sozlangan"
    fi
}

# SSL sertifikat holatini tekshirish
check_ssl_status() {
    local domain=$1
    
    log_info "${domain} uchun SSL sertifikat holatini tekshirish..."
    
    if [ -f "${CERT_DIR}/${domain}/fullchain.pem" ]; then
        # Sertifikat muddatini tekshirish
        expiry_date=$(openssl x509 -enddate -noout -in "${CERT_DIR}/${domain}/fullchain.pem" | cut -d= -f2)
        expiry_timestamp=$(date -d "$expiry_date" +%s)
        current_timestamp=$(date +%s)
        days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ $days_until_expiry -gt 30 ]; then
            log_success "${domain} SSL sertifikat yaroqli ($days_until_expiry kun qoldi)"
        elif [ $days_until_expiry -gt 0 ]; then
            log_warning "${domain} SSL sertifikat tez orada tugaydi ($days_until_expiry kun qoldi)"
        else
            log_error "${domain} SSL sertifikat muddati tugagan"
        fi
    else
        log_error "${domain} uchun SSL sertifikat topilmadi"
        return 1
    fi
}

# Firewall sozlash
setup_firewall() {
    log_info "Firewall sozlash..."
    
    # UFW o'rnatish
    if ! command -v ufw &> /dev/null; then
        apt-get install -y ufw
    fi
    
    # Firewall qoidalarini sozlash
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Firewall yoqish
    ufw --force enable
    
    log_success "Firewall sozlandi"
}

# Asosiy funksiya
main() {
    log_info "UltraMarket Backend SSL setup boshlandi..."
    
    # Root huquqlarini tekshirish
    check_root
    
    # Zarur paketlarni o'rnatish
    install_dependencies
    
    # Firewall sozlash
    setup_firewall
    
    # Har bir domain uchun SSL sozlash
    for domain in "${DOMAINS[@]}"; do
        log_info "========== ${domain} uchun SSL sozlash =========="
        
        # Nginx konfiguratsiyasi yaratish (HTTP only)
        create_nginx_config "$domain"
        
        # Nginx qayta yuklash
        systemctl reload nginx
        
        # SSL sertifikat olish
        if obtain_ssl_certificate "$domain"; then
            # HTTPS Nginx konfiguratsiyasi yaratish
            create_https_nginx_config "$domain"
            
            # Nginx konfiguratsiyasini test qilish
            test_nginx_config
            
            # SSL holatini tekshirish
            check_ssl_status "$domain"
        else
            log_error "${domain} uchun SSL sozlashda xatolik"
        fi
        
        echo
    done
    
    # Avtomatik yangilanishni sozlash
    setup_auto_renewal
    
    log_success "SSL setup yakunlandi!"
    
    # Yakuniy ma'lumotlar
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    SSL Setup Yakunlandi!                    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}Sozlangan domainlar:${NC}"
    for domain in "${DOMAINS[@]}"; do
        echo -e "  ✅ https://${domain}"
    done
    echo
    echo -e "${BLUE}Keyingi qadamlar:${NC}"
    echo -e "  1. DNS A record'larini sozlang"
    echo -e "  2. Domain'larni test qiling"
    echo -e "  3. SSL sertifikatlar holatini monitoring qiling"
    echo
    echo -e "${BLUE}Foydali buyruqlar:${NC}"
    echo -e "  • SSL holatini tekshirish: certbot certificates"
    echo -e "  • Nginx holatini tekshirish: systemctl status nginx"
    echo -e "  • SSL test: curl -I https://domain.com"
    echo
}

# Skriptni ishga tushirish
main "$@" 