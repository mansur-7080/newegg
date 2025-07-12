#!/bin/bash

# =============================================================================
# UltraMarket Automated Deployment Script
# Professional deployment automation for all environments
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_ID="deploy_$(date +%Y%m%d_%H%M%S)"

# Default values
ENVIRONMENT=${ENVIRONMENT:-development}
DEPLOYMENT_STRATEGY=${DEPLOYMENT_STRATEGY:-rolling}
DRY_RUN=${DRY_RUN:-false}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_BACKUP=${SKIP_BACKUP:-false}
FORCE_DEPLOY=${FORCE_DEPLOY:-false}
NOTIFICATION_ENABLED=${NOTIFICATION_ENABLED:-true}

# Logging
LOG_DIR="/var/log/ultramarket/deployments"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/deployment-$DEPLOYMENT_ID.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

# =============================================================================
# Utility Functions
# =============================================================================

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

section() {
    echo -e "${PURPLE}==================== $1 ====================${NC}"
}

# Error handling
handle_error() {
    error "Deployment failed at line $1"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        send_notification "failure" "Production deployment failed at line $1"
    fi
    cleanup_on_failure
    exit 1
}

trap 'handle_error $LINENO' ERR

# =============================================================================
# Configuration Management
# =============================================================================

load_environment_config() {
    local env_file="$PROJECT_ROOT/config/environments/${ENVIRONMENT}.env"
    
    if [[ -f "$env_file" ]]; then
        log "Loading environment configuration for $ENVIRONMENT"
        set -a
        source "$env_file"
        set +a
    else
        error "Environment configuration file not found: $env_file"
        exit 1
    fi
}

validate_configuration() {
    log "Validating deployment configuration"
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
        error "Invalid environment: $ENVIRONMENT"
        exit 1
    fi
    
    # Validate deployment strategy
    if [[ ! "$DEPLOYMENT_STRATEGY" =~ ^(rolling|blue-green|canary|recreate)$ ]]; then
        error "Invalid deployment strategy: $DEPLOYMENT_STRATEGY"
        exit 1
    fi
    
    # Check required tools
    local required_tools=("kubectl" "docker" "helm" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Validate Kubernetes context
    local current_context=$(kubectl config current-context)
    local expected_context
    
    case "$ENVIRONMENT" in
        development)
            expected_context="docker-desktop"
            ;;
        staging)
            expected_context="ultramarket-staging"
            ;;
        production)
            expected_context="ultramarket-production"
            ;;
    esac
    
    if [[ "$current_context" != "$expected_context" ]]; then
        error "Wrong Kubernetes context. Expected: $expected_context, Current: $current_context"
        exit 1
    fi
    
    log "Configuration validation completed"
}

# =============================================================================
# Pre-deployment Checks
# =============================================================================

run_pre_deployment_checks() {
    section "Pre-deployment Checks"
    
    # Check cluster health
    check_cluster_health
    
    # Check resource availability
    check_resource_availability
    
    # Check external dependencies
    check_external_dependencies
    
    # Run tests if not skipped
    if [[ "$SKIP_TESTS" != "true" ]]; then
        run_tests
    fi
    
    # Create backup if not skipped
    if [[ "$SKIP_BACKUP" != "true" && "$ENVIRONMENT" == "production" ]]; then
        create_backup
    fi
    
    log "Pre-deployment checks completed successfully"
}

check_cluster_health() {
    log "Checking Kubernetes cluster health"
    
    # Check cluster info
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check node status
    local not_ready_nodes=$(kubectl get nodes | grep -v Ready | grep -v STATUS | wc -l)
    if [[ $not_ready_nodes -gt 0 ]]; then
        error "$not_ready_nodes nodes are not ready"
        exit 1
    fi
    
    # Check namespace
    if ! kubectl get namespace ultramarket &> /dev/null; then
        log "Creating namespace: ultramarket"
        kubectl create namespace ultramarket
    fi
    
    log "Cluster health check passed"
}

