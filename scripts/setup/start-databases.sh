#!/bin/bash

# UltraMarket Database and Infrastructure Startup Script
# This script starts all required databases and infrastructure services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
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

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local max_attempts=30
    local attempt=1

    print_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$check_command" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Function to check Docker and Docker Compose
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p data/postgres
    mkdir -p data/mongodb
    mkdir -p data/redis
    mkdir -p data/elasticsearch
    mkdir -p data/minio
    mkdir -p backups
    
    print_success "Directories created"
}

# Function to generate environment file if it doesn't exist
setup_environment() {
    print_info "Setting up environment..."
    
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp config/environments/development.env .env
        print_success ".env file created from development template"
        print_warning "Please review and update .env file with your specific configuration"
    else
        print_success "Environment file exists"
    fi
}

# Function to start databases
start_databases() {
    print_info "Starting database services..."
    
    # Start database services
    docker-compose -f config/docker/docker-compose.databases.yml up -d
    
    print_info "Database containers started. Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    wait_for_service "PostgreSQL" "docker-compose -f config/docker/docker-compose.databases.yml exec -T postgres-primary pg_isready -U ultramarket_user"
    
    # Wait for MongoDB
    wait_for_service "MongoDB" "docker-compose -f config/docker/docker-compose.databases.yml exec -T mongodb-primary mongosh --eval 'db.adminCommand(\"ping\")'"
    
    # Wait for Redis
    wait_for_service "Redis" "docker-compose -f config/docker/docker-compose.databases.yml exec -T redis-master redis-cli ping"
    
    # Wait for Elasticsearch
    wait_for_service "Elasticsearch" "curl -f http://localhost:9200/_cluster/health"
    
    # Wait for MinIO
    wait_for_service "MinIO" "curl -f http://localhost:9000/minio/health/live"
    
    print_success "All database services are ready!"
}

# Function to initialize databases
initialize_databases() {
    print_info "Initializing databases..."
    
    # PostgreSQL initialization
    print_info "Initializing PostgreSQL databases..."
    docker-compose -f config/docker/docker-compose.databases.yml exec -T postgres-primary psql -U ultramarket_user -d postgres -f /docker-entrypoint-initdb.d/01-create-databases.sql || true
    
    # MongoDB initialization
    print_info "Initializing MongoDB databases..."
    docker-compose -f config/docker/docker-compose.databases.yml exec -T mongodb-primary mongosh /docker-entrypoint-initdb.d/01-init-replica-set.js || true
    
    # Create MinIO buckets
    print_info "Creating MinIO buckets..."
    docker-compose -f config/docker/docker-compose.databases.yml exec -T minio mc alias set local http://localhost:9000 ultramarket_admin minio_secure_password || true
    docker-compose -f config/docker/docker-compose.databases.yml exec -T minio mc mb local/ultramarket-files || true
    docker-compose -f config/docker/docker-compose.databases.yml exec -T minio mc mb local/ultramarket-backups || true
    
    print_success "Database initialization completed"
}

# Function to create Elasticsearch indexes
setup_elasticsearch() {
    print_info "Setting up Elasticsearch indexes..."
    
    # Create product index
    curl -X PUT "localhost:9200/ultramarket-products" -H 'Content-Type: application/json' -d'
    {
      "settings": {
        "number_of_shards": 2,
        "number_of_replicas": 1,
        "analysis": {
          "analyzer": {
            "uzbek_analyzer": {
              "type": "custom",
              "tokenizer": "standard",
              "filter": ["lowercase", "stop"]
            }
          }
        }
      },
      "mappings": {
        "properties": {
          "name": {
            "type": "text",
            "analyzer": "uzbek_analyzer",
            "fields": {
              "keyword": { "type": "keyword" },
              "suggest": { "type": "completion" }
            }
          },
          "description": {
            "type": "text",
            "analyzer": "uzbek_analyzer"
          },
          "category": {
            "type": "keyword"
          },
          "brand": {
            "type": "keyword"
          },
          "price": {
            "type": "float"
          },
          "rating": {
            "type": "float"
          },
          "created_at": {
            "type": "date"
          }
        }
      }
    }' || true
    
    # Create search logs index
    curl -X PUT "localhost:9200/ultramarket-search-logs" -H 'Content-Type: application/json' -d'
    {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1
      },
      "mappings": {
        "properties": {
          "query": { "type": "text" },
          "user_id": { "type": "keyword" },
          "session_id": { "type": "keyword" },
          "results_count": { "type": "integer" },
          "timestamp": { "type": "date" }
        }
      }
    }' || true
    
    print_success "Elasticsearch indexes created"
}

