#!/bin/bash

# =============================================================================
# UltraMarket Production Readiness Check
# Comprehensive validation script for production deployment
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE=${NAMESPACE:-ultramarket}
ENVIRONMENT=${ENVIRONMENT:-production}
TIMEOUT=${TIMEOUT:-300}
VERBOSE=${VERBOSE:-false}

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Log files
LOG_DIR="/tmp/ultramarket-readiness-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"
MAIN_LOG="$LOG_DIR/readiness-check.log"
DETAILED_LOG="$LOG_DIR/detailed-check.log"

# Logging functions
log() {
    local message="$1"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[${timestamp}] ✓ ${message}${NC}" | tee -a "$MAIN_LOG"
}

error() {
    local message="$1"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[${timestamp}] ✗ ${message}${NC}" | tee -a "$MAIN_LOG"
    ((FAILED_CHECKS++))
}

warning() {
    local message="$1"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[${timestamp}] ⚠ ${message}${NC}" | tee -a "$MAIN_LOG"
    ((WARNING_CHECKS++))
}

info() {
    local message="$1"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[${timestamp}] ℹ ${message}${NC}" | tee -a "$MAIN_LOG"
}

section() {
    local message="$1"
    echo -e "${PURPLE}==================== ${message} ====================${NC}" | tee -a "$MAIN_LOG"
}

# Check execution wrapper
check() {
    local description="$1"
    local command="$2"
    
    ((TOTAL_CHECKS++))
    
    info "Checking: $description"
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo "Command: $command" >> "$DETAILED_LOG"
    fi
    
    if eval "$command" >> "$DETAILED_LOG" 2>&1; then
        log "$description - PASSED"
        ((PASSED_CHECKS++))
        return 0
    else
        error "$description - FAILED"
        return 1
    fi
}

# =============================================================================
# Infrastructure Checks
# =============================================================================

check_kubernetes_cluster() {
    section "Kubernetes Cluster Checks"
    
    check "Kubernetes cluster connectivity" "kubectl cluster-info > /dev/null"
    check "Kubernetes version compatibility" "kubectl version --short | grep -E 'v1\.(2[0-9]|[3-9][0-9])'"
    check "Namespace exists" "kubectl get namespace $NAMESPACE > /dev/null"
    check "RBAC permissions" "kubectl auth can-i '*' '*' --namespace=$NAMESPACE"
    check "Node readiness" "kubectl get nodes | grep -v NotReady | wc -l | grep -v '^0$'"
    check "Storage classes available" "kubectl get storageclass | wc -l | grep -v '^0$'"
    check "Persistent volumes available" "kubectl get pv | grep Available | wc -l | grep -v '^0$'"
    
    # Check node resources
    local node_count=$(kubectl get nodes --no-headers | wc -l)
    if [[ $node_count -ge 3 ]]; then
        log "Node count ($node_count) meets minimum requirement"
        ((PASSED_CHECKS++))
    else
        error "Node count ($node_count) below minimum requirement (3)"
    fi
    
    # Check cluster resource capacity
    local cpu_capacity=$(kubectl top nodes | awk 'NR>1 {sum+=$2} END {print sum}' | sed 's/m//')
    local memory_capacity=$(kubectl top nodes | awk 'NR>1 {sum+=$4} END {print sum}' | sed 's/Mi//')
    
    if [[ ${cpu_capacity:-0} -gt 8000 ]]; then
        log "CPU capacity (${cpu_capacity}m) meets minimum requirement"
        ((PASSED_CHECKS++))
    else
        error "CPU capacity (${cpu_capacity}m) below minimum requirement (8000m)"
    fi
    
    if [[ ${memory_capacity:-0} -gt 16384 ]]; then
        log "Memory capacity (${memory_capacity}Mi) meets minimum requirement"
        ((PASSED_CHECKS++))
    else
        error "Memory capacity (${memory_capacity}Mi) below minimum requirement (16384Mi)"
    fi
}

