#!/bin/bash

# =============================================================================
# UltraMarket Backend - Final Deployment Script
# =============================================================================
# Bu script barcha deployment jarayonlarini avtomatlashtiradi
# Production environment uchun to'liq deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_TYPE=${1:-"production"}
ENVIRONMENT=${2:-"production"}
NAMESPACE=${3:-"ultramarket"}
DOMAIN=${4:-"ultramarket.uz"}

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_DIR="${ROOT_DIR}/config"
KUBE_DIR="${ROOT_DIR}/infrastructure/kubernetes"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Prerequisites tekshirish..."
    
    # Required tools
    local tools=("docker" "kubectl" "helm" "openssl" "curl" "jq")
    
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool o'rnatilmagan"
            exit 1
        fi
    done
    
    # Docker running
    if ! docker info &> /dev/null; then
        log_error "Docker ishlamayapti"
        exit 1
    fi
    
    # Kubernetes cluster access
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Kubernetes cluster'ga ulanish yo'q"
        exit 1
    fi
    
    log_success "Barcha prerequisites tekshirildi"
}

setup_environment() {
    log_info "Environment sozlash..."
    
    # Create directories
    mkdir -p "${ROOT_DIR}/logs"
    mkdir -p "${ROOT_DIR}/backups"
    mkdir -p "${ROOT_DIR}/ssl"
    
    # Environment file
    if [ ! -f "${CONFIG_DIR}/environments/${ENVIRONMENT}.env" ]; then
        log_error "Environment file topilmadi: ${CONFIG_DIR}/environments/${ENVIRONMENT}.env"
        exit 1
    fi
    
    # Load environment variables
    source "${CONFIG_DIR}/environments/${ENVIRONMENT}.env"
    
    log_success "Environment sozlandi"
}

build_images() {
    log_info "Docker images yaratish..."
    
    # Services to build
    local services=(
        "api-gateway"
        "auth-service"
        "user-service"
        "product-service"
        "order-service"
        "payment-service"
        "cart-service"
        "notification-service"
        "search-service"
        "file-service"
        "audit-service"
        "performance-service"
    )
    
    for service in "${services[@]}"; do
        log_info "Building ${service}..."
        
        # Find service directory
        local service_dir=""
        if [ -d "${ROOT_DIR}/microservices/core/${service}" ]; then
            service_dir="${ROOT_DIR}/microservices/core/${service}"
        elif [ -d "${ROOT_DIR}/microservices/business/${service}" ]; then
            service_dir="${ROOT_DIR}/microservices/business/${service}"
        elif [ -d "${ROOT_DIR}/microservices/platform/${service}" ]; then
            service_dir="${ROOT_DIR}/microservices/platform/${service}"
        else
            log_warning "Service directory topilmadi: ${service}"
            continue
        fi
        
        # Build image
        docker build -t "ultramarket/${service}:latest" "${service_dir}" || {
            log_error "Failed to build ${service}"
            exit 1
        }
        
        # Tag for registry
        if [ -n "${DOCKER_REGISTRY}" ]; then
            docker tag "ultramarket/${service}:latest" "${DOCKER_REGISTRY}/ultramarket/${service}:latest"
        fi
    done
    
    log_success "Barcha images yaratildi"
}

push_images() {
    if [ -z "${DOCKER_REGISTRY}" ]; then
        log_warning "Docker registry ko'rsatilmagan, images push qilinmaydi"
        return
    fi
    
    log_info "Images registry ga push qilish..."
    
    # Login to registry
    if [ -n "${DOCKER_USERNAME}" ] && [ -n "${DOCKER_PASSWORD}" ]; then
        echo "${DOCKER_PASSWORD}" | docker login "${DOCKER_REGISTRY}" -u "${DOCKER_USERNAME}" --password-stdin
    fi
    
    # Push all images
    docker images "ultramarket/*" --format "table {{.Repository}}:{{.Tag}}" | grep -v REPOSITORY | while read image; do
        registry_image="${DOCKER_REGISTRY}/${image}"
        log_info "Pushing ${registry_image}..."
        docker push "${registry_image}"
    done
    
    log_success "Barcha images push qilindi"
}

