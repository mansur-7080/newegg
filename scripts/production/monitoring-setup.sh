#!/bin/bash

# 📊 UltraMarket Backend - Production Monitoring Setup Script
# Bu skript production muhiti uchun monitoring va alerting tizimini o'rnatadi

set -e

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                📊 Monitoring Setup Script                   ║"
echo "║           UltraMarket Backend Monitoring Configuration       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Konfiguratsiya
MONITORING_DIR="/opt/monitoring"
PROMETHEUS_VERSION="2.40.0"
GRAFANA_VERSION="9.3.0"
ALERTMANAGER_VERSION="0.25.0"
NODE_EXPORTER_VERSION="1.5.0"

# Telegram bot konfiguratsiyasi
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Email konfiguratsiyasi
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
ALERT_EMAIL=""

# Funksiyalar
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

# Root huquqlarini tekshirish
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Bu skript root huquqlari bilan ishga tushirilishi kerak"
        exit 1
    fi
}

# Monitoring foydalanuvchisini yaratish
create_monitoring_user() {
    log_info "Monitoring foydalanuvchisini yaratish..."
    
    if ! id "monitoring" &>/dev/null; then
        useradd --no-create-home --shell /bin/false monitoring
        log_success "Monitoring foydalanuvchisi yaratildi"
    else
        log_info "Monitoring foydalanuvchisi allaqachon mavjud"
    fi
}

# Monitoring kataloglarini yaratish
create_directories() {
    log_info "Monitoring kataloglarini yaratish..."
    
    directories=(
        "$MONITORING_DIR"
        "$MONITORING_DIR/prometheus"
        "$MONITORING_DIR/grafana"
        "$MONITORING_DIR/alertmanager"
        "$MONITORING_DIR/node_exporter"
        "$MONITORING_DIR/config"
        "$MONITORING_DIR/data"
        "$MONITORING_DIR/logs"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        chown monitoring:monitoring "$dir"
    done
    
    log_success "Monitoring kataloglari yaratildi"
}

# Prometheus o'rnatish
install_prometheus() {
    log_info "Prometheus o'rnatish..."
    
    cd /tmp
    wget "https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz"
    tar xzf "prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz"
    
    cp "prometheus-${PROMETHEUS_VERSION}.linux-amd64/prometheus" /usr/local/bin/
    cp "prometheus-${PROMETHEUS_VERSION}.linux-amd64/promtool" /usr/local/bin/
    
    chown monitoring:monitoring /usr/local/bin/prometheus
    chown monitoring:monitoring /usr/local/bin/promtool
    
    # Prometheus konfiguratsiyasi
    cat > "$MONITORING_DIR/config/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'ultramarket-api'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'ultramarket-services'
    static_configs:
      - targets: 
        - 'localhost:3001'  # User Service
        - 'localhost:3002'  # Auth Service
        - 'localhost:3003'  # Product Service
        - 'localhost:3004'  # Order Service
        - 'localhost:3005'  # Cart Service
        - 'localhost:3006'  # Payment Service
        - 'localhost:3007'  # Search Service
        - 'localhost:3008'  # Notification Service
        - 'localhost:3009'  # File Service
        - 'localhost:3010'  # Audit Service
        - 'localhost:3011'  # Performance Service
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['localhost:9216']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'elasticsearch'
    static_configs:
      - targets: ['localhost:9114']

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
EOF
    
    # Alert rules
    cat > "$MONITORING_DIR/config/alert_rules.yml" << EOF
groups:
  - name: ultramarket_alerts
    rules:
      # Service Health Alerts
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ \$labels.job }} is down"
          description: "Service {{ \$labels.job }} has been down for more than 1 minute."

      # High CPU Usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ \$labels.instance }}"
          description: "CPU usage is above 80% for more than 5 minutes."

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ \$labels.instance }}"
          description: "Memory usage is above 85% for more than 5 minutes."

      # Disk Space Alert
      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"} * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space low on {{ \$labels.instance }}"
          description: "Disk space is below 10% on {{ \$labels.device }}."

      # High Response Time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time for {{ \$labels.job }}"
          description: "95th percentile response time is above 500ms for more than 5 minutes."

      # High Error Rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100 > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate for {{ \$labels.job }}"
          description: "Error rate is above 5% for more than 5 minutes."

      # Database Connection Issues
      - alert: DatabaseConnectionHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "PostgreSQL connection count is above 80 for more than 5 minutes."

      # Payment Processing Issues
      - alert: PaymentFailureRate
        expr: rate(payment_failures_total[5m]) / rate(payment_attempts_total[5m]) * 100 > 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High payment failure rate"
          description: "Payment failure rate is above 2% for more than 5 minutes."

      # Search Service Issues
      - alert: SearchServiceSlow
        expr: elasticsearch_cluster_health_status != 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Elasticsearch cluster health issues"
          description: "Elasticsearch cluster is not in green state."
