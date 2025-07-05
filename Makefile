# Newegg E-Commerce Platform Makefile

.PHONY: help
help: ## Display this help message
	@echo "Newegg E-Commerce Platform - Available Commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\033[36m%-30s\033[0m %s\n", "Command", "Description"} /^[a-zA-Z_-]+:.*?##/ { printf "\033[32m%-30s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.PHONY: setup
setup: ## Initial project setup
	@echo "Setting up project..."
	@cp env.example .env
	@echo "Please update .env file with your configuration"

# Docker Commands
.PHONY: docker-up
docker-up: ## Start all Docker services
	docker-compose up -d

.PHONY: docker-down
docker-down: ## Stop all Docker services
	docker-compose down

.PHONY: docker-build
docker-build: ## Build all Docker images
	docker-compose build

.PHONY: docker-logs
docker-logs: ## View Docker logs
	docker-compose logs -f

.PHONY: docker-ps
docker-ps: ## List running containers
	docker-compose ps

# Development Commands
.PHONY: dev-up
dev-up: ## Start development environment
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

.PHONY: dev-down
dev-down: ## Stop development environment
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

.PHONY: dev-logs
dev-logs: ## View development logs
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Database Commands
.PHONY: db-migrate
db-migrate: ## Run database migrations
	docker-compose exec user-service npm run migrate
	docker-compose exec order-service npm run migrate
	docker-compose exec payment-service npm run migrate

.PHONY: db-seed
db-seed: ## Seed database with test data
	docker-compose exec user-service npm run seed
	docker-compose exec product-service npm run seed

.PHONY: db-reset
db-reset: ## Reset database
	docker-compose exec postgres psql -U postgres -d newegg_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	$(MAKE) db-migrate
	$(MAKE) db-seed

# Service Commands
.PHONY: service-user
service-user: ## Access user service shell
	docker-compose exec user-service sh

.PHONY: service-product
service-product: ## Access product service shell
	docker-compose exec product-service sh

.PHONY: service-order
service-order: ## Access order service shell
	docker-compose exec order-service sh

# Testing Commands
.PHONY: test
test: ## Run all tests
	docker-compose exec user-service npm test
	docker-compose exec product-service npm test
	docker-compose exec order-service npm test

.PHONY: test-unit
test-unit: ## Run unit tests
	docker-compose exec user-service npm run test:unit
	docker-compose exec product-service npm run test:unit

.PHONY: test-integration
test-integration: ## Run integration tests
	docker-compose exec user-service npm run test:integration
	docker-compose exec product-service npm run test:integration

.PHONY: test-e2e
test-e2e: ## Run E2E tests
	docker-compose exec web-app npm run test:e2e

# Monitoring Commands
.PHONY: monitor-prometheus
monitor-prometheus: ## Open Prometheus dashboard
	@echo "Opening Prometheus at http://localhost:9090"
	@start http://localhost:9090 || open http://localhost:9090 || xdg-open http://localhost:9090

.PHONY: monitor-grafana
monitor-grafana: ## Open Grafana dashboard
	@echo "Opening Grafana at http://localhost:3000"
	@echo "Default credentials: admin/admin123"
	@start http://localhost:3000 || open http://localhost:3000 || xdg-open http://localhost:3000

# Build Commands
.PHONY: build-frontend
build-frontend: ## Build frontend applications
	docker-compose exec web-app npm run build
	docker-compose exec admin-panel npm run build

.PHONY: build-backend
build-backend: ## Build backend services
	docker-compose exec user-service npm run build
	docker-compose exec product-service npm run build
	docker-compose exec order-service npm run build

# Clean Commands
.PHONY: clean
clean: ## Clean all generated files and volumes
	docker-compose down -v
	rm -rf node_modules
	rm -rf backend/*/node_modules
	rm -rf frontend/*/node_modules

.PHONY: clean-docker
clean-docker: ## Clean Docker system
	docker system prune -af
	docker volume prune -f

# Kubernetes Commands
.PHONY: k8s-deploy
k8s-deploy: ## Deploy to Kubernetes
	kubectl apply -f infrastructure/kubernetes/

.PHONY: k8s-delete
k8s-delete: ## Delete Kubernetes deployment
	kubectl delete -f infrastructure/kubernetes/

.PHONY: k8s-status
k8s-status: ## Check Kubernetes status
	kubectl get all -n newegg

# Git Commands
.PHONY: git-push
git-push: ## Push to GitHub
	git add .
	git commit -m "Update: $$(date +'%Y-%m-%d %H:%M:%S')"
	git push origin master

# Production Commands
.PHONY: prod-build
prod-build: ## Build for production
	docker-compose -f docker-compose.prod.yml build

.PHONY: prod-deploy
prod-deploy: ## Deploy to production
	@echo "Deploying to production..."
	@echo "This would run your production deployment scripts" 