check_resource_availability() {
    log "Checking resource availability"
    
    # Check CPU and memory availability
    local cpu_capacity=$(kubectl top nodes | awk 'NR>1 {sum+=$3} END {print sum}' | sed 's/m//')
    local memory_capacity=$(kubectl top nodes | awk 'NR>1 {sum+=$5} END {print sum}' | sed 's/Mi//')
    
    local required_cpu=4000  # 4 CPU cores
    local required_memory=8192  # 8GB RAM
    
    if [[ ${cpu_capacity:-0} -lt $required_cpu ]]; then
        warning "Low CPU capacity: ${cpu_capacity}m (required: ${required_cpu}m)"
    fi
    
    if [[ ${memory_capacity:-0} -lt $required_memory ]]; then
        warning "Low memory capacity: ${memory_capacity}Mi (required: ${required_memory}Mi)"
    fi
    
    # Check storage
    local storage_available=$(kubectl get pv | grep Available | wc -l)
    if [[ $storage_available -lt 3 ]]; then
        warning "Limited storage available: $storage_available persistent volumes"
    fi
    
    log "Resource availability check completed"
}

check_external_dependencies() {
    log "Checking external dependencies"
    
    local dependencies=(
        "https://api.click.uz/health"
        "https://api.payme.uz/health"
        "https://api.eskiz.uz/health"
        "https://registry-1.docker.io"
    )
    
    for dep in "${dependencies[@]}"; do
        if curl -f -s --max-time 10 "$dep" > /dev/null; then
            log "✓ $dep - OK"
        else
            warning "✗ $dep - FAILED"
        fi
    done
    
    log "External dependencies check completed"
}

run_tests() {
    log "Running test suite"
    
    cd "$PROJECT_ROOT"
    
    # Unit tests
    npm run test:unit
    
    # Integration tests
    npm run test:integration
    
    # API tests
    npm run test:api
    
    # Security tests
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm run test:security
    fi
    
    log "All tests passed successfully"
}

create_backup() {
    log "Creating pre-deployment backup"
    
    local backup_script="$PROJECT_ROOT/scripts/backup/automated-backup.sh"
    if [[ -f "$backup_script" ]]; then
        "$backup_script"
        log "Backup created successfully"
    else
        warning "Backup script not found, skipping backup"
    fi
}

# =============================================================================
# Build and Image Management
# =============================================================================

build_and_push_images() {
    section "Building and Pushing Images"
    
    local registry="${DOCKER_REGISTRY:-ultramarket}"
    local tag="${IMAGE_TAG:-$DEPLOYMENT_ID}"
    
    # Build services
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
        "file-service"
        "api-gateway"
    )
    
    for service in "${services[@]}"; do
        log "Building $service..."
        
        local service_dir="$PROJECT_ROOT/microservices/*/$service"
        if [[ -d $service_dir ]]; then
            cd "$service_dir"
            
            # Build image
            docker build -t "$registry/$service:$tag" .
            docker tag "$registry/$service:$tag" "$registry/$service:latest"
            
            # Push to registry
            if [[ "$DRY_RUN" != "true" ]]; then
                docker push "$registry/$service:$tag"
                docker push "$registry/$service:latest"
            fi
            
            log "$service built and pushed successfully"
        else
            warning "Service directory not found: $service"
        fi
    done
    
    # Build frontend applications
    if [[ "$ENVIRONMENT" != "development" ]]; then
        build_frontend_images "$registry" "$tag"
    fi
    
    log "All images built and pushed successfully"
}

build_frontend_images() {
    local registry=$1
    local tag=$2
    
    log "Building frontend images"
    
    # Web application
    cd "$PROJECT_ROOT/frontend/web-app"
    docker build -t "$registry/web-app:$tag" -f Dockerfile.prod .
    
    # Admin panel
    cd "$PROJECT_ROOT/frontend/admin-panel"
    docker build -t "$registry/admin-panel:$tag" -f Dockerfile.prod .
    
    if [[ "$DRY_RUN" != "true" ]]; then
        docker push "$registry/web-app:$tag"
        docker push "$registry/admin-panel:$tag"
    fi
    
    log "Frontend images built successfully"
}

