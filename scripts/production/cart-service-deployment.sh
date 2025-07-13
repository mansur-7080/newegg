#!/bin/bash

# UltraMarket Cart Service Production Deployment Script
# HALOL VA PROFESSIONAL ISH

set -e

echo "🚀 UltraMarket Cart Service Production Deployment"
echo "================================================"

# Configuration
SERVICE_NAME="cart-service"
DOCKER_IMAGE="ultramarket/cart-service"
DOCKER_TAG="latest"
NAMESPACE="ultramarket"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        print_warning "Namespace $NAMESPACE does not exist, creating..."
        kubectl create namespace $NAMESPACE
    fi
    
    print_status "Prerequisites check completed"
}

# Build Docker image
build_image() {
    print_status "Building Docker image..."
    
    cd microservices/business/cart-service/cart-service
    
    # Build the image
    docker build -t $DOCKER_IMAGE:$DOCKER_TAG .
    
    if [ $? -eq 0 ]; then
        print_status "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
    
    cd ../../../..
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    print_status "Deploying to Kubernetes..."
    
    # Create deployment YAML
    cat > k8s-cart-service.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $SERVICE_NAME
  namespace: $NAMESPACE
  labels:
    app: $SERVICE_NAME
spec:
  replicas: 3
  selector:
    matchLabels:
      app: $SERVICE_NAME
  template:
    metadata:
      labels:
        app: $SERVICE_NAME
    spec:
      containers:
      - name: $SERVICE_NAME
        image: $DOCKER_IMAGE:$DOCKER_TAG
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          value: "redis-service"
        - name: REDIS_PORT
          value: "6379"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: $SERVICE_NAME-service
  namespace: $NAMESPACE
spec:
  selector:
    app: $SERVICE_NAME
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: $SERVICE_NAME-ingress
  namespace: $NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: cart.ultramarket.uz
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: $SERVICE_NAME-service
            port:
              number: 80
EOF
    
    # Apply the deployment
    kubectl apply -f k8s-cart-service.yaml
    
    if [ $? -eq 0 ]; then
        print_status "Kubernetes deployment applied successfully"
    else
        print_error "Failed to apply Kubernetes deployment"
        exit 1
    fi
    
    # Clean up the temporary file
    rm k8s-cart-service.yaml
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait for deployment to be ready
    kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=300s
    
    if [ $? -eq 0 ]; then
        print_status "Deployment is ready"
    else
        print_error "Deployment failed to become ready"
        exit 1
    fi
    
    # Check if pods are running
    RUNNING_PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME --no-headers | grep Running | wc -l)
    TOTAL_PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME --no-headers | wc -l)
    
    if [ $RUNNING_PODS -eq $TOTAL_PODS ]; then
        print_status "All pods are running ($RUNNING_PODS/$TOTAL_PODS)"
    else
        print_error "Not all pods are running ($RUNNING_PODS/$TOTAL_PODS)"
        exit 1
    fi
}

# Main deployment function
main() {
    echo "Starting deployment at $(date)"
    
    check_prerequisites
    build_image
    deploy_to_kubernetes
    health_check
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "Service: $SERVICE_NAME"
    echo "Namespace: $NAMESPACE"
    echo "Image: $DOCKER_IMAGE:$DOCKER_TAG"
    echo ""
    echo "To check the deployment:"
    echo "  kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME"
    echo "  kubectl logs -n $NAMESPACE -l app=$SERVICE_NAME"
    echo ""
    echo "Deployment completed at $(date)"
}

# Run main function
main "$@"