setup_ssl() {
    log_info "SSL sertifikatlar sozlash..."
    
    # Check if SSL certificates exist
    if [ ! -f "${ROOT_DIR}/ssl/tls.crt" ] || [ ! -f "${ROOT_DIR}/ssl/tls.key" ]; then
        log_info "SSL sertifikatlar topilmadi, Let's Encrypt bilan yaratish..."
        
        # Install certbot if not exists
        if ! command -v certbot &> /dev/null; then
            log_info "Certbot o'rnatish..."
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y certbot
            elif command -v yum &> /dev/null; then
                sudo yum install -y certbot
            else
                log_error "Certbot o'rnatib bo'lmadi"
                exit 1
            fi
        fi
        
        # Generate certificates
        sudo certbot certonly --standalone \
            -d "api.${DOMAIN}" \
            -d "admin.${DOMAIN}" \
            -d "cdn.${DOMAIN}" \
            --agree-tos \
            --non-interactive \
            --email "admin@${DOMAIN}" || {
            log_error "SSL sertifikat yaratib bo'lmadi"
            exit 1
        }
        
        # Copy certificates
        sudo cp "/etc/letsencrypt/live/api.${DOMAIN}/fullchain.pem" "${ROOT_DIR}/ssl/tls.crt"
        sudo cp "/etc/letsencrypt/live/api.${DOMAIN}/privkey.pem" "${ROOT_DIR}/ssl/tls.key"
        sudo chown $(id -u):$(id -g) "${ROOT_DIR}/ssl/"*
    fi
    
    log_success "SSL sertifikatlar tayyor"
}

create_namespace() {
    log_info "Kubernetes namespace yaratish..."
    
    kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    # Label namespace
    kubectl label namespace "${NAMESPACE}" name="${NAMESPACE}" --overwrite
    
    log_success "Namespace '${NAMESPACE}' yaratildi"
}

create_secrets() {
    log_info "Kubernetes secrets yaratish..."
    
    # TLS Secret
    kubectl create secret tls ultramarket-tls \
        --cert="${ROOT_DIR}/ssl/tls.crt" \
        --key="${ROOT_DIR}/ssl/tls.key" \
        --namespace="${NAMESPACE}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Application secrets
    kubectl create secret generic ultramarket-secrets \
        --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
        --from-literal=MONGO_PASSWORD="${MONGO_PASSWORD}" \
        --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD}" \
        --from-literal=JWT_SECRET="${JWT_SECRET}" \
        --from-literal=JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}" \
        --from-literal=ENCRYPTION_KEY="${ENCRYPTION_KEY}" \
        --from-literal=CLICK_SECRET_KEY="${CLICK_SECRET_KEY}" \
        --from-literal=PAYME_SECRET_KEY="${PAYME_SECRET_KEY}" \
        --from-literal=UZCARD_SECRET_KEY="${UZCARD_SECRET_KEY}" \
        --from-literal=SMTP_PASS="${SMTP_PASS}" \
        --from-literal=ESKIZ_API_KEY="${ESKIZ_API_KEY}" \
        --from-literal=PLAY_MOBILE_API_KEY="${PLAY_MOBILE_API_KEY}" \
        --from-literal=FCM_SERVER_KEY="${FCM_SERVER_KEY}" \
        --from-literal=VAPID_PRIVATE_KEY="${VAPID_PRIVATE_KEY}" \
        --from-literal=MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY}" \
        --from-literal=MINIO_SECRET_KEY="${MINIO_SECRET_KEY}" \
        --from-literal=ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD}" \
        --from-literal=TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}" \
        --namespace="${NAMESPACE}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Secrets yaratildi"
}

deploy_databases() {
    log_info "Database'larni deploy qilish..."
    
    # PostgreSQL
    log_info "PostgreSQL deploy qilish..."
    kubectl apply -f "${KUBE_DIR}/databases.yaml" -n "${NAMESPACE}"
    
    # Wait for databases to be ready
    log_info "Database'lar tayyor bo'lishini kutish..."
    kubectl wait --for=condition=ready pod -l app=postgres -n "${NAMESPACE}" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=mongodb -n "${NAMESPACE}" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n "${NAMESPACE}" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=elasticsearch -n "${NAMESPACE}" --timeout=300s
    
    log_success "Database'lar deploy qilindi"
}

