#!/bin/bash
set -euo pipefail

# =============================================
# ULTRAMARKET PRODUCTION BACKUP STRATEGY
# =============================================
# Author: UltraMarket DevOps Team
# Version: 2.0.0
# Description: Comprehensive backup and disaster recovery for production

# Configuration
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/backups/ultramarket}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-ultramarket-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Database credentials (should be set via environment variables)
POSTGRES_HOST="${POSTGRES_HOST:-postgres-service}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-ultramarket}"
POSTGRES_USER="${POSTGRES_USER:-ultramarket_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

MONGODB_HOST="${MONGODB_HOST:-mongodb-service}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_DB="${MONGODB_DB:-ultramarket_products}"
MONGODB_USER="${MONGODB_USER:-ultramarket_user}"
MONGODB_PASSWORD="${MONGODB_PASSWORD}"

REDIS_HOST="${REDIS_HOST:-redis-service}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"

# Backup directories
BACKUP_DIR="${BACKUP_BASE_DIR}/${BACKUP_DATE}"
DB_BACKUP_DIR="${BACKUP_DIR}/databases"
CONFIG_BACKUP_DIR="${BACKUP_DIR}/configs"
LOGS_BACKUP_DIR="${BACKUP_DIR}/logs"
DOCKER_BACKUP_DIR="${BACKUP_DIR}/docker"

# Logging
LOG_FILE="${BACKUP_BASE_DIR}/backup.log"
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Create backup directories
create_backup_dirs() {
    log "Creating backup directories..."
    mkdir -p "${DB_BACKUP_DIR}" "${CONFIG_BACKUP_DIR}" "${LOGS_BACKUP_DIR}" "${DOCKER_BACKUP_DIR}"
}

# Database backups
backup_postgresql() {
    log "Starting PostgreSQL backup..."
    
    # Full database dump
    PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --verbose \
        --clean \
        --if-exists \
        --format=custom \
        --no-owner \
        --no-privileges \
        > "${DB_BACKUP_DIR}/postgresql_${BACKUP_DATE}.dump" || error_exit "PostgreSQL backup failed"
    
    # Schema-only backup for quick recovery
    PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --schema-only \
        --format=plain \
        > "${DB_BACKUP_DIR}/postgresql_schema_${BACKUP_DATE}.sql" || error_exit "PostgreSQL schema backup failed"
    
    # Table-specific backups for critical data
    for table in users orders products payments; do
        log "Backing up table: ${table}"
        PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
            -h "${POSTGRES_HOST}" \
            -p "${POSTGRES_PORT}" \
            -U "${POSTGRES_USER}" \
            -d "${POSTGRES_DB}" \
            --table="${table}" \
            --data-only \
            --format=custom \
            > "${DB_BACKUP_DIR}/postgresql_${table}_${BACKUP_DATE}.dump"
    done
    
    log "PostgreSQL backup completed successfully"
}

backup_mongodb() {
    log "Starting MongoDB backup..."
    
    # Create MongoDB backup
    mongodump \
        --host "${MONGODB_HOST}:${MONGODB_PORT}" \
        --db "${MONGODB_DB}" \
        --username "${MONGODB_USER}" \
        --password "${MONGODB_PASSWORD}" \
        --authenticationDatabase admin \
        --out "${DB_BACKUP_DIR}/mongodb_${BACKUP_DATE}" || error_exit "MongoDB backup failed"
    
    # Create archive for easier handling
    tar -czf "${DB_BACKUP_DIR}/mongodb_${BACKUP_DATE}.tar.gz" \
        -C "${DB_BACKUP_DIR}" "mongodb_${BACKUP_DATE}"
    
    # Remove uncompressed backup
    rm -rf "${DB_BACKUP_DIR}/mongodb_${BACKUP_DATE}"
    
    log "MongoDB backup completed successfully"
}

backup_redis() {
    log "Starting Redis backup..."
    
    # Create Redis snapshot
    redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" \
        --rdb "${DB_BACKUP_DIR}/redis_${BACKUP_DATE}.rdb" || error_exit "Redis backup failed"
    
    # Export Redis data as JSON for readability
    redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" \
        --scan --pattern "*" | \
        while read -r key; do
            redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" \
                GET "$key" | jq -r --arg key "$key" '{"key": $key, "value": .}'
        done > "${DB_BACKUP_DIR}/redis_data_${BACKUP_DATE}.json"
    
    log "Redis backup completed successfully"
}

# Application backups
backup_kubernetes_configs() {
    log "Starting Kubernetes configuration backup..."
    
    # Export all Kubernetes resources
    kubectl get all --all-namespaces -o yaml > "${CONFIG_BACKUP_DIR}/k8s_all_resources_${BACKUP_DATE}.yaml"
    
    # Export specific UltraMarket resources
    kubectl get -n ultramarket-production all,configmaps,secrets,pvc -o yaml > \
        "${CONFIG_BACKUP_DIR}/k8s_ultramarket_${BACKUP_DATE}.yaml"
    
    # Export custom resources
    kubectl get ingress,networkpolicy,hpa,pdb -A -o yaml > \
        "${CONFIG_BACKUP_DIR}/k8s_custom_resources_${BACKUP_DATE}.yaml"
    
    # Export RBAC resources
    kubectl get clusterroles,clusterrolebindings,roles,rolebindings -A -o yaml > \
        "${CONFIG_BACKUP_DIR}/k8s_rbac_${BACKUP_DATE}.yaml"
    
    log "Kubernetes configuration backup completed successfully"
}

