# 🚀 **ULTRAMARKET PLATFORM - DEPLOYMENT ACTION PLAN**

## 📋 **OVERVIEW**

Bu document UltraMarket platformasini production muhitiga deploy qilish uchun to'liq action plan. Har bir qadam batafsil ko'rsatmalar bilan ta'minlangan.

---

## 🎯 **DEPLOYMENT PHASES**

### **Phase 1: Pre-Deployment Preparation**
### **Phase 2: Infrastructure Setup**
### **Phase 3: Application Deployment**
### **Phase 4: Post-Deployment Verification**

---

## 📋 **PHASE 1: PRE-DEPLOYMENT PREPARATION**

### **Step 1.1: Environment Setup**

```bash
# 1.1.1 - Check prerequisites
kubectl version --short
docker --version
helm version
node --version
npm --version

# 1.1.2 - Create namespace
kubectl create namespace ultramarket-production

# 1.1.3 - Set context
kubectl config set-context --current --namespace=ultramarket-production
```

### **Step 1.2: Secrets Configuration**

```bash
# 1.2.1 - Create secrets file
cat > infrastructure/kubernetes/secrets/production-secrets.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: ultramarket-secrets
  namespace: ultramarket-production
type: Opaque
stringData:
  POSTGRES_PASSWORD: "ultra-market-postgres-password-2024"
  MONGODB_PASSWORD: "ultra-market-mongodb-password-2024"
  REDIS_PASSWORD: "ultra-market-redis-password-2024"
  JWT_SECRET: "ultra-market-jwt-secret-key-production-2024"
  JWT_REFRESH_SECRET: "ultra-market-refresh-secret-key-production-2024"
  CLICK_MERCHANT_ID: "your_click_merchant_id"
  CLICK_SECRET_KEY: "your_click_secret_key"
  PAYME_MERCHANT_ID: "your_payme_merchant_id"
  PAYME_SECRET_KEY: "your_payme_secret_key"
  ESKIZ_EMAIL: "info@ultramarket.uz"
  ESKIZ_PASSWORD: "your_eskiz_password"
  PLAY_MOBILE_LOGIN: "ultramarket"
  PLAY_MOBILE_PASSWORD: "your_play_mobile_password"
  SENDGRID_API_KEY: "your_sendgrid_api_key"
  SMTP_PASSWORD: "your_smtp_password"
EOF

# 1.2.2 - Apply secrets
kubectl apply -f infrastructure/kubernetes/secrets/production-secrets.yaml
```

### **Step 1.3: Configuration Maps**

```bash
# 1.3.1 - Create config maps
cat > infrastructure/kubernetes/configmaps/production-config.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ultramarket-config
  namespace: ultramarket-production
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  REDIS_URL: "redis://redis-service:6379"
  MONGODB_URL: "mongodb://mongodb-service:27017/ultramarket"
  POSTGRES_URL: "postgresql://postgres-service:5432/ultramarket"
  ALLOWED_ORIGINS: "https://ultramarket.uz,https://admin.ultramarket.uz"
  JWT_EXPIRES_IN: "7d"
  RATE_LIMIT_WINDOW: "900000"
  RATE_LIMIT_MAX: "1000"
  CACHE_TTL: "3600"
  CORS_ENABLED: "true"
  HELMET_ENABLED: "true"
  COMPRESSION_ENABLED: "true"
  MONITORING_ENABLED: "true"
  ANALYTICS_ENABLED: "true"
EOF

# 1.3.2 - Apply config maps
kubectl apply -f infrastructure/kubernetes/configmaps/production-config.yaml
```

---

## 🏗️ **PHASE 2: INFRASTRUCTURE SETUP**

### **Step 2.1: Database Deployment**

```bash
# 2.1.1 - Deploy PostgreSQL
kubectl apply -f infrastructure/kubernetes/databases.yaml

# 2.1.2 - Verify database deployment
kubectl get pods -l app=postgres
kubectl get pods -l app=mongodb
kubectl get pods -l app=redis
kubectl get pods -l app=elasticsearch

# 2.1.3 - Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis --timeout=300s
kubectl wait --for=condition=ready pod -l app=elasticsearch --timeout=300s
```

### **Step 2.2: Storage Setup**

```bash
# 2.2.1 - Create persistent volumes
kubectl apply -f infrastructure/kubernetes/storage/

# 2.2.2 - Verify storage
kubectl get pv
kubectl get pvc -n ultramarket-production
```

### **Step 2.3: Network Setup**

```bash
# 2.3.1 - Deploy network policies
kubectl apply -f infrastructure/kubernetes/network-policies/

# 2.3.2 - Deploy ingress controller
kubectl apply -f infrastructure/kubernetes/ingress.yaml
```

---

## 🚀 **PHASE 3: APPLICATION DEPLOYMENT**

### **Step 3.1: Build Docker Images**