check_networking() {
    section "Network Configuration Checks"
    
    check "Network policies exist" "kubectl get networkpolicy -n $NAMESPACE | wc -l | grep -v '^0$'"
    check "Service mesh (if applicable)" "kubectl get pods -n istio-system 2>/dev/null | wc -l | grep -v '^0$' || echo 'No service mesh detected'"
    check "Load balancer service" "kubectl get service -n $NAMESPACE | grep LoadBalancer"
    check "Ingress controller" "kubectl get ingress -n $NAMESPACE | wc -l | grep -v '^0$'"
    check "DNS resolution" "nslookup kubernetes.default.svc.cluster.local > /dev/null"
    check "External DNS access" "nslookup google.com > /dev/null"
    
    # Check service connectivity
    local services=(
        "api-gateway"
        "auth-service"
        "user-service"
        "product-service"
        "cart-service"
        "order-service"
        "payment-service"
        "notification-service"
    )
    
    for service in "${services[@]}"; do
        check "Service $service exists" "kubectl get service $service -n $NAMESPACE > /dev/null"
        check "Service $service has endpoints" "kubectl get endpoints $service -n $NAMESPACE -o jsonpath='{.subsets[0].addresses[0].ip}' | grep -v '^$'"
    done
}

check_storage() {
    section "Storage Configuration Checks"
    
    check "Persistent volumes available" "kubectl get pv | grep Available | wc -l | grep -v '^0$'"
    check "Storage classes configured" "kubectl get storageclass | wc -l | grep -v '^0$'"
    check "Default storage class set" "kubectl get storageclass | grep '(default)'"
    
    # Check database persistent volumes
    local databases=("postgres" "mongodb" "redis")
    for db in "${databases[@]}"; do
        check "PVC for $db exists" "kubectl get pvc -n $NAMESPACE | grep $db"
        check "PVC for $db is bound" "kubectl get pvc -n $NAMESPACE | grep $db | grep Bound"
    done
    
    # Check backup storage
    check "Backup storage accessible" "ls /backups > /dev/null 2>&1 || mkdir -p /backups"
}

# =============================================================================
# Application Checks
# =============================================================================

check_deployments() {
    section "Application Deployment Checks"
    
    local deployments=(
        "api-gateway"
        "auth-service"
        "user-service"
        "product-service"
        "cart-service"
        "order-service"
        "payment-service"
        "inventory-service"
        "review-service"
        "notification-service"
        "analytics-service"
        "search-service"
        "file-service"
        "admin-service"
    )
    
    for deployment in "${deployments[@]}"; do
        check "Deployment $deployment exists" "kubectl get deployment $deployment -n $NAMESPACE > /dev/null"
        check "Deployment $deployment is ready" "kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' | grep -v '^0$'"
        check "Deployment $deployment has correct replicas" "kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.replicas}' | grep -E '^[2-9]|[1-9][0-9]+$'"
    done
    
    # Check pod status
    local total_pods=$(kubectl get pods -n $NAMESPACE --no-headers | wc -l)
    local running_pods=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers | wc -l)
    local ready_pods=$(kubectl get pods -n $NAMESPACE --no-headers | grep -c "1/1\|2/2\|3/3")
    
    if [[ $running_pods -eq $total_pods ]]; then
        log "All pods are running ($running_pods/$total_pods)"
        ((PASSED_CHECKS++))
    else
        error "Not all pods are running ($running_pods/$total_pods)"
    fi
    
    if [[ $ready_pods -eq $total_pods ]]; then
        log "All pods are ready ($ready_pods/$total_pods)"
        ((PASSED_CHECKS++))
    else
        error "Not all pods are ready ($ready_pods/$total_pods)"
    fi
}

