#!/bin/bash

# =============================================================================
# UltraMarket Automated Backup System
# =============================================================================
# Bu script barcha ma'lumotlar bazalari va fayllarni avtomatik backup qiladi
# Cron job orqali kunlik ishga tushiriladi

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
LOG_FILE="/var/log/ultramarket-backup.log"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID}"

# S3 Configuration
S3_BUCKET="${BACKUP_S3_BUCKET:-ultramarket-backups}"
S3_REGION="${BACKUP_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${BACKUP_AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${BACKUP_AWS_SECRET_ACCESS_KEY}"

# Database Configuration
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-ultramarket_db}"
POSTGRES_USER="${POSTGRES_USER:-ultramarket_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-ultramarket_db}"
MONGO_USER="${MONGO_USER:-ultramarket_user}"
MONGO_PASSWORD="${MONGO_PASSWORD}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD}"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

send_telegram_notification() {
    local message="$1"
    local status="$2"
    
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        local emoji="✅"
        if [ "$status" = "error" ]; then
            emoji="❌"
        elif [ "$status" = "warning" ]; then
            emoji="⚠️"
        fi
        
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d text="${emoji} UltraMarket Backup: $message" \
            -d parse_mode="Markdown" > /dev/null 2>&1
    fi
}

create_backup_directories() {
    log_info "Backup direktoriyalarini yaratish..."
    
    mkdir -p "$BACKUP_DIR"/{postgres,mongodb,redis,files,logs}
    mkdir -p "$BACKUP_DIR"/archive
    
    log_success "Backup direktoriyalari yaratildi"
}

backup_postgresql() {
    log_info "PostgreSQL backup boshlandi..."
    
    local backup_file="$BACKUP_DIR/postgres/ultramarket_postgres_${DATE}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Set password for pg_dump
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Create backup
    if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        --verbose --no-owner --no-acl --format=custom > "$backup_file" 2>>"$LOG_FILE"; then
        
        # Compress backup
        gzip "$backup_file"
        
        # Get file size
        local file_size=$(du -h "$compressed_file" | cut -f1)
        log_success "PostgreSQL backup yaratildi: $compressed_file ($file_size)"
        
        # Upload to S3
        if upload_to_s3 "$compressed_file" "postgres/"; then
            log_success "PostgreSQL backup S3 ga yuklandi"
        else
            log_warning "PostgreSQL backup S3 ga yuklanmadi"
        fi
        
        return 0
    else
        log_error "PostgreSQL backup xatolik bilan tugadi"
        return 1
    fi
}

backup_mongodb() {
    log_info "MongoDB backup boshlandi..."
    
    local backup_dir="$BACKUP_DIR/mongodb/ultramarket_mongodb_${DATE}"
    local compressed_file="${backup_dir}.tar.gz"
    
    # Create backup
    if mongodump --host "$MONGO_HOST:$MONGO_PORT" \
        --db "$MONGO_DB" \
        --username "$MONGO_USER" \
        --password "$MONGO_PASSWORD" \
        --out "$backup_dir" 2>>"$LOG_FILE"; then
        
        # Compress backup
        tar -czf "$compressed_file" -C "$BACKUP_DIR/mongodb" "$(basename "$backup_dir")"
        rm -rf "$backup_dir"
        
        # Get file size
        local file_size=$(du -h "$compressed_file" | cut -f1)
        log_success "MongoDB backup yaratildi: $compressed_file ($file_size)"
        
        # Upload to S3
        if upload_to_s3 "$compressed_file" "mongodb/"; then
            log_success "MongoDB backup S3 ga yuklandi"
        else
            log_warning "MongoDB backup S3 ga yuklanmadi"
        fi
        
        return 0
    else
        log_error "MongoDB backup xatolik bilan tugadi"
        return 1
    fi
}

backup_redis() {
    log_info "Redis backup boshlandi..."
    
    local backup_file="$BACKUP_DIR/redis/ultramarket_redis_${DATE}.rdb"
    local compressed_file="${backup_file}.gz"
    
    # Create Redis backup using BGSAVE
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE 2>>"$LOG_FILE"; then
        
        # Wait for backup to complete
        while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" = "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" ]; do
            sleep 1
        done
        
        # Copy RDB file
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$backup_file" 2>>"$LOG_FILE"; then
            
            # Compress backup
            gzip "$backup_file"
            
            # Get file size
            local file_size=$(du -h "$compressed_file" | cut -f1)
            log_success "Redis backup yaratildi: $compressed_file ($file_size)"
            
            # Upload to S3
            if upload_to_s3 "$compressed_file" "redis/"; then
                log_success "Redis backup S3 ga yuklandi"
            else
                log_warning "Redis backup S3 ga yuklanmadi"
            fi
            
            return 0
        else
            log_error "Redis RDB faylini nusxalash xatolik bilan tugadi"
            return 1
        fi
    else
        log_error "Redis backup xatolik bilan tugadi"
        return 1
    fi
}

