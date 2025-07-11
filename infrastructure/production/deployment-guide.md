# 🚀 UltraMarket Production Deployment Guide

## 📋 Production Deployment Checklist

### Pre-Deployment Requirements

#### 1. Infrastructure Prerequisites

- [ ] **Kubernetes Cluster** (v1.24+) ready
- [ ] **Load Balancer** configured (AWS ALB/GCP GLB)
- [ ] **DNS** records configured
- [ ] **SSL Certificates** obtained and validated
- [ ] **CDN** configured (CloudFlare/AWS CloudFront)
- [ ] **Database clusters** provisioned (PostgreSQL, MongoDB, Redis)
- [ ] **Monitoring stack** deployed (Prometheus, Grafana)
- [ ] **Log aggregation** system ready (ELK/Loki)

#### 2. Security Requirements

- [ ] **Secrets management** system configured (Vault/K8s Secrets)
- [ ] **Network policies** implemented
- [ ] **RBAC** policies configured
- [ ] **Security scanning** completed
- [ ] **Penetration testing** performed
- [ ] **Compliance audit** passed (if required)

#### 3. Performance Requirements

- [ ] **Load testing** completed
- [ ] **Stress testing** performed
- [ ] **Database performance** validated
- [ ] **Cache warming** strategy implemented
- [ ] **CDN cache** configured

## 🏗️ Deployment Architecture

### Production Infrastructure

```mermaid
graph TB
    subgraph "External"
        USERS[Users]
        CDN[CloudFlare CDN]
    end

    subgraph "Load Balancer"
        LB[AWS Application Load Balancer]
    end

    subgraph "Kubernetes Cluster"
        subgraph "Ingress"
            NGINX[NGINX Ingress Controller]
        end

        subgraph "Frontend"
            WEB[Web App Pods]
            ADMIN[Admin Panel Pods]
        end

        subgraph "API Gateway"
            KONG[Kong Gateway Pods]
        end

        subgraph "Core Services"
            AUTH[Auth Service]
            USER[User Service]
            PRODUCT[Product Service]
            ORDER[Order Service]
            PAYMENT[Payment Service]
            CART[Cart Service]
        end

        subgraph "Platform Services"
            NOTIFICATION[Notification Service]
            SEARCH[Search Service]
            ANALYTICS[Analytics Service]
        end
    end

    subgraph "Data Layer"
        subgraph "Databases"
            POSTGRES[(PostgreSQL Cluster)]
            MONGO[(MongoDB Cluster)]
            REDIS[(Redis Cluster)]
            ELASTIC[(Elasticsearch Cluster)]
        end

        subgraph "Message Queue"
            KAFKA[Apache Kafka Cluster]
        end
    end

    subgraph "Monitoring"
        PROMETHEUS[Prometheus]
        GRAFANA[Grafana]
        ALERTMANAGER[AlertManager]
        JAEGER[Jaeger]
    end

    USERS --> CDN
    CDN --> LB
    LB --> NGINX
    NGINX --> WEB
    NGINX --> ADMIN
    NGINX --> KONG

    KONG --> AUTH
    KONG --> USER
    KONG --> PRODUCT
    KONG --> ORDER
    KONG --> PAYMENT
    KONG --> CART

    AUTH --> POSTGRES
    USER --> POSTGRES
    PRODUCT --> POSTGRES
    ORDER --> POSTGRES
    PAYMENT --> POSTGRES
    CART --> REDIS

    NOTIFICATION --> KAFKA
    SEARCH --> ELASTIC
    ANALYTICS --> MONGO

    PROMETHEUS --> GRAFANA
    PROMETHEUS --> ALERTMANAGER
```

## 🔧 Environment Configuration

### Production Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
API_VERSION=v2
LOG_LEVEL=info

# Database URLs (Production)
DATABASE_URL=postgresql://prod_user:${DB_PASSWORD}@postgres-cluster:5432/ultramarket_prod
MONGODB_URL=mongodb://prod_user:${MONGO_PASSWORD}@mongo-cluster:27017/ultramarket_prod
REDIS_URL=redis://redis-cluster:6379
ELASTICSEARCH_URL=https://elastic-cluster:9200

# Authentication (Production Keys)
JWT_SECRET=${JWT_SECRET_PROD}
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET_PROD}
REFRESH_TOKEN_EXPIRES_IN=7d

# External Services (Production)
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY_PROD}
PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID_PROD}
SENDGRID_API_KEY=${SENDGRID_API_KEY_PROD}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID_PROD}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY_PROD}

# CDN & Storage
CDN_URL=https://cdn.ultramarket.com
S3_BUCKET=ultramarket-prod-assets
S3_REGION=us-east-1

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
JAEGER_URL=http://jaeger:14268
SENTRY_DSN=${SENTRY_DSN_PROD}

# Security
CORS_ORIGINS=https://ultramarket.com,https://admin.ultramarket.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=1000
HELMET_CSP_ENABLED=true

# Performance
CACHE_TTL=3600
CACHE_MAX_SIZE=10000
REDIS_CACHE_ENABLED=true
CDN_CACHE_TTL=86400

