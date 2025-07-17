# UltraMarket Product Service - Deployment Guide

Professional deployment guide for the UltraMarket Product Service microservice.

## 🚀 Quick Start

### Development Environment

```bash
# Clone repository
git clone <repository-url>
cd ultramarket/microservices/business/product-service

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start with Docker Compose
docker-compose up --build
```

### Production Environment

```bash
# Build production image
docker build -f Dockerfile -t ultramarket/product-service:latest .

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │  Product Service │    │    Database     │
│     (Nginx)     │───▶│    (Node.js)    │───▶│   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │      Cache      │
                       │    (Redis)      │
                       └─────────────────┘
```

## 📋 Prerequisites

### System Requirements

- **OS**: Linux Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+
- **CPU**: Minimum 2 cores (4+ recommended for production)
- **RAM**: Minimum 4GB (8GB+ recommended for production)
- **Storage**: Minimum 20GB free space
- **Network**: Stable internet connection

### Software Dependencies

- **Node.js**: Version 18.x or higher
- **Docker**: Version 20.10+ (with Docker Compose v2)
- **MongoDB**: Version 5.0+ (if not using Docker)
- **Redis**: Version 6.0+ (if not using Docker)

## 🔧 Installation Steps

### 1. Environment Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Application Setup

```bash
# Clone the repository
git clone <your-repository-url>
cd ultramarket/microservices/business/product-service

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### 3. Configuration

#### Development Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### Production Configuration

```bash
# Create production environment file
cp .env.example .env.production

# Set production variables
export NODE_ENV=production
export JWT_SECRET="your-super-secret-jwt-key"
export MONGODB_URI="mongodb://username:password@host:port/database"
export REDIS_PASSWORD="your-redis-password"
```

### 4. Database Setup

#### Using Docker (Recommended)

```bash
# Start MongoDB and Redis
docker-compose up -d mongodb redis

# Wait for services to be ready
docker-compose logs -f mongodb
```

#### Manual Installation

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Redis
sudo apt install redis-server

# Start services
sudo systemctl start mongod redis-server
sudo systemctl enable mongod redis-server
```

## 🐳 Docker Deployment

### Development Deployment

```bash
# Start all services
docker-compose up --build

# Start specific service
docker-compose up product-service

# View logs
docker-compose logs -f product-service

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Create production environment
cp .env.example .env.production

# Set production variables in .env.production
# JWT_SECRET, MONGODB_URI, REDIS_PASSWORD, etc.

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Scale service instances
docker-compose -f docker-compose.prod.yml up -d --scale product-service=3

# Monitor deployment
docker-compose -f docker-compose.prod.yml logs -f
```

## ☁️ Cloud Deployment

### AWS ECS Deployment

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t ultramarket/product-service .
docker tag ultramarket/product-service:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/ultramarket-product-service:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/ultramarket-product-service:latest

# Deploy to ECS
aws ecs update-service --cluster ultramarket --service product-service --force-new-deployment
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-service
  template:
    metadata:
      labels:
        app: product-service
    spec:
      containers:
      - name: product-service
        image: ultramarket/product-service:latest
        ports:
        - containerPort: 3003
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: product-secrets
              key: mongodb-uri
```

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/
kubectl get pods -l app=product-service
```

## 🔍 Health Checks & Monitoring

### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3003/health

# Detailed health status
curl http://localhost:3003/health | jq

# Readiness check
curl http://localhost:3003/ready
```

### Monitoring Setup

#### Prometheus Metrics

```bash
# Access Prometheus dashboard
open http://localhost:9090

# View metrics
curl http://localhost:3003/metrics
```

#### Grafana Dashboard

```bash
# Access Grafana
open http://localhost:3000
# Login: admin / admin123

# Import product service dashboard
# Dashboard ID: 12345
```

#### Log Monitoring

```bash
# View application logs
docker-compose logs -f product-service

# Access Kibana
open http://localhost:5601

# View aggregated logs
tail -f logs/product-service.log
```

## 🔐 Security Configuration

### SSL/TLS Setup

```bash
# Generate SSL certificates (Let's Encrypt)
sudo certbot --nginx -d api.ultramarket.com

# Or use existing certificates
cp /path/to/certificate.crt ./config/ssl/
cp /path/to/private.key ./config/ssl/
```

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 3003/tcp   # Product Service
sudo ufw enable
```

### Security Headers

