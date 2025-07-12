# UltraMarket O'zbekiston Deployment Guide

## Kirish

Bu guide UltraMarket e-commerce platformasini O'zbekiston bozori uchun production muhitida deploy qilish jarayonini batafsil ko'rsatadi.

---

## Tayyorgarlik

### Minimal Tizim Talablari

#### Server Talablari

- **OS**: Ubuntu 20.04 LTS yoki yuqori
- **RAM**: 8GB (minimum 4GB)
- **Disk**: 50GB (SSD tavsiya etiladi)
- **CPU**: 4 core (minimum 2 core)
- **Network**: 100 Mbps internet aloqasi

#### Domain va DNS

- Asosiy domain: `ultramarket.uz`
- API subdomain: `api.ultramarket.uz`
- Admin subdomain: `admin.ultramarket.uz`

#### Zarur Dasturlar

- Docker va Docker Compose
- Nginx
- Git
- Node.js 18+ (development uchun)
- PostgreSQL Client
- SSL sertifikat (Let's Encrypt)

---

## O'zbekiston Lokalizatsiyasi

### Amalga oshirilgan o'zgarishlar:

#### 1. To'lov Tizimlari ✅

- **Click** - Click.uz integratsiyasi
- **Payme** - Payme.uz integratsiyasi
- **Uzcard** - Bank kartasi to'lovi
- **Humo** - Bank kartasi to'lovi
- **Cash on Delivery** - Yetkazib berganda to'lash

#### 2. Valyuta ✅

- USD → **UZS** (O'zbek so'mi)
- Narx formatlashi: `1 250 000 so'm`
- QQS 12% hisoblanishi

#### 3. Manzil Tizimi ✅

- 14 ta viloyat va respublika
- Tuman/shahar + mahalla tizimi
- O'zbek pochta kodlari
- Yetkazib berish xaritasi

#### 4. Yetkazib Berish ✅

- **Express24** - Tezkor yetkazib berish
- **Uzbekiston Post** - Davlat pochta xizmati
- **Yandex Delivery** - Toshkent va atrofi
- **Local Delivery** - Mahalliy yetkazib berish

#### 5. Telefon Validatsiya ✅

- +998 country code
- Ucell, Beeline, UzMobile operatorlari
- To'g'ri format validatsiya

#### 6. Lokalizatsiya ✅

- **O'zbek tili** (asosiy)
- **Rus tili** (qo'shimcha)
- **Ingliz tili** (xalqaro)

#### 7. Vaqt Zonasi ✅

- **Asia/Tashkent** (+05:00 UTC)
- Barcha sana/vaqtlar mahalliy format

---

## Deployment Jarayoni

### 1. Serverga Kirish va Tayyorgarlik

```bash
# Server connection
ssh username@your-server-ip

# System update
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git nginx postgresql-client
```

### 2. Docker O'rnatish

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Restart session
newgrp docker
```

### 3. Project Clone va Setup

```bash
# Clone repository
git clone https://github.com/your-org/UltraMarket.git
cd UltraMarket

# Make deployment script executable
chmod +x scripts/deployment/uzbekistan-deploy.sh

# Run deployment
./scripts/deployment/uzbekistan-deploy.sh
```

### 4. Manual Configuration (agar kerak bo'lsa)

#### Environment Variables

```bash
# Copy and configure environment
cp config/environments/uzbekistan.env .env

# Generate secure passwords
openssl rand -base64 32  # Database passwords
openssl rand -base64 64  # JWT secrets
```

#### SSL Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificates
sudo certbot --nginx -d ultramarket.uz -d api.ultramarket.uz -d admin.ultramarket.uz
```

---

## Servislar Konfiguratsiyasi

### Docker Compose Setup

#### Ma'lumotlar Bazalari

```yaml
# PostgreSQL - Asosiy DB
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: ultramarket_uzbekistan
    POSTGRES_USER: ultramarket_user
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

# MongoDB - Mahsulotlar uchun
mongodb:
  image: mongo:7.0
  environment:
    MONGO_INITDB_DATABASE: ultramarket_uzbekistan

# Redis - Kesh va sessiyalar
redis:
  image: redis:7.2-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD}

# Elasticsearch - Qidiruv uchun
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

#### Backend Servislar

```yaml
# API Gateway (Port 3000)
api-gateway:
  build: ./microservices/core/api-gateway/api-gateway
  environment:
    - TIMEZONE=Asia/Tashkent
    - DEFAULT_CURRENCY=UZS

# Microservices
auth-service: # Port 3001
user-service: # Port 3002
product-service: # Port 3003
cart-service: # Port 3004
order-service: # Port 3005
payment-service: # Port 3012
shipping-service: # Port 3011
```

#### Frontend Apps

```yaml
# Web Application (Port 3100)
web-app:
  build: ./frontend/web-app
  environment:
    - REACT_APP_DEFAULT_CURRENCY=UZS
    - REACT_APP_DEFAULT_LANGUAGE=uz
    - REACT_APP_UZBEK_FEATURES=true

# Admin Panel (Port 3101)
admin-panel:
  build: ./frontend/admin-panel
```

---

## O'zbekiston API Integration

### Click To'lov Tizimi

#### Konfiguratsiya

```bash
# .env faylida
CLICK_MERCHANT_ID=your_click_merchant_id
CLICK_SECRET_KEY=your_click_secret_key
CLICK_API_URL=https://api.click.uz/v2
```

#### Test

```bash
curl -X POST https://api.ultramarket.uz/api/v1/payments/click/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "UZ1234567890",
    "amount": 250000,
    "description": "Test to'\''lov"
  }'
```

### Payme To'lov Tizimi

#### Konfiguratsiya

```bash
PAYME_MERCHANT_ID=your_payme_merchant_id
PAYME_SECRET_KEY=your_payme_secret_key
PAYME_API_URL=https://checkout.paycom.uz/api
```

### Express24 Yetkazib Berish

#### Konfiguratsiya

```bash
EXPRESS24_API_KEY=your_express24_api_key
EXPRESS24_API_URL=https://api.express24.uz/v1
```

#### Test

```bash
curl -X POST https://api.ultramarket.uz/api/v1/shipping/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "EXPRESS24",
    "fromRegion": "Toshkent shahri",
    "toRegion": "Samarqand",
    "weight": 2.5
  }'
