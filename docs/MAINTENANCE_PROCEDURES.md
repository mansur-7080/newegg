# 🔧 UltraMarket Maintenance Procedures

[![Maintenance](https://img.shields.io/badge/Maintenance-Guide-orange.svg)](https://docs.ultramarket.uz)
[![Operations](https://img.shields.io/badge/Operations-24%2F7-green.svg)](https://status.ultramarket.uz)
[![SLA](https://img.shields.io/badge/SLA-99.9%25-blue.svg)](https://ultramarket.uz/sla)

> **Comprehensive Maintenance and Operations Guide for UltraMarket Platform**  
> Everything needed for 24/7 operations and maintenance

## 📋 Table of Contents

1. [Overview](#overview)
2. [Daily Operations](#daily-operations)
3. [Weekly Maintenance](#weekly-maintenance)
4. [Monthly Procedures](#monthly-procedures)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Backup & Recovery](#backup--recovery)
7. [Security Maintenance](#security-maintenance)
8. [Performance Optimization](#performance-optimization)
9. [Incident Response](#incident-response)
10. [Emergency Procedures](#emergency-procedures)
11. [Documentation Updates](#documentation-updates)
12. [Contact Information](#contact-information)

---

## 🌟 Overview

### Maintenance Philosophy

UltraMarket follows a **proactive maintenance** approach to ensure:

- **99.9% uptime** SLA compliance
- **Optimal performance** across all services
- **Security** best practices
- **Data integrity** and availability
- **Scalability** for growth

### Service Level Agreements (SLA)

| Service           | Uptime Target | Response Time | Recovery Time |
| ----------------- | ------------- | ------------- | ------------- |
| **API Gateway**   | 99.9%         | < 200ms       | < 5 minutes   |
| **Core Services** | 99.9%         | < 300ms       | < 10 minutes  |
| **Database**      | 99.95%        | < 50ms        | < 15 minutes  |
| **File Storage**  | 99.9%         | < 1s          | < 30 minutes  |
| **Search**        | 99.5%         | < 100ms       | < 20 minutes  |

### Maintenance Windows

- **Daily**: 02:00 - 04:00 UTC (Low traffic period)
- **Weekly**: Sunday 01:00 - 05:00 UTC
- **Monthly**: First Sunday of month 00:00 - 06:00 UTC
- **Emergency**: Any time with proper notification

---

## 📅 Daily Operations

### Morning Checks (08:00 UTC)

#### 1. System Health Verification

```bash
# Run automated health checks
./scripts/maintenance/daily-health-check.sh

# Check all services status
kubectl get pods -n ultramarket
kubectl get services -n ultramarket

# Verify database connections
npm run db:health-check

# Check API endpoints
curl -f https://api.ultramarket.uz/health
curl -f https://api.ultramarket.uz/api/v1/auth/health
curl -f https://api.ultramarket.uz/api/v1/products/health
```

#### 2. Performance Metrics Review

```bash
# Check response times (last 24h)
curl -s "http://prometheus:9090/api/v1/query?query=avg_over_time(http_request_duration_seconds[24h])"

# Check error rates
curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~'5..'}[24h])"

# Check resource utilization
kubectl top nodes
kubectl top pods -n ultramarket
```

#### 3. Log Analysis

```bash
# Check for critical errors
kubectl logs -n ultramarket -l app=api-gateway --since=24h | grep -i error
kubectl logs -n ultramarket -l app=auth-service --since=24h | grep -i error

# Check payment gateway logs
kubectl logs -n ultramarket -l app=payment-service --since=24h | grep -i "payment\|error"

# Review security logs
kubectl logs -n ultramarket -l app=auth-service --since=24h | grep -i "failed\|blocked\|suspicious"
```

#### 4. Business Metrics

```bash
# Check daily orders
curl -s "https://api.ultramarket.uz/api/v1/admin/analytics/daily-orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check payment success rates
curl -s "https://api.ultramarket.uz/api/v1/admin/analytics/payment-rates" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check user registrations
curl -s "https://api.ultramarket.uz/api/v1/admin/analytics/user-registrations" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Evening Checks (20:00 UTC)

#### 1. Backup Verification

```bash
# Verify daily backups completed
ls -la /backups/daily/$(date +%Y-%m-%d)/

# Check backup integrity
./scripts/backup/verify-backup-integrity.sh

# Test backup restoration (on staging)
./scripts/backup/test-restore.sh staging
```

#### 2. Security Scan

```bash
# Run security vulnerability scan
./scripts/security/daily-security-scan.sh

# Check for failed login attempts
kubectl logs -n ultramarket -l app=auth-service --since=24h | grep "authentication failed" | wc -l

# Review access logs for suspicious activity
./scripts/security/analyze-access-logs.sh
```

#### 3. Capacity Planning

```bash
# Check storage usage
df -h
kubectl get pv | grep -v Available

# Check database sizes
./scripts/database/check-database-sizes.sh

# Review traffic patterns
./scripts/monitoring/traffic-analysis.sh
```

---

## 📆 Weekly Maintenance

### Sunday Maintenance Window (01:00 - 05:00 UTC)

#### 1. System Updates

```bash
# Update security patches
./scripts/maintenance/security-updates.sh

# Update Docker images
./scripts/maintenance/update-docker-images.sh

# Update Kubernetes manifests
./scripts/maintenance/update-k8s-manifests.sh

# Restart services with rolling updates
kubectl rollout restart deployment -n ultramarket
```

#### 2. Database Maintenance

```bash
# PostgreSQL maintenance
kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -c "VACUUM ANALYZE;"
kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -c "REINDEX DATABASE ultramarket;"

# MongoDB maintenance
kubectl exec -n ultramarket deployment/mongodb -- mongo --eval "db.runCommand({compact: 'users'})"
kubectl exec -n ultramarket deployment/mongodb -- mongo --eval "db.runCommand({compact: 'products'})"

# Redis maintenance
kubectl exec -n ultramarket deployment/redis -- redis-cli BGREWRITEAOF
```

#### 3. Performance Optimization

```bash
# Analyze slow queries
./scripts/database/analyze-slow-queries.sh

# Optimize database indexes
./scripts/database/optimize-indexes.sh

# Clear unused cache entries
kubectl exec -n ultramarket deployment/redis -- redis-cli FLUSHDB

# Optimize image storage
./scripts/storage/optimize-images.sh
```

#### 4. Log Rotation and Cleanup

```bash
# Rotate application logs
./scripts/maintenance/rotate-logs.sh

# Clean old backup files (keep last 30 days)
find /backups -type f -mtime +30 -delete

# Clean Docker images
docker system prune -af --volumes

# Clean Kubernetes resources
kubectl delete pods -n ultramarket --field-selector=status.phase=Succeeded
```

---

## 🗓️ Monthly Procedures

### First Sunday of Month (00:00 - 06:00 UTC)

#### 1. Major System Updates

```bash
# Update Node.js version
./scripts/maintenance/update-nodejs.sh

# Update dependencies
./scripts/maintenance/update-dependencies.sh

# Update Kubernetes version
./scripts/maintenance/update-kubernetes.sh

# Update monitoring stack
./scripts/maintenance/update-monitoring.sh
```

#### 2. Security Audit

```bash
# Run comprehensive security audit
./scripts/security/comprehensive-audit.sh

# Update SSL certificates
./scripts/security/update-ssl-certificates.sh

# Review user permissions
./scripts/security/audit-user-permissions.sh

# Update security policies
./scripts/security/update-security-policies.sh
```

#### 3. Capacity Planning Review

```bash
# Generate capacity report
./scripts/monitoring/generate-capacity-report.sh

# Analyze growth trends
./scripts/analytics/analyze-growth-trends.sh

# Plan infrastructure scaling
./scripts/planning/infrastructure-scaling-plan.sh

# Review cost optimization
./scripts/analytics/cost-analysis.sh
```

#### 4. Disaster Recovery Testing

```bash
# Test backup restoration
./scripts/disaster-recovery/test-backup-restore.sh

# Test failover procedures
./scripts/disaster-recovery/test-failover.sh

# Verify RTO/RPO metrics
./scripts/disaster-recovery/verify-rto-rpo.sh

# Update disaster recovery plan
./scripts/disaster-recovery/update-dr-plan.sh
```

---

## 📊 Monitoring & Alerting

### Prometheus Queries

#### System Health Queries

```promql
# Service availability
up{job="ultramarket-services"}

# API response time
histogram_quantile(0.95, http_request_duration_seconds_bucket{job="api-gateway"})

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Database connections
postgresql_connections{state="active"}

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# CPU usage
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

#### Business Metrics Queries

```promql
# Orders per minute
rate(orders_total[1m]) * 60

# Revenue per hour
rate(revenue_total[1h]) * 3600

# Active users
users_active_total

# Cart abandonment rate
cart_abandoned_total / cart_created_total

# Payment success rate
payment_success_total / payment_attempts_total
```

### Alert Rules Configuration

```yaml
# alerts/critical.yml
groups:
  - name: critical
    rules:
      - alert: ServiceDown
        expr: up{job="ultramarket-services"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Service {{ $labels.instance }} is down'
          description: 'Service has been down for more than 1 minute'

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value | humanizePercentage }}'

      - alert: DatabaseConnectionsHigh
        expr: postgresql_connections{state="active"} > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High database connections'
          description: 'Active connections: {{ $value }}'

      - alert: DiskSpaceHigh
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High disk usage'
          description: 'Disk usage is {{ $value | humanizePercentage }}'
```

### Grafana Dashboards

#### System Overview Dashboard

```json
{
  "dashboard": {
    "title": "UltraMarket System Overview",
    "panels": [
      {
        "title": "Service Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"ultramarket-services\"}"
          }
        ]
      },
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket{job=\"api-gateway\"})"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "users_active_total"
          }
        ]
      }
    ]
  }
}
```

---

## 💾 Backup & Recovery

### Backup Strategy

#### 1. Database Backups

```bash
#!/bin/bash
# scripts/backup/database-backup.sh

BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# PostgreSQL backup
kubectl exec -n ultramarket deployment/postgres -- pg_dumpall -U postgres | gzip > "$BACKUP_DIR/postgres.sql.gz"

# MongoDB backup
kubectl exec -n ultramarket deployment/mongodb -- mongodump --archive | gzip > "$BACKUP_DIR/mongodb.archive.gz"

# Redis backup
kubectl exec -n ultramarket deployment/redis -- redis-cli BGSAVE
kubectl cp ultramarket/redis-0:/data/dump.rdb "$BACKUP_DIR/redis.rdb"

# Verify backups
if [ -f "$BACKUP_DIR/postgres.sql.gz" ] && [ -f "$BACKUP_DIR/mongodb.archive.gz" ] && [ -f "$BACKUP_DIR/redis.rdb" ]; then
    echo "Backup completed successfully"
    # Upload to cloud storage
    aws s3 sync "$BACKUP_DIR" "s3://ultramarket-backups/$(date +%Y-%m-%d)/"
else
    echo "Backup failed!"
    exit 1
fi
```

#### 2. Application Data Backup

```bash
#!/bin/bash
# scripts/backup/application-backup.sh

BACKUP_DIR="/backups/app-$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup uploaded files
kubectl exec -n ultramarket deployment/file-service -- tar -czf - /app/uploads | cat > "$BACKUP_DIR/uploads.tar.gz"

# Backup configuration
kubectl get configmaps -n ultramarket -o yaml > "$BACKUP_DIR/configmaps.yaml"
kubectl get secrets -n ultramarket -o yaml > "$BACKUP_DIR/secrets.yaml"

# Backup Kubernetes manifests
kubectl get all -n ultramarket -o yaml > "$BACKUP_DIR/kubernetes.yaml"

echo "Application backup completed"
```

#### 3. Backup Verification

```bash
#!/bin/bash
# scripts/backup/verify-backup.sh

BACKUP_DATE=${1:-$(date +%Y-%m-%d)}
BACKUP_DIR="/backups/$BACKUP_DATE"

echo "Verifying backup for $BACKUP_DATE"

# Check file existence
if [ ! -f "$BACKUP_DIR/postgres.sql.gz" ]; then
    echo "PostgreSQL backup missing!"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/mongodb.archive.gz" ]; then
    echo "MongoDB backup missing!"
    exit 1
fi

# Check file integrity
gunzip -t "$BACKUP_DIR/postgres.sql.gz"
if [ $? -ne 0 ]; then
    echo "PostgreSQL backup corrupted!"
    exit 1
fi

gunzip -t "$BACKUP_DIR/mongodb.archive.gz"
if [ $? -ne 0 ]; then
    echo "MongoDB backup corrupted!"
    exit 1
fi

echo "Backup verification completed successfully"
```

### Recovery Procedures

#### 1. Database Recovery

```bash
#!/bin/bash
# scripts/recovery/database-recovery.sh

BACKUP_DATE=$1
BACKUP_DIR="/backups/$BACKUP_DATE"

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 <backup-date>"
    exit 1
fi

echo "Starting database recovery from $BACKUP_DATE"

# Stop applications
kubectl scale deployment --replicas=0 -n ultramarket

# Restore PostgreSQL
gunzip -c "$BACKUP_DIR/postgres.sql.gz" | kubectl exec -i -n ultramarket deployment/postgres -- psql -U postgres

# Restore MongoDB
gunzip -c "$BACKUP_DIR/mongodb.archive.gz" | kubectl exec -i -n ultramarket deployment/mongodb -- mongorestore --archive

# Restore Redis
kubectl cp "$BACKUP_DIR/redis.rdb" ultramarket/redis-0:/data/dump.rdb
kubectl exec -n ultramarket deployment/redis -- redis-cli DEBUG RESTART

# Start applications
kubectl scale deployment --replicas=2 -n ultramarket

echo "Database recovery completed"
```

#### 2. Point-in-Time Recovery

```bash
#!/bin/bash
# scripts/recovery/point-in-time-recovery.sh

TARGET_TIME=$1

if [ -z "$TARGET_TIME" ]; then
    echo "Usage: $0 <target-time-iso>"
    echo "Example: $0 2024-01-15T14:30:00Z"
    exit 1
fi

echo "Starting point-in-time recovery to $TARGET_TIME"

# Find appropriate backup
BACKUP_DATE=$(date -d "$TARGET_TIME" +%Y-%m-%d)

# Restore from backup
./scripts/recovery/database-recovery.sh "$BACKUP_DATE"

# Apply transaction logs up to target time
kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -c "SELECT pg_stop_backup();"

echo "Point-in-time recovery completed"
```

---

## 🔒 Security Maintenance

### Daily Security Tasks

#### 1. Security Log Analysis

```bash
#!/bin/bash
# scripts/security/daily-security-analysis.sh

LOG_DATE=$(date +%Y-%m-%d)
SECURITY_LOG="/var/log/security/security-$LOG_DATE.log"

echo "Analyzing security logs for $LOG_DATE"

# Check for failed login attempts
FAILED_LOGINS=$(kubectl logs -n ultramarket -l app=auth-service --since=24h | grep "authentication failed" | wc -l)
if [ "$FAILED_LOGINS" -gt 100 ]; then
    echo "WARNING: High number of failed logins: $FAILED_LOGINS"
    # Send alert
    ./scripts/alerts/send-security-alert.sh "High failed login attempts: $FAILED_LOGINS"
fi

# Check for blocked IPs
BLOCKED_IPS=$(kubectl logs -n ultramarket -l app=api-gateway --since=24h | grep "rate limit exceeded" | awk '{print $1}' | sort | uniq -c | sort -nr)
echo "Blocked IPs in last 24h:"
echo "$BLOCKED_IPS"

# Check for suspicious API calls
SUSPICIOUS_CALLS=$(kubectl logs -n ultramarket -l app=api-gateway --since=24h | grep -E "(sql|script|eval|exec)" | wc -l)
if [ "$SUSPICIOUS_CALLS" -gt 0 ]; then
    echo "WARNING: Suspicious API calls detected: $SUSPICIOUS_CALLS"
fi

echo "Security analysis completed"
```

#### 2. Vulnerability Scanning

```bash
#!/bin/bash
# scripts/security/vulnerability-scan.sh

echo "Starting vulnerability scan"

# Scan container images
trivy image --severity HIGH,CRITICAL ultramarket/api-gateway:latest
trivy image --severity HIGH,CRITICAL ultramarket/auth-service:latest
trivy image --severity HIGH,CRITICAL ultramarket/product-service:latest

# Scan Kubernetes configurations
kube-score score infrastructure/kubernetes/production/*.yaml

# Scan dependencies
npm audit --audit-level high
npm audit fix --force

# Scan for secrets in code
truffleHog --regex --entropy=False .

echo "Vulnerability scan completed"
```

### Weekly Security Tasks

#### 1. SSL Certificate Management

```bash
#!/bin/bash
# scripts/security/ssl-certificate-check.sh

echo "Checking SSL certificates"

# Check certificate expiration
CERT_EXPIRY=$(openssl x509 -in /etc/ssl/ultramarket.crt -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$CERT_EXPIRY" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))

if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
    echo "WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    # Renew certificate
    ./scripts/security/renew-ssl-certificate.sh
fi

# Verify certificate chain
openssl verify -CAfile /etc/ssl/ca-bundle.crt /etc/ssl/ultramarket.crt

echo "SSL certificate check completed"
```

#### 2. Access Control Review

```bash
#!/bin/bash
# scripts/security/access-control-review.sh

echo "Reviewing access controls"

# Check user permissions
kubectl get rolebindings -n ultramarket -o yaml > /tmp/current-permissions.yaml

# Compare with baseline
diff /tmp/current-permissions.yaml /etc/security/baseline-permissions.yaml

# Check for inactive users
INACTIVE_USERS=$(kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -c "SELECT email FROM users WHERE last_login < NOW() - INTERVAL '90 days';" -t)
if [ -n "$INACTIVE_USERS" ]; then
    echo "Inactive users found:"
    echo "$INACTIVE_USERS"
fi

# Check admin access
ADMIN_USERS=$(kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -c "SELECT email FROM users WHERE role = 'admin';" -t)
echo "Current admin users:"
echo "$ADMIN_USERS"

echo "Access control review completed"
```

### Monthly Security Tasks

#### 1. Penetration Testing

```bash
#!/bin/bash
# scripts/security/penetration-test.sh

echo "Starting penetration testing"

# OWASP ZAP scan
docker run -v $(pwd):/zap/wrk/:rw -t owasp/zap2docker-stable zap-baseline.py -t https://api.ultramarket.uz

# SQL injection testing
sqlmap -u "https://api.ultramarket.uz/api/v1/products?search=test" --batch --level=3

# XSS testing
python3 scripts/security/xss-scanner.py https://ultramarket.uz

# Directory traversal testing
dirb https://api.ultramarket.uz /usr/share/dirb/wordlists/common.txt

echo "Penetration testing completed"
```

---

## ⚡ Performance Optimization

### Database Performance

#### 1. Query Optimization

```bash
#!/bin/bash
# scripts/performance/optimize-database.sh

echo "Optimizing database performance"

# Analyze slow queries
kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# Update table statistics
kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -c "ANALYZE;"

# Reindex heavy tables
kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -c "REINDEX TABLE products;"
kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -c "REINDEX TABLE orders;"

# Optimize MongoDB
kubectl exec -n ultramarket deployment/mongodb -- mongo --eval "
db.products.reIndex();
db.users.reIndex();
db.orders.reIndex();"

echo "Database optimization completed"
```

#### 2. Cache Optimization

```bash
#!/bin/bash
# scripts/performance/optimize-cache.sh

echo "Optimizing cache performance"

# Analyze Redis memory usage
kubectl exec -n ultramarket deployment/redis -- redis-cli info memory

# Clean expired keys
kubectl exec -n ultramarket deployment/redis -- redis-cli --scan --pattern "*:expired:*" | xargs kubectl exec -n ultramarket deployment/redis -- redis-cli del

# Optimize cache settings
kubectl exec -n ultramarket deployment/redis -- redis-cli config set maxmemory-policy allkeys-lru

# Warm up critical cache
curl -s "https://api.ultramarket.uz/api/v1/products?category=electronics&limit=100" > /dev/null
curl -s "https://api.ultramarket.uz/api/v1/categories" > /dev/null

echo "Cache optimization completed"
```

### Application Performance

#### 1. API Performance Tuning

```bash
#!/bin/bash
# scripts/performance/tune-api-performance.sh

echo "Tuning API performance"

# Analyze response times
kubectl exec -n ultramarket deployment/api-gateway -- node -e "
const metrics = require('./metrics');
console.log('Average response time:', metrics.getAverageResponseTime());
console.log('95th percentile:', metrics.getPercentile(95));
"

# Optimize connection pools
kubectl patch deployment api-gateway -n ultramarket -p '{"spec":{"template":{"spec":{"containers":[{"name":"api-gateway","env":[{"name":"DB_POOL_SIZE","value":"20"}]}]}}}}'

# Enable compression
kubectl patch deployment api-gateway -n ultramarket -p '{"spec":{"template":{"spec":{"containers":[{"name":"api-gateway","env":[{"name":"ENABLE_COMPRESSION","value":"true"}]}]}}}}'

echo "API performance tuning completed"
```

#### 2. Resource Optimization

```bash
#!/bin/bash
# scripts/performance/optimize-resources.sh

echo "Optimizing resource allocation"

# Analyze current resource usage
kubectl top pods -n ultramarket

# Adjust resource limits based on usage
kubectl patch deployment auth-service -n ultramarket -p '{"spec":{"template":{"spec":{"containers":[{"name":"auth-service","resources":{"limits":{"memory":"512Mi","cpu":"500m"},"requests":{"memory":"256Mi","cpu":"250m"}}}]}}}}'

# Enable horizontal pod autoscaling
kubectl autoscale deployment api-gateway -n ultramarket --cpu-percent=70 --min=2 --max=10

echo "Resource optimization completed"
```

---

## 🚨 Incident Response

### Incident Classification

| Severity          | Description                  | Response Time | Examples                               |
| ----------------- | ---------------------------- | ------------- | -------------------------------------- |
| **P0 - Critical** | Complete service outage      | 15 minutes    | API down, database unavailable         |
| **P1 - High**     | Major functionality impacted | 1 hour        | Payment processing down, login issues  |
| **P2 - Medium**   | Minor functionality impacted | 4 hours       | Search slow, some features unavailable |
| **P3 - Low**      | Cosmetic issues              | 24 hours      | UI glitches, minor bugs                |

### Incident Response Playbook

#### 1. Initial Response (0-15 minutes)

```bash
#!/bin/bash
# scripts/incident/initial-response.sh

INCIDENT_ID=$1
SEVERITY=$2

echo "Starting incident response for $INCIDENT_ID (Severity: $SEVERITY)"

# Create incident channel
curl -X POST "https://api.slack.com/api/conversations.create" \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  -d "name=incident-$INCIDENT_ID"

# Gather initial information
kubectl get pods -n ultramarket
kubectl get services -n ultramarket
kubectl top nodes

# Check recent deployments
kubectl rollout history deployment -n ultramarket

# Check alerts
curl -s "http://alertmanager:9093/api/v1/alerts"

echo "Initial response completed"
```

#### 2. Investigation (15-60 minutes)

```bash
#!/bin/bash
# scripts/incident/investigate.sh

INCIDENT_ID=$1

echo "Starting investigation for incident $INCIDENT_ID"

# Collect logs
mkdir -p "/tmp/incident-$INCIDENT_ID"
kubectl logs -n ultramarket -l app=api-gateway --since=1h > "/tmp/incident-$INCIDENT_ID/api-gateway.log"
kubectl logs -n ultramarket -l app=auth-service --since=1h > "/tmp/incident-$INCIDENT_ID/auth-service.log"

# Check database status
kubectl exec -n ultramarket deployment/postgres -- pg_isready -U postgres
kubectl exec -n ultramarket deployment/mongodb -- mongo --eval "db.adminCommand('ping')"

# Check external dependencies
curl -f https://api.click.uz/health || echo "Click API down"
curl -f https://api.payme.uz/health || echo "Payme API down"

# Analyze error patterns
grep -c "ERROR" "/tmp/incident-$INCIDENT_ID"/*.log
grep -c "CRITICAL" "/tmp/incident-$INCIDENT_ID"/*.log

echo "Investigation completed"
```

#### 3. Resolution Actions

```bash
#!/bin/bash
# scripts/incident/resolve.sh

INCIDENT_ID=$1
ACTION=$2

echo "Executing resolution action: $ACTION for incident $INCIDENT_ID"

case $ACTION in
  "restart-service")
    SERVICE=$3
    kubectl rollout restart deployment/$SERVICE -n ultramarket
    ;;
  "scale-up")
    SERVICE=$3
    REPLICAS=$4
    kubectl scale deployment/$SERVICE --replicas=$REPLICAS -n ultramarket
    ;;
  "rollback")
    SERVICE=$3
    kubectl rollout undo deployment/$SERVICE -n ultramarket
    ;;
  "failover")
    ./scripts/disaster-recovery/initiate-failover.sh
    ;;
  *)
    echo "Unknown action: $ACTION"
    exit 1
    ;;
esac

echo "Resolution action completed"
```

### Post-Incident Review

#### 1. Incident Report Template

```markdown
# Incident Report: [INCIDENT_ID]

## Summary

- **Date**: [DATE]
- **Duration**: [START_TIME] - [END_TIME]
- **Severity**: [P0/P1/P2/P3]
- **Impact**: [DESCRIPTION]

## Timeline

- **[TIME]**: Issue detected
- **[TIME]**: Investigation started
- **[TIME]**: Root cause identified
- **[TIME]**: Fix implemented
- **[TIME]**: Service restored

## Root Cause

[DETAILED DESCRIPTION]

## Resolution

[ACTIONS TAKEN]

## Lessons Learned

- [LESSON 1]
- [LESSON 2]

## Action Items

- [ ] [ACTION 1] - Owner: [NAME] - Due: [DATE]
- [ ] [ACTION 2] - Owner: [NAME] - Due: [DATE]

## Prevention Measures

[MEASURES TO PREVENT RECURRENCE]
```

---

## 🆘 Emergency Procedures

### Service Recovery

#### 1. Database Recovery

```bash
#!/bin/bash
# scripts/emergency/database-recovery.sh

echo "EMERGENCY: Starting database recovery"

# Check database status
DB_STATUS=$(kubectl exec -n ultramarket deployment/postgres -- pg_isready -U postgres)

if [[ $DB_STATUS != *"accepting connections"* ]]; then
    echo "Database is down, attempting recovery"

    # Try to restart database
    kubectl rollout restart deployment/postgres -n ultramarket

    # Wait for restart
    kubectl rollout status deployment/postgres -n ultramarket --timeout=300s

    # If still down, restore from backup
    if ! kubectl exec -n ultramarket deployment/postgres -- pg_isready -U postgres; then
        echo "Database restart failed, restoring from backup"
        ./scripts/recovery/database-recovery.sh $(date -d "yesterday" +%Y-%m-%d)
    fi
fi

echo "Database recovery completed"
```

#### 2. Service Failover

```bash
#!/bin/bash
# scripts/emergency/service-failover.sh

SERVICE=$1

echo "EMERGENCY: Initiating failover for $SERVICE"

# Scale down primary
kubectl scale deployment/$SERVICE --replicas=0 -n ultramarket

# Scale up backup region (if available)
kubectl scale deployment/$SERVICE --replicas=3 -n ultramarket-backup

# Update load balancer
kubectl patch service $SERVICE -n ultramarket -p '{"spec":{"selector":{"region":"backup"}}}'

# Verify failover
kubectl get pods -n ultramarket-backup -l app=$SERVICE

echo "Failover completed for $SERVICE"
```

### Communication Templates

#### 1. Status Page Update

```bash
#!/bin/bash
# scripts/emergency/update-status-page.sh

STATUS=$1
MESSAGE=$2

curl -X POST "https://api.statuspage.io/v1/pages/PAGE_ID/incidents" \
  -H "Authorization: OAuth TOKEN" \
  -d "incident[name]=Service Issue" \
  -d "incident[status]=$STATUS" \
  -d "incident[message]=$MESSAGE"
```

#### 2. Customer Notification

```bash
#!/bin/bash
# scripts/emergency/notify-customers.sh

INCIDENT_TYPE=$1
ESTIMATED_RESOLUTION=$2

# Send email notification
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -d '{
    "personalizations": [{"to": [{"email": "customers@ultramarket.uz"}]}],
    "from": {"email": "support@ultramarket.uz"},
    "subject": "Service Notice - UltraMarket",
    "content": [{"type": "text/plain", "value": "We are experiencing issues with '$INCIDENT_TYPE'. Estimated resolution: '$ESTIMATED_RESOLUTION'"}]
  }'

# Send SMS notification (for critical issues)
if [ "$INCIDENT_TYPE" = "payment" ] || [ "$INCIDENT_TYPE" = "orders" ]; then
    curl -X POST "https://api.eskiz.uz/api/message/sms/send" \
      -H "Authorization: Bearer $ESKIZ_TOKEN" \
      -d "mobile=+998901234567&message=UltraMarket service notice: $INCIDENT_TYPE issue detected. We are working to resolve it."
fi
```

---

## 📚 Documentation Updates

### Weekly Documentation Review

```bash
#!/bin/bash
# scripts/maintenance/update-documentation.sh

echo "Updating documentation"

# Generate API documentation
npm run docs:generate

# Update README files
./scripts/docs/update-readme.sh

# Check for outdated links
./scripts/docs/check-links.sh

# Update changelog
./scripts/docs/update-changelog.sh

# Commit changes
git add docs/
git commit -m "docs: weekly documentation update"
git push origin main

echo "Documentation update completed"
```

### Automated Documentation

```bash
#!/bin/bash
# scripts/docs/generate-api-docs.sh

echo "Generating API documentation"

# Generate OpenAPI spec
swagger-jsdoc -d swaggerDef.js routes/*.js > docs/api/openapi.json

# Generate Postman collection
openapi2postman -s docs/api/openapi.json -o docs/api/postman-collection.json

# Generate SDK documentation
typedoc --out docs/sdk src/

echo "API documentation generated"
```

---

## 📞 Contact Information

### Emergency Contacts

#### Technical Team

- **DevOps Lead**: +998 90 123 4567 (24/7)
- **Backend Lead**: +998 90 123 4568 (24/7)
- **Database Admin**: +998 90 123 4569 (24/7)
- **Security Lead**: +998 90 123 4570 (On-call)

#### Business Team

- **Product Owner**: +998 90 123 4571
- **Customer Support**: +998 90 123 4572 (24/7)
- **Business Manager**: +998 90 123 4573

#### External Contacts

- **Cloud Provider**: AWS Support (Enterprise)
- **CDN Provider**: CloudFlare Support
- **Payment Gateway**: Click Support +998 71 200 0000
- **SMS Provider**: ESKIZ Support +998 71 202 0202

### Communication Channels

#### Internal

- **Slack**: #ultramarket-ops (24/7 monitoring)
- **Discord**: UltraMarket Dev Team
- **Email**: ops@ultramarket.uz

#### External

- **Status Page**: https://status.ultramarket.uz
- **Customer Support**: support@ultramarket.uz
- **Business Inquiries**: business@ultramarket.uz

### Escalation Matrix

| Issue Type          | L1 Support        | L2 Support      | L3 Support         | Manager        |
| ------------------- | ----------------- | --------------- | ------------------ | -------------- |
| **API Issues**      | DevOps Engineer   | Backend Lead    | CTO                | VP Engineering |
| **Database Issues** | Database Admin    | Senior DBA      | Database Architect | CTO            |
| **Security Issues** | Security Engineer | Security Lead   | CISO               | CTO            |
| **Business Issues** | Support Agent     | Support Manager | Product Owner      | VP Product     |

---

## 📊 Maintenance Metrics

### Key Performance Indicators

| Metric                  | Target      | Current   | Trend |
| ----------------------- | ----------- | --------- | ----- |
| **Uptime**              | 99.9%       | 99.95%    | ↗️    |
| **MTTR**                | < 30 min    | 25 min    | ↗️    |
| **MTBF**                | > 720 hours | 850 hours | ↗️    |
| **Backup Success Rate** | 100%        | 100%      | ➡️    |
| **Security Incidents**  | 0           | 0         | ➡️    |

### Monthly Maintenance Report

```bash
#!/bin/bash
# scripts/reporting/monthly-maintenance-report.sh

MONTH=$(date +%Y-%m)
REPORT_FILE="/reports/maintenance-report-$MONTH.md"

echo "# Maintenance Report - $MONTH" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Uptime statistics
UPTIME=$(./scripts/monitoring/calculate-uptime.sh)
echo "## Uptime: $UPTIME%" >> "$REPORT_FILE"

# Incident summary
INCIDENTS=$(./scripts/reporting/incident-summary.sh)
echo "## Incidents: $INCIDENTS" >> "$REPORT_FILE"

# Maintenance activities
echo "## Maintenance Activities" >> "$REPORT_FILE"
cat /var/log/maintenance/activities-$MONTH.log >> "$REPORT_FILE"

# Performance metrics
echo "## Performance Metrics" >> "$REPORT_FILE"
./scripts/monitoring/performance-summary.sh >> "$REPORT_FILE"

echo "Monthly report generated: $REPORT_FILE"
```

---

**🔧 UltraMarket Maintenance Procedures - Keeping the platform running smoothly 24/7**

_Last updated: $(date)_  
_Version: 1.0.0_  
_Owner: DevOps Team_  
_Next Review: $(date -d '+1 month')_
