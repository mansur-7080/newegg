#!/bin/bash

# =============================================================================
# UltraMarket Final Production Deployment Script
# Professional Production Deployment Automation
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${DEPLOYMENT_ENV:-production}
NAMESPACE=${NAMESPACE:-ultramarket}
CLUSTER_NAME=${CLUSTER_NAME:-ultramarket-prod}
REGION=${REGION:-us-east-1}
BACKUP_ENABLED=${BACKUP_ENABLED:-true}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-300}
ROLLBACK_ON_FAILURE=${ROLLBACK_ON_FAILURE:-true}

# Logging
LOG_FILE="/var/log/ultramarket-deployment-$(date +%Y%m%d_%H%M%S).log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Error handling
handle_error() {
    error "Deployment failed at line $1"
    if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
        warning "Initiating rollback..."
        rollback_deployment
    fi
    exit 1
}

trap 'handle_error $LINENO' ERR

# =============================================================================
# Pre-deployment Checks
# =============================================================================

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "docker" "helm" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check Kubernetes cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log "Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
    fi
    
    # Check Docker registry access
    if ! docker info &> /dev/null; then
        error "Docker is not running or accessible"
        exit 1
    fi
    
    log "Prerequisites check completed successfully"
}

# =============================================================================
# Backup Operations
# =============================================================================

create_backup() {
    if [[ "$BACKUP_ENABLED" != "true" ]]; then
        info "Backup disabled, skipping..."
        return 0
    fi
    
    log "Creating pre-deployment backup..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="/backups/ultramarket-${backup_timestamp}"
    
    mkdir -p "$backup_dir"
    
    # Database backup
    log "Backing up databases..."
    
    # PostgreSQL backup
    kubectl exec -n "$NAMESPACE" deployment/postgres -- pg_dumpall -U postgres > "$backup_dir/postgres_backup.sql"
    
    # MongoDB backup
    kubectl exec -n "$NAMESPACE" deployment/mongodb -- mongodump --archive > "$backup_dir/mongodb_backup.archive"
    
    # Redis backup
    kubectl exec -n "$NAMESPACE" deployment/redis -- redis-cli BGSAVE
    kubectl cp "$NAMESPACE/redis-0:/data/dump.rdb" "$backup_dir/redis_backup.rdb"
    
    # Kubernetes resources backup
    kubectl get all -n "$NAMESPACE" -o yaml > "$backup_dir/kubernetes_resources.yaml"
    
    # Create backup manifest
    cat > "$backup_dir/backup_manifest.json" << EOF
{
    "timestamp": "$backup_timestamp",
    "environment": "$DEPLOYMENT_ENV",
    "namespace": "$NAMESPACE",
    "cluster": "$CLUSTER_NAME",
    "backup_type": "pre_deployment",
    "files": [
        "postgres_backup.sql",
        "mongodb_backup.archive",
        "redis_backup.rdb",
        "kubernetes_resources.yaml"
    ]
}
EOF
    
    # Compress backup
    tar -czf "/backups/ultramarket-backup-${backup_timestamp}.tar.gz" -C "/backups" "ultramarket-${backup_timestamp}"
    rm -rf "$backup_dir"
    
    log "Backup created: /backups/ultramarket-backup-${backup_timestamp}.tar.gz"
    echo "$backup_timestamp" > "/tmp/last_backup_timestamp"
}

# =============================================================================
# Docker Image Management
# =============================================================================

build_and_push_images() {
    log "Building and pushing Docker images..."
    
    local services=(
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
        "recommendation-service"
        "api-gateway"
        "admin-service"
        "file-service"
    )
    
    local registry="${DOCKER_REGISTRY:-ultramarket}"
    local tag="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
    
    for service in "${services[@]}"; do
        log "Building $service..."
        
        if [[ -f "microservices/*/$service/Dockerfile" ]]; then
            local dockerfile_path=$(find microservices -name "$service" -type d)/Dockerfile
            local context_path=$(dirname "$dockerfile_path")
            
            docker build -t "$registry/$service:$tag" -f "$dockerfile_path" "$context_path"
            docker push "$registry/$service:$tag"
            
            log "$service image built and pushed successfully"
        else
            warning "Dockerfile not found for $service, skipping..."
        fi
    done
    
    # Build frontend images
    log "Building frontend images..."
    
    # Web app
    docker build -t "$registry/web-app:$tag" -f frontend/web-app/Dockerfile.prod frontend/web-app/
    docker push "$registry/web-app:$tag"
    
    # Admin panel
    docker build -t "$registry/admin-panel:$tag" -f frontend/admin-panel/Dockerfile.prod frontend/admin-panel/
    docker push "$registry/admin-panel:$tag"
    
    log "All images built and pushed successfully"
}

