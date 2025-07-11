# 🚀 UltraMarket Production Deployment Guide

## 📋 Overview

Bu guide UltraMarket e-commerce platformasini production muhitiga deploy qilish uchun to'liq yo'riqnoma.

## 🔧 Prerequisites

### System Requirements

- **Kubernetes Cluster**: v1.24+
- **Docker**: v20.10+
- **Helm**: v3.8+
- **kubectl**: v1.24+
- **Node.js**: v18+
- **PostgreSQL**: v15+
- **MongoDB**: v6.0+
- **Redis**: v7.0+

### Infrastructure Requirements

- **CPU**: 16+ cores
- **Memory**: 32+ GB RAM
- **Storage**: 500+ GB SSD
- **Network**: 1Gbps+ bandwidth

## 🏗️ Pre-Deployment Checklist

### ✅ Code Quality

- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage > 80%
- [ ] ESLint issues resolved
- [ ] TypeScript compilation successful
- [ ] Security scan passed

### ✅ Configuration

- [ ] Environment variables configured
- [ ] Database schemas migrated
- [ ] SSL certificates ready
- [ ] DNS records configured
- [ ] CDN configured

### ✅ Monitoring

- [ ] Prometheus configured
- [ ] Grafana dashboards ready
- [ ] AlertManager configured
- [ ] Log aggregation setup
- [ ] Health checks implemented

### ✅ Security

- [ ] Secrets management configured
- [ ] RBAC policies applied
- [ ] Network policies configured
- [ ] Security scanning completed
- [ ] Vulnerability assessment done

## 🚀 Deployment Steps

### 1. Environment Setup

```bash
# Create namespace
kubectl create namespace ultramarket-production

# Apply secrets
kubectl apply -f infrastructure/kubernetes/secrets/

# Configure environment variables
kubectl apply -f infrastructure/kubernetes/configmaps/
```

### 2. Database Deployment

```bash
# Deploy PostgreSQL
helm install postgresql bitnami/postgresql \
  --namespace ultramarket-production \
  --set auth.postgresPassword=<POSTGRES_PASSWORD> \
  --set primary.persistence.size=100Gi

# Deploy MongoDB
helm install mongodb bitnami/mongodb \
  --namespace ultramarket-production \
  --set auth.rootPassword=<MONGODB_PASSWORD> \
  --set persistence.size=100Gi

# Deploy Redis
helm install redis bitnami/redis \
  --namespace ultramarket-production \
  --set auth.password=<REDIS_PASSWORD> \
  --set master.persistence.size=20Gi
```

### 3. Application Deployment

```bash
# Deploy microservices
kubectl apply -f infrastructure/kubernetes/production/

# Verify deployments
kubectl get pods -n ultramarket-production
kubectl get services -n ultramarket-production
```

### 4. Monitoring Stack

```bash
# Deploy Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace ultramarket-monitoring \
  --create-namespace \
  --values infrastructure/monitoring/prometheus-values.yaml

# Deploy Grafana dashboards
kubectl apply -f infrastructure/monitoring/grafana/dashboards/
```

### 5. Ingress Configuration

```bash
# Deploy ingress controller
kubectl apply -f infrastructure/kubernetes/ingress.yaml

# Configure SSL certificates
kubectl apply -f infrastructure/kubernetes/certificates/
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Production Deployment
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.24.0'

      - name: Deploy to Production
        run: |
          kubectl apply -f infrastructure/kubernetes/production/
          kubectl rollout status deployment/api-gateway -n ultramarket-production
```

### Deployment Strategy

1. **Blue-Green Deployment**
   - Zero-downtime deployment
   - Quick rollback capability
   - Traffic switching

2. **Rolling Updates**
   - Gradual service updates
   - Health checks during deployment
   - Automatic rollback on failure

## 📊 Post-Deployment Verification

### 1. Health Checks

```bash
# Check service health
curl -f https://api.ultramarket.com/health

# Check individual services
kubectl get pods -n ultramarket-production
kubectl logs -f deployment/api-gateway -n ultramarket-production
```

### 2. Performance Testing

```bash
# Run load tests
k6 run tests/performance/load-test.js \
  --env BASE_URL=https://api.ultramarket.com

# Run stress tests
k6 run tests/performance/stress-test.js \
  --env BASE_URL=https://api.ultramarket.com
```

### 3. Monitoring Verification

- [ ] Prometheus metrics collecting
- [ ] Grafana dashboards displaying data
- [ ] Alerts configured and working
- [ ] Log aggregation functioning

## 🔧 Configuration Management

### Environment Variables

