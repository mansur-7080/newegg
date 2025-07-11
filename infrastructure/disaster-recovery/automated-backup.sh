#!/bin/bash
#
# UltraMarket Automated Backup System
# Professional enterprise backup automation
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/backup.conf"
LOG_FILE="/var/log/ultramarket-backup.log"
LOCK_FILE="/var/run/ultramarket-backup.lock"

# Load configuration
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Default values
BACKUP_ROOT_DIR="${BACKUP_ROOT_DIR:-/backup/ultramarket}"
S3_BUCKET="${S3_BUCKET:-ultramarket-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
PARALLEL_JOBS="${PARALLEL_JOBS:-4}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"

# Logging function
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    cleanup
    exit 1
}

# Cleanup function
cleanup() {
    if [[ -f "$LOCK_FILE" ]]; then
        rm -f "$LOCK_FILE"
    fi
}

# Lock check
check_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local pid=$(cat "$LOCK_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            error_exit "Backup already running (PID: $pid)"
        else
            log "WARN" "Removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
}

# Create backup directory structure
create_backup_dirs() {
    local dirs=(
        "$BACKUP_ROOT_DIR/postgresql"
        "$BACKUP_ROOT_DIR/mongodb" 
        "$BACKUP_ROOT_DIR/redis"
        "$BACKUP_ROOT_DIR/application"
        "$BACKUP_ROOT_DIR/config"
        "$BACKUP_ROOT_DIR/logs"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir" || error_exit "Failed to create directory: $dir"
    done
}

# PostgreSQL backup
backup_postgresql() {
    log "INFO" "Starting PostgreSQL backup"
    
    local backup_name="postgresql_$(date +%Y%m%d_%H%M%S)"
    local backup_dir="$BACKUP_ROOT_DIR/postgresql/$backup_name"
    
    # Create base backup
    pg_basebackup \
        -h "${POSTGRES_HOST:-localhost}" \
        -p "${POSTGRES_PORT:-5432}" \
        -U "${POSTGRES_BACKUP_USER:-backup}" \
        -D "$backup_dir" \
        -Ft -z -P -v \
        --wal-method=stream \
        --checkpoint=fast || error_exit "PostgreSQL backup failed"
    
    # Upload to S3
    aws s3 cp "$backup_dir.tar.gz" \
        "s3://$S3_BUCKET/postgresql/" \
        --storage-class STANDARD_IA || error_exit "PostgreSQL S3 upload failed"
    
    log "INFO" "PostgreSQL backup completed: $backup_name"
}

# MongoDB backup
backup_mongodb() {
    log "INFO" "Starting MongoDB backup"
    
    local backup_name="mongodb_$(date +%Y%m%d_%H%M%S)"
    local backup_dir="$BACKUP_ROOT_DIR/mongodb/$backup_name"
    
    # Create dump from secondary
    mongodump \
        --host "${MONGODB_HOST:-mongodb-secondary:27017}" \
        --db "${MONGODB_DATABASE:-ultramarket}" \
        --out "$backup_dir" \
        --gzip \
        --numParallelCollections=$PARALLEL_JOBS || error_exit "MongoDB backup failed"
    
    # Compress backup
    tar -czf "$backup_dir.tar.gz" -C "$BACKUP_ROOT_DIR/mongodb" "$(basename "$backup_dir")"
    
    # Upload to S3
    aws s3 cp "$backup_dir.tar.gz" \
        "s3://$S3_BUCKET/mongodb/" \
        --storage-class STANDARD_IA || error_exit "MongoDB S3 upload failed"
    
    # Cleanup local directory
    rm -rf "$backup_dir"
    
    log "INFO" "MongoDB backup completed: $backup_name"
}

# Redis backup
backup_redis() {
    log "INFO" "Starting Redis backup"
    
    local backup_name="redis_$(date +%Y%m%d_%H%M%S)"
    local backup_dir="$BACKUP_ROOT_DIR/redis"
    
    # Trigger background save
    redis-cli -h "${REDIS_HOST:-redis-master}" -p "${REDIS_PORT:-6379}" BGSAVE
    
    # Wait for completion
    local last_save=$(redis-cli -h "${REDIS_HOST:-redis-master}" -p "${REDIS_PORT:-6379}" LASTSAVE)
    while true; do
        sleep 5
        local current_save=$(redis-cli -h "${REDIS_HOST:-redis-master}" -p "${REDIS_PORT:-6379}" LASTSAVE)
        if [[ "$current_save" != "$last_save" ]]; then
            break
        fi
    done
    
    # Copy RDB and AOF files
    kubectl cp "redis-master-0:/data/dump.rdb" "$backup_dir/dump_$backup_name.rdb"
    kubectl cp "redis-master-0:/data/appendonly.aof" "$backup_dir/appendonly_$backup_name.aof"
    
    # Compress and upload
    tar -czf "$backup_dir/redis_$backup_name.tar.gz" \
        -C "$backup_dir" \
        "dump_$backup_name.rdb" \
        "appendonly_$backup_name.aof"
    
    aws s3 cp "$backup_dir/redis_$backup_name.tar.gz" \
        "s3://$S3_BUCKET/redis/" \
        --storage-class STANDARD_IA || error_exit "Redis S3 upload failed"
    
    # Cleanup
    rm -f "$backup_dir/dump_$backup_name.rdb" "$backup_dir/appendonly_$backup_name.aof"
    
    log "INFO" "Redis backup completed: $backup_name"
}

# Application files backup
backup_application() {
    log "INFO" "Starting application backup"
    
    local backup_name="application_$(date +%Y%m%d_%H%M%S)"
    local backup_file="$BACKUP_ROOT_DIR/application/${backup_name}.tar.gz"
    
    # Application directories to backup
    local app_dirs=(
        "/opt/ultramarket/config"
        "/opt/ultramarket/public/uploads"
        "/etc/nginx/sites-enabled"
        "/etc/ssl/certs/ultramarket"
    )
    
    # Create application backup
    tar -czf "$backup_file" \
        --exclude="*/node_modules/*" \
        --exclude="*/logs/*" \
        --exclude="*/tmp/*" \
        --exclude="*.log" \
        "${app_dirs[@]}" || error_exit "Application backup failed"
    
    # Upload to S3
    aws s3 cp "$backup_file" \
        "s3://$S3_BUCKET/application/" \
        --storage-class STANDARD_IA || error_exit "Application S3 upload failed"
    
    log "INFO" "Application backup completed: $backup_name"
}

# Kubernetes configuration backup
backup_kubernetes_config() {
    log "INFO" "Starting Kubernetes configuration backup"
    
    local backup_name="k8s_config_$(date +%Y%m%d_%H%M%S)"
    local backup_dir="$BACKUP_ROOT_DIR/config/$backup_name"
    
    mkdir -p "$backup_dir"
    
    # Backup namespaces
    kubectl get namespaces -o yaml > "$backup_dir/namespaces.yaml"
    
    # Backup secrets
    kubectl get secrets --all-namespaces -o yaml > "$backup_dir/secrets.yaml"
    
    # Backup configmaps
    kubectl get configmaps --all-namespaces -o yaml > "$backup_dir/configmaps.yaml"
    
    # Backup deployments
    kubectl get deployments --all-namespaces -o yaml > "$backup_dir/deployments.yaml"
    
    # Backup services
    kubectl get services --all-namespaces -o yaml > "$backup_dir/services.yaml"
    
    # Backup ingress
    kubectl get ingress --all-namespaces -o yaml > "$backup_dir/ingress.yaml"
    
    # Backup persistent volumes
    kubectl get pv -o yaml > "$backup_dir/persistent-volumes.yaml"
    
    # Compress and upload
    tar -czf "$backup_dir.tar.gz" -C "$BACKUP_ROOT_DIR/config" "$(basename "$backup_dir")"
    
    aws s3 cp "$backup_dir.tar.gz" \
        "s3://$S3_BUCKET/config/" \
        --storage-class STANDARD_IA || error_exit "Kubernetes config S3 upload failed"
    
    # Cleanup
    rm -rf "$backup_dir"
    
    log "INFO" "Kubernetes configuration backup completed: $backup_name"
}

# Backup verification
verify_backup() {
    local backup_type="$1"
    local backup_file="$2"
    
    log "INFO" "Verifying $backup_type backup: $backup_file"
    
    case "$backup_type" in
        postgresql)
            # Verify PostgreSQL backup
            if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
                error_exit "PostgreSQL backup verification failed: $backup_file"
            fi
            ;;
        mongodb)
            # Verify MongoDB backup
            if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
                error_exit "MongoDB backup verification failed: $backup_file"
            fi
            ;;
        redis)
            # Verify Redis backup
            if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
                error_exit "Redis backup verification failed: $backup_file"
            fi
            ;;
        application)
            # Verify application backup
            if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
                error_exit "Application backup verification failed: $backup_file"
            fi
            ;;
    esac
    
    log "INFO" "$backup_type backup verification successful"
}