# =============================================================================
# Database Initialization
# =============================================================================

initialize_databases() {
    log "Initializing databases..."
    
    # Wait for databases to be ready
    log "Waiting for databases to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=mongodb -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n "$NAMESPACE" --timeout=300s
    
    # Run database migrations
    log "Running database migrations..."
    
    # PostgreSQL migrations
    kubectl exec -n "$NAMESPACE" deployment/postgres -- psql -U postgres -f /docker-entrypoint-initdb.d/init.sql
    
    # Apply optimization script
    if [[ -f "scripts/database/comprehensive-database-optimization.sql" ]]; then
        kubectl cp scripts/database/comprehensive-database-optimization.sql "$NAMESPACE/postgres-0:/tmp/optimization.sql"
        kubectl exec -n "$NAMESPACE" deployment/postgres -- psql -U postgres -f /tmp/optimization.sql
    fi
    
    # MongoDB initialization
    kubectl exec -n "$NAMESPACE" deployment/mongodb -- mongo /docker-entrypoint-initdb.d/init.js
    
    # Seed initial data
    log "Seeding initial data..."
    if [[ -f "scripts/database/seed-data.js" ]]; then
        kubectl cp scripts/database/seed-data.js "$NAMESPACE/mongodb-0:/tmp/seed-data.js"
        kubectl exec -n "$NAMESPACE" deployment/mongodb -- mongo ultramarket /tmp/seed-data.js
    fi
    
    log "Database initialization completed"
}

# =============================================================================
# Kubernetes Deployment
# =============================================================================

deploy_infrastructure() {
    log "Deploying infrastructure components..."
    
    # Deploy databases
    kubectl apply -f infrastructure/kubernetes/databases.yaml -n "$NAMESPACE"
    
    # Deploy monitoring
    kubectl apply -f infrastructure/kubernetes/monitoring.yaml -n "$NAMESPACE"
    
    # Deploy API Gateway
    kubectl apply -f infrastructure/kubernetes/api-gateway.yaml -n "$NAMESPACE"
    
    log "Infrastructure deployment completed"
}

deploy_microservices() {
    log "Deploying microservices..."
    
    # Deploy production configuration
    kubectl apply -f infrastructure/kubernetes/production/complete-production-deployment.yaml -n "$NAMESPACE"
    
    # Wait for deployments to be ready
    log "Waiting for deployments to be ready..."
    
    local deployments=(
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
        "api-gateway"
    )
    
    for deployment in "${deployments[@]}"; do
        kubectl wait --for=condition=available deployment/"$deployment" -n "$NAMESPACE" --timeout=300s
        log "$deployment is ready"
    done
    
    log "All microservices deployed successfully"
}

# =============================================================================
# Health Checks and Validation
# =============================================================================

