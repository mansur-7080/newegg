#!/bin/bash

# UltraMarket Store & Analytics Services Deployment Script
# This script deploys the complete store-service and analytics-service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
   exit 1
fi

# Configuration
PROJECT_ROOT="/workspace"
STORE_SERVICE_DIR="$PROJECT_ROOT/microservices/core/store-service"
ANALYTICS_SERVICE_DIR="$PROJECT_ROOT/microservices/analytics/analytics-service"
LOGS_DIR="$PROJECT_ROOT/logs"

# Create logs directory
mkdir -p "$LOGS_DIR"

log "Starting UltraMarket Store & Analytics Services Deployment"

# Function to check if service is running
check_service() {
    local service_name=$1
    local port=$2
    
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        log "$service_name is running on port $port"
        return 0
    else
        warning "$service_name is not running on port $port"
        return 1
    fi
}

# Function to install dependencies
install_dependencies() {
    local service_dir=$1
    local service_name=$2
    
    log "Installing dependencies for $service_name..."
    
    if [ ! -f "$service_dir/package.json" ]; then
        error "package.json not found in $service_dir"
        return 1
    fi
    
    cd "$service_dir"
    
    # Install npm dependencies
    if npm install; then
        log "Dependencies installed successfully for $service_name"
    else
        error "Failed to install dependencies for $service_name"
        return 1
    fi
    
    # Generate Prisma client
    if npm run prisma:generate; then
        log "Prisma client generated for $service_name"
    else
        error "Failed to generate Prisma client for $service_name"
        return 1
    fi
}

# Function to setup database
setup_database() {
    local service_dir=$1
    local service_name=$2
    
    log "Setting up database for $service_name..."
    
    cd "$service_dir"
    
    # Run database migrations
    if npm run prisma:migrate; then
        log "Database migrations completed for $service_name"
    else
        error "Failed to run database migrations for $service_name"
        return 1
    fi
}

# Function to build service
build_service() {
    local service_dir=$1
    local service_name=$2
    
    log "Building $service_name..."
    
    cd "$service_dir"
    
    # Build TypeScript
    if npm run build; then
        log "$service_name built successfully"
    else
        error "Failed to build $service_name"
        return 1
    fi
}

# Function to start service
start_service() {
    local service_dir=$1
    local service_name=$2
    local port=$3
    
    log "Starting $service_name on port $port..."
    
    cd "$service_dir"
    
    # Check if service is already running
    if check_service "$service_name" "$port"; then
        warning "$service_name is already running on port $port"
        return 0
    fi
    
    # Start service in background
    nohup npm start > "$LOGS_DIR/${service_name}.log" 2>&1 &
    local pid=$!
    
    # Wait for service to start
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if check_service "$service_name" "$port"; then
            log "$service_name started successfully (PID: $pid)"
            return 0
        fi
        sleep 2
        attempts=$((attempts + 1))
    done
    
    error "$service_name failed to start"
    return 1
}

# Main deployment process
main() {
    log "Starting deployment process..."
    
    # Check if project root exists
    if [ ! -d "$PROJECT_ROOT" ]; then
        error "Project root directory not found: $PROJECT_ROOT"
        exit 1
    fi
    
    # Check if service directories exist
    if [ ! -d "$STORE_SERVICE_DIR" ]; then
        error "Store service directory not found: $STORE_SERVICE_DIR"
        exit 1
    fi
    
    if [ ! -d "$ANALYTICS_SERVICE_DIR" ]; then
        error "Analytics service directory not found: $ANALYTICS_SERVICE_DIR"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    log "Node.js version: $(node -v)"
    log "npm version: $(npm -v)"
    
    # Deploy Store Service
    log "=== Deploying Store Service ==="
    
    if install_dependencies "$STORE_SERVICE_DIR" "store-service"; then
        if setup_database "$STORE_SERVICE_DIR" "store-service"; then
            if build_service "$STORE_SERVICE_DIR" "store-service"; then
                if start_service "$STORE_SERVICE_DIR" "store-service" "3010"; then
                    log "Store service deployed successfully"
                else
                    error "Failed to start store service"
                    exit 1
                fi
            else
                error "Failed to build store service"
                exit 1
            fi
        else
            error "Failed to setup database for store service"
            exit 1
        fi
    else
        error "Failed to install dependencies for store service"
        exit 1
    fi
    
    # Deploy Analytics Service
    log "=== Deploying Analytics Service ==="
    
    if install_dependencies "$ANALYTICS_SERVICE_DIR" "analytics-service"; then
        if setup_database "$ANALYTICS_SERVICE_DIR" "analytics-service"; then
            if build_service "$ANALYTICS_SERVICE_DIR" "analytics-service"; then
                if start_service "$ANALYTICS_SERVICE_DIR" "analytics-service" "3020"; then
                    log "Analytics service deployed successfully"
                else
                    error "Failed to start analytics service"
                    exit 1
                fi
            else
                error "Failed to build analytics service"
                exit 1
            fi
        else
            error "Failed to setup database for analytics service"
            exit 1
        fi
    else
        error "Failed to install dependencies for analytics service"
        exit 1
    fi
    
    # Final health checks
    log "=== Final Health Checks ==="
    
    if check_service "store-service" "3010"; then
        log "✅ Store service is healthy"
    else
        error "❌ Store service health check failed"
        exit 1
    fi
    
    if check_service "analytics-service" "3020"; then
        log "✅ Analytics service is healthy"
    else
        error "❌ Analytics service health check failed"
        exit 1
    fi
    
    # Display service information
    log "=== Deployment Complete ==="
    log "Store Service: http://localhost:3010"
    log "Analytics Service: http://localhost:3020"
    log "Store Service Health: http://localhost:3010/health"
    log "Analytics Service Health: http://localhost:3020/health"
    log "Logs directory: $LOGS_DIR"
    
    # Display running processes
    log "=== Running Processes ==="
    ps aux | grep -E "(store-service|analytics-service)" | grep -v grep || true
    
    log "Deployment completed successfully! 🎉"
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"