EOF
    
    # Prometheus systemd service
    cat > /etc/systemd/system/prometheus.service << EOF
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=monitoring
Group=monitoring
Type=simple
ExecStart=/usr/local/bin/prometheus \\
    --config.file $MONITORING_DIR/config/prometheus.yml \\
    --storage.tsdb.path $MONITORING_DIR/data \\
    --web.console.templates=/etc/prometheus/consoles \\
    --web.console.libraries=/etc/prometheus/console_libraries \\
    --web.listen-address=0.0.0.0:9090 \\
    --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable prometheus
    systemctl start prometheus
    
    log_success "Prometheus o'rnatildi va ishga tushirildi"
}

# Grafana o'rnatish
install_grafana() {
    log_info "Grafana o'rnatish..."
    
    # Grafana repository qo'shish
    wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
    echo "deb https://packages.grafana.com/oss/deb stable main" | tee -a /etc/apt/sources.list.d/grafana.list
    
    apt-get update
    apt-get install -y grafana
    
    # Grafana konfiguratsiyasi
    cat > /etc/grafana/grafana.ini << EOF
[server]
http_port = 3000
domain = monitoring.ultramarket.uz
root_url = https://monitoring.ultramarket.uz

[security]
admin_user = admin
admin_password = UltraMarket2024!
secret_key = ultramarket_secret_key_2024

[database]
type = sqlite3
path = grafana.db

[smtp]
enabled = true
host = ${SMTP_HOST}:${SMTP_PORT}
user = ${SMTP_USER}
password = ${SMTP_PASSWORD}
from_address = ${SMTP_USER}
from_name = UltraMarket Monitoring

[alerting]
enabled = true
execute_alerts = true
EOF
    
    systemctl daemon-reload
    systemctl enable grafana-server
    systemctl start grafana-server
    
    log_success "Grafana o'rnatildi va ishga tushirildi"
}