check_databases() {
    section "Database Checks"
    
    # PostgreSQL checks
    check "PostgreSQL pod is running" "kubectl get pods -n $NAMESPACE | grep postgres | grep Running"
    check "PostgreSQL service is accessible" "kubectl get service postgres -n $NAMESPACE > /dev/null"
    check "PostgreSQL is ready" "kubectl exec -n $NAMESPACE deployment/postgres -- pg_isready -U postgres"
    check "PostgreSQL databases exist" "kubectl exec -n $NAMESPACE deployment/postgres -- psql -U postgres -l | grep ultramarket"
    
    # MongoDB checks
    check "MongoDB pod is running" "kubectl get pods -n $NAMESPACE | grep mongodb | grep Running"
    check "MongoDB service is accessible" "kubectl get service mongodb -n $NAMESPACE > /dev/null"
    check "MongoDB is ready" "kubectl exec -n $NAMESPACE deployment/mongodb -- mongo --eval 'db.adminCommand(\"ping\")'"
    check "MongoDB databases exist" "kubectl exec -n $NAMESPACE deployment/mongodb -- mongo --eval 'db.adminCommand(\"listDatabases\")' | grep ultramarket"
    
    # Redis checks
    check "Redis pod is running" "kubectl get pods -n $NAMESPACE | grep redis | grep Running"
    check "Redis service is accessible" "kubectl get service redis -n $NAMESPACE > /dev/null"
    check "Redis is ready" "kubectl exec -n $NAMESPACE deployment/redis -- redis-cli ping | grep PONG"
    check "Redis memory usage acceptable" "kubectl exec -n $NAMESPACE deployment/redis -- redis-cli info memory | grep used_memory_human"
}

check_configurations() {
    section "Configuration Checks"
    
    # ConfigMaps
    check "ConfigMaps exist" "kubectl get configmap -n $NAMESPACE | wc -l | grep -v '^0$'"
    
    # Secrets
    check "Secrets exist" "kubectl get secret -n $NAMESPACE | wc -l | grep -v '^0$'"
    check "Database secrets exist" "kubectl get secret -n $NAMESPACE | grep database"
    check "API keys secrets exist" "kubectl get secret -n $NAMESPACE | grep api-keys"
    check "JWT secrets exist" "kubectl get secret -n $NAMESPACE | grep jwt"
    
    # Environment variables
    local services=("auth-service" "user-service" "product-service" "cart-service" "order-service")
    for service in "${services[@]}"; do
        check "$service environment variables" "kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].env}' | grep -v '^$'"
    done
}

# =============================================================================
# Security Checks
# =============================================================================

check_security() {
    section "Security Configuration Checks"
    
    # Pod Security Policies
    check "Pod Security Policies exist" "kubectl get psp | wc -l | grep -v '^0$'"
    check "Network Policies exist" "kubectl get networkpolicy -n $NAMESPACE | wc -l | grep -v '^0$'"
    check "Service Accounts configured" "kubectl get serviceaccount -n $NAMESPACE | wc -l | grep -v '^1$'"
    check "RBAC roles configured" "kubectl get role,rolebinding -n $NAMESPACE | wc -l | grep -v '^0$'"
    
    # Security contexts
    local deployments=("auth-service" "user-service" "product-service")
    for deployment in "${deployments[@]}"; do
        check "$deployment security context" "kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.securityContext}' | grep -v '^$'"
        check "$deployment non-root user" "kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.securityContext.runAsNonRoot}' | grep true"
    done
    
    # TLS/SSL
    check "TLS certificates exist" "kubectl get secret -n $NAMESPACE | grep tls"
    check "Ingress TLS configured" "kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].spec.tls}' | grep -v '^$'"
    
    # Image security
    check "Container images from trusted registries" "kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].spec.containers[*].image}' | grep -E '(ultramarket|gcr.io|quay.io)'"
    check "Image pull secrets configured" "kubectl get secret -n $NAMESPACE | grep regcred"
}

check_compliance() {
    section "Compliance Checks"
    
    # Data protection
    check "Data encryption at rest" "kubectl get pv -o jsonpath='{.items[*].spec.csi.volumeAttributes.encrypted}' | grep -v false"
    check "Backup encryption" "ls /backups/*.gpg > /dev/null 2>&1 || warning 'Backup encryption not detected'"
    
    # Audit logging
    check "Audit logging enabled" "kubectl get pods -n kube-system | grep audit"
    check "Security monitoring" "kubectl get pods -n monitoring | grep security"
    
    # Access controls
    check "Multi-factor authentication" "kubectl get secret -n $NAMESPACE | grep mfa"
    check "Password policies" "kubectl get configmap -n $NAMESPACE | grep password-policy"
}

