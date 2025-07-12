#!/bin/bash

# =============================================================================
# UltraMarket Security Hardening Script
# This script implements comprehensive security hardening measures
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get upgrade -y
        apt-get install -y fail2ban ufw aide rkhunter chkrootkit
    elif command -v yum &> /dev/null; then
        yum update -y
        yum install -y fail2ban firewalld aide rkhunter
    else
        warning "Package manager not supported. Please update manually."
    fi
    
    success "System packages updated"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        # Reset UFW to defaults
        ufw --force reset
        
        # Default policies
        ufw default deny incoming
        ufw default allow outgoing
        
        # Allow SSH (change port if needed)
        ufw allow 22/tcp
        
        # Allow HTTP and HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp
        
        # Allow application ports
        ufw allow 3000/tcp  # Node.js apps
        ufw allow 5432/tcp  # PostgreSQL
        ufw allow 27017/tcp # MongoDB
        ufw allow 6379/tcp  # Redis
        ufw allow 9200/tcp  # Elasticsearch
        
        # Allow monitoring ports
        ufw allow 9090/tcp  # Prometheus
        ufw allow 3000/tcp  # Grafana
        
        # Enable UFW
        ufw --force enable
        
    elif command -v firewall-cmd &> /dev/null; then
        # Configure firewalld
        systemctl enable firewalld
        systemctl start firewalld
        
        # Set default zone
        firewall-cmd --set-default-zone=public
        
        # Allow services
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        
        # Allow custom ports
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --permanent --add-port=5432/tcp
        firewall-cmd --permanent --add-port=27017/tcp
        firewall-cmd --permanent --add-port=6379/tcp
        firewall-cmd --permanent --add-port=9200/tcp
        firewall-cmd --permanent --add-port=9090/tcp
        
        # Reload firewall
        firewall-cmd --reload
    fi
    
    success "Firewall configured"
}

# Configure fail2ban
configure_fail2ban() {
    log "Configuring fail2ban..."
    
    # Create custom jail configuration
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban IP for 1 hour
bantime = 3600
# Find IP in 10 minutes
findtime = 600
# Ban after 5 attempts
maxretry = 5
# Ignore local IPs
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

    # Create custom filter for Node.js apps
    cat > /etc/fail2ban/filter.d/nodejs.conf << 'EOF'
[Definition]
failregex = ^<HOST> .* ".*" (4\d\d|5\d\d) \d+ ".*" ".*"$
ignoreregex =
EOF

    # Add Node.js jail
    cat >> /etc/fail2ban/jail.local << 'EOF'

[nodejs]
enabled = true
filter = nodejs
port = 3000
logpath = /var/log/ultramarket/access.log
maxretry = 10
bantime = 1800
EOF

    # Restart fail2ban
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    success "Fail2ban configured"
}

# Secure SSH configuration
secure_ssh() {
    log "Securing SSH configuration..."
    
    # Backup original config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # Apply security settings
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/#PermitEmptyPasswords no/PermitEmptyPasswords no/' /etc/ssh/sshd_config
    sed -i 's/#MaxAuthTries 6/MaxAuthTries 3/' /etc/ssh/sshd_config
    sed -i 's/#ClientAliveInterval 0/ClientAliveInterval 300/' /etc/ssh/sshd_config
    sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 2/' /etc/ssh/sshd_config
    
    # Add additional security settings
    echo "Protocol 2" >> /etc/ssh/sshd_config
    echo "X11Forwarding no" >> /etc/ssh/sshd_config
    echo "UsePAM yes" >> /etc/ssh/sshd_config
    echo "AllowUsers ubuntu" >> /etc/ssh/sshd_config
    
    # Restart SSH service
    systemctl restart sshd
    
    success "SSH configuration secured"
}

# Configure system security settings
configure_system_security() {
    log "Configuring system security settings..."
    
    # Disable unused network protocols
    echo "install dccp /bin/true" >> /etc/modprobe.d/blacklist.conf
    echo "install sctp /bin/true" >> /etc/modprobe.d/blacklist.conf
    echo "install rds /bin/true" >> /etc/modprobe.d/blacklist.conf
    echo "install tipc /bin/true" >> /etc/modprobe.d/blacklist.conf
    
    # Kernel security parameters
    cat > /etc/sysctl.d/99-security.conf << 'EOF'
# IP Spoofing protection
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Log Martians
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_all = 1

# Ignore Directed pings
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable IPv6 if not needed
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# TCP SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Control buffer overflow attacks
kernel.exec-shield = 1
kernel.randomize_va_space = 2
EOF

    # Apply sysctl settings
    sysctl -p /etc/sysctl.d/99-security.conf
    
    success "System security settings configured"
}