deploy_applications() {
    log_info "Application'larni deploy qilish..."
    
    # Update image references if using registry
    if [ -n "${DOCKER_REGISTRY}" ]; then
        sed -i.bak "s|ultramarket/|${DOCKER_REGISTRY}/ultramarket/|g" "${KUBE_DIR}/production/complete-deployment.yaml"
    fi
    
    # Deploy applications
    kubectl apply -f "${KUBE_DIR}/production/complete-deployment.yaml" -n "${NAMESPACE}"
    
    # Wait for deployments
    log_info "Application'lar tayyor bo'lishini kutish..."
    kubectl wait --for=condition=available deployment --all -n "${NAMESPACE}" --timeout=600s
    
    log_success "Application'lar deploy qilindi"
}

setup_monitoring() {
    log_info "Monitoring sozlash..."
    
    # Deploy monitoring stack
    kubectl apply -f "${KUBE_DIR}/monitoring.yaml" -n "${NAMESPACE}"
    
    # Wait for monitoring to be ready
    kubectl wait --for=condition=ready pod -l app=prometheus -n "${NAMESPACE}" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=grafana -n "${NAMESPACE}" --timeout=300s
    
    log_success "Monitoring sozlandi"
}

setup_ingress() {
    log_info "Ingress sozlash..."
    
    # Install nginx ingress controller if not exists
    if ! kubectl get ingressclass nginx &> /dev/null; then
        log_info "Nginx Ingress Controller o'rnatish..."
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
        
        # Wait for ingress controller
        kubectl wait --namespace ingress-nginx \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/component=controller \
            --timeout=300s
    fi
    
    # Deploy ingress
    kubectl apply -f "${KUBE_DIR}/production/ingress.yaml" -n "${NAMESPACE}"
    
    log_success "Ingress sozlandi"
}

run_migrations() {
    log_info "Database migration'larni ishga tushirish..."
    
    # Run database migrations
    kubectl run migration-job \
        --image="ultramarket/api-gateway:latest" \
        --rm -i --restart=Never \
        --env="NODE_ENV=${ENVIRONMENT}" \
        --namespace="${NAMESPACE}" \
        -- npm run migration:run
    
    # Seed initial data
    kubectl run seed-job \
        --image="ultramarket/api-gateway:latest" \
        --rm -i --restart=Never \
        --env="NODE_ENV=${ENVIRONMENT}" \
        --namespace="${NAMESPACE}" \
        -- npm run seed:run
    
    log_success "Migration'lar bajarildi"
}

setup_backup() {
    log_info "Backup sistemasini sozlash..."
    
    # Create backup CronJobs
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: ${NAMESPACE}
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h postgres -U ultramarket_user -d ultramarket_prod | gzip > /backup/postgres_\$(date +%Y%m%d_%H%M%S).sql.gz
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: ultramarket-secrets
                  key: POSTGRES_PASSWORD
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
EOF
    
    log_success "Backup sistemasi sozlandi"
}