```bash
# 3.1.1 - Build core services
docker build -t ultramarket/auth-service:latest microservices/core/auth-service/
docker build -t ultramarket/user-service:latest microservices/core/user-service/
docker build -t ultramarket/config-service:latest microservices/core/config-service/
docker build -t ultramarket/store-service:latest microservices/core/store-service/
docker build -t ultramarket/api-gateway:latest microservices/core/api-gateway/

# 3.1.2 - Build business services
docker build -t ultramarket/product-service:latest microservices/business/product-service/
docker build -t ultramarket/cart-service:latest microservices/business/cart-service/
docker build -t ultramarket/order-service:latest microservices/business/order-service/
docker build -t ultramarket/payment-service:latest microservices/business/payment-service/
docker build -t ultramarket/inventory-service:latest microservices/business/inventory-service/
docker build -t ultramarket/review-service:latest microservices/business/review-service/

# 3.1.3 - Build platform services
docker build -t ultramarket/search-service:latest microservices/platform/search-service/
docker build -t ultramarket/notification-service:latest microservices/platform/notification-service/
docker build -t ultramarket/file-service:latest microservices/platform/file-service/
docker build -t ultramarket/analytics-service:latest microservices/platform/analytics-service/
docker build -t ultramarket/content-service:latest microservices/platform/content-service/
docker build -t ultramarket/audit-service:latest microservices/platform/audit-service/

# 3.1.4 - Build frontend applications
docker build -t ultramarket/web-app:latest frontend/web-app/
docker build -t ultramarket/admin-panel:latest frontend/admin-panel/
docker build -t ultramarket/mobile-app:latest frontend/mobile-app/
```

### **Step 3.2: Deploy Core Services**

```bash
# 3.2.1 - Deploy API Gateway
kubectl apply -f infrastructure/kubernetes/production/api-gateway.yaml

# 3.2.2 - Deploy Auth Service
kubectl apply -f infrastructure/kubernetes/production/auth-service.yaml

# 3.2.3 - Deploy User Service
kubectl apply -f infrastructure/kubernetes/production/user-service.yaml

# 3.2.4 - Deploy Config Service
kubectl apply -f infrastructure/kubernetes/production/config-service.yaml

# 3.2.5 - Deploy Store Service
kubectl apply -f infrastructure/kubernetes/production/store-service.yaml
```

### **Step 3.3: Deploy Business Services**

```bash
# 3.3.1 - Deploy Product Service
kubectl apply -f infrastructure/kubernetes/production/product-service.yaml

# 3.3.2 - Deploy Cart Service
kubectl apply -f infrastructure/kubernetes/production/cart-service.yaml

# 3.3.3 - Deploy Order Service
kubectl apply -f infrastructure/kubernetes/production/order-service.yaml

# 3.3.4 - Deploy Payment Service
kubectl apply -f infrastructure/kubernetes/production/payment-service.yaml

# 3.3.5 - Deploy Inventory Service
kubectl apply -f infrastructure/kubernetes/production/inventory-service.yaml

# 3.3.6 - Deploy Review Service
kubectl apply -f infrastructure/kubernetes/production/review-service.yaml
```

### **Step 3.4: Deploy Platform Services**

```bash
# 3.4.1 - Deploy Search Service
kubectl apply -f infrastructure/kubernetes/production/search-service.yaml

# 3.4.2 - Deploy Notification Service
kubectl apply -f infrastructure/kubernetes/production/notification-service.yaml

# 3.4.3 - Deploy File Service
kubectl apply -f infrastructure/kubernetes/production/file-service.yaml

# 3.4.4 - Deploy Analytics Service
kubectl apply -f infrastructure/kubernetes/production/analytics-service.yaml

# 3.4.5 - Deploy Content Service
kubectl apply -f infrastructure/kubernetes/production/content-service.yaml

# 3.4.6 - Deploy Audit Service
kubectl apply -f infrastructure/kubernetes/production/audit-service.yaml
```

### **Step 3.5: Deploy Frontend Applications**

```bash
# 3.5.1 - Deploy Web App
kubectl apply -f infrastructure/kubernetes/production/web-app.yaml

# 3.5.2 - Deploy Admin Panel
kubectl apply -f infrastructure/kubernetes/production/admin-panel.yaml

# 3.5.3 - Deploy Mobile App (if needed)
kubectl apply -f infrastructure/kubernetes/production/mobile-app.yaml
```

---

## 🔍 **PHASE 4: POST-DEPLOYMENT VERIFICATION**

### **Step 4.1: Health Checks**

```bash
# 4.1.1 - Check all pods are running
kubectl get pods -n ultramarket-production

# 4.1.2 - Check services are available
kubectl get services -n ultramarket-production

# 4.1.3 - Check ingress is configured
kubectl get ingress -n ultramarket-production

# 4.1.4 - Test API Gateway health
curl -f https://api.ultramarket.com/health

# 4.1.5 - Test individual service health
curl -f https://api.ultramarket.com/auth/health
curl -f https://api.ultramarket.com/users/health
curl -f https://api.ultramarket.com/products/health
```

