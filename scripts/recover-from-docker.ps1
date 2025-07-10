#!/usr/bin/env pwsh
# Docker konteynerlardan fayllarni tiklash skripti

Write-Host "🔄 Docker konteynerlardan fayllarni tiklanishi boshlandi..." -ForegroundColor Green

# Tiklash papkasini yaratish
$RecoveryDir = "recovered-files"
if (!(Test-Path $RecoveryDir)) {
    New-Item -ItemType Directory -Path $RecoveryDir -Force
    Write-Host "📁 '$RecoveryDir' papkasi yaratildi" -ForegroundColor Yellow
}

# Servislar ro'yxati
$Services = @(
    "ultramarket_user_service",
    "ultramarket_product_service", 
    "ultramarket_cart_service",
    "ultramarket_order_service",
    "ultramarket_payment_service",
    "ultramarket_notification_service",
    "ultramarket_search_service",
    "ultramarket_inventory_service",
    "ultramarket_shipping_service",
    "ultramarket_admin_service"
)

foreach ($Service in $Services) {
    Write-Host "🔍 $Service servisini tekshirish..." -ForegroundColor Cyan
    
    # Konteyner ishlaydimi tekshirish
    $ContainerStatus = docker inspect $Service --format '{{.State.Status}}' 2>$null
    
    if ($ContainerStatus -eq "running") {
        Write-Host "✅ $Service ishlayapti" -ForegroundColor Green
        
        # Servis nomi olish
        $ServiceName = $Service -replace "ultramarket_", ""
        $ServiceDir = "$RecoveryDir/$ServiceName"
        
        if (!(Test-Path $ServiceDir)) {
            New-Item -ItemType Directory -Path $ServiceDir -Force
        }
        
        # Fayllarni ko'chirish
        try {
            # src papkasini ko'chirish
            docker cp "${Service}:/app/src" $ServiceDir 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  📄 src fayllar ko'chirildi" -ForegroundColor Green
            } else {
                # Boshqa yo'llarni sinab ko'rish
                docker cp "${Service}:/app/${ServiceName}/src" $ServiceDir 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  📄 src fayllar ko'chirildi" -ForegroundColor Green
                }
            }
            
            # package.json ko'chirish
            docker cp "${Service}:/app/package.json" $ServiceDir 2>$null
            if ($LASTEXITCODE -ne 0) {
                docker cp "${Service}:/app/${ServiceName}/package.json" $ServiceDir 2>$null
            }
            
            # prisma papkasini ko'chirish (agar mavjud bo'lsa)
            docker cp "${Service}:/app/prisma" $ServiceDir 2>$null
            if ($LASTEXITCODE -ne 0) {
                docker cp "${Service}:/app/${ServiceName}/prisma" $ServiceDir 2>$null
            }
            
        } catch {
            Write-Host "  ❌ Xatolik: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "⚠️ $Service ishlamayapti yoki topilmadi" -ForegroundColor Yellow
    }
}

# Ma'lumotlar bazasi backup'lari
Write-Host "🗄️ Ma'lumotlar bazasi backup'larini olish..." -ForegroundColor Cyan

$DbBackupDir = "$RecoveryDir/database-backups"
if (!(Test-Path $DbBackupDir)) {
    New-Item -ItemType Directory -Path $DbBackupDir -Force
}

# PostgreSQL backup
try {
    docker start ultramarket_postgres 2>$null
    Start-Sleep -Seconds 5
    docker exec ultramarket_postgres pg_dumpall -U postgres > "$DbBackupDir/postgres-backup.sql" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ PostgreSQL backup muvaffaqiyatli" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ PostgreSQL backup xatolik" -ForegroundColor Red
}

# MongoDB backup
try {
    docker start ultramarket_mongodb 2>$null
    Start-Sleep -Seconds 5
    docker exec ultramarket_mongodb mongodump --out /tmp/mongodb-backup 2>$null
    docker cp ultramarket_mongodb:/tmp/mongodb-backup $DbBackupDir 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ MongoDB backup muvaffaqiyatli" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ MongoDB backup xatolik" -ForegroundColor Red
}

# Natijalar
Write-Host "`n📊 Tiklanish natijalari:" -ForegroundColor Magenta
$TotalFiles = (Get-ChildItem -Path $RecoveryDir -Recurse -File | Measure-Object).Count
$TotalDirs = (Get-ChildItem -Path $RecoveryDir -Recurse -Directory | Measure-Object).Count

Write-Host "  📁 Jami papkalar: $TotalDirs" -ForegroundColor White
Write-Host "  📄 Jami fayllar: $TotalFiles" -ForegroundColor White
Write-Host "  📂 Tiklangan fayllar: $RecoveryDir papkasida" -ForegroundColor White

Write-Host "`n🎉 Tiklanish jarayoni tugadi!" -ForegroundColor Green
Write-Host "💡 Fayllaringizni '$RecoveryDir' papkasidan topishingiz mumkin" -ForegroundColor Cyan 