health_check() {
    log_info "Health check..."
    
    # Get ingress IP
    local ingress_ip
    ingress_ip=$(kubectl get ingress ultramarket-ingress -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    
    if [ -z "${ingress_ip}" ]; then
        ingress_ip=$(kubectl get ingress ultramarket-ingress -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    fi
    
    if [ -z "${ingress_ip}" ]; then
        log_warning "Ingress IP topilmadi, service IP'larni tekshirish..."
        kubectl get services -n "${NAMESPACE}"
        return
    fi
    
    # Test API endpoints
    local endpoints=(
        "https://api.${DOMAIN}/health"
        "https://api.${DOMAIN}/api/auth/health"
        "https://api.${DOMAIN}/api/products/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Testing ${endpoint}..."
        if curl -f -s "${endpoint}" > /dev/null; then
            log_success "${endpoint} - OK"
        else
            log_error "${endpoint} - FAILED"
        fi
    done
}

display_info() {
    log_info "Deployment ma'lumotlari:"
    echo ""
    echo "🌐 API URL: https://api.${DOMAIN}"
    echo "🔧 Admin Panel: https://admin.${DOMAIN}"
    echo "📊 Grafana: https://grafana.${DOMAIN}"
    echo "🔍 Prometheus: https://prometheus.${DOMAIN}"
    echo ""
    echo "📱 Namespace: ${NAMESPACE}"
    echo "🏷️  Environment: ${ENVIRONMENT}"
    echo "🐳 Registry: ${DOCKER_REGISTRY:-"local"}"
    echo ""
    
    # Show pods status
    log_info "Pods holati:"
    kubectl get pods -n "${NAMESPACE}" -o wide
    echo ""
    
    # Show services
    log_info "Services:"
    kubectl get services -n "${NAMESPACE}"
    echo ""
    
    # Show ingress
    log_info "Ingress:"
    kubectl get ingress -n "${NAMESPACE}"
    echo ""
    
    # Default credentials
    log_info "Default login ma'lumotlari:"
    echo "Admin: admin@ultramarket.uz / password123"
    echo "User: user@ultramarket.uz / password123"
    echo "Vendor: vendor@ultramarket.uz / password123"
    echo ""
    
    log_success "Deployment yakunlandi! 🎉"
}

cleanup_on_error() {
    log_error "Deployment xatolik bilan tugadi!"
    log_info "Cleanup qilish..."
    
    # Restore original deployment file
    if [ -f "${KUBE_DIR}/production/complete-deployment.yaml.bak" ]; then
        mv "${KUBE_DIR}/production/complete-deployment.yaml.bak" "${KUBE_DIR}/production/complete-deployment.yaml"
    fi
    
    # Show logs for debugging
    log_info "Oxirgi loglar:"
    kubectl logs --tail=50 -l app=api-gateway -n "${NAMESPACE}" || true
    
    exit 1
}

# =============================================================================
# Main Deployment Function
# =============================================================================

main() {
    log_info "UltraMarket Backend Deployment boshlandi"
    log_info "Deployment type: ${DEPLOYMENT_TYPE}"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Namespace: ${NAMESPACE}"
    log_info "Domain: ${DOMAIN}"
    echo ""
    
    # Set error handler
    trap cleanup_on_error ERR
    
    # Deployment steps
    check_prerequisites
    setup_environment
    
    if [ "${DEPLOYMENT_TYPE}" = "production" ] || [ "${DEPLOYMENT_TYPE}" = "staging" ]; then
        build_images
        push_images
        setup_ssl
    fi
    
    create_namespace
    create_secrets
    deploy_databases
    deploy_applications
    setup_monitoring
    setup_ingress
    run_migrations
    setup_backup
    
    # Wait a bit for everything to settle
    sleep 30
    
    health_check
    display_info
    
    log_success "🎉 UltraMarket Backend muvaffaqiyatli deploy qilindi!"
}

# =============================================================================
# Script Entry Point
# =============================================================================

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "UltraMarket Backend Deployment Script"
    echo ""
    echo "Usage: $0 [DEPLOYMENT_TYPE] [ENVIRONMENT] [NAMESPACE] [DOMAIN]"
    echo ""
    echo "Parameters:"
    echo "  DEPLOYMENT_TYPE: development|staging|production (default: production)"
    echo "  ENVIRONMENT:     development|staging|production (default: production)"
    echo "  NAMESPACE:       Kubernetes namespace (default: ultramarket)"
    echo "  DOMAIN:          Base domain (default: ultramarket.uz)"
    echo ""
    echo "Examples:"
    echo "  $0 production production ultramarket ultramarket.uz"
    echo "  $0 staging staging ultramarket-staging staging.ultramarket.uz"
    echo "  $0 development development ultramarket-dev dev.ultramarket.uz"
    echo ""
    exit 0
fi

# Run main function
main "$@" 