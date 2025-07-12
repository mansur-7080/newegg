#!/bin/bash

# ==================================================
# ULTRAMARKET BACKEND STARTUP SCRIPT
# ==================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Docker is running
check_docker() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Docker and Docker Compose are available"
}

# Function to check environment file
check_environment() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success "Created .env file from template"
            print_warning "Please edit .env file with your configuration before continuing"
            read -p "Press Enter to continue or Ctrl+C to exit and edit .env file..."
        else
            print_error "env.example file not found. Please create .env file manually."
            exit 1
        fi
    else
        print_success ".env file found"
    fi
}

# Function to build shared library
build_shared_library() {
    print_status "Building shared library..."
    
    cd libs/shared
    npm install
    npm run build
    cd ../..
    
    print_success "Shared library built successfully"
}

# Function to build all services
build_services() {
    print_status "Building all services..."
    
    # Build core services
    print_status "Building core services..."
    
    # Auth Service
    cd microservices/core/auth-service
    npm install
    npm run build
    cd ../../..
    
    # User Service
    cd microservices/core/user-service/user-service
    npm install
    npm run build
    cd ../../../..
    
    # Product Service
    cd microservices/business/product-service/product-service
    npm install
    npm run build
    cd ../../../..
    
    # Order Service
    cd microservices/business/order-service/order-service
    npm install
    npm run build
    cd ../../../..
    
    # Payment Service
    cd microservices/business/payment-service/payment-service
    npm install
    npm run build
    cd ../../../..
    
    # Cart Service
    cd microservices/business/cart-service/cart-service
    npm install
    npm run build
    cd ../../../..
    
    print_success "All services built successfully"
}

# Function to start database services
start_databases() {
    print_status "Starting database services..."
    
    docker-compose -f config/docker/docker-compose.dev.yml up -d postgres redis
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    until docker-compose -f config/docker/docker-compose.dev.yml exec -T postgres pg_isready -U ultramarket_user -d ultramarket; do
        sleep 2
    done
    
    print_success "Database services started successfully"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Run migrations for each service
    services=("auth-service" "product-service" "order-service" "payment-service" "cart-service")
    
    for service in "${services[@]}"; do
        print_status "Running migrations for $service..."
        docker-compose -f config/docker/docker-compose.dev.yml exec -T $service npm run migrate:dev || true
    done
    
    print_success "Database migrations completed"
}

# Function to start all services
start_services() {
    print_status "Starting all services..."
    
    docker-compose -f config/docker/docker-compose.dev.yml up -d
    
    print_success "All services started successfully"
}

# Function to check service health
check_service_health() {
    print_status "Checking service health..."
    
    services=(
        "http://localhost:3001/health"  # Auth Service
        "http://localhost:3003/health"  # Product Service
        "http://localhost:3004/health"  # Order Service
        "http://localhost:3005/health"  # Payment Service
        "http://localhost:3006/health"  # Cart Service
        "http://localhost:8000/status"  # API Gateway
    )
    
    for service in "${services[@]}"; do
        print_status "Checking $service..."
        if curl -f -s "$service" >/dev/null; then
            print_success "$service is healthy"
        else
            print_warning "$service is not responding yet"
        fi
    done
}

# Function to show service URLs
show_service_urls() {
    echo ""
    print_success "UltraMarket Backend is running!"
    echo ""
    echo "Service URLs:"
    echo "  API Gateway:     http://localhost:8000"
    echo "  Auth Service:    http://localhost:3001"
    echo "  Product Service: http://localhost:3003"
    echo "  Order Service:   http://localhost:3004"
    echo "  Payment Service: http://localhost:3005"
    echo "  Cart Service:    http://localhost:3006"
    echo ""
    echo "Development Tools:"
    echo "  Grafana Dashboard: http://localhost:3000 (admin/admin)"
    echo "  Adminer (DB):     http://localhost:8080"
    echo "  Redis Commander:  http://localhost:8081"
    echo ""
    echo "API Documentation:"
    echo "  Swagger UI:       http://localhost:8000/docs"
    echo ""
}

# Function to stop all services
stop_services() {
    print_status "Stopping all services..."
    docker-compose -f config/docker/docker-compose.dev.yml down
    print_success "All services stopped"
}

# Function to show logs
show_logs() {
    print_status "Showing logs for all services..."
    docker-compose -f config/docker/docker-compose.dev.yml logs -f
}

# Function to clean up
cleanup() {
    print_status "Cleaning up..."
    docker-compose -f config/docker/docker-compose.dev.yml down -v
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "UltraMarket Backend Startup Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  start     Start all services (default)"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  logs      Show logs for all services"
    echo "  clean     Clean up all containers and volumes"
    echo "  build     Build all services"
    echo "  migrate   Run database migrations"
    echo "  health    Check service health"
    echo "  help      Show this help message"
    echo ""
}

# Main script logic
main() {
    case "${1:-start}" in
        "start")
            print_status "Starting UltraMarket Backend..."
            check_docker
            check_environment
            build_shared_library
            build_services
            start_databases
            run_migrations
            start_services
            sleep 10
            check_service_health
            show_service_urls
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 5
            main start
            ;;
        "logs")
            show_logs
            ;;
        "clean")
            cleanup
            ;;
        "build")
            check_docker
            build_shared_library
            build_services
            ;;
        "migrate")
            check_docker
            start_databases
            run_migrations
            ;;
        "health")
            check_service_health
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Trap to handle script interruption
trap 'print_error "Script interrupted"; exit 1' INT

# Run main function with all arguments
main "$@"