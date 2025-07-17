#!/bin/bash

echo "🚀 Starting Product Service Test..."

# Change to product service directory
cd /workspace/microservices/business/product-service

# Start the server in background
echo "Starting server on port 3003..."
node minimal-server.js &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Test health endpoint
echo -e "\n📋 Testing Health Endpoint:"
curl -s http://localhost:3003/health | python3 -m json.tool

# Test products endpoint
echo -e "\n📦 Testing Products Endpoint:"
curl -s http://localhost:3003/api/v1/products | python3 -m json.tool

# Test single product
echo -e "\n🔍 Testing Single Product:"
curl -s http://localhost:3003/api/v1/products/1 | python3 -m json.tool

# Test categories
echo -e "\n📂 Testing Categories:"
curl -s http://localhost:3003/api/v1/categories | python3 -m json.tool

# Test product creation
echo -e "\n➕ Testing Product Creation:"
curl -s -X POST http://localhost:3003/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 99.99,
    "category": "Electronics",
    "description": "This is a test product",
    "stock": 5,
    "brand": "TestBrand"
  }' | python3 -m json.tool

# Test search
echo -e "\n🔎 Testing Search:"
curl -s "http://localhost:3003/api/v1/products?search=mouse" | python3 -m json.tool

# Test category filter
echo -e "\n🏷️ Testing Category Filter:"
curl -s "http://localhost:3003/api/v1/products?category=accessories" | python3 -m json.tool

# Kill the server
echo -e "\n✅ Tests completed. Stopping server..."
kill $SERVER_PID

echo "🎉 Product Service Test Complete!"