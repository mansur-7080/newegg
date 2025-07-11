# ⚡ UltraMarket Quick Reference Guide

## 🚨 Emergency Procedures

### Critical System Down

```bash
# 1. Check overall system health
kubectl get pods -n ultramarket-production | grep -v Running

# 2. Check services status
kubectl get services -n ultramarket-production

# 3. Emergency restart (if needed)
kubectl rollout restart deployment/product-service -n ultramarket-production

# 4. Scale up services immediately
kubectl scale deployment product-service --replicas=10 -n ultramarket-production
```

### Database Emergency

```bash
# PostgreSQL emergency
kubectl exec -it postgresql-0 -n ultramarket-production -- pg_isready
kubectl logs postgresql-0 -n ultramarket-production --tail=100

# MongoDB emergency
kubectl exec -it mongodb-0 -n ultramarket-production -- mongosh --eval "db.adminCommand('ismaster')"

# Redis emergency
kubectl exec -it redis-master-0 -n ultramarket-production -- redis-cli ping
```

## 📊 Monitoring Dashboard URLs

| Service          | URL                                 | Purpose                   |
| ---------------- | ----------------------------------- | ------------------------- |
| **Grafana**      | http://grafana.ultramarket.com      | Main monitoring dashboard |
| **Prometheus**   | http://prometheus.ultramarket.com   | Metrics collection        |
| **AlertManager** | http://alertmanager.ultramarket.com | Alert management          |
| **Jaeger**       | http://jaeger.ultramarket.com       | Distributed tracing       |
| **Kibana**       | http://kibana.ultramarket.com       | Log analysis              |

## 🔧 Common Commands

### Kubernetes Operations

```bash
# View all pods
kubectl get pods -n ultramarket-production

# Describe pod details
kubectl describe pod <pod-name> -n ultramarket-production

# View logs
kubectl logs -f <pod-name> -n ultramarket-production

# Execute command in pod
kubectl exec -it <pod-name> -n ultramarket-production -- /bin/bash

# Port forward for debugging
kubectl port-forward svc/product-service 8080:80 -n ultramarket-production
```

### Service Management

```bash
# Scale service
kubectl scale deployment <service-name> --replicas=<count> -n ultramarket-production

# Update image
kubectl set image deployment/<service-name> <container>=<new-image> -n ultramarket-production

# Rollback deployment
kubectl rollout undo deployment/<service-name> -n ultramarket-production

# Check rollout status
kubectl rollout status deployment/<service-name> -n ultramarket-production
```

### Database Operations

```sql
-- PostgreSQL health checks
SELECT version();
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
SELECT schemaname, tablename, n_tup_ins, n_tup_upd FROM pg_stat_user_tables ORDER BY n_tup_ins DESC LIMIT 10;

-- MongoDB health checks
db.runCommand({serverStatus: 1})
db.adminCommand("replSetGetStatus")
db.stats()
```

## 🚨 Alert Response Guide

### High Response Time Alert

1. **Check**: Service metrics in Grafana
2. **Investigate**: Database query performance
3. **Action**: Scale services if needed
4. **Escalate**: If issue persists > 15 minutes

### High Error Rate Alert

1. **Check**: Service logs for error patterns
2. **Investigate**: Recent deployments
3. **Action**: Rollback if deployment related
4. **Escalate**: If error rate > 5%

### Database Connection Alert

1. **Check**: Database pod status
2. **Investigate**: Connection pool settings
3. **Action**: Restart database connections
4. **Escalate**: If database is down

### Memory Usage Alert

1. **Check**: Pod memory usage
2. **Investigate**: Memory leaks in logs
3. **Action**: Restart affected pods
4. **Escalate**: If system-wide issue

## 🔍 Troubleshooting Checklists

### Service Not Responding

- [ ] Check pod status (`kubectl get pods`)
- [ ] Review service logs (`kubectl logs`)
- [ ] Verify service configuration
- [ ] Check resource limits
- [ ] Test network connectivity
- [ ] Verify database connections

### Performance Issues

- [ ] Check CPU/Memory usage
- [ ] Review database performance
- [ ] Analyze cache hit rates
- [ ] Check network latency
- [ ] Review application logs
- [ ] Monitor error rates

### Authentication Issues

- [ ] Verify JWT tokens
- [ ] Check auth service status
- [ ] Review user permissions
- [ ] Test API endpoints
- [ ] Validate session storage
- [ ] Check rate limiting

## 📞 Escalation Matrix

| Severity          | Response Time | Primary Contact   | Escalation               |
| ----------------- | ------------- | ----------------- | ------------------------ |
| **P0 - Critical** | 15 minutes    | On-call Engineer  | CTO after 30 min         |
| **P1 - High**     | 1 hour        | Team Lead         | Manager after 2 hours    |
| **P2 - Medium**   | 4 hours       | Assigned Engineer | Team Lead after 8 hours  |
| **P3 - Low**      | 24 hours      | Support Team      | Team Lead after 48 hours |

### Contact Information

- **On-call Engineer**: +1-XXX-XXX-XXXX
- **Team Lead**: +1-XXX-XXX-XXXX
- **DevOps Manager**: +1-XXX-XXX-XXXX
- **CTO**: +1-XXX-XXX-XXXX