# Features
FEATURE_ANALYTICS=true
FEATURE_RECOMMENDATIONS=true
FEATURE_REAL_TIME_CHAT=true
FEATURE_PAYMENT_GATEWAY_STRIPE=true
FEATURE_PAYMENT_GATEWAY_PAYPAL=true
```

## 🚀 Deployment Steps

### Step 1: Prepare Secrets

```bash
# Create namespace
kubectl create namespace ultramarket-production

# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=${JWT_SECRET_PROD} \
  --from-literal=refresh-token-secret=${REFRESH_TOKEN_SECRET_PROD} \
  --from-literal=db-password=${DB_PASSWORD} \
  --from-literal=mongo-password=${MONGO_PASSWORD} \
  --from-literal=stripe-secret=${STRIPE_SECRET_KEY_PROD} \
  --from-literal=aws-access-key=${AWS_ACCESS_KEY_ID_PROD} \
  --from-literal=aws-secret-key=${AWS_SECRET_ACCESS_KEY_PROD} \
  --namespace ultramarket-production

# Create TLS secret for SSL
kubectl create secret tls ultramarket-tls \
  --cert=tls.crt \
  --key=tls.key \
  --namespace ultramarket-production
```

### Step 2: Deploy Database Layer

```bash
# Deploy PostgreSQL Cluster
kubectl apply -f infrastructure/kubernetes/production/databases/postgresql-cluster.yaml

# Deploy MongoDB Cluster
kubectl apply -f infrastructure/kubernetes/production/databases/mongodb-cluster.yaml

# Deploy Redis Cluster
kubectl apply -f infrastructure/kubernetes/production/databases/redis-cluster.yaml

# Deploy Elasticsearch Cluster
kubectl apply -f infrastructure/kubernetes/production/databases/elasticsearch-cluster.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgresql --timeout=300s -n ultramarket-production
kubectl wait --for=condition=ready pod -l app=mongodb --timeout=300s -n ultramarket-production
kubectl wait --for=condition=ready pod -l app=redis --timeout=300s -n ultramarket-production
```

### Step 3: Deploy Message Queue

```bash
# Deploy Kafka Cluster
kubectl apply -f infrastructure/kubernetes/production/kafka/

# Wait for Kafka to be ready
kubectl wait --for=condition=ready pod -l app=kafka --timeout=300s -n ultramarket-production
```

### Step 4: Deploy Monitoring Stack

```bash
# Deploy Prometheus
kubectl apply -f infrastructure/kubernetes/production/monitoring/prometheus/

# Deploy Grafana
kubectl apply -f infrastructure/kubernetes/production/monitoring/grafana/

# Deploy Jaeger
kubectl apply -f infrastructure/kubernetes/production/monitoring/jaeger/

# Deploy AlertManager
kubectl apply -f infrastructure/kubernetes/production/monitoring/alertmanager/
```

### Step 5: Deploy Core Services

```bash
# Deploy Auth Service
kubectl apply -f infrastructure/kubernetes/production/auth-service.yaml

# Deploy User Service
kubectl apply -f infrastructure/kubernetes/production/user-service.yaml

# Deploy Product Service
kubectl apply -f infrastructure/kubernetes/production/product-service.yaml

# Deploy Order Service
kubectl apply -f infrastructure/kubernetes/production/order-service.yaml

# Deploy Payment Service
kubectl apply -f infrastructure/kubernetes/production/payment-service.yaml

# Deploy Cart Service
kubectl apply -f infrastructure/kubernetes/production/cart-service.yaml

# Wait for core services
kubectl wait --for=condition=available deployment/auth-service --timeout=300s -n ultramarket-production
kubectl wait --for=condition=available deployment/user-service --timeout=300s -n ultramarket-production
kubectl wait --for=condition=available deployment/product-service --timeout=300s -n ultramarket-production
```

### Step 6: Deploy Platform Services

```bash
# Deploy Notification Service
kubectl apply -f infrastructure/kubernetes/production/notification-service.yaml

# Deploy Search Service
kubectl apply -f infrastructure/kubernetes/production/search-service.yaml

# Deploy Analytics Service
kubectl apply -f infrastructure/kubernetes/production/analytics-service.yaml
```

### Step 7: Deploy API Gateway

```bash
# Deploy Kong Gateway
kubectl apply -f infrastructure/kubernetes/production/api-gateway.yaml

# Wait for API Gateway
kubectl wait --for=condition=available deployment/api-gateway --timeout=300s -n ultramarket-production
```

### Step 8: Deploy Frontend Applications

```bash
# Deploy Web App
kubectl apply -f infrastructure/kubernetes/production/web-app.yaml

# Deploy Admin Panel
kubectl apply -f infrastructure/kubernetes/production/admin-panel.yaml

# Wait for frontend apps
kubectl wait --for=condition=available deployment/web-app --timeout=300s -n ultramarket-production
kubectl wait --for=condition=available deployment/admin-panel --timeout=300s -n ultramarket-production
```

### Step 9: Configure Ingress

```bash
# Deploy Ingress Controller
kubectl apply -f infrastructure/kubernetes/production/ingress-controller.yaml