```nginx
# nginx.conf
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose logs product-service

# Check port conflicts
sudo netstat -tulpn | grep :3003

# Restart services
docker-compose restart product-service
```

#### Database Connection Issues

```bash
# Test MongoDB connection
docker-compose exec mongodb mongo --eval "db.adminCommand('ping')"

# Check MongoDB logs
docker-compose logs mongodb

# Reset database
docker-compose down -v
docker-compose up -d
```

#### Memory Issues

```bash
# Check memory usage
docker stats

# Increase memory limits
# Edit docker-compose.yml
services:
  product-service:
    deploy:
      resources:
        limits:
          memory: 1G
```

#### Performance Issues

```bash
# Check CPU usage
top -p $(pgrep node)

# Profile application
npm install -g clinic
clinic doctor -- node dist/index.js

# Optimize database
# Add proper indexes
# Enable query profiling
```

### Debug Mode

```bash
# Start in debug mode
NODE_ENV=development DEBUG=* npm run dev

# Enable verbose logging
LOG_LEVEL=debug npm start

# Debug with Chrome DevTools
node --inspect dist/index.js
```

## 📊 Performance Tuning

### Application Optimization

```javascript
// Enable cluster mode
NODE_ENV=production CLUSTER_MODE=true npm start

// Optimize garbage collection
node --max-old-space-size=512 --optimize-for-size dist/index.js
```

### Database Optimization

```javascript
// MongoDB indexes
db.products.createIndex({ "name": "text", "description": "text" })
db.products.createIndex({ "category": 1, "status": 1 })
db.products.createIndex({ "sku": 1 }, { unique: true })
db.categories.createIndex({ "slug": 1 }, { unique: true })
```

### Cache Optimization

```javascript
// Redis configuration
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## 🔄 Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --host localhost:27017 --db ultramarket-products --out /backups/mongodb_$DATE
tar -czf /backups/mongodb_$DATE.tar.gz /backups/mongodb_$DATE
rm -rf /backups/mongodb_$DATE

# Setup cron job
0 2 * * * /path/to/backup.sh
```

### Redis Backup

```bash
# Redis backup
redis-cli --rdb /backups/redis_$(date +%Y%m%d).rdb

# Automated Redis backup
echo "BGSAVE" | redis-cli
```

### Application Recovery

```bash
# Restore from backup
mongorestore --host localhost:27017 --db ultramarket-products /backups/mongodb_latest/

# Restart services
docker-compose restart

# Verify data integrity
curl http://localhost:3003/health
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale with Docker Compose
docker-compose up -d --scale product-service=3

# Load balancer configuration
upstream product_service {
    server product-service-1:3003;
    server product-service-2:3003;
    server product-service-3:3003;
}
```

### Vertical Scaling

```yaml
# Increase resources
services:
  product-service:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

## 📝 Maintenance

### Regular Tasks

```bash
# Weekly maintenance script
#!/bin/bash

# Update dependencies
npm audit fix

# Clean up old logs
find ./logs -name "*.log" -mtime +7 -delete

# Database maintenance
mongo ultramarket-products --eval "db.runCommand({compact: 'products'})"

# Cache cleanup
redis-cli FLUSHDB

# Restart services
docker-compose restart
```

### Updates & Patches

```bash
# Update application
git pull origin main
npm install
npm run build
docker-compose build --no-cache
docker-compose up -d
```

## 🆘 Emergency Procedures

### Service Outage

```bash
# Emergency restart
docker-compose down
docker-compose up -d

# Health check
curl http://localhost:3003/health

# Rollback if needed
docker-compose down
docker-compose up -d --build <previous-version>
```

### Data Loss Prevention

```bash
# Immediate backup
mongodump --host localhost:27017 --db ultramarket-products --out /emergency-backup/

# Verify backup
mongorestore --dry-run /emergency-backup/
```

## 📞 Support

### Documentation
- [API Documentation](./API.md)
- [Development Guide](./README.md)
- [Architecture Guide](./ARCHITECTURE.md)

### Monitoring Dashboards
- **Application**: http://localhost:3003/health
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
- **Kibana**: http://localhost:5601

### Emergency Contacts
- **DevOps Team**: devops@ultramarket.com
- **Backend Team**: backend@ultramarket.com
- **On-call Engineer**: +1-555-0123

---

**Note**: This deployment guide covers enterprise-level deployment scenarios. Adjust configurations based on your specific infrastructure requirements.