backup_files() {
    log_info "Fayl backup boshlandi..."
    
    local backup_file="$BACKUP_DIR/files/ultramarket_files_${DATE}.tar.gz"
    local files_to_backup=(
        "/var/lib/ultramarket/uploads"
        "/var/lib/ultramarket/logs"
        "/etc/ultramarket/config"
        "/opt/ultramarket/ssl"
    )
    
    # Create file backup
    if tar -czf "$backup_file" "${files_to_backup[@]}" 2>>"$LOG_FILE"; then
        
        # Get file size
        local file_size=$(du -h "$backup_file" | cut -f1)
        log_success "Fayl backup yaratildi: $backup_file ($file_size)"
        
        # Upload to S3
        if upload_to_s3 "$backup_file" "files/"; then
            log_success "Fayl backup S3 ga yuklandi"
        else
            log_warning "Fayl backup S3 ga yuklanmadi"
        fi
        
        return 0
    else
        log_error "Fayl backup xatolik bilan tugadi"
        return 1
    fi
}

backup_configuration() {
    log_info "Konfiguratsiya backup boshlandi..."
    
    local backup_file="$BACKUP_DIR/files/ultramarket_config_${DATE}.tar.gz"
    local config_dirs=(
        "/etc/ultramarket"
        "/opt/ultramarket/config"
        "/etc/nginx/sites-available/ultramarket"
        "/etc/systemd/system/ultramarket*"
    )
    
    # Create configuration backup
    if tar -czf "$backup_file" "${config_dirs[@]}" 2>>"$LOG_FILE"; then
        
        # Get file size
        local file_size=$(du -h "$backup_file" | cut -f1)
        log_success "Konfiguratsiya backup yaratildi: $backup_file ($file_size)"
        
        # Upload to S3
        if upload_to_s3 "$backup_file" "config/"; then
            log_success "Konfiguratsiya backup S3 ga yuklandi"
        else
            log_warning "Konfiguratsiya backup S3 ga yuklanmadi"
        fi
        
        return 0
    else
        log_error "Konfiguratsiya backup xatolik bilan tugadi"
        return 1
    fi
}

upload_to_s3() {
    local file_path="$1"
    local s3_prefix="$2"
    
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        log_warning "AWS credentials topilmadi, S3 ga yuklanmaydi"
        return 1
    fi
    
    # Install AWS CLI if not exists
    if ! command -v aws &> /dev/null; then
        log_info "AWS CLI o'rnatilmoqda..."
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y awscli
        elif command -v yum &> /dev/null; then
            yum install -y awscli
        else
            log_error "AWS CLI o'rnatib bo'lmadi"
            return 1
        fi
    fi
    
    # Configure AWS credentials
    export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
    export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"
    
    # Upload to S3
    local s3_key="${s3_prefix}$(basename "$file_path")"
    if aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_key" 2>>"$LOG_FILE"; then
        log_success "Fayl S3 ga yuklandi: s3://$S3_BUCKET/$s3_key"
        return 0
    else
        log_error "S3 ga yuklash xatolik bilan tugadi"
        return 1
    fi
}

cleanup_old_backups() {
    log_info "Eski backuplarni tozalash..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE"
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE"
    find "$BACKUP_DIR" -name "*.sql" -type f -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE"
    
    # S3 cleanup (if AWS CLI is available)
    if command -v aws &> /dev/null && [ -n "$AWS_ACCESS_KEY_ID" ]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        
        # List and delete old S3 objects
        aws s3 ls "s3://$S3_BUCKET/" --recursive | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}' | sed 's/-//g')
            local file_key=$(echo "$line" | awk '{print $4}')
            
            if [ "$file_date" -lt "$cutoff_date" ]; then
                aws s3 rm "s3://$S3_BUCKET/$file_key" 2>>"$LOG_FILE"
                log_info "Eski S3 fayl o'chirildi: $file_key"
            fi
        done
    fi
    
    log_success "Eski backuplar tozalandi"
}