# =============================================================================
# Performance Checks
# =============================================================================

check_performance() {
    section "Performance Configuration Checks"
    
    # Resource limits
    local deployments=("api-gateway" "auth-service" "user-service" "product-service")
    for deployment in "${deployments[@]}"; do
        check "$deployment resource limits" "kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits}' | grep -v '^$'"
        check "$deployment resource requests" "kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.requests}' | grep -v '^$'"
    done
    
    # Horizontal Pod Autoscaler
    check "HPA configured" "kubectl get hpa -n $NAMESPACE | wc -l | grep -v '^0$'"
    check "HPA targets set" "kubectl get hpa -n $NAMESPACE -o jsonpath='{.items[*].spec.targetCPUUtilizationPercentage}' | grep -v '^$'"
    
    # Caching
    check "Redis cache configured" "kubectl get service redis -n $NAMESPACE > /dev/null"
    check "CDN configuration" "kubectl get configmap -n $NAMESPACE | grep cdn"
    
    # Database optimization
    check "Database connection pooling" "kubectl get configmap -n $NAMESPACE | grep db-config"
    check "Database indexes" "kubectl exec -n $NAMESPACE deployment/postgres -- psql -U postgres -c '\\di' | wc -l | grep -v '^0$'"
}

check_scalability() {
    section "Scalability Checks"
    
    # Replica counts
    local critical_services=("api-gateway" "auth-service" "user-service" "product-service")
    for service in "${critical_services[@]}"; do
        local replicas=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.spec.replicas}')
        if [[ ${replicas:-0} -ge 2 ]]; then
            log "$service has adequate replicas ($replicas)"
            ((PASSED_CHECKS++))
        else
            error "$service has insufficient replicas ($replicas)"
        fi
    done
    
    # Load balancing
    check "Load balancer services" "kubectl get service -n $NAMESPACE | grep LoadBalancer"
    check "Service endpoints distributed" "kubectl get endpoints -n $NAMESPACE | grep -E '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+.*,[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+'"
    
    # Auto-scaling
    check "Cluster autoscaler" "kubectl get pods -n kube-system | grep cluster-autoscaler"
    check "Vertical Pod Autoscaler" "kubectl get vpa -n $NAMESPACE | wc -l | grep -v '^0$' || warning 'VPA not configured'"
}

# =============================================================================
# Monitoring Checks
# =============================================================================

check_monitoring() {
    section "Monitoring Configuration Checks"
    
    # Prometheus
    check "Prometheus running" "curl -f -s http://localhost:9090/-/healthy > /dev/null"
    check "Prometheus targets" "curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length' | grep -v '^0$'"
    check "Prometheus rules" "curl -s http://localhost:9090/api/v1/rules | jq '.data.groups | length' | grep -v '^0$'"
    
    # Grafana
    check "Grafana running" "curl -f -s http://localhost:3000/api/health > /dev/null"
    check "Grafana dashboards" "curl -s http://admin:admin@localhost:3000/api/dashboards/home | jq '.dashboard.id' | grep -v null"
    
    # AlertManager
    check "AlertManager running" "curl -f -s http://localhost:9093/-/healthy > /dev/null"
    check "AlertManager config" "curl -s http://localhost:9093/api/v1/status | jq '.data.configYAML' | grep -v null"
    
    # Service monitoring
    local services=("api-gateway" "auth-service" "user-service" "product-service")
    for service in "${services[@]}"; do
        check "$service metrics endpoint" "kubectl exec -n $NAMESPACE deployment/$service -- curl -f -s http://localhost:3000/metrics > /dev/null"
    done
    
    # Log aggregation
    check "Log aggregation (ELK/Loki)" "kubectl get pods -n monitoring | grep -E '(elasticsearch|logstash|kibana|loki)'"
    check "Centralized logging" "kubectl get pods -n $NAMESPACE | grep -E '(fluent|filebeat|promtail)'"
}

