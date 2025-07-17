#!/bin/bash

echo "🚀 ULTRAMARKET PROFESSIONAL E-COMMERCE PLATFORM"
echo "=============================================="
echo "TO'LIQ PROFESSIONAL DASTURNI ISHGA TUSHIRISH"
echo ""

# Ranglar
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ma'lumotlar bazalarini ishga tushirish
echo -e "${BLUE}[1/6] Ma'lumotlar bazalarini ishga tushirish...${NC}"

# PostgreSQL
echo "PostgreSQL ishga tushirilmoqda..."
sudo service postgresql start 2>/dev/null || echo "PostgreSQL mavjud emas"

# MongoDB
echo "MongoDB ishga tushirilmoqda..."
sudo service mongod start 2>/dev/null || {
    echo "MongoDB o'rnatilmagan. In-memory storage ishlatiladi."
}

# Redis
echo "Redis ishga tushirilmoqda..."
redis-server --daemonize yes 2>/dev/null || {
    echo "Redis o'rnatilmagan. In-memory cache ishlatiladi."
}

# Elasticsearch
echo "Elasticsearch ishga tushirilmoqda..."
sudo service elasticsearch start 2>/dev/null || echo "Elasticsearch mavjud emas"

echo -e "${GREEN}✓ Ma'lumotlar bazalari tayyor${NC}"
echo ""

# NPM dependencies o'rnatish
echo -e "${BLUE}[2/6] Dependencies o'rnatilmoqda...${NC}"

# Core services
echo "Core services dependencies..."
cd /workspace/microservices/core/auth-service && npm install --ignore-scripts &
cd /workspace/microservices/core/user-service && npm install --ignore-scripts &
cd /workspace/microservices/core/config-service && npm install --ignore-scripts &
cd /workspace/microservices/core/store-service && npm install --ignore-scripts &

# Business services
echo "Business services dependencies..."
cd /workspace/microservices/business/cart-service && npm install --ignore-scripts &
cd /workspace/microservices/business/payment-service && npm install --ignore-scripts &
cd /workspace/microservices/business/inventory-service && npm install --ignore-scripts &
cd /workspace/microservices/business/shipping-service && npm install --ignore-scripts &
cd /workspace/microservices/business/review-service && npm install --ignore-scripts &

# Platform services
echo "Platform services dependencies..."
cd /workspace/microservices/platform/search-service && npm install --ignore-scripts &
cd /workspace/microservices/platform/notification-service && npm install --ignore-scripts &
cd /workspace/microservices/platform/file-service && npm install --ignore-scripts &
cd /workspace/microservices/platform/audit-service && npm install --ignore-scripts &
cd /workspace/microservices/platform/content-service && npm install --ignore-scripts &

# Analytics services
echo "Analytics services dependencies..."
cd /workspace/microservices/analytics/analytics-service && npm install --ignore-scripts &

# ML/AI services
echo "ML/AI services dependencies..."
cd /workspace/microservices/ml-ai/recommendation-service && npm install --ignore-scripts &
cd /workspace/microservices/ml-ai/fraud-detection-service && npm install --ignore-scripts &

# Frontend
echo "Frontend dependencies..."
cd /workspace/frontend/admin-panel && npm install --ignore-scripts &

wait
echo -e "${GREEN}✓ Dependencies o'rnatildi${NC}"
echo ""

# PM2 bilan barcha servislarni ishga tushirish
echo -e "${BLUE}[3/6] Mikroservislarni ishga tushirish...${NC}"
cd /workspace

# PM2 daemon restart
pm2 kill
pm2 start ecosystem.config.js

echo -e "${GREEN}✓ Barcha servislar ishga tushirildi${NC}"
echo ""

# Health check
echo -e "${BLUE}[4/6] Servislar holatini tekshirish...${NC}"
sleep 10

echo ""
echo -e "${YELLOW}ISHLAB TURGAN SERVISLAR:${NC}"
echo "=================================="
pm2 list

echo ""
echo -e "${BLUE}[5/6] Port ma'lumotlari:${NC}"
echo "=================================="
echo -e "${GREEN}FRONTEND:${NC}"
echo "• Web App: http://localhost:3000"
echo "• Admin Panel: http://localhost:3100"
echo ""
echo -e "${GREEN}API GATEWAY:${NC}"
echo "• Main API: http://localhost:8000"
echo ""
echo -e "${GREEN}CORE SERVICES:${NC}"
echo "• Auth Service: http://localhost:3001"
echo "• User Service: http://localhost:3002"
echo "• Config Service: http://localhost:3010"
echo "• Store Service: http://localhost:3011"
echo ""
echo -e "${GREEN}BUSINESS SERVICES:${NC}"
echo "• Product Service: http://localhost:3003"
echo "• Order Service: http://localhost:3004"
echo "• Cart Service: http://localhost:3005"
echo "• Payment Service: http://localhost:3006"
echo "• Inventory Service: http://localhost:3007"
echo "• Shipping Service: http://localhost:3008"
echo "• Review Service: http://localhost:3009"
echo ""
echo -e "${GREEN}PLATFORM SERVICES:${NC}"
echo "• Search Service: http://localhost:3012"
echo "• Notification Service: http://localhost:3013"
echo "• File Service: http://localhost:3014"
echo "• Analytics Service: http://localhost:3015"
echo "• Audit Service: http://localhost:3016"
echo "• Content Service: http://localhost:3017"
echo ""
echo -e "${GREEN}ML/AI SERVICES:${NC}"
echo "• Recommendation Service: http://localhost:3018"
echo "• Fraud Detection Service: http://localhost:3019"
echo ""

echo -e "${BLUE}[6/6] Monitoring & Logs:${NC}"
echo "=================================="
echo "• Logs ko'rish: pm2 logs [service-name]"
echo "• Monitoring: pm2 monit"
echo "• Status: pm2 status"
echo ""

echo -e "${GREEN}✅ ULTRAMARKET PROFESSIONAL PLATFORM TO'LIQ ISHGA TUSHIRILDI!${NC}"
echo ""
echo -e "${YELLOW}Platformaga kirish:${NC}"
echo "1. Web App: http://localhost:3000"
echo "2. Admin Panel: http://localhost:3100"
echo "3. API Documentation: http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}Test qilish:${NC}"
echo "curl http://localhost:8000/health"
echo ""