#!/bin/bash

# E-Commerce Platform - Project Setup Script

echo "🚀 Setting up E-Commerce Platform project structure..."

# Create main directories
directories=(
  "backend/user-service"
  "backend/product-service"
  "backend/order-service"
  "backend/cart-service"
  "backend/payment-service"
  "backend/notification-service"
  "backend/search-service"
  "backend/common"
  "frontend/web-app"
  "frontend/mobile-app"
  "frontend/admin-panel"
  "infrastructure/docker"
  "infrastructure/kubernetes/deployments"
  "infrastructure/kubernetes/services"
  "infrastructure/kubernetes/configmaps"
  "infrastructure/kubernetes/secrets"
  "infrastructure/terraform"
  "infrastructure/nginx"
  "docs/api"
  "docs/architecture"
  "scripts"
  "tests/e2e"
  "tests/performance"
  "tests/security"
)

for dir in "${directories[@]}"; do
  mkdir -p "$dir"
  echo "✓ Created $dir"
done

# Create README files for each major directory
echo "# Backend Services" > backend/README.md
echo "# Frontend Applications" > frontend/README.md
echo "# Infrastructure Configuration" > infrastructure/README.md
echo "# Documentation" > docs/README.md
echo "# Test Suites" > tests/README.md

# Create placeholder files
touch backend/user-service/.gitkeep
touch backend/product-service/.gitkeep
touch backend/order-service/.gitkeep
touch frontend/web-app/.gitkeep
touch frontend/mobile-app/.gitkeep
touch infrastructure/docker/docker-compose.yml
touch infrastructure/kubernetes/namespace.yaml

# Move documentation to docs folder
echo "📁 Organizing documentation..."
mv architecture.md docs/architecture/ 2>/dev/null || true
mv E-Commerce_Complete_Implementation_Plan.md docs/ 2>/dev/null || true
mv API_Specification.md docs/api/ 2>/dev/null || true
mv Database_Schema.md docs/ 2>/dev/null || true
mv Development_Setup_Guide.md docs/ 2>/dev/null || true
mv Security_Checklist.md docs/ 2>/dev/null || true
mv Testing_Strategy.md docs/ 2>/dev/null || true

echo ""
echo "✅ Project structure created successfully!"
echo ""
echo "📂 Project Structure:"
echo "."
echo "├── backend/            # Microservices"
echo "├── frontend/           # Web, Mobile, Admin apps"
echo "├── infrastructure/     # Docker, K8s, Terraform"
echo "├── docs/              # Documentation"
echo "├── tests/             # Test suites"
echo "└── scripts/           # Utility scripts"
echo ""
echo "Next steps:"
echo "1. Initialize git repository: git init"
echo "2. Create GitHub repository"
echo "3. Push to GitHub" 