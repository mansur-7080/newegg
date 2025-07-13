#!/bin/bash

# UltraMarket Security Audit Script
# Professional security audit for UltraMarket platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AUDIT_DIR="./security-audit"
LOG_FILE="$AUDIT_DIR/audit-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="$AUDIT_DIR/security-report-$(date +%Y%m%d-%H%M%S).md"

# Create audit directory
mkdir -p "$AUDIT_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# UltraMarket Security Audit Report

**Generated:** $(date)
**Auditor:** Security Audit Script
**Version:** 1.0.0

## Executive Summary

This report contains the results of a comprehensive security audit of the UltraMarket platform.

## Audit Results

EOF
}

# Add section to report
add_section() {
    echo -e "\n## $1\n" >> "$REPORT_FILE"
}

# Add finding to report
add_finding() {
    local severity="$1"
    local title="$2"
    local description="$3"
    local recommendation="$4"
    
    echo -e "\n### $severity: $title\n" >> "$REPORT_FILE"
    echo -e "**Description:** $description\n" >> "$REPORT_FILE"
    echo -e "**Recommendation:** $recommendation\n" >> "$REPORT_FILE"
    echo -e "---\n" >> "$REPORT_FILE"
}

# Check for hardcoded secrets
check_hardcoded_secrets() {
    log "Checking for hardcoded secrets..."
    
    local secrets_found=0
    
    # Check for common secret patterns
    local patterns=(
        "password.*=.*['\"][^'\"]{8,}['\"]"
        "secret.*=.*['\"][^'\"]{8,}['\"]"
        "token.*=.*['\"][^'\"]{8,}['\"]"
        "key.*=.*['\"][^'\"]{8,}['\"]"
        "jwt.*secret.*=.*['\"][^'\"]{8,}['\"]"
        "api.*key.*=.*['\"][^'\"]{8,}['\"]"
    )
    
    for pattern in "${patterns[@]}"; do
        local matches=$(grep -r -n -i "$pattern" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build 2>/dev/null || true)
        
        if [ -n "$matches" ]; then
            error "Found potential hardcoded secrets:"
            echo "$matches" | while read -r line; do
                echo "  $line"
            done
            secrets_found=$((secrets_found + 1))
        fi
    done
    
    if [ $secrets_found -eq 0 ]; then
        success "No hardcoded secrets found"
    else
        add_finding "HIGH" "Hardcoded Secrets Found" "Found $secrets_found potential hardcoded secrets in the codebase" "Move all secrets to environment variables and use secure secret management"
    fi
}

# Check for vulnerable dependencies
check_dependencies() {
    log "Checking for vulnerable dependencies..."
    
    # Check if npm audit is available
    if command -v npm &> /dev/null; then
        cd microservices/core/auth-service
        
        # Run npm audit
        local audit_output=$(npm audit --audit-level=moderate --json 2>/dev/null || echo '{"error": "npm audit failed"}')
        
        if echo "$audit_output" | grep -q '"error"'; then
            warning "npm audit failed or not available"
        else
            local vulnerabilities=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")
            
            if [ "$vulnerabilities" -gt 0 ]; then
                error "Found $vulnerabilities vulnerabilities in dependencies"
                add_finding "MEDIUM" "Vulnerable Dependencies" "Found $vulnerabilities vulnerabilities in npm dependencies" "Run 'npm audit fix' and update vulnerable packages"
            else
                success "No vulnerabilities found in dependencies"
            fi
        fi
        
        cd ../../..
    else
        warning "npm not available for dependency audit"
    fi
}

# Check for exposed ports
check_exposed_ports() {
    log "Checking for exposed ports..."
    
    local exposed_ports=0
    
    # Check docker-compose files
    if [ -f "docker-compose.yml" ]; then
        local ports=$(grep -r "ports:" docker-compose.yml | grep -o "[0-9]\+:[0-9]\+" || true)
        
        if [ -n "$ports" ]; then
            warning "Found exposed ports in docker-compose.yml:"
            echo "$ports" | while read -r port; do
                echo "  $port"
            done
            exposed_ports=$((exposed_ports + 1))
        fi
    fi
    
    # Check for direct port bindings
    local direct_ports=$(find . -name "*.js" -o -name "*.ts" -o -name "*.json" | xargs grep -l "listen.*[0-9]\+" 2>/dev/null || true)
    
    if [ -n "$direct_ports" ]; then
        warning "Found direct port bindings in:"
        echo "$direct_ports" | while read -r file; do
            echo "  $file"
        done
        exposed_ports=$((exposed_ports + 1))
    fi
    
    if [ $exposed_ports -eq 0 ]; then
        success "No unnecessary port exposures found"
    else
        add_finding "MEDIUM" "Port Exposure" "Found $exposed_ports instances of potentially unnecessary port exposure" "Review and restrict port exposure to minimum required"
    fi
}

