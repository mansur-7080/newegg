# =====================================================
# UltraMarket Enterprise E-Commerce Platform
# Makefile for Development & Deployment
# =====================================================

.PHONY: help install build test lint format clean dev up down logs deploy k8s-deploy

# Default target
help: ## Show this help message
	@echo "🚀 UltraMarket Enterprise Platform Commands"
	@echo "=============================================="
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# =====================================================
# Development Commands
# =====================================================

install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	npm install
	nx run-many --target=install --all

build: ## Build all applications and services
	@echo "🔨 Building all projects..."
	nx run-many --target=build --all

build-affected: ## Build only affected projects
	@echo "🔨 Building affected projects..."
	nx affected:build

test: ## Run all tests
	@echo "🧪 Running tests..."
	nx run-many --target=test --all

test-affected: ## Run tests for affected projects
	@echo "🧪 Running tests for affected projects..."
	nx affected:test

lint: ## Run linting for all projects
	@echo "🔍 Running linting..."
	nx run-many --target=lint --all

lint-fix: ## Fix linting issues
	@echo "🔧 Fixing linting issues..."
	nx run-many --target=lint --all --fix

format: ## Format code
	@echo "✨ Formatting code..."
	nx format:write

format-check: ## Check code formatting
	@echo "✅ Checking code formatting..."
	nx format:check

clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist/
	rm -rf node_modules/
	nx reset

# =====================================================
# Development Server Commands
# =====================================================

dev: ## Start development environment
	@echo "🚀 Starting development environment..."
	docker-compose -f docker-compose.enterprise.yml up -d

dev-web: ## Start web application
	@echo "🌐 Starting web application..."
	nx serve web-app

dev-admin: ## Start admin panel
	@echo "👨‍💼 Starting admin panel..."
	nx serve admin-panel

dev-api: ## Start API gateway
	@echo "🔗 Starting API gateway..."
	nx serve api-gateway

dev-services: ## Start all backend services
	@echo "⚙️ Starting backend services..."
	nx run-many --target=serve --projects=user-service,product-service,order-service,payment-service

# =====================================================
# Docker Commands
# =====================================================

docker-build: ## Build Docker images
	@echo "🐳 Building Docker images..."
	docker-compose -f docker-compose.enterprise.yml build

docker-up: ## Start Docker containers
	@echo "🐳 Starting Docker containers..."
	docker-compose -f docker-compose.enterprise.yml up -d

docker-down: ## Stop Docker containers
	@echo "🐳 Stopping Docker containers..."
	docker-compose -f docker-compose.enterprise.yml down

docker-logs: ## Show Docker logs
	@echo "📋 Showing Docker logs..."
	docker-compose -f docker-compose.enterprise.yml logs -f

docker-clean: ## Clean Docker resources
	@echo "🧹 Cleaning Docker resources..."
	docker system prune -f
	docker volume prune -f

# =====================================================
# Database Commands
# =====================================================

db-migrate: ## Run database migrations
	@echo "🗄️ Running database migrations..."
	nx run-many --target=migrate --all

db-seed: ## Seed database with test data
	@echo "🌱 Seeding database..."
	nx run-many --target=seed --all

db-reset: ## Reset database
	@echo "🔄 Resetting database..."
	nx run-many --target=db-reset --all

# =====================================================
# Kubernetes Commands
# =====================================================

k8s-deploy: ## Deploy to Kubernetes
	@echo "☸️ Deploying to Kubernetes..."
	kubectl apply -f infrastructure/kubernetes/namespace.yaml
	kubectl apply -f infrastructure/kubernetes/

k8s-delete: ## Delete Kubernetes resources
	@echo "🗑️ Deleting Kubernetes resources..."
	kubectl delete -f infrastructure/kubernetes/

k8s-status: ## Check Kubernetes status
	@echo "📊 Checking Kubernetes status..."
	kubectl get pods -n ultramarket
	kubectl get services -n ultramarket
	kubectl get ingress -n ultramarket

k8s-logs: ## Show Kubernetes logs
	@echo "📋 Showing Kubernetes logs..."
	kubectl logs -f deployment/api-gateway -n ultramarket