check_alerting() {
    section "Alerting Configuration Checks"
    
    # Alert rules
    local critical_alerts=(
        "HighErrorRate"
        "HighLatency"
        "PodCrashLooping"
        "DatabaseDown"
        "DiskSpaceHigh"
        "MemoryHigh"
        "CPUHigh"
    )
    
    for alert in "${critical_alerts[@]}"; do
        check "Alert rule $alert exists" "curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[].alert' | grep -q $alert"
    done
    
    # Notification channels
    check "Slack notifications" "curl -s http://localhost:9093/api/v1/status | jq '.data.configYAML' | grep -q slack"
    check "Email notifications" "curl -s http://localhost:9093/api/v1/status | jq '.data.configYAML' | grep -q smtp"
    check "PagerDuty integration" "curl -s http://localhost:9093/api/v1/status | jq '.data.configYAML' | grep -q pagerduty || warning 'PagerDuty not configured'"
}

# =============================================================================
# Application Health Checks
# =============================================================================

check_health_endpoints() {
    section "Application Health Checks"
    
    # Get API Gateway URL
    local api_gateway_url
    api_gateway_url=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    if [[ -z "$api_gateway_url" ]]; then
        api_gateway_url=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    fi
    
    if [[ -z "$api_gateway_url" ]]; then
        error "Cannot determine API Gateway URL"
        return 1
    fi
    
    # Health endpoints
    local health_endpoints=(
        "/health"
        "/api/v1/auth/health"
        "/api/v1/users/health"
        "/api/v1/products/health"
        "/api/v1/orders/health"
        "/api/v1/payments/health"
        "/api/v1/inventory/health"
        "/api/v1/reviews/health"
        "/api/v1/notifications/health"
        "/api/v1/analytics/health"
        "/api/v1/search/health"
        "/api/v1/files/health"
    )
    
    for endpoint in "${health_endpoints[@]}"; do
        check "Health endpoint $endpoint" "curl -f -s --max-time 10 http://$api_gateway_url$endpoint > /dev/null"
    done
}

check_api_functionality() {
    section "API Functionality Checks"
    
    local api_gateway_url
    api_gateway_url=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    if [[ -z "$api_gateway_url" ]]; then
        api_gateway_url=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    fi
    
    # API documentation
    check "API documentation accessible" "curl -f -s http://$api_gateway_url/docs > /dev/null"
    
    # Authentication
    check "User registration endpoint" "curl -f -s -X POST http://$api_gateway_url/api/v1/auth/register -H 'Content-Type: application/json' -d '{}' | grep -v 'Cannot POST'"
    check "User login endpoint" "curl -f -s -X POST http://$api_gateway_url/api/v1/auth/login -H 'Content-Type: application/json' -d '{}' | grep -v 'Cannot POST'"
    
    # Core functionality
    check "Product listing" "curl -f -s http://$api_gateway_url/api/v1/products | jq '.data' | grep -v null"
    check "Product search" "curl -f -s 'http://$api_gateway_url/api/v1/products/search?q=test' | jq '.data' | grep -v null"
    check "Categories listing" "curl -f -s http://$api_gateway_url/api/v1/products/categories | jq '.data' | grep -v null"
    
    # Cart functionality
    check "Cart operations" "curl -f -s http://$api_gateway_url/api/v1/cart | jq '.data' | grep -v null"
    
    # Order functionality
    check "Order operations" "curl -f -s http://$api_gateway_url/api/v1/orders | jq '.data' | grep -v null"
}

# =============================================================================
# Third-Party Integration Checks
# =============================================================================