```yaml
# production-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ultramarket-config
  namespace: ultramarket-production
data:
  NODE_ENV: 'production'
  DATABASE_URL: 'postgresql://user:pass@postgres:5432/ultramarket'
  MONGODB_URI: 'mongodb://user:pass@mongodb:27017/ultramarket'
  REDIS_URL: 'redis://user:pass@redis:6379'
  JWT_SECRET: 'your-jwt-secret'
  API_VERSION: 'v1'
```

### Secrets Management

```yaml
# production-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ultramarket-secrets
  namespace: ultramarket-production
type: Opaque
data:
  database-password: <base64-encoded-password>
  mongodb-password: <base64-encoded-password>
  redis-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-secret>
```

## 🔒 Security Configuration

### 1. Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ultramarket-network-policy
  namespace: ultramarket-production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ultramarket-production
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: ultramarket-production
```

### 2. RBAC Configuration

```yaml
# rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: ultramarket-production
  name: ultramarket-role
rules:
  - apiGroups: ['']
    resources: ['pods', 'services', 'configmaps']
    verbs: ['get', 'list', 'watch']
```

## 📈 Scaling Configuration

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: ultramarket-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## 🚨 Disaster Recovery

### 1. Backup Strategy

```bash
# Database backup
kubectl exec -it postgresql-0 -n ultramarket-production -- \
  pg_dump -h localhost -U postgres ultramarket > backup.sql

# MongoDB backup
kubectl exec -it mongodb-0 -n ultramarket-production -- \
  mongodump --host localhost --db ultramarket --out /backup/
```

### 2. Rollback Procedures

```bash
# Rollback deployment
kubectl rollout undo deployment/api-gateway -n ultramarket-production

# Rollback to specific revision
kubectl rollout undo deployment/api-gateway --to-revision=2 -n ultramarket-production
```

## 📊 Performance Optimization

### 1. Resource Limits

```yaml
# resource-limits.yaml
resources:
  requests:
    memory: '512Mi'
    cpu: '250m'
  limits:
    memory: '1Gi'
    cpu: '500m'
```

### 2. Caching Strategy

- **Redis**: Session storage, API caching
- **CDN**: Static asset caching
- **Database**: Query result caching
- **Application**: In-memory caching

## 🔍 Troubleshooting

### Common Issues

1. **Pod Startup Failures**

   ```bash
   kubectl describe pod <pod-name> -n ultramarket-production
   kubectl logs <pod-name> -n ultramarket-production
   ```

2. **Service Discovery Issues**

   ```bash
   kubectl get endpoints -n ultramarket-production
   kubectl get services -n ultramarket-production
   ```

3. **Database Connection Issues**
   ```bash
   kubectl exec -it <pod-name> -n ultramarket-production -- \
     telnet postgres 5432
   ```

### Debug Commands

```bash
# Check cluster status
kubectl cluster-info

# Check node status
kubectl get nodes

# Check resource usage
kubectl top pods -n ultramarket-production
kubectl top nodes

# Check events
kubectl get events -n ultramarket-production --sort-by=.metadata.creationTimestamp
```

## 📋 Maintenance

### Regular Tasks

1. **Daily**
   - Monitor system health
   - Check error logs
   - Verify backup completion

2. **Weekly**
   - Review performance metrics
   - Update security patches
   - Clean up old logs

3. **Monthly**
   - Review scaling metrics
   - Update dependencies
   - Disaster recovery testing

### Update Procedures

```bash
# Update deployment
kubectl set image deployment/api-gateway \
  api-gateway=ultramarket/api-gateway:v2.0.0 \
  -n ultramarket-production

# Monitor rollout
kubectl rollout status deployment/api-gateway -n ultramarket-production
```

## 🎯 Success Metrics

### Key Performance Indicators

- **Uptime**: >99.9%
- **Response Time**: <200ms (p95)
- **Error Rate**: <0.1%
- **Throughput**: 1000+ RPS
- **Database Performance**: <50ms (p95)

### Monitoring Dashboards

1. **System Overview**: CPU, Memory, Network
2. **Application Metrics**: Request rate, Error rate, Response time
3. **Business Metrics**: User activity, Sales, Performance
4. **Infrastructure**: Kubernetes cluster health

## 🔗 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Charts](https://helm.sh/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)

---

## 🆘 Emergency Contacts

- **DevOps Team**: devops@ultramarket.com
- **Platform Team**: platform@ultramarket.com
- **Security Team**: security@ultramarket.com
- **On-Call**: +1-xxx-xxx-xxxx

---

**Last Updated**: 2025-01-11
**Version**: 1.0.0
**Author**: UltraMarket DevOps Team