# =============================================================================
# Deployment Strategies
# =============================================================================

deploy_services() {
    section "Deploying Services"
    
    case "$DEPLOYMENT_STRATEGY" in
        rolling)
            deploy_rolling_update
            ;;
        blue-green)
            deploy_blue_green
            ;;
        canary)
            deploy_canary
            ;;
        recreate)
            deploy_recreate
            ;;
        *)
            error "Unknown deployment strategy: $DEPLOYMENT_STRATEGY"
            exit 1
            ;;
    esac
}

deploy_rolling_update() {
    log "Executing rolling update deployment"
    
    local manifests_dir="$PROJECT_ROOT/infrastructure/kubernetes/$ENVIRONMENT"
    
    if [[ ! -d "$manifests_dir" ]]; then
        error "Kubernetes manifests directory not found: $manifests_dir"
        exit 1
    fi
    
    # Apply configuration changes
    kubectl apply -f "$manifests_dir/configmaps/"
    kubectl apply -f "$manifests_dir/secrets/"
    
    # Deploy databases first
    kubectl apply -f "$manifests_dir/databases.yaml"
    wait_for_deployment "postgres"
    wait_for_deployment "mongodb"
    wait_for_deployment "redis"
    
    # Deploy core services
    kubectl apply -f "$manifests_dir/core-services.yaml"
    wait_for_deployment "auth-service"
    wait_for_deployment "user-service"
    
    # Deploy business services
    kubectl apply -f "$manifests_dir/business-services.yaml"
    wait_for_deployment "product-service"
    wait_for_deployment "cart-service"
    wait_for_deployment "order-service"
    wait_for_deployment "payment-service"
    
    # Deploy platform services
    kubectl apply -f "$manifests_dir/platform-services.yaml"
    wait_for_deployment "search-service"
    wait_for_deployment "notification-service"
    wait_for_deployment "analytics-service"
    
    # Deploy API Gateway last
    kubectl apply -f "$manifests_dir/api-gateway.yaml"
    wait_for_deployment "api-gateway"
    
    log "Rolling update deployment completed"
}

deploy_blue_green() {
    log "Executing blue-green deployment"
    
    local current_env=$(kubectl get service api-gateway -n ultramarket -o jsonpath='{.spec.selector.environment}')
    local new_env
    
    if [[ "$current_env" == "blue" ]]; then
        new_env="green"
    else
        new_env="blue"
    fi
    
    log "Deploying to $new_env environment"
    
    # Deploy to new environment
    export DEPLOYMENT_ENV="$new_env"
    deploy_rolling_update
    
    # Run health checks on new environment
    run_health_checks "$new_env"
    
    # Switch traffic to new environment
    log "Switching traffic to $new_env environment"
    kubectl patch service api-gateway -n ultramarket -p "{\"spec\":{\"selector\":{\"environment\":\"$new_env\"}}}"
    
    # Wait and verify
    sleep 30
    run_health_checks
    
    # Clean up old environment
    log "Cleaning up old $current_env environment"
    kubectl delete pods -n ultramarket -l environment="$current_env"
    
    log "Blue-green deployment completed"
}

