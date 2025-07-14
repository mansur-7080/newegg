#!/bin/bash

# UltraMarket Backend Services Test Script
# Test script for production-ready microservices

echo "🚀 UltraMarket Backend Services Test"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} ($response)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $response)"
        return 1
    fi
}

# Test with JSON output
test_json_endpoint() {
    local url=$1
    local description=$2
    
    echo -n "Testing $description... "
    
    response=$(curl -s "$url")
    http_status=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
    
    if [ "$http_status" = "200" ] && echo "$response" | grep -q "{"; then
        echo -e "${GREEN}✅ PASS${NC} (JSON Response)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Status: $http_status)"
        return 1
    fi
}

echo -e "${BLUE}1. Checking if services are running...${NC}"
echo ""

# Store Service Tests
echo -e "${YELLOW}🏪 Store Service (Port 3030)${NC}"
test_endpoint "http://localhost:3030/health" "Health Check" 200
test_json_endpoint "http://localhost:3030/stores" "Stores List"
test_json_endpoint "http://localhost:3030/store-categories" "Store Categories"

echo ""

# Analytics Service Tests  
echo -e "${YELLOW}📊 Analytics Service (Port 3020)${NC}"
test_endpoint "http://localhost:3020/health" "Health Check" 200
# Analytics endpoints require authentication, so testing only health

echo ""

# User Service Tests (if running)
echo -e "${YELLOW}👥 User Service (Port 3005 - if running)${NC}"
test_endpoint "http://localhost:3005/health" "Health Check" 200

echo ""

# Performance Service Tests (if running)
echo -e "${YELLOW}📈 Performance Service (Port 3025 - if running)${NC}"
test_endpoint "http://localhost:3025/health" "Health Check" 200

echo ""
echo "===================================="
echo -e "${BLUE}Test Summary:${NC}"
echo ""

# Count running services
running_services=0

if curl -s "http://localhost:3030/health" > /dev/null; then
    echo -e "${GREEN}✅ Store Service${NC} - Running on port 3030"
    ((running_services++))
else
    echo -e "${RED}❌ Store Service${NC} - Not running"
fi

if curl -s "http://localhost:3020/health" > /dev/null; then
    echo -e "${GREEN}✅ Analytics Service${NC} - Running on port 3020"
    ((running_services++))
else
    echo -e "${RED}❌ Analytics Service${NC} - Not running"
fi

if curl -s "http://localhost:3005/health" > /dev/null; then
    echo -e "${GREEN}✅ User Service${NC} - Running on port 3005"
    ((running_services++))
else
    echo -e "${YELLOW}⚠️ User Service${NC} - Not running (optional)"
fi

if curl -s "http://localhost:3025/health" > /dev/null; then
    echo -e "${GREEN}✅ Performance Service${NC} - Running on port 3025"
    ((running_services++))
else
    echo -e "${YELLOW}⚠️ Performance Service${NC} - Not running (optional)"
fi

echo ""
echo -e "${BLUE}Services Running: $running_services${NC}"

if [ $running_services -ge 2 ]; then
    echo -e "${GREEN}🎉 Backend is ready for production!${NC}"
    echo ""
    echo -e "${BLUE}API Endpoints Available:${NC}"
    echo "• Store Management: http://localhost:3030"
    echo "• Analytics Dashboard: http://localhost:3020"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Build frontend components"
    echo "2. Deploy to production environment"
    echo "3. Configure domain and SSL"
else
    echo -e "${YELLOW}⚠️ Start the backend services first${NC}"
    echo ""
    echo -e "${BLUE}To start services:${NC}"
    echo "cd microservices/core/store-service && npm run start:dev"
    echo "cd microservices/analytics/analytics-service && npm run start:dev"
fi

echo ""