## 🛠️ Deployment Procedures

### Standard Deployment

```bash
# 1. Verify staging deployment
kubectl get deployment <service-name> -n ultramarket-staging

# 2. Update production image
kubectl set image deployment/<service-name> <container>=<new-image> -n ultramarket-production

# 3. Monitor rollout
kubectl rollout status deployment/<service-name> -n ultramarket-production

# 4. Verify health
curl -f https://api.ultramarket.com/health

# 5. Monitor metrics for 15 minutes
```

### Emergency Rollback

```bash
# Quick rollback
kubectl rollout undo deployment/<service-name> -n ultramarket-production

# Rollback to specific version
kubectl rollout undo deployment/<service-name> --to-revision=<number> -n ultramarket-production

# Verify rollback
kubectl rollout status deployment/<service-name> -n ultramarket-production
```

## 🔐 Security Incident Response

### Immediate Actions

1. **Assess Severity** - Determine impact level
2. **Contain** - Isolate affected systems
3. **Notify** - Alert security team
4. **Document** - Record all actions
5. **Investigate** - Gather evidence
6. **Recover** - Restore normal operations

### Security Commands

```bash
# Check failed logins
kubectl logs auth-service -n ultramarket-production | grep "failed login"

# Review access logs
kubectl logs api-gateway -n ultramarket-production | grep "401\|403"

# Check suspicious activity
kubectl logs -f --selector app=auth-service -n ultramarket-production
```

## 📈 Performance Optimization

### Quick Performance Checks

```bash
# Service response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.ultramarket.com/v2/products

# Database performance
kubectl exec -it postgresql-0 -n ultramarket-production -- \
  psql -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# Cache hit rates
kubectl exec -it redis-master-0 -n ultramarket-production -- \
  redis-cli info stats | grep hit_rate
```

### Optimization Actions

- **Scale Services**: Increase replicas for high-traffic services
- **Database Tuning**: Add indexes for slow queries
- **Cache Optimization**: Increase cache TTL for static data
- **CDN**: Enable CDN for static assets

## 🔄 Backup & Recovery

### Backup Status Check

```bash
# Check recent backups
aws s3 ls s3://ultramarket-backups/ --recursive --human-readable

# Verify backup integrity
aws s3api head-object --bucket ultramarket-backups --key postgresql/latest.tar.gz

# Check backup logs
tail -f /var/log/ultramarket-backup.log
```

### Emergency Recovery

```bash
# Database recovery
kubectl exec -it postgresql-0 -n ultramarket-production -- \
  pg_basebackup -h backup-server -D /recovery

# Application recovery
kubectl apply -f infrastructure/kubernetes/production/
```

## 📱 Mobile App Issues

### Common Mobile Issues

- **API Connectivity**: Check network and API gateway
- **Authentication**: Verify JWT token handling
- **Performance**: Monitor API response times
- **Push Notifications**: Check notification service

### Mobile Debugging

```bash
# Check mobile API endpoints
curl -H "User-Agent: UltraMarketMobile/1.0" https://api.ultramarket.com/v2/products

# Review mobile-specific logs
kubectl logs api-gateway -n ultramarket-production | grep "Mobile"
```

## 🛒 E-commerce Specific

### Order Processing Issues

```sql
-- Check stuck orders
SELECT id, status, created_at FROM orders
WHERE status = 'processing' AND created_at < NOW() - INTERVAL '1 hour';

-- Payment verification
SELECT order_id, payment_status, gateway_response
FROM payments
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 minutes';
```

### Inventory Management

```sql
-- Low stock alerts
SELECT id, name, stock_quantity
FROM products
WHERE stock_quantity < low_stock_threshold;

-- Inventory discrepancies
SELECT p.id, p.name, p.stock_quantity, SUM(oi.quantity) as sold
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.id
HAVING p.stock_quantity < 0;
```

## 🔧 Configuration Management

### Environment Variables

```bash
# View current config
kubectl get configmap app-config -n ultramarket-production -o yaml

# Update configuration
kubectl patch configmap app-config -n ultramarket-production --patch '{"data":{"API_RATE_LIMIT":"2000"}}'

# Restart services to pick up config
kubectl rollout restart deployment/api-gateway -n ultramarket-production
```

### Secret Management

```bash
# View secrets (metadata only)
kubectl get secrets -n ultramarket-production

# Update secret
kubectl create secret generic new-secret --from-literal=key=value -n ultramarket-production --dry-run=client -o yaml | kubectl apply -f -
```

## 📊 Business Metrics

### Real-time Business Monitoring

```sql
-- Today's sales
SELECT COUNT(*) as orders, SUM(total_amount) as revenue
FROM orders
WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed';

-- Active users
SELECT COUNT(DISTINCT user_id) as active_users
FROM user_sessions
WHERE last_activity > NOW() - INTERVAL '15 minutes';

-- Conversion rate
SELECT
  (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE) * 100.0 /
  (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE DATE(created_at) = CURRENT_DATE) as conversion_rate;
```

---

**⚡ Keep this guide handy for quick operational reference!**