# Alertmanager o'rnatish
install_alertmanager() {
    log_info "Alertmanager o'rnatish..."
    
    cd /tmp
    wget "https://github.com/prometheus/alertmanager/releases/download/v${ALERTMANAGER_VERSION}/alertmanager-${ALERTMANAGER_VERSION}.linux-amd64.tar.gz"
    tar xzf "alertmanager-${ALERTMANAGER_VERSION}.linux-amd64.tar.gz"
    
    cp "alertmanager-${ALERTMANAGER_VERSION}.linux-amd64/alertmanager" /usr/local/bin/
    cp "alertmanager-${ALERTMANAGER_VERSION}.linux-amd64/amtool" /usr/local/bin/
    
    chown monitoring:monitoring /usr/local/bin/alertmanager
    chown monitoring:monitoring /usr/local/bin/amtool
    
    # Alertmanager konfiguratsiyasi
    cat > "$MONITORING_DIR/config/alertmanager.yml" << EOF
global:
  smtp_smarthost: '${SMTP_HOST}:${SMTP_PORT}'
  smtp_from: '${SMTP_USER}'
  smtp_auth_username: '${SMTP_USER}'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
      receiver: 'critical-receiver'
    - match:
        severity: warning
      receiver: 'warning-receiver'

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: '${ALERT_EMAIL}'
        subject: 'UltraMarket Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Labels: {{ .Labels }}
          {{ end }}

  - name: 'critical-receiver'
    email_configs:
      - to: '${ALERT_EMAIL}'
        subject: '🚨 CRITICAL: UltraMarket Alert'
        body: |
          {{ range .Alerts }}
          🚨 CRITICAL ALERT 🚨
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Labels: {{ .Labels }}
          Time: {{ .StartsAt }}
          {{ end }}
    webhook_configs:
      - url: 'https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage'
        send_resolved: true

  - name: 'warning-receiver'
    email_configs:
      - to: '${ALERT_EMAIL}'
        subject: '⚠️ WARNING: UltraMarket Alert'
        body: |
          {{ range .Alerts }}
          ⚠️ WARNING ALERT ⚠️
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Labels: {{ .Labels }}
          Time: {{ .StartsAt }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF
    
    # Alertmanager systemd service
    cat > /etc/systemd/system/alertmanager.service << EOF
[Unit]
Description=Alertmanager
Wants=network-online.target
After=network-online.target

[Service]
User=monitoring
Group=monitoring
Type=simple
ExecStart=/usr/local/bin/alertmanager \\
    --config.file=$MONITORING_DIR/config/alertmanager.yml \\
    --storage.path=$MONITORING_DIR/data \\
    --web.listen-address=0.0.0.0:9093

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable alertmanager
    systemctl start alertmanager
    
    log_success "Alertmanager o'rnatildi va ishga tushirildi"
}

# Node Exporter o'rnatish
install_node_exporter() {
    log_info "Node Exporter o'rnatish..."
    
    cd /tmp
    wget "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
    tar xzf "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
    
    cp "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter" /usr/local/bin/
    chown monitoring:monitoring /usr/local/bin/node_exporter
    
    # Node Exporter systemd service
    cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=monitoring
Group=monitoring
Type=simple
ExecStart=/usr/local/bin/node_exporter \\
    --web.listen-address=0.0.0.0:9100

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable node_exporter
    systemctl start node_exporter
    
    log_success "Node Exporter o'rnatildi va ishga tushirildi"
}

# Database exporters o'rnatish
install_database_exporters() {
    log_info "Database exporters o'rnatish..."
    
    # PostgreSQL Exporter
    wget -O /tmp/postgres_exporter.tar.gz "https://github.com/prometheus-community/postgres_exporter/releases/download/v0.11.1/postgres_exporter-0.11.1.linux-amd64.tar.gz"
    tar xzf /tmp/postgres_exporter.tar.gz -C /tmp
    cp /tmp/postgres_exporter-0.11.1.linux-amd64/postgres_exporter /usr/local/bin/
    chown monitoring:monitoring /usr/local/bin/postgres_exporter
    
    # MongoDB Exporter
    wget -O /tmp/mongodb_exporter.tar.gz "https://github.com/percona/mongodb_exporter/releases/download/v0.35.0/mongodb_exporter-0.35.0.linux-amd64.tar.gz"
    tar xzf /tmp/mongodb_exporter.tar.gz -C /tmp
    cp /tmp/mongodb_exporter-0.35.0.linux-amd64/mongodb_exporter /usr/local/bin/
    chown monitoring:monitoring /usr/local/bin/mongodb_exporter
    
    # Redis Exporter
    wget -O /tmp/redis_exporter.tar.gz "https://github.com/oliver006/redis_exporter/releases/download/v1.45.0/redis_exporter-v1.45.0.linux-amd64.tar.gz"
    tar xzf /tmp/redis_exporter.tar.gz -C /tmp
    cp /tmp/redis_exporter-v1.45.0.linux-amd64/redis_exporter /usr/local/bin/
    chown monitoring:monitoring /usr/local/bin/redis_exporter
    
    # Elasticsearch Exporter
    wget -O /tmp/elasticsearch_exporter.tar.gz "https://github.com/prometheus-community/elasticsearch_exporter/releases/download/v1.5.0/elasticsearch_exporter-1.5.0.linux-amd64.tar.gz"
    tar xzf /tmp/elasticsearch_exporter.tar.gz -C /tmp
    cp /tmp/elasticsearch_exporter-1.5.0.linux-amd64/elasticsearch_exporter /usr/local/bin/
    chown monitoring:monitoring /usr/local/bin/elasticsearch_exporter
    
    # Nginx Exporter
    wget -O /tmp/nginx_exporter.tar.gz "https://github.com/nginxinc/nginx-prometheus-exporter/releases/download/v0.10.0/nginx-prometheus-exporter_0.10.0_linux_amd64.tar.gz"
    tar xzf /tmp/nginx_exporter.tar.gz -C /tmp
    cp /tmp/nginx-prometheus-exporter /usr/local/bin/
    chown monitoring:monitoring /usr/local/bin/nginx-prometheus-exporter
    
    log_success "Database exporters o'rnatildi"
}

# Grafana dashboards import qilish
import_grafana_dashboards() {
    log_info "Grafana dashboards import qilish..."
    
    # Grafana API orqali dashboards import qilish
    sleep 10  # Grafana to'liq ishga tushishini kutish
    
    # Node Exporter Dashboard
    curl -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "dashboard": {
                "id": null,
                "title": "Node Exporter Full",
                "tags": ["node-exporter"],
                "timezone": "browser",
                "panels": [],
                "time": {"from": "now-6h", "to": "now"},
                "timepicker": {},
                "templating": {"list": []},
                "annotations": {"list": []},
                "refresh": "30s",
                "schemaVersion": 16,
                "version": 0,
                "links": []
            },
            "overwrite": true
        }' \
        http://admin:UltraMarket2024!@localhost:3000/api/dashboards/db
    
    log_success "Grafana dashboards import qilindi"
}