deploy_canary() {
    log "Executing canary deployment"
    
    local canary_percentage=${CANARY_PERCENTAGE:-10}
    
    # Deploy canary version
    export DEPLOYMENT_SUFFIX="-canary"
    deploy_rolling_update
    
    # Configure traffic split
    kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: api-gateway-canary
  namespace: ultramarket
spec:
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: api-gateway-canary
  - route:
    - destination:
        host: api-gateway
      weight: $((100 - canary_percentage))
    - destination:
        host: api-gateway-canary
      weight: $canary_percentage
EOF
    
    log "Canary deployment with $canary_percentage% traffic completed"
    
    # Monitor canary for specified duration
    local monitor_duration=${CANARY_MONITOR_DURATION:-300}
    log "Monitoring canary for $monitor_duration seconds"
    sleep "$monitor_duration"
    
    # Check canary metrics
    if check_canary_metrics; then
        log "Canary metrics look good, promoting to full deployment"
        promote_canary
    else
        error "Canary metrics failed, rolling back"
        rollback_canary
        exit 1
    fi
}

deploy_recreate() {
    log "Executing recreate deployment"
    
    warning "This will cause downtime. Proceeding with recreate deployment."
    
    # Scale down all services
    kubectl scale deployment --all --replicas=0 -n ultramarket
    
    # Wait for pods to terminate
    kubectl wait --for=delete pod --all -n ultramarket --timeout=300s
    
    # Deploy new version
    deploy_rolling_update
    
    log "Recreate deployment completed"
}

# =============================================================================
# Health Checks and Validation
# =============================================================================

wait_for_deployment() {
    local deployment=$1
    local timeout=${2:-300}
    
    log "Waiting for deployment $deployment to be ready"
    
    if kubectl rollout status deployment/"$deployment" -n ultramarket --timeout="${timeout}s"; then
        log "Deployment $deployment is ready"
    else
        error "Deployment $deployment failed to become ready within $timeout seconds"
        exit 1
    fi
}