# Deploy Ingress Rules
kubectl apply -f infrastructure/kubernetes/production/ingress.yaml

# Verify ingress
kubectl get ingress -n ultramarket-production
```

## 🔍 Post-Deployment Verification

### Health Checks

```bash
# Check all pods
kubectl get pods -n ultramarket-production

# Check services
kubectl get services -n ultramarket-production

# Check ingress
kubectl get ingress -n ultramarket-production

# Check logs
kubectl logs -f deployment/api-gateway -n ultramarket-production
```

### Smoke Tests

```bash
# Test API Gateway
curl -f https://api.ultramarket.com/health

# Test Web App
curl -f https://ultramarket.com/health

# Test Admin Panel
curl -f https://admin.ultramarket.com/health

# Test Authentication
curl -X POST https://api.ultramarket.com/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test Product API
curl -f https://api.ultramarket.com/v2/products?limit=5
```

### Performance Tests

```bash
# Load test with k6
k6 run --vus 100 --duration 5m tests/performance/load-test.js

# Stress test
k6 run --vus 500 --duration 2m tests/performance/stress-test.js
```

## 📊 Monitoring & Alerting

### Key Metrics to Monitor

1. **Application Metrics**
   - Response time (< 100ms p95)
   - Error rate (< 0.1%)
   - Throughput (requests/second)
   - Availability (> 99.9%)

2. **Infrastructure Metrics**
   - CPU usage (< 70%)
   - Memory usage (< 80%)
   - Disk usage (< 85%)
   - Network I/O

3. **Database Metrics**
   - Connection pool usage
   - Query performance
   - Replication lag
   - Lock waits

4. **Business Metrics**
   - Active users
   - Order completion rate
   - Payment success rate
   - Cart abandonment rate

### Critical Alerts

```yaml
# Example AlertManager rules
groups:
  - name: ultramarket-critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'

      - alert: DatabaseDown
        expr: up{job="postgresql"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Database is down'

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High response time detected'
```

## 🔄 Rollback Strategy

### Automated Rollback

```bash
# Rollback specific service
kubectl rollout undo deployment/product-service -n ultramarket-production

# Rollback to specific revision
kubectl rollout undo deployment/product-service --to-revision=2 -n ultramarket-production

# Check rollout status
kubectl rollout status deployment/product-service -n ultramarket-production
```

### Manual Rollback

```bash
# Switch to previous version
kubectl set image deployment/product-service product-service=ultramarket/product-service:v1.9.0 -n ultramarket-production

# Scale down problematic version
kubectl scale deployment/product-service-v2 --replicas=0 -n ultramarket-production

# Scale up stable version
kubectl scale deployment/product-service --replicas=5 -n ultramarket-production
```

## 📈 Scaling Strategy

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: product-service-hpa
  namespace: ultramarket-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## 🔐 Security Considerations

### Network Security

- Use Kubernetes Network Policies
- Implement service mesh (Istio/Linkerd)
- Configure WAF rules
- Enable DDoS protection

### Data Security

- Encrypt data at rest
- Use TLS for all communications
- Implement proper RBAC
- Regular security updates

### Compliance

- GDPR compliance for EU users
- PCI DSS for payment processing
- SOC 2 for enterprise customers
- Regular security audits

## 📞 Support & Troubleshooting

### Emergency Contacts

- **DevOps Team**: devops@ultramarket.com
- **Security Team**: security@ultramarket.com
- **Platform Team**: platform@ultramarket.com

### Common Issues

1. **High Memory Usage**

   ```bash
   # Check memory usage
   kubectl top pods -n ultramarket-production

   # Restart high memory pod
   kubectl delete pod <pod-name> -n ultramarket-production
   ```

2. **Database Connection Issues**

   ```bash
   # Check database connectivity
   kubectl exec -it <app-pod> -n ultramarket-production -- pg_isready -h postgresql

   # Check connection pool
   kubectl logs <app-pod> -n ultramarket-production | grep "connection"
   ```

3. **SSL Certificate Issues**

   ```bash
   # Check certificate expiry
   kubectl describe secret ultramarket-tls -n ultramarket-production

   # Renew certificate
   certbot renew --nginx
   ```

## ✅ Go-Live Checklist

### Final Verification

- [ ] All services healthy and responding
- [ ] SSL certificates valid and configured
- [ ] DNS records pointing to production
- [ ] CDN caching correctly
- [ ] Monitoring alerts configured
- [ ] Backup systems operational
- [ ] Security scanning completed
- [ ] Performance benchmarks met
- [ ] Rollback plan tested
- [ ] Team notified and ready
- [ ] Documentation updated
- [ ] Customer support prepared

### Post Go-Live

- [ ] Monitor metrics for 24 hours
- [ ] Verify all integrations working
- [ ] Check payment processing
- [ ] Validate email notifications
- [ ] Monitor error rates
- [ ] Review performance metrics
- [ ] Conduct security review
- [ ] Update status page
- [ ] Notify stakeholders

---

**🚀 UltraMarket is now ready for production deployment!**