# Monitoring holatini tekshirish
check_monitoring_status() {
    log_info "Monitoring xizmatlar holatini tekshirish..."
    
    services=("prometheus" "grafana-server" "alertmanager" "node_exporter")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            log_success "$service xizmati ishlamoqda"
        else
            log_error "$service xizmati ishlamayapti"
        fi
    done
}

# Telegram bot konfiguratsiyasi
setup_telegram_bot() {
    log_info "Telegram bot konfiguratsiyasi..."
    
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        # Test message jo'natish
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            -d text="🚀 UltraMarket Monitoring tizimi ishga tushirildi!"
        
        log_success "Telegram bot konfiguratsiya qilindi"
    else
        log_warning "Telegram bot token va chat ID belgilanmagan"
    fi
}

# Asosiy funksiya
main() {
    log_info "UltraMarket Backend monitoring setup boshlandi..."
    
    # Root huquqlarini tekshirish
    check_root
    
    # Konfiguratsiyani so'rash
    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        read -p "Telegram Bot Token kiriting (ixtiyoriy): " TELEGRAM_BOT_TOKEN
    fi
    
    if [ -z "$TELEGRAM_CHAT_ID" ]; then
        read -p "Telegram Chat ID kiriting (ixtiyoriy): " TELEGRAM_CHAT_ID
    fi
    
    if [ -z "$SMTP_USER" ]; then
        read -p "SMTP username kiriting: " SMTP_USER
    fi
    
    if [ -z "$SMTP_PASSWORD" ]; then
        read -s -p "SMTP password kiriting: " SMTP_PASSWORD
        echo
    fi
    
    if [ -z "$ALERT_EMAIL" ]; then
        read -p "Alert email kiriting: " ALERT_EMAIL
    fi
    
    # Monitoring foydalanuvchisini yaratish
    create_monitoring_user
    
    # Kataloglarni yaratish
    create_directories
    
    # Prometheus o'rnatish
    install_prometheus
    
    # Grafana o'rnatish
    install_grafana
    
    # Alertmanager o'rnatish
    install_alertmanager
    
    # Node Exporter o'rnatish
    install_node_exporter
    
    # Database exporters o'rnatish
    install_database_exporters
    
    # Grafana dashboards import qilish
    import_grafana_dashboards
    
    # Telegram bot sozlash
    setup_telegram_bot
    
    # Monitoring holatini tekshirish
    check_monitoring_status
    
    log_success "Monitoring setup yakunlandi!"
    
    # Yakuniy ma'lumotlar
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 Monitoring Setup Yakunlandi!                ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}Monitoring URLs:${NC}"
    echo -e "  📊 Prometheus: http://localhost:9090"
    echo -e "  📈 Grafana: http://localhost:3000 (admin/UltraMarket2024!)"
    echo -e "  🚨 Alertmanager: http://localhost:9093"
    echo -e "  📊 Node Exporter: http://localhost:9100"
    echo
    echo -e "${BLUE}Keyingi qadamlar:${NC}"
    echo -e "  1. Grafana dashboards sozlang"
    echo -e "  2. Alert rules test qiling"
    echo -e "  3. Telegram bot test qiling"
    echo -e "  4. Email alerts test qiling"
    echo
    echo -e "${BLUE}Foydali buyruqlar:${NC}"
    echo -e "  • Prometheus holatini tekshirish: systemctl status prometheus"
    echo -e "  • Grafana holatini tekshirish: systemctl status grafana-server"
    echo -e "  • Alertmanager holatini tekshirish: systemctl status alertmanager"
    echo -e "  • Loglarni ko'rish: journalctl -u prometheus -f"
    echo
}

# Skriptni ishga tushirish
main "$@" 