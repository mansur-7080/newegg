# E-Commerce Platform - Development Setup Guide

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Setup](#2-repository-setup)
3. [Backend Services Setup](#3-backend-services-setup)
4. [Frontend Setup](#4-frontend-setup)
5. [Database Setup](#5-database-setup)
6. [Docker Setup](#6-docker-setup)
7. [Kubernetes Local Setup](#7-kubernetes-local-setup)
8. [Development Workflow](#8-development-workflow)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Python | 3.11+ | [python.org](https://python.org) |
| Java | 17+ | [adoptium.net](https://adoptium.net) |
| Docker | 24+ | [docker.com](https://docker.com) |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |
| VS Code | Latest | [code.visualstudio.com](https://code.visualstudio.com) |

### Development Tools

```bash
# Install global tools
npm install -g yarn pnpm typescript @nestjs/cli

# Python tools
pip install poetry black flake8 pytest

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

## 2. Repository Setup

### Clone Repository

```bash
# Clone main repository
git clone https://github.com/your-org/ecommerce-platform.git
cd ecommerce-platform

# Repository structure
ecommerce-platform/
├── backend/
│   ├── user-service/
│   ├── product-service/
│   ├── order-service/
│   ├── cart-service/
│   ├── payment-service/
│   └── common/
├── frontend/
│   ├── web-app/
│   ├── mobile-app/
│   └── admin-panel/
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
├── docs/
├── scripts/
└── docker-compose.yml
```

### Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp backend/user-service/.env.example backend/user-service/.env
cp backend/product-service/.env.example backend/product-service/.env
# ... repeat for all services

# Edit .env files with your local configurations
```

---

## 3. Backend Services Setup

### 3.1 User Service (Node.js/TypeScript)

```bash
cd backend/user-service

# Install dependencies
npm install

# Setup database
npm run db:migrate
npm run db:seed

# Run tests
npm test

# Start development server
npm run dev
```

#### User Service Structure
```
user-service/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── middleware/
│   ├── routes/
│   └── app.ts
├── tests/
├── package.json
└── tsconfig.json
```

### 3.2 Product Service (Python/FastAPI)

```bash
cd backend/product-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run tests
pytest

# Start development server
uvicorn main:app --reload --port 8001
```

### 3.3 Order Service (Java/Spring Boot)

```bash
cd backend/order-service

# Build project
./mvnw clean install

# Run tests
./mvnw test

# Start development server
./mvnw spring-boot:run
```

---

## 4. Frontend Setup

### 4.1 Web Application (Next.js)

```bash
cd frontend/web-app

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Start development server
npm run dev
# Open http://localhost:3000
```

### 4.2 Mobile Application (React Native)

```bash
cd frontend/mobile-app

# Install dependencies
npm install

# iOS setup (Mac only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### 4.3 Admin Panel

```bash
cd frontend/admin-panel

# Install dependencies
npm install

# Start development server
npm run dev
# Open http://localhost:3001
```

---

## 5. Database Setup

### 5.1 PostgreSQL Setup

```bash
# Using Docker
docker run --name postgres-dev \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=ecommerce \
  -p 5432:5432 \
  -v postgres-data:/var/lib/postgresql/data \
  -d postgres:15

# Create databases
docker exec -it postgres-dev psql -U admin -c "CREATE DATABASE users_db;"
docker exec -it postgres-dev psql -U admin -c "CREATE DATABASE orders_db;"
```

### 5.2 MongoDB Setup

```bash
# Using Docker
docker run --name mongodb-dev \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -p 27017:27017 \
  -v mongodb-data:/data/db \
  -d mongo:6

# Create database and user
docker exec -it mongodb-dev mongosh \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --eval "use products_db; db.createUser({user: 'products_user', pwd: 'password', roles: ['readWrite']})"
```

### 5.3 Redis Setup

```bash
# Using Docker
docker run --name redis-dev \
  -p 6379:6379 \
  -v redis-data:/data \
  -d redis:7-alpine redis-server --requirepass password
```

---

## 6. Docker Setup

### 6.1 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Databases
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  mongodb:
    image: mongo:6
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass password
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # Services
  user-service:
    build: ./backend/user-service
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://admin:password@postgres:5432/users_db
      - REDIS_URL=redis://:password@redis:6379
    depends_on:
      - postgres
      - redis

  product-service:
    build: ./backend/product-service
    ports:
      - "8001:8001"
    environment:
      - MONGODB_URL=mongodb://admin:password@mongodb:27017/products_db
      - REDIS_URL=redis://:password@redis:6379
    depends_on:
      - mongodb
      - redis

  # Frontend
  web-app:
    build: ./frontend/web-app
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8080
    depends_on:
      - user-service
      - product-service

  # API Gateway
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - user-service
      - product-service

volumes:
  postgres-data:
  mongodb-data:
  redis-data:
```

### 6.2 Running with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Reset everything (including volumes)
docker-compose down -v
```

---

## 7. Kubernetes Local Setup

### 7.1 Minikube Setup

```bash
# Install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Start Minikube
minikube start --cpus=4 --memory=8192

# Enable addons
minikube addons enable ingress
minikube addons enable metrics-server
```

### 7.2 Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace ecommerce-dev

# Apply configurations
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/configmaps/
kubectl apply -f infrastructure/kubernetes/secrets/
kubectl apply -f infrastructure/kubernetes/services/
kubectl apply -f infrastructure/kubernetes/deployments/

# Check status
kubectl get pods -n ecommerce-dev
kubectl get services -n ecommerce-dev

# Access services
minikube service user-service -n ecommerce-dev
```

---

## 8. Development Workflow

### 8.1 Git Workflow

```bash
# Create feature branch
git checkout -b feature/JIRA-123-new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/JIRA-123-new-feature

# Create pull request
# Use GitHub/GitLab UI
```

### 8.2 Code Style

```bash
# Frontend (ESLint + Prettier)
npm run lint
npm run format

# Backend Node.js
npm run lint:fix
npm run prettier

# Backend Python
black .
flake8 .
mypy .

# Backend Java
./mvnw spotless:apply
```

### 8.3 Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 9. Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :8000
# or
netstat -tulpn | grep 8000

# Kill process
kill -9 <PID>
```

#### Docker Issues
```bash
# Clean up Docker
docker system prune -a
docker volume prune

# Restart Docker
sudo systemctl restart docker
```

#### Database Connection Issues
```bash
# Check database is running
docker ps

# Check logs
docker logs postgres-dev

# Test connection
psql -h localhost -U admin -d ecommerce
```

#### Node.js Issues
```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json
npm install
```

### Useful Commands

```bash
# View all running services
docker-compose ps

# SSH into container
docker exec -it <container-name> bash

# View Kubernetes logs
kubectl logs -f <pod-name> -n ecommerce-dev

# Port forwarding
kubectl port-forward <pod-name> 8000:8000 -n ecommerce-dev

# Database backup
docker exec postgres-dev pg_dump -U admin ecommerce > backup.sql

# Database restore
docker exec -i postgres-dev psql -U admin ecommerce < backup.sql
```

---

## VS Code Extensions

### Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-vscode.vscode-typescript-tslint-plugin",
    "prisma.prisma",
    "mongodb.mongodb-vscode",
    "mtxr.sqltools",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "redhat.vscode-yaml",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

### Workspace Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.updateImportsOnFileMove.enabled": "always",
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true,
    "**/build": true
  }
}
```

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Next Review:** Monthly

--- 