# Function to check service health
check_services_health() {
    print_info "Checking services health..."
    
    local all_healthy=true
    
    # Check PostgreSQL
    if docker-compose -f config/docker/docker-compose.databases.yml exec -T postgres-primary pg_isready -U ultramarket_user >/dev/null 2>&1; then
        print_success "PostgreSQL: Healthy"
    else
        print_error "PostgreSQL: Unhealthy"
        all_healthy=false
    fi
    
    # Check MongoDB
    if docker-compose -f config/docker/docker-compose.databases.yml exec -T mongodb-primary mongosh --eval 'db.adminCommand("ping")' >/dev/null 2>&1; then
        print_success "MongoDB: Healthy"
    else
        print_error "MongoDB: Unhealthy"
        all_healthy=false
    fi
    
    # Check Redis
    if docker-compose -f config/docker/docker-compose.databases.yml exec -T redis-master redis-cli ping >/dev/null 2>&1; then
        print_success "Redis: Healthy"
    else
        print_error "Redis: Unhealthy"
        all_healthy=false
    fi
    
    # Check Elasticsearch
    if curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1; then
        print_success "Elasticsearch: Healthy"
    else
        print_error "Elasticsearch: Unhealthy"
        all_healthy=false
    fi
    
    # Check MinIO
    if curl -f http://localhost:9000/minio/health/live >/dev/null 2>&1; then
        print_success "MinIO: Healthy"
    else
        print_error "MinIO: Unhealthy"
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        print_success "All services are healthy!"
        return 0
    else
        print_error "Some services are not healthy"
        return 1
    fi
}

# Function to display service URLs
display_service_info() {
    print_info "Service Information:"
    echo ""
    echo "🗄️  Database Services:"
    echo "   PostgreSQL: localhost:5432 (user: ultramarket_user)"
    echo "   MongoDB: localhost:27017 (user: ultramarket_app)"
    echo "   Redis: localhost:6379"
    echo "   Elasticsearch: http://localhost:9200"
    echo ""
    echo "📁 File Storage:"
    echo "   MinIO: http://localhost:9000 (user: ultramarket_admin)"
    echo "   MinIO Console: http://localhost:9001"
    echo ""
    echo "🔧 Management Tools:"
    echo "   PgAdmin: http://localhost:5050 (admin@ultramarket.uz)"
    echo "   MongoDB Express: http://localhost:8081"
    echo "   Kibana: http://localhost:5601"
    echo ""
    echo "📊 Monitoring:"
    echo "   Check logs: docker-compose -f config/docker/docker-compose.databases.yml logs -f [service-name]"
    echo "   Stop services: docker-compose -f config/docker/docker-compose.databases.yml down"
    echo "   Restart services: docker-compose -f config/docker/docker-compose.databases.yml restart"
    echo ""
}

# Function to create sample data
create_sample_data() {
    if [ "$1" = "--with-sample-data" ]; then
        print_info "Creating sample data..."
        
        # Create sample PostgreSQL data
        docker-compose -f config/docker/docker-compose.databases.yml exec -T postgres-primary psql -U ultramarket_user -d user_db -c "
        INSERT INTO users (email, first_name, last_name, role) VALUES 
        ('admin@ultramarket.uz', 'Admin', 'User', 'ADMIN'),
        ('test@ultramarket.uz', 'Test', 'User', 'CUSTOMER')
        ON CONFLICT (email) DO NOTHING;
        " || true
        
        # Create sample MongoDB data
        docker-compose -f config/docker/docker-compose.databases.yml exec -T mongodb-primary mongosh ultramarket_products --eval "
        db.products.insertMany([
          {
            name: 'MacBook Pro 16\"',
            description: 'Professional laptop for developers',
            price: 2500,
            category: 'laptops',
            brand: 'Apple',
            status: 'active',
            created_at: new Date()
          },
          {
            name: 'iPhone 15 Pro',
            description: 'Latest iPhone with Pro features',
            price: 1200,
            category: 'smartphones',
            brand: 'Apple',
            status: 'active',
            created_at: new Date()
          }
        ]);
        " || true
        
        print_success "Sample data created"
    fi
}

# Main execution
main() {
    echo "🚀 UltraMarket Database Setup Script"
    echo "===================================="
    echo ""
    
    check_prerequisites
    create_directories
    setup_environment
    start_databases
    
    # Wait a bit for services to fully initialize
    sleep 5
    
    initialize_databases
    setup_elasticsearch
    
    # Create sample data if requested
    create_sample_data "$1"
    
    echo ""
    print_info "Performing final health check..."
    if check_services_health; then
        echo ""
        print_success "🎉 All services are up and running!"
        display_service_info
        
        echo ""
        print_info "Next steps:"
        echo "1. Start your microservices: npm run dev (in each service directory)"
        echo "2. Check the API Gateway: http://localhost:3000/health"
        echo "3. Visit the admin panel: http://localhost:3000/admin"
        echo ""
        print_success "Setup completed successfully! 🎉"
    else
        echo ""
        print_error "Setup completed with some issues. Please check the logs."
        echo "Run: docker-compose -f config/docker/docker-compose.databases.yml logs"
        exit 1
    fi
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --with-sample-data    Create sample data for testing"
        echo "  --help, -h           Show this help message"
        echo ""
        echo "This script will:"
        echo "1. Check prerequisites (Docker, Docker Compose)"
        echo "2. Create necessary directories"
        echo "3. Set up environment configuration"
        echo "4. Start all database services"
        echo "5. Initialize databases with schemas"
        echo "6. Set up Elasticsearch indexes"
        echo "7. Perform health checks"
        echo ""
        exit 0
        ;;
    *)
        main "$1"
        ;;
esac 