run_health_checks() {
    log "Running health checks..."
    
    local api_gateway_url=$(kubectl get service api-gateway -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [[ -z "$api_gateway_url" ]]; then
        api_gateway_url=$(kubectl get service api-gateway -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    fi
    
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
    )
    
    local failed_checks=0
    
    for endpoint in "${health_endpoints[@]}"; do
        info "Checking $endpoint..."
        
        if curl -f -s --max-time 30 "http://$api_gateway_url$endpoint" > /dev/null; then
            log "✓ $endpoint - OK"
        else
            error "✗ $endpoint - FAILED"
            ((failed_checks++))
        fi
    done
    
    if [[ $failed_checks -gt 0 ]]; then
        error "$failed_checks health checks failed"
        return 1
    fi
    
    log "All health checks passed"
    return 0
}

validate_deployment() {
    log "Validating deployment..."
    
    # Check all pods are running
    local failed_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers | wc -l)
    if [[ $failed_pods -gt 0 ]]; then
        error "$failed_pods pods are not running"
        kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running
        return 1
    fi
    
    # Check services
    local services=$(kubectl get services -n "$NAMESPACE" --no-headers | wc -l)
    if [[ $services -lt 10 ]]; then
        error "Expected at least 10 services, found $services"
        return 1
    fi
    
    # Run health checks
    if ! run_health_checks; then
        return 1
    fi
    
    # Test critical user journeys
    log "Testing critical user journeys..."
    
    # User registration test
    local test_user_data='{"email":"test@ultramarket.uz","password":"Test123!","name":"Test User"}'
    local register_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$test_user_data" \
        "http://$api_gateway_url/api/v1/auth/register")
    
    if [[ $(echo "$register_response" | jq -r '.success') == "true" ]]; then
        log "✓ User registration test - OK"
    else
        error "✗ User registration test - FAILED"
        return 1
    fi
    
    # Product search test
    local search_response=$(curl -s "http://$api_gateway_url/api/v1/products/search?q=laptop")
    if [[ $(echo "$search_response" | jq -r '.data | length') -gt 0 ]]; then
        log "✓ Product search test - OK"
    else
        warning "Product search test returned no results (may be expected if no products seeded)"
    fi
    
    log "Deployment validation completed successfully"
    return 0
}

# =============================================================================
# Monitoring and Alerting Setup
# =============================================================================

setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Deploy monitoring stack
    if [[ -f "infrastructure/monitoring/comprehensive-monitoring-setup.yml" ]]; then
        docker-compose -f infrastructure/monitoring/comprehensive-monitoring-setup.yml up -d
        log "Monitoring stack deployed"
    fi
    
    # Configure alerts
    log "Configuring alerts..."
    
    # Wait for Prometheus to be ready
    local prometheus_url="http://localhost:9090"
    local timeout=60
    local count=0
    
    while ! curl -f -s "$prometheus_url/-/ready" > /dev/null; do
        if [[ $count -ge $timeout ]]; then
            error "Prometheus failed to start within $timeout seconds"
            return 1
        fi
        sleep 1
        ((count++))
    done
    
    log "Prometheus is ready"
    
    # Test alert rules
    local alert_rules=$(curl -s "$prometheus_url/api/v1/rules" | jq -r '.data.groups | length')
    if [[ $alert_rules -gt 0 ]]; then
        log "✓ Alert rules loaded: $alert_rules rule groups"
    else
        warning "No alert rules found"
    fi
    
    log "Monitoring setup completed"
}

# =============================================================================
# Performance Optimization
# =============================================================================

optimize_performance() {
    log "Applying performance optimizations..."
    
    # Run performance optimization script
    if [[ -f "scripts/performance/comprehensive-performance-optimization.js" ]]; then
        node scripts/performance/comprehensive-performance-optimization.js
        log "Performance optimizations applied"
    fi
    
    # Configure resource limits
    log "Configuring resource limits..."
    
    # Apply HPA (Horizontal Pod Autoscaler)
    kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: $NAMESPACE
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
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
EOF
    
    log "Performance optimization completed"
}

# =============================================================================
# Security Hardening
# =============================================================================

apply_security_hardening() {
    log "Applying security hardening..."
    
    # Apply network policies
    kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ultramarket-network-policy
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: $NAMESPACE
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: $NAMESPACE
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 443
EOF
    
    # Apply pod security policies
    kubectl apply -f - <<EOF
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: ultramarket-psp
  namespace: $NAMESPACE
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
EOF
    
    log "Security hardening applied"
}

# =============================================================================
# Rollback Operations
# =============================================================================

