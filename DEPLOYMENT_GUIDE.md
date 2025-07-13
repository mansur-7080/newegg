# UltraMarket Platform - Deployment Guide

## 🚀 Production Deployment Guide

Bu hujjat UltraMarket platformasini production muhitiga deploy qilish uchun to'liq ko'rsatmalarni o'z ichiga oladi.

## 📋 Talablar

### System Requirements
- **Node.js**: 18.x yoki undan yuqori
- **PostgreSQL**: 13.x yoki undan yuqori
- **Redis**: 6.x yoki undan yuqori
- **MongoDB**: 5.x yoki undan yuqori
- **Docker**: 20.x yoki undan yuqori (ixtiyoriy)

### Server Requirements
- **CPU**: Minimum 4 cores
- **RAM**: Minimum 8GB
- **Storage**: Minimum 100GB SSD
- **Network**: Stable internet connection

## 🔧 Environment Setup

### 1. Environment Variables

Har bir servis uchun `.env` faylini yarating:

```bash
# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/ultramarket
MONGODB_URI=mongodb://localhost:27017/ultramarket

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

# JWT
JWT_SECRET=your_ultra_secure_jwt_secret_key_minimum_32_chars_long
JWT_REFRESH_SECRET=your_ultra_secure_jwt_refresh_secret_key_minimum_32_chars_long

# Payment Gateways
CLICK_SECRET_KEY=your_click_secret_key
CLICK_MERCHANT_ID=your_click_merchant_id
PAYME_SECRET_KEY=your_payme_secret_key
PAYME_MERCHANT_ID=your_payme_merchant_id

# External Services
FRONTEND_URL=https://ultramarket.uz
ADMIN_URL=https://admin.ultramarket.uz
API_BASE_URL=https://api.ultramarket.uz

# Security
CORS_ORIGIN=https://ultramarket.uz
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
```

### 2. Database Setup

```bash
# PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE ultramarket;
CREATE USER ultramarket_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ultramarket TO ultramarket_user;
\q

# MongoDB
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Redis
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 3. Node.js Setup

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

## 🐳 Docker Deployment (Tavsiya etiladi)

### 1. Docker Compose Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ultramarket
      POSTGRES_USER: ultramarket_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - ultramarket-network

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your_secure_redis_password
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - ultramarket-network

  # MongoDB
  mongodb:
    image: mongo:6
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secure_password
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    networks:
      - ultramarket-network

  # API Gateway
  api-gateway:
    build:
      context: .
      dockerfile: microservices/core/api-gateway/api-gateway/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://ultramarket_user:secure_password@postgres:5432/ultramarket
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your_secure_redis_password
    depends_on:
      - postgres
      - redis
    networks:
      - ultramarket-network
    restart: unless-stopped

  # Auth Service
  auth-service:
    build:
      context: .
      dockerfile: microservices/core/auth-service/Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://ultramarket_user:secure_password@postgres:5432/ultramarket
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your_secure_redis_password
    depends_on:
      - postgres
      - redis
    networks:
      - ultramarket-network
    restart: unless-stopped

  # Payment Service
  payment-service:
    build:
      context: .
      dockerfile: microservices/business/payment-service/payment-service/Dockerfile
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://ultramarket_user:secure_password@postgres:5432/ultramarket
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your_secure_redis_password
    depends_on:
      - postgres
      - redis
    networks:
      - ultramarket-network
    restart: unless-stopped

  # Product Service
  product-service:
    build:
      context: .
      dockerfile: microservices/business/product-service/product-service/Dockerfile
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:secure_password@mongodb:27017/ultramarket
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your_secure_redis_password
    depends_on:
      - mongodb
      - redis
    networks:
      - ultramarket-network
    restart: unless-stopped

  # Order Service
  order-service:
    build:
      context: .
      dockerfile: microservices/business/order-service/order-service/Dockerfile
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://ultramarket_user:secure_password@postgres:5432/ultramarket
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your_secure_redis_password
    depends_on:
      - postgres
      - redis
    networks:
      - ultramarket-network
    restart: unless-stopped

  # Analytics Service
  analytics-service:
    build:
      context: .
      dockerfile: microservices/analytics/analytics-service/Dockerfile
    ports:
      - "3008:3008"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://ultramarket_user:secure_password@postgres:5432/ultramarket
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your_secure_redis_password
    depends_on:
      - postgres
      - redis
    networks:
      - ultramarket-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  mongodb_data:

networks:
  ultramarket-network:
    driver: bridge
```