# Set up intrusion detection
setup_intrusion_detection() {
    log "Setting up intrusion detection..."
    
    # Configure AIDE (Advanced Intrusion Detection Environment)
    if command -v aide &> /dev/null; then
        # Initialize AIDE database
        aide --init
        mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
        
        # Create daily check cron job
        cat > /etc/cron.daily/aide-check << 'EOF'
#!/bin/bash
/usr/bin/aide --check 2>&1 | mail -s "AIDE Report - $(hostname)" admin@ultramarket.uz
EOF
        chmod +x /etc/cron.daily/aide-check
    fi
    
    # Configure rkhunter
    if command -v rkhunter &> /dev/null; then
        # Update rkhunter database
        rkhunter --update
        
        # Initial scan
        rkhunter --propupd
        
        # Create daily scan cron job
        cat > /etc/cron.daily/rkhunter-scan << 'EOF'
#!/bin/bash
/usr/bin/rkhunter --cronjob --update --quiet 2>&1 | mail -s "RKHunter Report - $(hostname)" admin@ultramarket.uz
EOF
        chmod +x /etc/cron.daily/rkhunter-scan
    fi
    
    success "Intrusion detection configured"
}

# Secure file permissions
secure_file_permissions() {
    log "Securing file permissions..."
    
    # Set secure permissions for sensitive files
    chmod 600 /etc/passwd- /etc/shadow- /etc/group- /etc/gshadow-
    chmod 644 /etc/passwd /etc/group
    chmod 640 /etc/shadow /etc/gshadow
    
    # Secure SSH keys
    find /etc/ssh -name "ssh_host_*_key" -exec chmod 600 {} \;
    find /etc/ssh -name "ssh_host_*_key.pub" -exec chmod 644 {} \;
    
    # Secure application directories
    if [ -d "/opt/ultramarket" ]; then
        chown -R ultramarket:ultramarket /opt/ultramarket
        find /opt/ultramarket -type d -exec chmod 755 {} \;
        find /opt/ultramarket -type f -exec chmod 644 {} \;
        find /opt/ultramarket -name "*.sh" -exec chmod +x {} \;
    fi
    
    # Secure log files
    if [ -d "/var/log/ultramarket" ]; then
        chown -R ultramarket:ultramarket /var/log/ultramarket
        chmod -R 640 /var/log/ultramarket
    fi
    
    success "File permissions secured"
}

# Configure log monitoring
configure_log_monitoring() {
    log "Configuring log monitoring..."
    
    # Configure rsyslog for centralized logging
    cat > /etc/rsyslog.d/50-ultramarket.conf << 'EOF'
# UltraMarket application logs
$template UltraMarketFormat,"%TIMESTAMP% %HOSTNAME% %syslogtag% %msg%\n"
local0.*    /var/log/ultramarket/app.log;UltraMarketFormat
local1.*    /var/log/ultramarket/security.log;UltraMarketFormat
local2.*    /var/log/ultramarket/audit.log;UltraMarketFormat

# Rotate logs
$outchannel ultramarket_app,/var/log/ultramarket/app.log,52428800,/usr/sbin/logrotate /etc/logrotate.d/ultramarket
$outchannel ultramarket_security,/var/log/ultramarket/security.log,52428800,/usr/sbin/logrotate /etc/logrotate.d/ultramarket
$outchannel ultramarket_audit,/var/log/ultramarket/audit.log,52428800,/usr/sbin/logrotate /etc/logrotate.d/ultramarket
EOF

    # Configure log rotation
    cat > /etc/logrotate.d/ultramarket << 'EOF'
/var/log/ultramarket/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 ultramarket ultramarket
    postrotate
        /usr/bin/systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

    # Restart rsyslog
    systemctl restart rsyslog
    
    success "Log monitoring configured"
}

# Install and configure security tools
install_security_tools() {
    log "Installing additional security tools..."
    
    # Install security scanning tools
    if command -v apt-get &> /dev/null; then
        apt-get install -y lynis tiger clamav clamav-daemon
    elif command -v yum &> /dev/null; then
        yum install -y lynis clamav clamav-update
    fi
    
    # Update ClamAV database
    if command -v freshclam &> /dev/null; then
        freshclam
        
        # Create daily scan cron job
        cat > /etc/cron.daily/clamav-scan << 'EOF'
#!/bin/bash
/usr/bin/clamscan -r /opt/ultramarket --log=/var/log/clamav/scan.log --quiet
if [ $? -eq 1 ]; then
    mail -s "ClamAV: Malware detected on $(hostname)" admin@ultramarket.uz < /var/log/clamav/scan.log
fi
EOF
        chmod +x /etc/cron.daily/clamav-scan
    fi
    
    success "Security tools installed"
}