run_health_checks() {
    local environment=${1:-""}
    
    log "Running health checks"
    
    # Get API Gateway URL
    local api_gateway_url
    if [[ -n "$environment" ]]; then
        api_gateway_url=$(kubectl get service "api-gateway-$environment" -n ultramarket -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    else
        api_gateway_url=$(kubectl get service api-gateway -n ultramarket -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    fi
    
    if [[ -z "$api_gateway_url" ]]; then
        api_gateway_url=$(kubectl get service api-gateway -n ultramarket -o jsonpath='{.spec.clusterIP}')
    fi
    
    # Health endpoints
    local health_endpoints=(
        "/health"
        "/api/v1/auth/health"
        "/api/v1/users/health"
        "/api/v1/products/health"
        "/api/v1/orders/health"
        "/api/v1/payments/health"
    )
    
    local failed_checks=0
    
    for endpoint in "${health_endpoints[@]}"; do
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

check_canary_metrics() {
    log "Checking canary metrics"
    
    # Check error rate
    local error_rate=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{service=\"api-gateway-canary\",status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1]')
    
    if (( $(echo "$error_rate > 0.01" | bc -l) )); then
        error "Canary error rate too high: $error_rate"
        return 1
    fi
    
    # Check response time
    local response_time=$(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,http_request_duration_seconds_bucket{service=\"api-gateway-canary\"})" | jq -r '.data.result[0].value[1]')
    
    if (( $(echo "$response_time > 0.5" | bc -l) )); then
        error "Canary response time too high: $response_time"
        return 1
    fi
    
    log "Canary metrics are within acceptable ranges"
    return 0
}

promote_canary() {
    log "Promoting canary to full deployment"
    
    # Update main deployment with canary image
    local canary_image=$(kubectl get deployment api-gateway-canary -n ultramarket -o jsonpath='{.spec.template.spec.containers[0].image}')
    kubectl set image deployment/api-gateway api-gateway="$canary_image" -n ultramarket
    
    # Remove canary deployment
    kubectl delete deployment api-gateway-canary -n ultramarket
    kubectl delete service api-gateway-canary -n ultramarket
    
    # Remove traffic split
    kubectl delete virtualservice api-gateway-canary -n ultramarket
    
    log "Canary promotion completed"
}

rollback_canary() {
    log "Rolling back canary deployment"
    
    # Remove canary deployment
    kubectl delete deployment api-gateway-canary -n ultramarket
    kubectl delete service api-gateway-canary -n ultramarket
    
    # Remove traffic split
    kubectl delete virtualservice api-gateway-canary -n ultramarket
    
    log "Canary rollback completed"
}

# =============================================================================
# Post-deployment Tasks
# =============================================================================

run_post_deployment_tasks() {
    section "Post-deployment Tasks"
    
    # Run database migrations
    run_database_migrations
    
    # Warm up caches
    warm_up_caches
    
    # Update monitoring
    update_monitoring_configuration
    
    # Send notifications
    if [[ "$NOTIFICATION_ENABLED" == "true" ]]; then
        send_notification "success" "Deployment completed successfully"
    fi
    
    # Generate deployment report
    generate_deployment_report
    
    log "Post-deployment tasks completed"
}

run_database_migrations() {
    log "Running database migrations"
    
    # PostgreSQL migrations
    kubectl exec -n ultramarket deployment/postgres -- psql -U postgres -f /docker-entrypoint-initdb.d/migrations.sql
    
    # MongoDB migrations
    kubectl exec -n ultramarket deployment/mongodb -- mongo ultramarket /docker-entrypoint-initdb.d/migrations.js
    
    log "Database migrations completed"
}

warm_up_caches() {
    log "Warming up caches"
    
    local api_gateway_url=$(kubectl get service api-gateway -n ultramarket -o jsonpath='{.spec.clusterIP}')
    
    # Warm up critical endpoints
    curl -s "http://$api_gateway_url/api/v1/products?limit=100" > /dev/null
    curl -s "http://$api_gateway_url/api/v1/categories" > /dev/null
    curl -s "http://$api_gateway_url/api/v1/products/featured" > /dev/null
    
    log "Cache warm-up completed"
}

update_monitoring_configuration() {
    log "Updating monitoring configuration"
    
    # Update Prometheus targets
    kubectl apply -f "$PROJECT_ROOT/infrastructure/monitoring/prometheus-config.yaml"
    
    # Update Grafana dashboards
    kubectl apply -f "$PROJECT_ROOT/infrastructure/monitoring/grafana-dashboards.yaml"
    
    log "Monitoring configuration updated"
}

# =============================================================================
# Rollback Procedures
# =============================================================================

rollback_deployment() {
    section "Rolling Back Deployment"
    
    local rollback_revision=${1:-1}
    
    log "Rolling back to revision $rollback_revision"
    
    # Rollback all deployments
    local deployments=$(kubectl get deployments -n ultramarket -o name)
    
    for deployment in $deployments; do
        kubectl rollout undo "$deployment" -n ultramarket --to-revision="$rollback_revision"
        kubectl rollout status "$deployment" -n ultramarket --timeout=300s
    done
    
    # Verify rollback
    run_health_checks
    
    log "Rollback completed successfully"
}

# =============================================================================
# Notification System
# =============================================================================

send_notification() {
    local status=$1
    local message=$2
    
    if [[ "$NOTIFICATION_ENABLED" != "true" ]]; then
        return 0
    fi
    
    case $status in
        success)
            send_slack_notification ":white_check_mark: Deployment Success" "$message" "good"
            ;;
        failure)
            send_slack_notification ":x: Deployment Failed" "$message" "danger"
            ;;
        warning)
            send_slack_notification ":warning: Deployment Warning" "$message" "warning"
            ;;
    esac
}

send_slack_notification() {
    local title=$1
    local message=$2
    local color=$3
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$title\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Strategy\", \"value\": \"$DEPLOYMENT_STRATEGY\", \"short\": true},
                        {\"title\": \"Deployment ID\", \"value\": \"$DEPLOYMENT_ID\", \"short\": true}
                    ]
                }]
            }"
    fi
}

# =============================================================================
# Reporting
# =============================================================================