rollback_deployment() {
    error "Initiating rollback..."
    
    # Get last backup timestamp
    local backup_timestamp
    if [[ -f "/tmp/last_backup_timestamp" ]]; then
        backup_timestamp=$(cat /tmp/last_backup_timestamp)
    else
        error "No backup timestamp found, cannot rollback"
        return 1
    fi
    
    log "Rolling back to backup: $backup_timestamp"
    
    # Rollback Kubernetes deployments
    kubectl rollout undo deployment --all -n "$NAMESPACE"
    
    # Restore databases if needed
    if [[ -f "/backups/ultramarket-backup-${backup_timestamp}.tar.gz" ]]; then
        log "Restoring databases..."
        
        # Extract backup
        tar -xzf "/backups/ultramarket-backup-${backup_timestamp}.tar.gz" -C "/tmp"
        
        # Restore PostgreSQL
        kubectl exec -n "$NAMESPACE" deployment/postgres -- psql -U postgres < "/tmp/ultramarket-${backup_timestamp}/postgres_backup.sql"
        
        # Restore MongoDB
        kubectl exec -n "$NAMESPACE" deployment/mongodb -- mongorestore --archive < "/tmp/ultramarket-${backup_timestamp}/mongodb_backup.archive"
        
        # Cleanup
        rm -rf "/tmp/ultramarket-${backup_timestamp}"
        
        log "Database rollback completed"
    fi
    
    log "Rollback completed"
}

# =============================================================================
# Main Deployment Flow
# =============================================================================

main() {
    log "Starting UltraMarket production deployment..."
    log "Environment: $DEPLOYMENT_ENV"
    log "Namespace: $NAMESPACE"
    log "Cluster: $CLUSTER_NAME"
    
    # Pre-deployment
    check_prerequisites
    create_backup
    
    # Build and deploy
    build_and_push_images
    deploy_infrastructure
    initialize_databases
    deploy_microservices
    
    # Post-deployment
    setup_monitoring
    optimize_performance
    apply_security_hardening
    
    # Validation
    if validate_deployment; then
        log "✅ Deployment completed successfully!"
        log "🚀 UltraMarket is now live in production!"
        
        # Generate deployment report
        generate_deployment_report
        
        # Send success notification
        send_deployment_notification "success"
    else
        error "❌ Deployment validation failed!"
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback_deployment
        fi
        send_deployment_notification "failure"
        exit 1
    fi
}

# =============================================================================
# Reporting and Notifications
# =============================================================================

generate_deployment_report() {
    log "Generating deployment report..."
    
    local report_file="/tmp/deployment-report-$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "deployment": {
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "environment": "$DEPLOYMENT_ENV",
        "namespace": "$NAMESPACE",
        "cluster": "$CLUSTER_NAME",
        "status": "success",
        "duration": "$(date -d@$(($(date +%s) - $start_time)) -u +%H:%M:%S)"
    },
    "services": {
        "total": $(kubectl get deployments -n "$NAMESPACE" --no-headers | wc -l),
        "running": $(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Running --no-headers | wc -l),
        "failed": $(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers | wc -l)
    },
    "resources": {
        "cpu_requests": "$(kubectl top nodes | awk 'NR>1 {sum+=$3} END {print sum}')m",
        "memory_requests": "$(kubectl top nodes | awk 'NR>1 {sum+=$5} END {print sum}')Mi"
    },
    "endpoints": {
        "api_gateway": "http://$(kubectl get service api-gateway -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')",
        "monitoring": "http://localhost:3000",
        "prometheus": "http://localhost:9090"
    }
}
EOF
    
    log "Deployment report generated: $report_file"
}

send_deployment_notification() {
    local status=$1
    
    if [[ "$status" == "success" ]]; then
        log "🎉 Deployment notification: SUCCESS"
    else
        error "🚨 Deployment notification: FAILURE"
    fi
    
    # Here you would integrate with your notification service
    # kubectl exec -n "$NAMESPACE" deployment/notification-service -- \
    #     node -e "require('./src/services/notification').sendDeploymentNotification('$status')"
}

# =============================================================================
# Script Execution
# =============================================================================

start_time=$(date +%s)

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback_deployment
        ;;
    "health-check")
        run_health_checks
        ;;
    "validate")
        validate_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|validate}"
        exit 1
        ;;
esac

log "Script execution completed in $(date -d@$(($(date +%s) - $start_time)) -u +%H:%M:%S)"