```

---

## Database Migration

### O'zbekiston uchun Migration

```sql
-- Foydalanuvchilar jadvalini yangilash
ALTER TABLE "User" ADD COLUMN "phone_uzbek" VARCHAR(20);
ALTER TABLE "User" ADD COLUMN "address_region" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN "address_district" VARCHAR(100);
ALTER TABLE "User" ADD COLUMN "address_mahalla" VARCHAR(100);

-- To'lov metodlari jadvali
CREATE TABLE "UzbekPaymentMethod" (
  "id" SERIAL PRIMARY KEY,
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "name_uz" VARCHAR(100) NOT NULL,
  "name_ru" VARCHAR(100) NOT NULL
);

-- Viloyatlar jadvali
CREATE TABLE "UzbekRegion" (
  "id" SERIAL PRIMARY KEY,
  "code" VARCHAR(10) UNIQUE NOT NULL,
  "name_uz" VARCHAR(100) NOT NULL,
  "delivery_fee" INTEGER DEFAULT 25000
);

-- Valyuta o'zgartirish (USD → UZS)
UPDATE "Product" SET "price" = "price" * 12300;
UPDATE "Order" SET "total" = "total" * 12300, "currency" = 'UZS';
```

### Migration Ishga Tushirish

```bash
# Docker orqali
docker-compose exec postgres psql -U ultramarket_user -d ultramarket_uzbekistan -f /path/to/uzbekistan-migration.sql

# Yoki to'g'ridan-to'g'ri
psql -h localhost -U ultramarket_user -d ultramarket_uzbekistan -f scripts/database-migration/uzbekistan-migration.sql
```

---

## Monitoring va Logging

### Health Check Setup

```bash
# Health monitor script
sudo cp scripts/monitoring/ultramarket-monitor.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/ultramarket-monitor

# Cron job (har 5 daqiqa)
crontab -e
# Qo'shish: */5 * * * * /usr/local/bin/ultramarket-monitor
```

### Logging Konfiguratsiya

```yaml
# docker-compose.yml da
services:
  api-gateway:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

### Backup Setup

```bash
# Daily backup script
sudo cp scripts/backup/ultramarket-backup.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/ultramarket-backup

# Cron job (har kuni soat 2:00 da)
crontab -e
# Qo'shish: 0 2 * * * /usr/local/bin/ultramarket-backup
```

---

## Nginx Konfiguratsiyasi

### Sites Configuration

```nginx
# /etc/nginx/sites-available/ultramarket

# Main website
server {
    listen 443 ssl http2;
    server_name ultramarket.uz;

    ssl_certificate /etc/letsencrypt/live/ultramarket.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ultramarket.uz/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# API
server {
    listen 443 ssl http2;
    server_name api.ultramarket.uz;

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}

# Admin
server {
    listen 443 ssl http2;
    server_name admin.ultramarket.uz;

    location / {
        proxy_pass http://127.0.0.1:3101;
    }
}
```

### Aktivlashtirish

```bash
sudo ln -s /etc/nginx/sites-available/ultramarket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Testing va Verification

### Health Check Testlar

```bash
# API health
curl https://api.ultramarket.uz/health

# Web app
curl https://ultramarket.uz

# Admin panel
curl https://admin.ultramarket.uz
```

### O'zbekiston Funksiyalarini Test Qilish

#### Telefon Validatsiya

```bash
curl -X POST https://api.ultramarket.uz/api/v1/validation/phone \
  -H "Content-Type: application/json" \
  -d '{"phone": "+998901234567"}'
```

#### Manzil Validatsiya

```bash
curl -X POST https://api.ultramarket.uz/api/v1/validation/address \
  -H "Content-Type: application/json" \
  -d '{
    "region": "Toshkent shahri",
    "district": "Yashnobod",
    "street": "Mustaqillik ko'\''chasi",
    "house": "15"
  }'
