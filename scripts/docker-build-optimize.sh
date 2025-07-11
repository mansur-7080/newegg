#!/bin/bash

# ==================================================
# Docker Build Optimization Script
# Builds all UltraMarket services with optimizations
# ==================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY=${DOCKER_REGISTRY:-"ultramarket"}
TAG=${DOCKER_TAG:-"latest"}
BUILD_CONTEXT=${BUILD_CONTEXT:-"."}
PARALLEL_BUILDS=${PARALLEL_BUILDS:-"3"}
ENABLE_CACHE=${ENABLE_CACHE:-"true"}
ENABLE_BUILDKIT=${ENABLE_BUILDKIT:-"true"}

# Enable Docker BuildKit for better performance
if [ "$ENABLE_BUILDKIT" = "true" ]; then
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
fi

echo -e "${BLUE}🐳 UltraMarket Docker Build Optimization${NC}"
echo -e "${BLUE}=========================================${NC}\n"

# Function to log with timestamp
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to build service with optimizations
build_service() {
    local service_name=$1
    local dockerfile_path=$2
    local context_path=$3
    local target_stage=${4:-"production"}
    
    log "${BLUE}📦 Building ${service_name}...${NC}"
    
    local image_name="${REGISTRY}/${service_name}:${TAG}"
    local cache_args=""
    
    # Add cache arguments if enabled
    if [ "$ENABLE_CACHE" = "true" ]; then
        cache_args="--cache-from=${image_name} --cache-from=${REGISTRY}/${service_name}:cache"
    fi
    
    # Build command with optimizations
    local build_cmd="docker build \
        --target=${target_stage} \
        --tag=${image_name} \
        --file=${dockerfile_path} \
        ${cache_args} \
        --label=service=${service_name} \
        --label=version=${TAG} \
        --label=build-date=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        ${context_path}"
    
    if eval $build_cmd; then
        log "${GREEN}✅ Successfully built ${service_name}${NC}"
        
        # Tag as latest if not already
        if [ "$TAG" != "latest" ]; then
            docker tag "${image_name}" "${REGISTRY}/${service_name}:latest"
        fi
        
        # Display image size
        local size=$(docker images --format "table {{.Size}}" "${image_name}" | tail -n +2)
        log "${GREEN}📏 Image size: ${size}${NC}"
        
        return 0
    else
        log "${RED}❌ Failed to build ${service_name}${NC}"
        return 1
    fi
}

# Function to build service in background
build_service_async() {
    build_service "$@" &
}

# Function to wait for background jobs
wait_for_builds() {
    local failed=0
    
    for job in $(jobs -p); do
        if ! wait $job; then
            failed=$((failed + 1))
        fi
    done
    
    return $failed
}

# Function to optimize base images
optimize_base_images() {
    log "${YELLOW}🔧 Optimizing base images...${NC}"
    
    # Pull latest base images
    docker pull node:18-alpine
    docker pull nginx:alpine
    docker pull postgres:15-alpine
    
    log "${GREEN}✅ Base images optimized${NC}"
}

# Function to clean up old images
cleanup_old_images() {
    log "${YELLOW}🧹 Cleaning up old images...${NC}"
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old service images (keep last 3 versions)
    for service in $(docker images --format "{{.Repository}}" | grep "^${REGISTRY}/" | sort -u); do
        docker images --format "{{.ID}} {{.CreatedAt}}" "$service" | \
        tail -n +4 | \
        awk '{print $1}' | \
        xargs -r docker rmi -f 2>/dev/null || true
    done
    
    log "${GREEN}✅ Cleanup completed${NC}"
}

# Function to create optimized Dockerfile for a service
create_optimized_dockerfile() {
    local service_path=$1
    local service_name=$(basename "$service_path")
    
    cat > "${service_path}/Dockerfile.optimized" << 'EOF'
# Multi-stage optimized Dockerfile
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine AS base

# Install security updates and dumb-init
RUN apk add --no-cache dumb-init \
    && apk upgrade --no-cache \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodeuser -u 1001

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production --frozen-lockfile \
    && npm cache clean --force

# Build stage
FROM base AS builder
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build 2>/dev/null || echo "No build script"
RUN npm prune --production

# Production stage
FROM base AS production
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/package*.json ./

RUN mkdir -p /app/logs && chown -R nodeuser:nodejs /app

USER nodeuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node healthcheck.js || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Development stage
FROM base AS development
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN mkdir -p /app/logs && chown -R nodeuser:nodejs /app

USER nodeuser
EXPOSE 3000

CMD ["npm", "run", "dev"]
EOF

    log "${GREEN}✅ Created optimized Dockerfile for ${service_name}${NC}"
}