### 2. Docker Deployment Commands

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Update services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Manual Deployment

### 1. Clone Repository

```bash
git clone https://github.com/ultramarket/ultramarket-platform.git
cd ultramarket-platform
```

### 2. Install Dependencies

```bash
# Install dependencies for all services
npm install

# Build all services
npm run build
```

### 3. Database Migrations

```bash
# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 4. Start Services with PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './microservices/core/api-gateway/api-gateway/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'auth-service',
      script: './microservices/core/auth-service/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    {
      name: 'payment-service',
      script: './microservices/business/payment-service/payment-service/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      }
    },
    {
      name: 'product-service',
      script: './microservices/business/product-service/product-service/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      }
    },
    {
      name: 'order-service',
      script: './microservices/business/order-service/order-service/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      }
    },
    {
      name: 'analytics-service',
      script: './microservices/analytics/analytics-service/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3008
      }
    }
  ]
};
EOF

# Start all services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Install UFW
sudo apt install ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000:3010/tcp
sudo ufw enable
```

### 2. SSL Certificate

```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d ultramarket.uz -d api.ultramarket.uz

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/ultramarket
server {
    listen 80;
    server_name ultramarket.uz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ultramarket.uz;

    ssl_certificate /etc/letsencrypt/live/ultramarket.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ultramarket.uz/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoring Setup

### 1. PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View monitoring dashboard
pm2 monit
```

### 2. Log Management

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/ultramarket

# Add configuration
/var/log/ultramarket/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

### 3. Health Checks

```bash
# Create health check script
cat > health-check.sh << 'EOF'
#!/bin/bash

# Check API Gateway
curl -f http://localhost:3000/health || exit 1

# Check Auth Service
curl -f http://localhost:3002/health || exit 1

# Check Payment Service
curl -f http://localhost:3005/health || exit 1

# Check Product Service
curl -f http://localhost:3003/health || exit 1

# Check Order Service
curl -f http://localhost:3004/health || exit 1

# Check Analytics Service
curl -f http://localhost:3008/health || exit 1

echo "All services are healthy"
EOF

chmod +x health-check.sh

# Add to crontab for regular checks
crontab -e
# Add: */5 * * * * /path/to/health-check.sh
```

## 🔄 Deployment Scripts

### 1. Automated Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting UltraMarket deployment..."

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build all services
npm run build

# Run database migrations
npm run db:migrate

# Restart PM2 processes
pm2 reload all

# Health check
./health-check.sh

echo "✅ Deployment completed successfully!"
```

### 2. Rollback Script

```bash
#!/bin/bash
# rollback.sh

set -e

echo "🔄 Rolling back UltraMarket..."

# Get previous commit
PREVIOUS_COMMIT=$(git log --oneline -2 | tail -1 | awk '{print $1}')

# Checkout previous commit
git checkout $PREVIOUS_COMMIT

# Install dependencies
npm install

# Build all services
npm run build

# Restart PM2 processes
pm2 reload all

# Health check
./health-check.sh

echo "✅ Rollback completed successfully!"
```

## 📝 Post-Deployment Checklist

### ✅ Verification Steps

- [ ] All services are running: `pm2 status`
- [ ] Health checks are passing: `./health-check.sh`
- [ ] Database connections are working
- [ ] Redis connections are working
- [ ] Payment gateways are configured
- [ ] SSL certificates are valid
- [ ] Firewall is configured
- [ ] Logs are being generated
- [ ] Monitoring is active
- [ ] Backup system is configured

### 🔧 Maintenance Tasks

```bash
# Daily tasks
pm2 monit
./health-check.sh

# Weekly tasks
npm audit
pm2 update

# Monthly tasks
sudo apt update && sudo apt upgrade
certbot renew
```

## 🆘 Troubleshooting

### Common Issues

1. **Service not starting**
   ```bash
   pm2 logs service-name
   pm2 restart service-name
   ```

2. **Database connection issues**
   ```bash
   sudo systemctl status postgresql
   sudo systemctl restart postgresql
   ```

3. **Redis connection issues**
   ```bash
   sudo systemctl status redis-server
   sudo systemctl restart redis-server
   ```

4. **Memory issues**
   ```bash
   pm2 monit
   pm2 restart all
   ```

## 📞 Support

Agar muammolar bo'lsa:

1. **Logs tekshirish**: `pm2 logs`
2. **Health check**: `./health-check.sh`
3. **Service status**: `pm2 status`
4. **System resources**: `htop`

**UltraMarket platformasi endi production-ga chiqish uchun tayyor!** 🚀