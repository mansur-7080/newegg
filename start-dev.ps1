Write-Host "🚀 Starting Newegg E-Commerce Platform Development Environment..." -ForegroundColor Green

# Check if Docker is installed
try {
    docker --version | Out-Null
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
try {
    docker-compose --version | Out-Null
} catch {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Copy env.example to .env if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "📝 Creating .env file from env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "⚠️  Please update .env file with your configuration before running again." -ForegroundColor Yellow
    exit 1
}

# Build and start services
Write-Host "🔨 Building Docker images..." -ForegroundColor Cyan
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

Write-Host "🚀 Starting services..." -ForegroundColor Cyan
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Run database migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Cyan
docker-compose exec -T user-service npm run migrate:dev 2>$null
docker-compose exec -T order-service npm run migrate:dev 2>$null
docker-compose exec -T payment-service npm run migrate:dev 2>$null

# Show service status
Write-Host "`n✅ Services are running!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🛡️ Admin Panel: http://localhost:3100" -ForegroundColor Cyan
Write-Host "🌐 API Gateway: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📊 Grafana: http://localhost:3000 (admin/admin123)" -ForegroundColor Cyan
Write-Host "📈 Prometheus: http://localhost:9090" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f" -ForegroundColor Yellow
Write-Host "To stop services: docker-compose -f docker-compose.yml -f docker-compose.dev.yml down" -ForegroundColor Yellow 