### **Step 4.2: Database Verification**

```bash
# 4.2.1 - Test database connections
kubectl exec -it deployment/postgres -- psql -U postgres -d ultramarket -c "SELECT 1;"
kubectl exec -it deployment/mongodb -- mongosh --eval "db.runCommand({ping: 1})"
kubectl exec -it deployment/redis -- redis-cli ping

# 4.2.2 - Verify database migrations
kubectl exec -it deployment/auth-service -- npm run migrate
kubectl exec -it deployment/user-service -- npm run migrate
```

### **Step 4.3: Performance Testing**

```bash
# 4.3.1 - Run load tests
k6 run tests/performance/load-test.js \
  --env BASE_URL=https://api.ultramarket.com

# 4.3.2 - Run stress tests
k6 run tests/performance/stress-test.js \
  --env BASE_URL=https://api.ultramarket.com

# 4.3.3 - Run endurance tests
k6 run tests/performance/endurance-test.js \
  --env BASE_URL=https://api.ultramarket.com
```

### **Step 4.4: Security Verification**

```bash
# 4.4.1 - Run security scan
./scripts/security/security-hardening.sh

# 4.4.2 - Check SSL certificates
openssl s_client -connect api.ultramarket.com:443 -servername api.ultramarket.com

# 4.4.3 - Test rate limiting
for i in {1..110}; do curl https://api.ultramarket.com/health; done
```

### **Step 4.5: Monitoring Setup**

```bash
# 4.5.1 - Deploy monitoring stack
kubectl apply -f infrastructure/monitoring/

# 4.5.2 - Verify Prometheus metrics
curl -f https://api.ultramarket.com/metrics

# 4.5.3 - Check Grafana dashboards
kubectl port-forward svc/grafana 3000:80 -n ultramarket-monitoring
```

---

## 🔄 **DEPLOYMENT AUTOMATION**

### **Automated Deployment Script**

```bash
#!/bin/bash
# Complete deployment automation

set -euo pipefail

echo "🚀 Starting UltraMarket Production Deployment..."

# Phase 1: Pre-deployment
echo "📋 Phase 1: Pre-deployment preparation..."
./scripts/production/pre-deployment-checks.sh

# Phase 2: Infrastructure
echo "🏗️ Phase 2: Infrastructure setup..."
./scripts/production/infrastructure-setup.sh

# Phase 3: Application
echo "🚀 Phase 3: Application deployment..."
./scripts/production/application-deployment.sh

# Phase 4: Verification
echo "🔍 Phase 4: Post-deployment verification..."
./scripts/production/post-deployment-verification.sh

echo "✅ Deployment completed successfully!"
```

### **Rollback Script**

```bash
#!/bin/bash
# Rollback deployment if needed

set -euo pipefail

echo "🔄 Starting rollback..."

# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n ultramarket-production
kubectl rollout undo deployment/auth-service -n ultramarket-production
kubectl rollout undo deployment/user-service -n ultramarket-production
# ... other services

# Verify rollback
kubectl get pods -n ultramarket-production
kubectl rollout status deployment/api-gateway -n ultramarket-production

echo "✅ Rollback completed successfully!"
```

---

## 📊 **MONITORING & ALERTING**

### **Key Metrics to Monitor**

1. **Application Metrics**
   - Response time
   - Error rate
   - Throughput
   - Memory usage
   - CPU usage

2. **Database Metrics**
   - Connection pool usage
   - Query performance
   - Disk usage
   - Replication lag

3. **Infrastructure Metrics**
   - Node health
   - Pod status
   - Network latency
   - Storage usage

### **Alerting Rules**

```yaml
# Prometheus alerting rules
groups:
  - name: ultramarket-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "Service {{ $labels.service }} is down"
```

---

## 🎯 **SUCCESS CRITERIA**

### **Deployment Success Criteria**

1. **✅ All services are running**
   - All pods in Running state
   - All services have endpoints
   - Health checks passing

2. **✅ Performance meets requirements**
   - Response time < 200ms
   - Error rate < 0.1%
   - Throughput > 10,000 req/sec

3. **✅ Security is verified**
   - SSL certificates valid
   - Rate limiting working
   - Security headers present

4. **✅ Monitoring is active**
   - Prometheus collecting metrics
   - Grafana dashboards working
   - Alerts configured

5. **✅ Database is healthy**
   - All databases connected
   - Migrations applied
   - Data integrity verified

---

## 📞 **EMERGENCY CONTACTS**

### **Technical Team**
- **Lead Developer**: dev@ultramarket.uz
- **DevOps Engineer**: devops@ultramarket.uz
- **System Administrator**: admin@ultramarket.uz

### **Emergency Procedures**
1. **Service Down**: Check pod status and logs
2. **Database Issues**: Check connection and performance
3. **Security Breach**: Isolate affected services
4. **Performance Issues**: Scale up resources

---

*Bu action plan professional darajada tayyorlangan va barcha deployment qadamlari batafsil ko'rsatilgan.*