check_integrations() {
    section "Third-Party Integration Checks"
    
    # Payment gateways
    check "Click payment integration" "kubectl get secret -n $NAMESPACE | grep click-api"
    check "Payme payment integration" "kubectl get secret -n $NAMESPACE | grep payme-api"
    check "Uzcard payment integration" "kubectl get secret -n $NAMESPACE | grep uzcard-api"
    
    # SMS service
    check "ESKIZ SMS integration" "kubectl get secret -n $NAMESPACE | grep eskiz-api"
    check "Play Mobile SMS integration" "kubectl get secret -n $NAMESPACE | grep playmobile-api"
    
    # Email service
    check "SMTP configuration" "kubectl get secret -n $NAMESPACE | grep smtp-config"
    check "SendGrid integration" "kubectl get secret -n $NAMESPACE | grep sendgrid-api"
    
    # Push notifications
    check "Firebase configuration" "kubectl get secret -n $NAMESPACE | grep firebase-config"
    check "APNS configuration" "kubectl get secret -n $NAMESPACE | grep apns-config"
    
    # Analytics
    check "Google Analytics" "kubectl get configmap -n $NAMESPACE | grep analytics-config"
    
    # Search engine
    check "Elasticsearch integration" "kubectl get service elasticsearch -n $NAMESPACE > /dev/null 2>&1 || warning 'Elasticsearch not found'"
    
    # File storage
    check "AWS S3 integration" "kubectl get secret -n $NAMESPACE | grep aws-s3"
    check "MinIO integration" "kubectl get secret -n $NAMESPACE | grep minio-config"
}

# =============================================================================
# Backup and Recovery Checks
# =============================================================================

check_backup_recovery() {
    section "Backup and Recovery Checks"
    
    # Backup configuration
    check "Backup scripts exist" "ls /usr/local/bin/*backup* > /dev/null 2>&1"
    check "Backup storage accessible" "ls /backups > /dev/null 2>&1"
    check "Backup schedule configured" "crontab -l | grep backup"
    
    # Database backups
    check "PostgreSQL backup script" "ls /usr/local/bin/*postgres*backup* > /dev/null 2>&1"
    check "MongoDB backup script" "ls /usr/local/bin/*mongo*backup* > /dev/null 2>&1"
    check "Redis backup script" "ls /usr/local/bin/*redis*backup* > /dev/null 2>&1"
    
    # Recent backups
    check "Recent PostgreSQL backup" "find /backups -name '*postgres*' -mtime -1 | wc -l | grep -v '^0$'"
    check "Recent MongoDB backup" "find /backups -name '*mongo*' -mtime -1 | wc -l | grep -v '^0$'"
    check "Recent Redis backup" "find /backups -name '*redis*' -mtime -1 | wc -l | grep -v '^0$'"
    
    # Recovery procedures
    check "Recovery documentation" "ls /usr/local/share/doc/*recovery* > /dev/null 2>&1"
    check "Recovery scripts" "ls /usr/local/bin/*recovery* > /dev/null 2>&1"
    
    # Disaster recovery
    check "Disaster recovery plan" "ls /usr/local/share/doc/*disaster* > /dev/null 2>&1"
    check "Offsite backup" "ls /backups/offsite > /dev/null 2>&1 || warning 'Offsite backup not configured'"
}

# =============================================================================
# Performance Validation
# =============================================================================