backup_docker_images() {
    log "Starting Docker images backup..."
    
    # List of critical images to backup
    CRITICAL_IMAGES=(
        "ultramarket/api-gateway:latest"
        "ultramarket/user-service:latest"
        "ultramarket/auth-service:latest"
        "ultramarket/product-service:latest"
        "ultramarket/order-service:latest"
        "ultramarket/payment-service:latest"
        "ultramarket/cart-service:latest"
    )
    
    for image in "${CRITICAL_IMAGES[@]}"; do
        if docker image inspect "$image" >/dev/null 2>&1; then
            log "Backing up Docker image: $image"
            image_name=$(echo "$image" | tr '/:' '_')
            docker save "$image" | gzip > "${DOCKER_BACKUP_DIR}/${image_name}_${BACKUP_DATE}.tar.gz"
        else
            log "WARNING: Image $image not found, skipping..."
        fi
    done
    
    log "Docker images backup completed successfully"
}

backup_application_logs() {
    log "Starting application logs backup..."
    
    # Backup Kubernetes logs
    kubectl logs -n ultramarket-production --all-containers=true \
        --since=24h > "${LOGS_BACKUP_DIR}/k8s_logs_${BACKUP_DATE}.log" 2>/dev/null || true
    
    # Backup specific service logs
    for service in api-gateway user-service auth-service product-service order-service; do
        kubectl logs -n ultramarket-production deployment/"$service" \
            --since=24h > "${LOGS_BACKUP_DIR}/${service}_${BACKUP_DATE}.log" 2>/dev/null || true
    done
    
    # Backup monitoring logs
    if [ -d "/var/log/prometheus" ]; then
        tar -czf "${LOGS_BACKUP_DIR}/prometheus_logs_${BACKUP_DATE}.tar.gz" \
            -C "/var/log" prometheus/ 2>/dev/null || true
    fi
    
    if [ -d "/var/log/grafana" ]; then
        tar -czf "${LOGS_BACKUP_DIR}/grafana_logs_${BACKUP_DATE}.tar.gz" \
            -C "/var/log" grafana/ 2>/dev/null || true
    fi
    
    log "Application logs backup completed successfully"
}

# Backup verification
verify_backups() {
    log "Starting backup verification..."
    
    # Verify PostgreSQL backup
    if [ -f "${DB_BACKUP_DIR}/postgresql_${BACKUP_DATE}.dump" ]; then
        PGPASSWORD="${POSTGRES_PASSWORD}" pg_restore \
            --list "${DB_BACKUP_DIR}/postgresql_${BACKUP_DATE}.dump" >/dev/null || \
            error_exit "PostgreSQL backup verification failed"
        log "✓ PostgreSQL backup verified"
    fi
    
    # Verify MongoDB backup
    if [ -f "${DB_BACKUP_DIR}/mongodb_${BACKUP_DATE}.tar.gz" ]; then
        tar -tzf "${DB_BACKUP_DIR}/mongodb_${BACKUP_DATE}.tar.gz" >/dev/null || \
            error_exit "MongoDB backup verification failed"
        log "✓ MongoDB backup verified"
    fi
    
    # Verify Redis backup
    if [ -f "${DB_BACKUP_DIR}/redis_${BACKUP_DATE}.rdb" ]; then
        redis-check-rdb "${DB_BACKUP_DIR}/redis_${BACKUP_DATE}.rdb" >/dev/null || \
            error_exit "Redis backup verification failed"
        log "✓ Redis backup verified"
    fi
    
    # Verify file sizes
    find "${BACKUP_DIR}" -name "*.dump" -o -name "*.tar.gz" -o -name "*.rdb" | while read -r file; do
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        if [ "$size" -lt 1024 ]; then  # Less than 1KB
            log "WARNING: Backup file $file seems too small ($size bytes)"
        fi
    done
    
    log "Backup verification completed successfully"
}