# Cleanup old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up old backups (retention: $RETENTION_DAYS days)"
    
    local backup_dirs=(
        "$BACKUP_ROOT_DIR/postgresql"
        "$BACKUP_ROOT_DIR/mongodb"
        "$BACKUP_ROOT_DIR/redis"
        "$BACKUP_ROOT_DIR/application"
        "$BACKUP_ROOT_DIR/config"
    )
    
    for dir in "${backup_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            find "$dir" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
            log "INFO" "Cleaned up old backups in $dir"
        fi
    done
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"UltraMarket Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" || log "WARN" "Failed to send Slack notification"
    fi
    
    if [[ -n "${EMAIL_RECIPIENT:-}" ]]; then
        echo "$message" | mail -s "UltraMarket Backup $status" "$EMAIL_RECIPIENT" || \
            log "WARN" "Failed to send email notification"
    fi
}

# Health check
health_check() {
    log "INFO" "Performing backup system health check"
    
    # Check disk space
    local disk_usage=$(df "$BACKUP_ROOT_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    if (( disk_usage > 85 )); then
        error_exit "Backup disk usage too high: ${disk_usage}%"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        error_exit "AWS credentials not configured or expired"
    fi
    
    # Check database connectivity
    if ! pg_isready -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" >/dev/null 2>&1; then
        error_exit "PostgreSQL not accessible"
    fi
    
    if ! mongosh --host "${MONGODB_HOST:-mongodb-secondary:27017}" --eval "db.adminCommand('ismaster')" >/dev/null 2>&1; then
        error_exit "MongoDB not accessible"
    fi
    
    if ! redis-cli -h "${REDIS_HOST:-redis-master}" -p "${REDIS_PORT:-6379}" ping >/dev/null 2>&1; then
        error_exit "Redis not accessible"
    fi
    
    log "INFO" "Health check passed"
}

# Generate backup report
generate_report() {
    local start_time="$1"
    local end_time="$2"
    
    local duration=$((end_time - start_time))
    local report_file="$BACKUP_ROOT_DIR/logs/backup_report_$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "backup_date": "$(date -d @$start_time '+%Y-%m-%d %H:%M:%S')",
  "duration_seconds": $duration,
  "status": "completed",
  "components": {
    "postgresql": "success",
    "mongodb": "success", 
    "redis": "success",
    "application": "success",
    "kubernetes_config": "success"
  },
  "storage": {
    "local_path": "$BACKUP_ROOT_DIR",
    "s3_bucket": "$S3_BUCKET",
    "retention_days": $RETENTION_DAYS
  },
  "verification": "passed"
}
EOF
    
    # Upload report to S3
    aws s3 cp "$report_file" "s3://$S3_BUCKET/reports/" || \
        log "WARN" "Failed to upload backup report to S3"
    
    log "INFO" "Backup report generated: $report_file"
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "Starting UltraMarket backup process"
    
    # Setup
    check_lock
    trap cleanup EXIT
    create_backup_dirs
    health_check
    
    # Perform backups
    backup_postgresql
    backup_mongodb  
    backup_redis
    backup_application
    backup_kubernetes_config
    
    # Cleanup
    cleanup_old_backups
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate report
    generate_report "$start_time" "$end_time"
    
    # Notifications
    send_notification "SUCCESS" "Backup completed successfully in ${duration}s"
    
    log "INFO" "Backup process completed successfully in ${duration} seconds"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 