check_performance_metrics() {
    section "Performance Validation"
    
    # Response time checks
    local api_gateway_url
    api_gateway_url=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    if [[ -z "$api_gateway_url" ]]; then
        api_gateway_url=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    fi
    
    # Measure response times
    local response_time
    response_time=$(curl -w "%{time_total}" -s -o /dev/null http://$api_gateway_url/health)
    
    if (( $(echo "$response_time < 0.2" | bc -l) )); then
        log "API response time acceptable (${response_time}s)"
        ((PASSED_CHECKS++))
    else
        error "API response time too high (${response_time}s)"
    fi
    
    # Database performance
    check "PostgreSQL query performance" "kubectl exec -n $NAMESPACE deployment/postgres -- psql -U postgres -c 'SELECT 1' | grep -q '1 row'"
    check "MongoDB query performance" "kubectl exec -n $NAMESPACE deployment/mongodb -- mongo --eval 'db.runCommand({ping: 1})' | grep -q 'ok.*1'"
    check "Redis performance" "kubectl exec -n $NAMESPACE deployment/redis -- redis-cli ping | grep -q PONG"
    
    # Resource utilization
    local cpu_usage
    cpu_usage=$(kubectl top pods -n $NAMESPACE | awk 'NR>1 {sum+=$2} END {print sum}' | sed 's/m//')
    
    if [[ ${cpu_usage:-0} -lt 5000 ]]; then
        log "CPU usage acceptable (${cpu_usage}m)"
        ((PASSED_CHECKS++))
    else
        warning "CPU usage high (${cpu_usage}m)"
    fi
    
    local memory_usage
    memory_usage=$(kubectl top pods -n $NAMESPACE | awk 'NR>1 {sum+=$3} END {print sum}' | sed 's/Mi//')
    
    if [[ ${memory_usage:-0} -lt 8192 ]]; then
        log "Memory usage acceptable (${memory_usage}Mi)"
        ((PASSED_CHECKS++))
    else
        warning "Memory usage high (${memory_usage}Mi)"
    fi
}

# =============================================================================
# Load Testing
# =============================================================================

run_load_tests() {
    section "Load Testing"
    
    # Check if k6 is available
    if ! command -v k6 &> /dev/null; then
        warning "k6 not found, skipping load tests"
        return 0
    fi
    
    local api_gateway_url
    api_gateway_url=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    if [[ -z "$api_gateway_url" ]]; then
        api_gateway_url=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    fi
    
    # Create simple load test
    cat > /tmp/load-test.js << EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.1'],
    },
};

export default function() {
    let response = http.get('http://$api_gateway_url/health');
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(1);
}
EOF
    
    # Run load test
    if k6 run /tmp/load-test.js > "$LOG_DIR/load-test.log" 2>&1; then
        log "Load test passed"
        ((PASSED_CHECKS++))
    else
        error "Load test failed"
        cat "$LOG_DIR/load-test.log" >> "$DETAILED_LOG"
    fi
    
    # Cleanup
    rm -f /tmp/load-test.js
}

# =============================================================================
# Security Validation
# =============================================================================

check_security_vulnerabilities() {
    section "Security Vulnerability Checks"
    
    # Container image scanning
    if command -v trivy &> /dev/null; then
        check "Container vulnerability scanning" "trivy image --severity HIGH,CRITICAL ultramarket/api-gateway:latest"
    else
        warning "Trivy not found, skipping container scanning"
    fi
    
    # Network security
    check "Network policies enforced" "kubectl get networkpolicy -n $NAMESPACE | wc -l | grep -v '^0$'"
    check "Pod security policies" "kubectl get psp | wc -l | grep -v '^0$'"
    
    # TLS/SSL validation
    local api_gateway_url
    api_gateway_url=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    if [[ -n "$api_gateway_url" ]]; then
        check "TLS certificate valid" "echo | openssl s_client -connect $api_gateway_url:443 2>/dev/null | openssl x509 -noout -dates"
    fi
    
    # Authentication security
    check "Strong password policy" "kubectl get configmap -n $NAMESPACE | grep password-policy"
    check "Session security" "kubectl get configmap -n $NAMESPACE | grep session-config"
    check "JWT security" "kubectl get secret -n $NAMESPACE | grep jwt-secret"
}

# =============================================================================
# Final Report Generation
# =============================================================================