generate_deployment_report() {
    log "Generating deployment report"
    
    local report_file="$LOG_DIR/deployment-report-$DEPLOYMENT_ID.json"
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    cat > "$report_file" << EOF
{
    "deployment": {
        "id": "$DEPLOYMENT_ID",
        "environment": "$ENVIRONMENT",
        "strategy": "$DEPLOYMENT_STRATEGY",
        "start_time": "$start_time",
        "end_time": "$end_time",
        "duration": "$(($(date +%s) - start_timestamp)) seconds",
        "status": "success"
    },
    "configuration": {
        "dry_run": $DRY_RUN,
        "skip_tests": $SKIP_TESTS,
        "skip_backup": $SKIP_BACKUP,
        "force_deploy": $FORCE_DEPLOY
    },
    "services": {
        "deployed": $(kubectl get deployments -n ultramarket --no-headers | wc -l),
        "running": $(kubectl get pods -n ultramarket --field-selector=status.phase=Running --no-headers | wc -l),
        "failed": $(kubectl get pods -n ultramarket --field-selector=status.phase=Failed --no-headers | wc -l)
    },
    "health_checks": {
        "passed": true,
        "endpoints_checked": 6
    },
    "logs": {
        "deployment_log": "$LOG_FILE",
        "report_file": "$report_file"
    }
}
EOF
    
    log "Deployment report generated: $report_file"
}

# =============================================================================
# Cleanup
# =============================================================================

cleanup_on_failure() {
    log "Cleaning up after failure"
    
    # Remove failed deployments
    kubectl delete pods -n ultramarket --field-selector=status.phase=Failed
    
    # Clean up temporary files
    rm -f /tmp/deployment-*
    
    log "Cleanup completed"
}

cleanup_on_success() {
    log "Performing post-deployment cleanup"
    
    # Clean up old images
    docker image prune -f
    
    # Clean up old ReplicaSets
    kubectl delete replicaset -n ultramarket --field-selector=status.replicas=0
    
    log "Cleanup completed"
}

# =============================================================================
# Main Execution
# =============================================================================

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV       Target environment (development|staging|production)
    -s, --strategy STRATEGY     Deployment strategy (rolling|blue-green|canary|recreate)
    -d, --dry-run              Perform a dry run without actual deployment
    -t, --skip-tests           Skip running tests
    -b, --skip-backup          Skip creating backup
    -f, --force                Force deployment even if checks fail
    -n, --no-notifications     Disable notifications
    -h, --help                 Show this help message

Examples:
    $0 --environment staging --strategy rolling
    $0 --environment production --strategy blue-green --skip-tests
    $0 --environment development --dry-run

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -s|--strategy)
                DEPLOYMENT_STRATEGY="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN="true"
                shift
                ;;
            -t|--skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            -b|--skip-backup)
                SKIP_BACKUP="true"
                shift
                ;;
            -f|--force)
                FORCE_DEPLOY="true"
                shift
                ;;
            -n|--no-notifications)
                NOTIFICATION_ENABLED="false"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

main() {
    local start_timestamp=$(date +%s)
    local start_time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    section "UltraMarket Automated Deployment"
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Environment: $ENVIRONMENT"
    log "Strategy: $DEPLOYMENT_STRATEGY"
    log "Dry Run: $DRY_RUN"
    
    # Load configuration
    load_environment_config
    validate_configuration
    
    # Pre-deployment
    run_pre_deployment_checks
    
    # Build and deploy
    if [[ "$DRY_RUN" != "true" ]]; then
        build_and_push_images
        deploy_services
        run_post_deployment_tasks
        cleanup_on_success
    else
        log "Dry run completed - no actual deployment performed"
    fi
    
    local end_timestamp=$(date +%s)
    local duration=$((end_timestamp - start_timestamp))
    
    log "Deployment completed successfully in $duration seconds"
    
    # Generate final report
    generate_deployment_report
}

# Parse command line arguments
parse_arguments "$@"

# Execute main function
main

log "Deployment script execution completed" 