# Check for weak authentication
check_authentication() {
    log "Checking authentication security..."
    
    local auth_issues=0
    
    # Check for weak password requirements
    local weak_password_patterns=(
        "password.*length.*[0-9]\+"
        "minLength.*[0-9]\+"
    )
    
    for pattern in "${weak_password_patterns[@]}"; do
        local matches=$(grep -r -n -i "$pattern" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true)
        
        if [ -n "$matches" ]; then
            warning "Found potential weak password requirements:"
            echo "$matches" | while read -r line; do
                echo "  $line"
            done
            auth_issues=$((auth_issues + 1))
        fi
    done
    
    # Check for missing MFA
    if ! grep -r -i "mfa\|2fa\|two.*factor" . --exclude-dir=node_modules --exclude-dir=.git &> /dev/null; then
        warning "No MFA implementation found"
        auth_issues=$((auth_issues + 1))
    fi
    
    if [ $auth_issues -eq 0 ]; then
        success "Authentication security looks good"
    else
        add_finding "HIGH" "Authentication Issues" "Found $auth_issues authentication security issues" "Implement strong password policies and MFA"
    fi
}

# Check for SQL injection vulnerabilities
check_sql_injection() {
    log "Checking for SQL injection vulnerabilities..."
    
    local sql_issues=0
    
    # Check for raw SQL queries
    local raw_sql=$(grep -r -n -i "query.*raw\|execute.*raw\|sql.*string" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true)
    
    if [ -n "$raw_sql" ]; then
        warning "Found potential raw SQL queries:"
        echo "$raw_sql" | while read -r line; do
            echo "  $line"
        done
        sql_issues=$((sql_issues + 1))
    fi
    
    # Check for string concatenation in queries
    local string_concat=$(grep -r -n -i "query.*\+.*\$\|sql.*\+.*\$\|execute.*\+.*\$" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true)
    
    if [ -n "$string_concat" ]; then
        warning "Found potential SQL string concatenation:"
        echo "$string_concat" | while read -r line; do
            echo "  $line"
        done
        sql_issues=$((sql_issues + 1))
    fi
    
    if [ $sql_issues -eq 0 ]; then
        success "No SQL injection vulnerabilities found"
    else
        add_finding "HIGH" "SQL Injection Risk" "Found $sql_issues potential SQL injection vulnerabilities" "Use parameterized queries and ORM methods"
    fi
}

# Check for XSS vulnerabilities
check_xss() {
    log "Checking for XSS vulnerabilities..."
    
    local xss_issues=0
    
    # Check for innerHTML usage
    local inner_html=$(grep -r -n -i "innerHTML\|dangerouslySetInnerHTML" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true)
    
    if [ -n "$inner_html" ]; then
        warning "Found potential XSS vulnerabilities (innerHTML usage):"
        echo "$inner_html" | while read -r line; do
            echo "  $line"
        done
        xss_issues=$((xss_issues + 1))
    fi
    
    # Check for eval usage
    local eval_usage=$(grep -r -n -i "eval\(" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true)
    
    if [ -n "$eval_usage" ]; then
        warning "Found eval() usage (potential XSS):"
        echo "$eval_usage" | while read -r line; do
            echo "  $line"
        done
        xss_issues=$((xss_issues + 1))
    fi
    
    if [ $xss_issues -eq 0 ]; then
        success "No XSS vulnerabilities found"
    else
        add_finding "HIGH" "XSS Vulnerabilities" "Found $xss_issues potential XSS vulnerabilities" "Sanitize user input and avoid dangerous DOM manipulation"
    fi
}

# Check for CORS misconfiguration
check_cors() {
    log "Checking CORS configuration..."
    
    local cors_issues=0
    
    # Check for wildcard CORS
    local wildcard_cors=$(grep -r -n -i "cors.*\*\|origin.*\*" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true)
    
    if [ -n "$wildcard_cors" ]; then
        warning "Found wildcard CORS configuration:"
        echo "$wildcard_cors" | while read -r line; do
            echo "  $line"
        done
        cors_issues=$((cors_issues + 1))
    fi
    
    # Check for missing CORS
    if ! grep -r -i "cors" . --exclude-dir=node_modules --exclude-dir=.git &> /dev/null; then
        warning "No CORS configuration found"
        cors_issues=$((cors_issues + 1))
    fi
    
    if [ $cors_issues -eq 0 ]; then
        success "CORS configuration looks good"
    else
        add_finding "MEDIUM" "CORS Issues" "Found $cors_issues CORS configuration issues" "Configure CORS properly with specific origins"
    fi
}