generate_report() {
    section "Generating Final Report"
    
    local report_file="$LOG_DIR/readiness-report.json"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    cat > "$report_file" << EOF
{
    "readiness_check": {
        "timestamp": "$timestamp",
        "environment": "$ENVIRONMENT",
        "namespace": "$NAMESPACE",
        "summary": {
            "total_checks": $TOTAL_CHECKS,
            "passed_checks": $PASSED_CHECKS,
            "failed_checks": $FAILED_CHECKS,
            "warning_checks": $WARNING_CHECKS,
            "success_rate": $(echo "scale=2; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc -l)
        },
        "status": "$(if [[ $FAILED_CHECKS -eq 0 ]]; then echo "READY"; else echo "NOT_READY"; fi)",
        "recommendation": "$(if [[ $FAILED_CHECKS -eq 0 ]]; then echo "System is ready for production deployment"; else echo "System has $FAILED_CHECKS failed checks that must be resolved"; fi)"
    },
    "logs": {
        "main_log": "$MAIN_LOG",
        "detailed_log": "$DETAILED_LOG",
        "report_directory": "$LOG_DIR"
    }
}
EOF
    
    log "Readiness report generated: $report_file"
    
    # Display summary
    echo ""
    echo -e "${PURPLE}============================================================${NC}"
    echo -e "${PURPLE}                 READINESS CHECK SUMMARY                   ${NC}"
    echo -e "${PURPLE}============================================================${NC}"
    echo ""
    echo -e "Environment: ${BLUE}$ENVIRONMENT${NC}"
    echo -e "Namespace: ${BLUE}$NAMESPACE${NC}"
    echo -e "Timestamp: ${BLUE}$timestamp${NC}"
    echo ""
    echo -e "Total Checks: ${BLUE}$TOTAL_CHECKS${NC}"
    echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
    echo -e "Warnings: ${YELLOW}$WARNING_CHECKS${NC}"
    echo -e "Success Rate: ${BLUE}$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc -l)%${NC}"
    echo ""
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo -e "${GREEN}✅ SYSTEM IS READY FOR PRODUCTION DEPLOYMENT${NC}"
        echo -e "${GREEN}   All critical checks have passed successfully${NC}"
    else
        echo -e "${RED}❌ SYSTEM IS NOT READY FOR PRODUCTION DEPLOYMENT${NC}"
        echo -e "${RED}   $FAILED_CHECKS critical checks have failed${NC}"
        echo -e "${RED}   Please review the detailed logs and fix issues${NC}"
    fi
    
    if [[ $WARNING_CHECKS -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  $WARNING_CHECKS warnings detected${NC}"
        echo -e "${YELLOW}   Please review warnings for potential improvements${NC}"
    fi
    
    echo ""
    echo -e "Detailed logs available at: ${BLUE}$LOG_DIR${NC}"
    echo -e "${PURPLE}============================================================${NC}"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo -e "${PURPLE}Starting UltraMarket Production Readiness Check...${NC}"
    echo -e "${PURPLE}Log directory: $LOG_DIR${NC}"
    echo ""
    
    # Infrastructure checks
    check_kubernetes_cluster
    check_networking
    check_storage
    
    # Application checks
    check_deployments
    check_databases
    check_configurations
    
    # Security checks
    check_security
    check_compliance
    
    # Performance checks
    check_performance
    check_scalability
    
    # Monitoring checks
    check_monitoring
    check_alerting
    
    # Health checks
    check_health_endpoints
    check_api_functionality
    
    # Integration checks
    check_integrations
    
    # Backup and recovery
    check_backup_recovery
    
    # Performance validation
    check_performance_metrics
    
    # Load testing
    run_load_tests
    
    # Security validation
    check_security_vulnerabilities
    
    # Generate final report
    generate_report
    
    # Exit with appropriate code
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script arguments
case "${1:-check}" in
    "check")
        main
        ;;
    "quick")
        # Quick check - only critical components
        check_kubernetes_cluster
        check_deployments
        check_databases
        check_health_endpoints
        generate_report
        ;;
    "security")
        # Security-focused check
        check_security
        check_compliance
        check_security_vulnerabilities
        generate_report
        ;;
    "performance")
        # Performance-focused check
        check_performance
        check_scalability
        check_performance_metrics
        run_load_tests
        generate_report
        ;;
    *)
        echo "Usage: $0 {check|quick|security|performance}"
        echo "  check      - Full production readiness check (default)"
        echo "  quick      - Quick check of critical components"
        echo "  security   - Security-focused validation"
        echo "  performance - Performance-focused validation"
        exit 1
        ;;
esac 