verify_backups() {
    log_info "Backup fayllarini tekshirish..."
    
    local backup_files=(
        "$BACKUP_DIR/postgres/ultramarket_postgres_${DATE}.sql.gz"
        "$BACKUP_DIR/mongodb/ultramarket_mongodb_${DATE}.tar.gz"
        "$BACKUP_DIR/redis/ultramarket_redis_${DATE}.rdb.gz"
        "$BACKUP_DIR/files/ultramarket_files_${DATE}.tar.gz"
        "$BACKUP_DIR/files/ultramarket_config_${DATE}.tar.gz"
    )
    
    local failed_backups=()
    
    for backup_file in "${backup_files[@]}"; do
        if [ -f "$backup_file" ]; then
            # Check if file is not empty
            if [ -s "$backup_file" ]; then
                # Check if compressed file is valid
                if gzip -t "$backup_file" 2>/dev/null || tar -tzf "$backup_file" &>/dev/null; then
                    log_success "Backup fayl yaroqli: $(basename "$backup_file")"
                else
                    log_error "Backup fayl buzilgan: $(basename "$backup_file")"
                    failed_backups+=("$(basename "$backup_file")")
                fi
            else
                log_error "Backup fayl bo'sh: $(basename "$backup_file")"
                failed_backups+=("$(basename "$backup_file")")
            fi
        else
            log_error "Backup fayl topilmadi: $(basename "$backup_file")"
            failed_backups+=("$(basename "$backup_file")")
        fi
    done
    
    if [ ${#failed_backups[@]} -eq 0 ]; then
        log_success "Barcha backup fayllar yaroqli"
        return 0
    else
        log_error "Muvaffaqiyatsiz backup fayllar: ${failed_backups[*]}"
        return 1
    fi
}

generate_backup_report() {
    log_info "Backup hisobotini yaratish..."
    
    local report_file="$BACKUP_DIR/logs/backup_report_${DATE}.txt"
    
    {
        echo "UltraMarket Backup Report"
        echo "========================"
        echo "Date: $(date)"
        echo "Backup Directory: $BACKUP_DIR"
        echo "Retention Days: $RETENTION_DAYS"
        echo ""
        echo "Backup Files:"
        echo "============="
        
        find "$BACKUP_DIR" -name "*${DATE}*" -type f | while read -r file; do
            local size=$(du -h "$file" | cut -f1)
            echo "- $(basename "$file"): $size"
        done
        
        echo ""
        echo "Disk Usage:"
        echo "==========="
        df -h "$BACKUP_DIR"
        
        echo ""
        echo "Log Entries:"
        echo "============"
        tail -50 "$LOG_FILE"
        
    } > "$report_file"
    
    log_success "Backup hisoboti yaratildi: $report_file"
}

# =============================================================================
# Main Backup Function
# =============================================================================

main() {
    log_info "UltraMarket backup jarayoni boshlandi"
    log_info "Backup sanasi: $DATE"
    
    # Initialize
    create_backup_directories
    
    # Backup counters
    local success_count=0
    local total_count=5
    
    # Perform backups
    if backup_postgresql; then
        ((success_count++))
    fi
    
    if backup_mongodb; then
        ((success_count++))
    fi
    
    if backup_redis; then
        ((success_count++))
    fi
    
    if backup_files; then
        ((success_count++))
    fi
    
    if backup_configuration; then
        ((success_count++))
    fi
    
    # Verify backups
    if verify_backups; then
        log_success "Backup tekshiruvi muvaffaqiyatli"
    else
        log_error "Backup tekshiruvi muvaffaqiyatsiz"
        send_telegram_notification "Backup verification failed!" "error"
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_backup_report
    
    # Final summary
    log_info "Backup jarayoni yakunlandi"
    log_info "Muvaffaqiyatli: $success_count/$total_count"
    
    if [ $success_count -eq $total_count ]; then
        log_success "Barcha backuplar muvaffaqiyatli yaratildi!"
        send_telegram_notification "All backups completed successfully! ($success_count/$total_count)" "success"
    else
        log_error "Ba'zi backuplar muvaffaqiyatsiz: $success_count/$total_count"
        send_telegram_notification "Some backups failed: $success_count/$total_count" "error"
    fi
    
    # Calculate total backup size
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    log_info "Jami backup hajmi: $total_size"
    
    return $((total_count - success_count))
}

# =============================================================================
# Script Entry Point
# =============================================================================

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Bu script root huquqida ishga tushirilishi kerak"
    exit 1
fi

# Check required tools
required_tools=("pg_dump" "mongodump" "redis-cli" "tar" "gzip")
for tool in "${required_tools[@]}"; do
    if ! command -v "$tool" &> /dev/null; then
        log_error "Kerakli tool topilmadi: $tool"
        exit 1
    fi
done

# Create log file if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Run main function
main "$@"
exit_code=$?

# Send final notification
if [ $exit_code -eq 0 ]; then
    send_telegram_notification "Backup completed successfully!" "success"
else
    send_telegram_notification "Backup completed with errors!" "error"
fi

exit $exit_code 