#!/bin/bash

echo "Installing dependencies for all services..."

# Core services
cd /workspace/microservices/core/api-gateway/api-gateway && npm install &
cd /workspace/microservices/core/config-service/config-service && npm install &
cd /workspace/microservices/core/store-service/store-service && npm install &

# Business services  
cd /workspace/microservices/business/payment-service/payment-service && npm install &
cd /workspace/microservices/business/inventory-service/inventory-service && npm install &
cd /workspace/microservices/business/shipping-service/shipping-service && npm install &
cd /workspace/microservices/business/review-service/review-service && npm install &

# Platform services
cd /workspace/microservices/platform/search-service/search-service && npm install &
cd /workspace/microservices/platform/notification-service/notification-service && npm install &
cd /workspace/microservices/platform/file-service/file-service && npm install &
cd /workspace/microservices/platform/audit-service/audit-service && npm install &
cd /workspace/microservices/platform/content-service/content-service && npm install &

# ML/AI services
cd /workspace/microservices/ml-ai/recommendation-service/recommendation-service && npm install &
cd /workspace/microservices/ml-ai/fraud-detection-service/fraud-detection-service && npm install &

# Frontend
cd /workspace/frontend/admin-panel && npm install &

wait
echo "All dependencies installed!"