# =====================================================
# Monitoring Commands
# =====================================================

monitor-up: ## Start monitoring stack
	@echo "📊 Starting monitoring stack..."
	docker-compose -f docker-compose.enterprise.yml up -d prometheus grafana jaeger

monitor-down: ## Stop monitoring stack
	@echo "📊 Stopping monitoring stack..."
	docker-compose -f docker-compose.enterprise.yml stop prometheus grafana jaeger

# =====================================================
# Security Commands
# =====================================================

security-scan: ## Run security scans
	@echo "🔒 Running security scans..."
	npm audit
	docker run --rm -v $(PWD):/app securecodewarrior/docker-security-scan

vulnerability-check: ## Check for vulnerabilities
	@echo "🛡️ Checking for vulnerabilities..."
	npm audit --audit-level high

# =====================================================
# Performance Commands
# =====================================================

load-test: ## Run load tests
	@echo "⚡ Running load tests..."
	k6 run tests/load/api-load-test.js

benchmark: ## Run benchmarks
	@echo "🏃‍♂️ Running benchmarks..."
	npm run benchmark

# =====================================================
# Quality Commands
# =====================================================

quality-check: ## Run quality checks
	@echo "✅ Running quality checks..."
	make lint
	make test
	make security-scan

pre-commit: ## Run pre-commit checks
	@echo "🔍 Running pre-commit checks..."
	make format-check
	make lint
	make test-affected

# =====================================================
# Deployment Commands
# =====================================================

deploy-dev: ## Deploy to development environment
	@echo "🚀 Deploying to development..."
	kubectl apply -f infrastructure/kubernetes/namespace.yaml
	kubectl apply -f infrastructure/kubernetes/ --namespace=ultramarket-dev

deploy-staging: ## Deploy to staging environment
	@echo "🚀 Deploying to staging..."
	kubectl apply -f infrastructure/kubernetes/ --namespace=ultramarket-staging

deploy-prod: ## Deploy to production environment
	@echo "🚀 Deploying to production..."
	kubectl apply -f infrastructure/kubernetes/ --namespace=ultramarket

# =====================================================
# Backup Commands
# =====================================================

backup-db: ## Backup databases
	@echo "💾 Backing up databases..."
	./scripts/backup-databases.sh

restore-db: ## Restore databases
	@echo "🔄 Restoring databases..."
	./scripts/restore-databases.sh

# =====================================================
# Utility Commands
# =====================================================

graph: ## Show project dependency graph
	@echo "📊 Showing project dependency graph..."
	nx graph

affected: ## Show affected projects
	@echo "📋 Showing affected projects..."
	nx affected:apps
	nx affected:libs

update-deps: ## Update dependencies
	@echo "📦 Updating dependencies..."
	npm update
	nx migrate latest

# =====================================================
# Environment Setup
# =====================================================

setup-dev: ## Setup development environment
	@echo "🛠️ Setting up development environment..."
	make install
	make docker-up
	make db-migrate
	make db-seed
	@echo "✅ Development environment ready!"

setup-prod: ## Setup production environment
	@echo "🛠️ Setting up production environment..."
	make k8s-deploy
	make monitor-up
	@echo "✅ Production environment ready!"

# =====================================================
# Documentation Commands
# =====================================================

docs-build: ## Build documentation
	@echo "📚 Building documentation..."
	npm run docs:build

docs-serve: ## Serve documentation
	@echo "📚 Serving documentation..."
	npm run docs:serve

# =====================================================
# CI/CD Commands
# =====================================================

ci-build: ## CI build pipeline
	@echo "🔄 Running CI build..."
	make install
	make lint
	make test
	make build

ci-deploy: ## CI deploy pipeline
	@echo "🚀 Running CI deploy..."
	make docker-build
	make k8s-deploy

# =====================================================
# Health Check Commands
# =====================================================

health-check: ## Check system health
	@echo "🏥 Checking system health..."
	curl -f http://localhost:3000/health || exit 1
	curl -f http://localhost:8080/health || exit 1

status: ## Show system status
	@echo "📊 System Status:"
	@echo "=================="
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 