```

#### UZS Narxlar

```bash
curl https://api.ultramarket.uz/api/v1/products?currency=UZS
```

---

## Performance Optimization

### Redis Kesh

```bash
# Redis memory optimization
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### PostgreSQL Tuning

```sql
-- postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### Nginx Optimization

```nginx
# nginx.conf
worker_processes auto;
worker_connections 1024;

# Gzip compression
gzip on;
gzip_min_length 10240;
gzip_types text/css application/javascript application/json;

# Static file caching
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Security Checklist

### SSL/TLS

- ✅ SSL sertifikatlari (Let's Encrypt)
- ✅ HTTPS redirect
- ✅ HSTS headers
- ✅ Strong cipher suites

### API Security

- ✅ JWT authentication
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Input validation

### Database Security

- ✅ Strong passwords
- ✅ Limited user permissions
- ✅ Connection encryption
- ✅ Regular backups

### Server Security

- ✅ Firewall configuration
- ✅ SSH key authentication
- ✅ Regular updates
- ✅ Log monitoring

---

## Troubleshooting

### Common Issues

#### Docker Container Issues

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs [service-name]

# Restart service
docker-compose restart [service-name]
```

#### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U ultramarket_user -d ultramarket_uzbekistan

# Check Redis connection
redis-cli ping
```

#### SSL Certificate Issues

```bash
# Renew certificates
sudo certbot renew

# Test SSL
openssl s_client -connect ultramarket.uz:443
```

### Log Files

- **Application logs**: `/var/log/ultramarket/`
- **Nginx logs**: `/var/log/nginx/`
- **Docker logs**: `docker-compose logs`

---

## Maintenance

### Regular Tasks

#### Daily

- Health check monitoring
- Backup verification
- Log rotation

#### Weekly

- SSL certificate check
- Performance monitoring
- Security updates

#### Monthly

- Database optimization
- Clean old backups
- Review access logs

### Update Process

```bash
# 1. Backup current state
./scripts/backup/ultramarket-backup.sh

# 2. Pull latest changes
git pull origin main

# 3. Update services
docker-compose build --no-cache
docker-compose up -d

# 4. Run migrations if needed
docker-compose exec postgres psql -U ultramarket_user -d ultramarket_uzbekistan -f /path/to/migration.sql

# 5. Verify deployment
curl https://api.ultramarket.uz/health
```

---

## Support va Kontakt

### Texnik Yordam

- **Email**: support@ultramarket.uz
- **Telegram**: @UltraMarketSupport
- **Phone**: +998 71 123-45-67

### Dokumentatsiya

- **API Docs**: https://docs.ultramarket.uz
- **GitHub**: https://github.com/ultramarket/uzbekistan

### Emergency Contacts

- **System Admin**: +998 90 123-45-67
- **DevOps**: +998 91 123-45-67
- **CEO**: +998 93 123-45-67

---

## Appendix

### Environment Variables Reference

#### Required Variables

```bash
# Database
POSTGRES_PASSWORD=secure_password
MONGODB_URI=mongodb://user:pass@localhost:27017/db
REDIS_PASSWORD=redis_password

# Security
JWT_SECRET=your_jwt_secret_64_characters
SESSION_SECRET=session_secret

# O'zbek Payment Systems
CLICK_MERCHANT_ID=click_merchant_id
CLICK_SECRET_KEY=click_secret_key
PAYME_MERCHANT_ID=payme_merchant_id
PAYME_SECRET_KEY=payme_secret_key

# Delivery Services
EXPRESS24_API_KEY=express24_api_key
UZPOST_API_KEY=uzpost_api_key

# SMS Service
ESKIZ_EMAIL=your_eskiz_email
ESKIZ_PASSWORD=eskiz_password
```

#### Optional Variables

```bash
# Monitoring
TELEGRAM_BOT_TOKEN=telegram_bot_token
TELEGRAM_CHAT_ID=chat_id
SENTRY_DSN=sentry_dsn

# File Storage
CLOUDINARY_CLOUD_NAME=cloud_name
CLOUDINARY_API_KEY=api_key
CLOUDINARY_API_SECRET=api_secret

# Analytics
GOOGLE_ANALYTICS_ID=ga_id
YANDEX_METRIKA_ID=ym_id
```

### Port Reference

- **3000**: API Gateway
- **3001**: Auth Service
- **3002**: User Service
- **3003**: Product Service
- **3004**: Cart Service
- **3005**: Order Service
- **3006**: Notification Service
- **3007**: Search Service
- **3010**: Review Service
- **3011**: Shipping Service
- **3012**: Payment Service
- **3100**: Web Application
- **3101**: Admin Panel
- **5432**: PostgreSQL
- **27017**: MongoDB
- **6379**: Redis
- **9200**: Elasticsearch

---

_Guide oxirgi marta 2024-yil 15-yanvarda yangilangan._