# Configure Docker security (if Docker is installed)
configure_docker_security() {
    if command -v docker &> /dev/null; then
        log "Configuring Docker security..."
        
        # Create Docker daemon configuration
        mkdir -p /etc/docker
        cat > /etc/docker/daemon.json << 'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "live-restore": true,
    "userland-proxy": false,
    "no-new-privileges": true,
    "seccomp-profile": "/etc/docker/seccomp.json",
    "storage-driver": "overlay2"
}
EOF

        # Restart Docker daemon
        systemctl restart docker
        
        success "Docker security configured"
    fi
}

# Configure Kubernetes security (if Kubernetes is installed)
configure_kubernetes_security() {
    if command -v kubectl &> /dev/null; then
        log "Configuring Kubernetes security..."
        
        # Create network policies
        cat > /tmp/network-policy.yaml << 'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ultramarket-network-policy
  namespace: ultramarket
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ultramarket
    - podSelector: {}
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: ultramarket
    - podSelector: {}
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
EOF

        # Apply network policy
        kubectl apply -f /tmp/network-policy.yaml
        
        success "Kubernetes security configured"
    fi
}

# Create security monitoring script
create_security_monitoring() {
    log "Creating security monitoring script..."
    
    cat > /opt/ultramarket/scripts/security-monitor.sh << 'EOF'
#!/bin/bash

# Security monitoring script for UltraMarket
# This script checks for security issues and sends alerts

ALERT_EMAIL="admin@ultramarket.uz"
LOG_FILE="/var/log/ultramarket/security-monitor.log"

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    echo "$(date): $subject - $message" >> "$LOG_FILE"
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

# Check for failed login attempts
check_failed_logins() {
    local failed_logins=$(grep "Failed password" /var/log/auth.log | wc -l)
    if [ "$failed_logins" -gt 50 ]; then
        send_alert "High number of failed login attempts" "Detected $failed_logins failed login attempts in the last check"
    fi
}

# Check for suspicious network connections
check_network_connections() {
    local suspicious_connections=$(netstat -an | grep -E "(ESTABLISHED|LISTEN)" | grep -v -E "(127.0.0.1|::1)" | wc -l)
    if [ "$suspicious_connections" -gt 100 ]; then
        send_alert "High number of network connections" "Detected $suspicious_connections active network connections"
    fi
}

# Check disk usage
check_disk_usage() {
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        send_alert "High disk usage" "Root partition is $disk_usage% full"
    fi
}

# Check for rootkit signatures
check_rootkits() {
    if command -v rkhunter &> /dev/null; then
        rkhunter --check --skip-keypress --quiet
        if [ $? -ne 0 ]; then
            send_alert "Rootkit detection alert" "rkhunter found potential issues"
        fi
    fi
}

# Main execution
check_failed_logins
check_network_connections
check_disk_usage
check_rootkits

echo "$(date): Security monitoring completed" >> "$LOG_FILE"
EOF

    chmod +x /opt/ultramarket/scripts/security-monitor.sh
    
    # Create cron job for security monitoring
    cat > /etc/cron.hourly/security-monitor << 'EOF'
#!/bin/bash
/opt/ultramarket/scripts/security-monitor.sh
EOF
    chmod +x /etc/cron.hourly/security-monitor
    
    success "Security monitoring script created"
}

# Main execution
main() {
    log "Starting UltraMarket security hardening..."
    
    check_root
    update_system
    configure_firewall
    configure_fail2ban
    secure_ssh
    configure_system_security
    setup_intrusion_detection
    secure_file_permissions
    configure_log_monitoring
    install_security_tools
    configure_docker_security
    configure_kubernetes_security
    create_security_monitoring
    
    success "Security hardening completed successfully!"
    success "Please reboot the system to ensure all changes take effect."
    
    log "Security hardening summary:"
    log "- Firewall configured and enabled"
    log "- Fail2ban installed and configured"
    log "- SSH hardened with key-based authentication"
    log "- System security parameters optimized"
    log "- Intrusion detection systems configured"
    log "- File permissions secured"
    log "- Log monitoring and rotation configured"
    log "- Security tools installed and configured"
    log "- Continuous security monitoring enabled"
    
    warning "Remember to:"
    warning "- Update SSH keys and disable password authentication"
    warning "- Configure email notifications for security alerts"
    warning "- Regularly review security logs"
    warning "- Keep all software updated"
    warning "- Test backup and recovery procedures"
}

# Run main function
main "$@" 