# Main build function
main() {
    log "${BLUE}🚀 Starting optimized build process...${NC}"
    
    # Optimize base images first
    optimize_base_images
    
    # Build counter
    local total_builds=0
    local successful_builds=0
    local failed_builds=0
    
    # Core Services
    log "${YELLOW}📦 Building Core Services...${NC}"
    
    if [ -d "microservices/core/api-gateway" ]; then
        build_service_async "api-gateway" "microservices/core/api-gateway/api-gateway/Dockerfile.dev" "microservices/core/api-gateway/api-gateway" "production"
        total_builds=$((total_builds + 1))
    fi
    
    if [ -d "microservices/core/auth-service" ]; then
        build_service_async "auth-service" "microservices/core/auth-service/Dockerfile.dev" "microservices/core/auth-service" "production"
        total_builds=$((total_builds + 1))
    fi
    
    if [ -d "microservices/core/user-service" ]; then
        build_service_async "user-service" "microservices/core/user-service/user-service/Dockerfile.dev" "microservices/core/user-service/user-service" "production"
        total_builds=$((total_builds + 1))
    fi
    
    # Wait for core services
    if ! wait_for_builds; then
        failed_builds=$((failed_builds + $?))
    else
        successful_builds=$((successful_builds + 3))
    fi
    
    # Business Services
    log "${YELLOW}📦 Building Business Services...${NC}"
    
    if [ -d "microservices/business/product-service" ]; then
        build_service_async "product-service" "microservices/business/product-service/product-service/Dockerfile.dev" "microservices/business/product-service/product-service" "production"
        total_builds=$((total_builds + 1))
    fi
    
    if [ -d "microservices/business/order-service" ]; then
        build_service_async "order-service" "microservices/business/order-service/order-service/Dockerfile.dev" "microservices/business/order-service/order-service" "production"
        total_builds=$((total_builds + 1))
    fi
    
    if [ -d "microservices/business/cart-service" ]; then
        build_service_async "cart-service" "microservices/business/cart-service/cart-service/Dockerfile.dev" "microservices/business/cart-service/cart-service" "production"
        total_builds=$((total_builds + 1))
    fi
    
    if [ -d "microservices/business/payment-service" ]; then
        build_service_async "payment-service" "microservices/business/payment-service/payment-service/Dockerfile.dev" "microservices/business/payment-service/payment-service" "production"
        total_builds=$((total_builds + 1))
    fi
    
    # Wait for business services
    if ! wait_for_builds; then
        failed_builds=$((failed_builds + $?))
    else
        successful_builds=$((successful_builds + 4))
    fi
    
    # Platform Services
    log "${YELLOW}📦 Building Platform Services...${NC}"
    
    if [ -d "microservices/platform/notification-service" ]; then
        build_service_async "notification-service" "microservices/platform/notification-service/notification-service/Dockerfile.dev" "microservices/platform/notification-service/notification-service" "production"
        total_builds=$((total_builds + 1))
    fi
    
    if [ -d "microservices/platform/search-service" ]; then
        build_service_async "search-service" "microservices/platform/search-service/search-service/Dockerfile.dev" "microservices/platform/search-service/search-service" "production"
        total_builds=$((total_builds + 1))
    fi
    
    # Wait for platform services
    if ! wait_for_builds; then
        failed_builds=$((failed_builds + $?))
    else
        successful_builds=$((successful_builds + 2))
    fi
    
    # Frontend Applications
    log "${YELLOW}📦 Building Frontend Applications...${NC}"
    
    if [ -d "frontend/web-app" ]; then
        build_service_async "web-app" "frontend/web-app/Dockerfile.dev" "frontend/web-app" "production"
        total_builds=$((total_builds + 1))
    fi
    
    if [ -d "frontend/admin-panel" ]; then
        build_service_async "admin-panel" "frontend/admin-panel/Dockerfile.dev" "frontend/admin-panel" "production"
        total_builds=$((total_builds + 1))
    fi
    
    # Wait for frontend builds
    if ! wait_for_builds; then
        failed_builds=$((failed_builds + $?))
    else
        successful_builds=$((successful_builds + 2))
    fi
    
    # Calculate actual successful builds
    successful_builds=$((total_builds - failed_builds))
    
    # Display summary
    echo
    log "${BLUE}=========================================${NC}"
    log "${BLUE}📊 Build Summary${NC}"
    log "${BLUE}=========================================${NC}"
    log "${GREEN}✅ Successful builds: ${successful_builds}/${total_builds}${NC}"
    
    if [ $failed_builds -gt 0 ]; then
        log "${RED}❌ Failed builds: ${failed_builds}${NC}"
    fi
    
    # Display total image sizes
    local total_size=$(docker images --format "{{.Size}}" ${REGISTRY}/* | \
        awk '{sum += $1} END {printf "%.1f", sum}')
    log "${BLUE}📏 Total image size: ${total_size}${NC}"
    
    # Cleanup old images
    cleanup_old_images
    
    # Final status
    if [ $failed_builds -eq 0 ]; then
        log "${GREEN}🎉 All builds completed successfully!${NC}"
        echo
        log "${YELLOW}💡 Next steps:${NC}"
        log "   • Test images: docker-compose up"
        log "   • Push to registry: docker-compose push"
        log "   • Deploy to staging: kubectl apply -f kubernetes/"
        return 0
    else
        log "${RED}⚠️  Some builds failed. Check logs above.${NC}"
        return 1
    fi
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -r, --registry REGISTRY    Docker registry prefix (default: ultramarket)"
    echo "  -t, --tag TAG             Image tag (default: latest)"
    echo "  -p, --parallel NUM        Number of parallel builds (default: 3)"
    echo "  --no-cache               Disable build cache"
    echo "  --no-buildkit            Disable Docker BuildKit"
    echo "  -h, --help               Show this help message"
    echo
    echo "Examples:"
    echo "  $0                                    # Build with defaults"
    echo "  $0 -r myregistry -t v1.0.0          # Custom registry and tag"
    echo "  $0 -p 5 --no-cache                  # 5 parallel builds, no cache"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -p|--parallel)
            PARALLEL_BUILDS="$2"
            shift 2
            ;;
        --no-cache)
            ENABLE_CACHE="false"
            shift
            ;;
        --no-buildkit)
            ENABLE_BUILDKIT="false"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "microservices" ]; then
    log "${RED}❌ This script must be run from the project root directory.${NC}"
    exit 1
fi

# Run main function
main "$@" 