# Check for environment variables
check_environment() {
    log "Checking environment configuration..."
    
    local env_issues=0
    
    # Check for .env files in git
    local env_files=$(find . -name ".env*" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || true)
    
    if [ -n "$env_files" ]; then
        warning "Found .env files that might be committed:"
        echo "$env_files" | while read -r file; do
            echo "  $file"
        done
        env_issues=$((env_issues + 1))
    fi
    
    # Check for missing .env.example
    if [ ! -f ".env.example" ] && [ ! -f "microservices/core/auth-service/.env.example" ]; then
        warning "No .env.example file found"
        env_issues=$((env_issues + 1))
    fi
    
    if [ $env_issues -eq 0 ]; then
        success "Environment configuration looks good"
    else
        add_finding "MEDIUM" "Environment Issues" "Found $env_issues environment configuration issues" "Create .env.example and ensure .env files are not committed"
    fi
}

# Check for logging security
check_logging() {
    log "Checking logging security..."
    
    local logging_issues=0
    
    # Check for sensitive data in logs
    local sensitive_logs=$(grep -r -n -i "console\.log.*password\|console\.log.*token\|console\.log.*secret" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true)
    
    if [ -n "$sensitive_logs" ]; then
        warning "Found potential sensitive data logging:"
        echo "$sensitive_logs" | while read -r line; do
            echo "  $line"
        done
        logging_issues=$((logging_issues + 1))
    fi
    
    # Check for error logging without sanitization
    local error_logs=$(grep -r -n -i "console\.error.*\$" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || true)
    
    if [ -n "$error_logs" ]; then
        warning "Found potential unsanitized error logging:"
        echo "$error_logs" | while read -r line; do
            echo "  $line"
        done
        logging_issues=$((logging_issues + 1))
    fi
    
    if [ $logging_issues -eq 0 ]; then
        success "Logging security looks good"
    else
        add_finding "MEDIUM" "Logging Security Issues" "Found $logging_issues logging security issues" "Sanitize sensitive data in logs and implement proper error handling"
    fi
}

# Generate summary
generate_summary() {
    log "Generating security audit summary..."
    
    local total_issues=$(grep -c "### " "$REPORT_FILE" || echo "0")
    local high_issues=$(grep -c "### HIGH:" "$REPORT_FILE" || echo "0")
    local medium_issues=$(grep -c "### MEDIUM:" "$REPORT_FILE" || echo "0")
    local low_issues=$(grep -c "### LOW:" "$REPORT_FILE" || echo "0")
    
    cat >> "$REPORT_FILE" << EOF

## Summary

- **Total Issues Found:** $total_issues
- **High Priority:** $high_issues
- **Medium Priority:** $medium_issues
- **Low Priority:** $low_issues

## Recommendations

1. **Immediate Actions (High Priority):**
   - Address all high-priority issues immediately
   - Implement proper secret management
   - Fix authentication vulnerabilities

2. **Short-term Actions (Medium Priority):**
   - Update vulnerable dependencies
   - Configure CORS properly
   - Implement proper logging

3. **Long-term Actions (Low Priority):**
   - Regular security audits
   - Security training for developers
   - Implement security monitoring

## Next Steps

1. Review all findings in this report
2. Prioritize fixes based on severity
3. Implement fixes and retest
4. Schedule regular security audits
5. Consider penetration testing

---
*This report was generated automatically. Please review all findings manually.*
EOF
}

# Main audit function
main() {
    log "Starting UltraMarket Security Audit..."
    
    init_report
    
    add_section "Security Findings"
    
    check_hardcoded_secrets
    check_dependencies
    check_exposed_ports
    check_authentication
    check_sql_injection
    check_xss
    check_cors
    check_environment
    check_logging
    
    generate_summary
    
    log "Security audit completed. Report saved to: $REPORT_FILE"
    log "Log file: $LOG_FILE"
    
    echo -e "\n${GREEN}Security Audit Summary:${NC}"
    echo -e "Report: $REPORT_FILE"
    echo -e "Log: $LOG_FILE"
}

# Run main function
main "$@"