# Upload to cloud storage
upload_to_s3() {
    log "Starting upload to S3..."
    
    # Create backup archive
    ARCHIVE_NAME="ultramarket_backup_${BACKUP_DATE}.tar.gz"
    tar -czf "${BACKUP_BASE_DIR}/${ARCHIVE_NAME}" -C "${BACKUP_BASE_DIR}" "${BACKUP_DATE}"
    
    # Upload to S3 with encryption
    aws s3 cp "${BACKUP_BASE_DIR}/${ARCHIVE_NAME}" \
        "s3://${S3_BUCKET}/${ARCHIVE_NAME}" \
        --region "${AWS_REGION}" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        --metadata "backup-date=${BACKUP_DATE},environment=production" || \
        error_exit "S3 upload failed"
    
    # Verify upload
    aws s3api head-object \
        --bucket "${S3_BUCKET}" \
        --key "${ARCHIVE_NAME}" \
        --region "${AWS_REGION}" >/dev/null || \
        error_exit "S3 upload verification failed"
    
    log "S3 upload completed successfully"
    
    # Clean up local archive
    rm -f "${BACKUP_BASE_DIR}/${ARCHIVE_NAME}"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Starting cleanup of old backups..."
    
    # Local cleanup
    find "${BACKUP_BASE_DIR}" -maxdepth 1 -type d -name "20*" -mtime +${RETENTION_DAYS} -exec rm -rf {} \; 2>/dev/null || true
    
    # S3 cleanup
    aws s3api list-objects-v2 \
        --bucket "${S3_BUCKET}" \
        --query "Contents[?LastModified<='$(date -d "${RETENTION_DAYS} days ago" -Iseconds)'].Key" \
        --output text | \
        while read -r key; do
            if [ -n "$key" ] && [ "$key" != "None" ]; then
                aws s3 rm "s3://${S3_BUCKET}/$key"
                log "Deleted old backup from S3: $key"
            fi
        done
    
    log "Cleanup completed successfully"
}

# Health check and monitoring
send_monitoring_metrics() {
    log "Sending monitoring metrics..."
    
    # Calculate backup size
    BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
    
    # Send metrics to CloudWatch (if available)
    if command -v aws >/dev/null 2>&1; then
        aws cloudwatch put-metric-data \
            --namespace "UltraMarket/Backup" \
            --metric-data MetricName=BackupSize,Value="${BACKUP_SIZE%?}",Unit=Bytes \
            --region "${AWS_REGION}" 2>/dev/null || true
        
        aws cloudwatch put-metric-data \
            --namespace "UltraMarket/Backup" \
            --metric-data MetricName=BackupSuccess,Value=1,Unit=Count \
            --region "${AWS_REGION}" 2>/dev/null || true
    fi
    
    # Send notification (if webhook is configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ UltraMarket Production Backup Completed Successfully\\n📦 Size: ${BACKUP_SIZE}\\n🕐 Time: ${BACKUP_DATE}\"}" \
            "${SLACK_WEBHOOK_URL}" 2>/dev/null || true
    fi
    
    log "Monitoring metrics sent successfully"
}

# Error handling
handle_error() {
    log "ERROR: Backup process failed at step: $1"
    
    # Send failure notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 UltraMarket Production Backup FAILED\\n❌ Step: $1\\n🕐 Time: ${BACKUP_DATE}\"}" \
            "${SLACK_WEBHOOK_URL}" 2>/dev/null || true
    fi
    
    # Send failure metric
    if command -v aws >/dev/null 2>&1; then
        aws cloudwatch put-metric-data \
            --namespace "UltraMarket/Backup" \
            --metric-data MetricName=BackupFailure,Value=1,Unit=Count \
            --region "${AWS_REGION}" 2>/dev/null || true
    fi
    
    exit 1
}

# Main backup process
main() {
    log "=================================================="
    log "Starting UltraMarket Production Backup Process"
    log "Backup Date: ${BACKUP_DATE}"
    log "Backup Directory: ${BACKUP_DIR}"
    log "=================================================="
    
    # Pre-flight checks
    if [ -z "${POSTGRES_PASSWORD:-}" ]; then
        error_exit "POSTGRES_PASSWORD environment variable is required"
    fi
    
    if [ -z "${MONGODB_PASSWORD:-}" ]; then
        error_exit "MONGODB_PASSWORD environment variable is required"
    fi
    
    if [ -z "${REDIS_PASSWORD:-}" ]; then
        error_exit "REDIS_PASSWORD environment variable is required"
    fi
    
    # Execute backup steps
    create_backup_dirs || handle_error "create_backup_dirs"
    backup_postgresql || handle_error "backup_postgresql"
    backup_mongodb || handle_error "backup_mongodb"
    backup_redis || handle_error "backup_redis"
    backup_kubernetes_configs || handle_error "backup_kubernetes_configs"
    backup_docker_images || handle_error "backup_docker_images"
    backup_application_logs || handle_error "backup_application_logs"
    verify_backups || handle_error "verify_backups"
    upload_to_s3 || handle_error "upload_to_s3"
    cleanup_old_backups || handle_error "cleanup_old_backups"
    send_monitoring_metrics || handle_error "send_monitoring_metrics"
    
    log "=================================================="
    log "UltraMarket Production Backup Process Completed Successfully"
    log "Total Backup Size: $(du -sh "${BACKUP_DIR}" | cut -f1)"
    log "Backup Location: ${BACKUP_DIR}"
    log "S3 Location: s3://${S3_BUCKET}/ultramarket_backup_${BACKUP_DATE}.tar.gz"
    log "=================================================="
}

# Trap errors
trap 'handle_error "unexpected_error"' ERR

# Run main process
main "$@" 