#!/usr/bin/env pwsh
# Barcha servislarni Docker'dan qaytarish skripti

Write-Host "🚀 Barcha servislarni Docker'dan qaytarish boshlandi..." -ForegroundColor Green

# Barcha servislar ro'yxati
$AllServices = @(
    "user-service",
    "product-service", 
    "cart-service",
    "order-service",
    "payment-service",
    "notification-service",
    "search-service",
    "inventory-service",
    "shipping-service",
    "admin-service",
    "review-service",
    "analytics-service",
    "advanced-analytics-service"
)

# Tiklash papkasini yaratish
$RecoveryDir = "recovered-all-services"
if (Test-Path $RecoveryDir) {
    Remove-Item -Path $RecoveryDir -Recurse -Force
    Write-Host "🗑️ Eski tiklash papkasi o'chirildi" -ForegroundColor Yellow
}
New-Item -ItemType Directory -Path $RecoveryDir -Force | Out-Null

Write-Host "📁 '$RecoveryDir' papkasi yaratildi" -ForegroundColor Cyan

# Har bir servis uchun fayllarni tiklash
foreach ($Service in $AllServices) {
    $ContainerName = "ultramarket_$Service"
    $ServiceDir = "$RecoveryDir/$Service"
    
    Write-Host "🔄 $Service servisini qaytarish..." -ForegroundColor Cyan
    
    # Konteyner mavjudligini tekshirish
    $ContainerExists = docker ps -a --format "table {{.Names}}" | Select-String $ContainerName
    
    if ($ContainerExists) {
        # Konteyner ishlaydimi tekshirish
        $ContainerStatus = docker inspect $ContainerName --format '{{.State.Status}}' 2>$null
        
        if ($ContainerStatus -ne "running") {
            Write-Host "  ⚡ Konteyner ishga tushirilmoqda..." -ForegroundColor Yellow
            docker start $ContainerName | Out-Null
            Start-Sleep -Seconds 3
        }
        
        # Servis papkasini yaratish
        New-Item -ItemType Directory -Path $ServiceDir -Force | Out-Null
        
        # Fayllarni ko'chirish
        $FilesRecovered = 0
        
        # src papkasini ko'chirish
        try {
            docker cp "${ContainerName}:/app/src" $ServiceDir 2>$null
            if ($LASTEXITCODE -eq 0) {
                $FilesRecovered++
                Write-Host "  ✅ src papkasi ko'chirildi" -ForegroundColor Green
            } else {
                # Boshqa yo'llarni sinab ko'rish
                docker cp "${ContainerName}:/app/${Service}/src" $ServiceDir 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $FilesRecovered++
                    Write-Host "  ✅ src papkasi ko'chirildi" -ForegroundColor Green
                }
            }
        } catch { }
        
        # package.json ko'chirish
        try {
            docker cp "${ContainerName}:/app/package.json" $ServiceDir 2>$null
            if ($LASTEXITCODE -eq 0) {
                $FilesRecovered++
            } else {
                docker cp "${ContainerName}:/app/${Service}/package.json" $ServiceDir 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $FilesRecovered++
                }
            }
        } catch { }
        
        # tsconfig.json ko'chirish
        try {
            docker cp "${ContainerName}:/app/tsconfig.json" $ServiceDir 2>$null
            if ($LASTEXITCODE -eq 0) {
                $FilesRecovered++
            } else {
                docker cp "${ContainerName}:/app/${Service}/tsconfig.json" $ServiceDir 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $FilesRecovered++
                }
            }
        } catch { }
        
        # prisma papkasini ko'chirish
        try {
            docker cp "${ContainerName}:/app/prisma" $ServiceDir 2>$null
            if ($LASTEXITCODE -eq 0) {
                $FilesRecovered++
            } else {
                docker cp "${ContainerName}:/app/${Service}/prisma" $ServiceDir 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $FilesRecovered++
                }
            }
        } catch { }
        
        # Dockerfile ko'chirish
        try {
            docker cp "${ContainerName}:/app/Dockerfile" $ServiceDir 2>$null
            if ($LASTEXITCODE -eq 0) {
                $FilesRecovered++
            }
        } catch { }
        
        if ($FilesRecovered -gt 0) {
            Write-Host "  📦 $FilesRecovered xil fayl turi tiklandi" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Hech qanday fayl tiklanmadi" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "  ❌ $ContainerName konteyner topilmadi" -ForegroundColor Red
    }
}

Write-Host "`n🔄 Barcha fayllarni backend papkasiga ko'chirish..." -ForegroundColor Magenta

# Barcha fayllarni backend papkasiga ko'chirish
foreach ($Service in $AllServices) {
    $SourceDir = "$RecoveryDir/$Service"
    $DestDir = "backend/$Service"
    
    if (Test-Path $SourceDir) {
        # Backend papkasini yaratish (agar mavjud bo'lmasa)
        if (!(Test-Path $DestDir)) {
            New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        }
        
        # Fayllarni ko'chirish
        try {
            Copy-Item -Path "$SourceDir/*" -Destination $DestDir -Recurse -Force
            Write-Host "  ✅ $Service fayllar backend papkasiga ko'chirildi" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ $Service fayllarni ko'chirishda xatolik: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Ma'lumotlar bazasi backup'lari
Write-Host "`n🗄️ Ma'lumotlar bazasi backup'larini olish..." -ForegroundColor Cyan

$DbBackupDir = "$RecoveryDir/database-backups"
New-Item -ItemType Directory -Path $DbBackupDir -Force | Out-Null

# PostgreSQL backup
try {
    $PostgresRunning = docker ps --format "table {{.Names}}" | Select-String "ultramarket_postgres"
    if (!$PostgresRunning) {
        docker start ultramarket_postgres | Out-Null
        Start-Sleep -Seconds 5
    }
    
    docker exec ultramarket_postgres pg_dumpall -U postgres > "$DbBackupDir/postgres-backup.sql" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ PostgreSQL backup muvaffaqiyatli" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ PostgreSQL backup xatolik" -ForegroundColor Red
}

# MongoDB backup
try {
    $MongoRunning = docker ps --format "table {{.Names}}" | Select-String "ultramarket_mongodb"
    if (!$MongoRunning) {
        docker start ultramarket_mongodb | Out-Null
        Start-Sleep -Seconds 5
    }
    
    docker exec ultramarket_mongodb mongodump --out /tmp/mongodb-backup 2>$null
    docker cp ultramarket_mongodb:/tmp/mongodb-backup $DbBackupDir 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ MongoDB backup muvaffaqiyatli" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ MongoDB backup xatolik" -ForegroundColor Red
}

# Redis backup
try {
    $RedisRunning = docker ps --format "table {{.Names}}" | Select-String "ultramarket_redis"
    if (!$RedisRunning) {
        docker start ultramarket_redis | Out-Null
        Start-Sleep -Seconds 3
    }
    
    docker exec ultramarket_redis redis-cli BGSAVE 2>$null
    Start-Sleep -Seconds 2
    docker cp ultramarket_redis:/data/dump.rdb "$DbBackupDir/redis-backup.rdb" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Redis backup muvaffaqiyatli" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Redis backup xatolik" -ForegroundColor Red
}

# Natijalar
Write-Host "`n📊 Umumiy natijalar:" -ForegroundColor Magenta

$TotalFiles = 0
$TotalDirs = 0

if (Test-Path $RecoveryDir) {
    $TotalFiles = (Get-ChildItem -Path $RecoveryDir -Recurse -File | Measure-Object).Count
    $TotalDirs = (Get-ChildItem -Path $RecoveryDir -Recurse -Directory | Measure-Object).Count
}

$BackendFiles = 0
if (Test-Path "backend") {
    $BackendFiles = (Get-ChildItem -Path "backend" -Recurse -File | Measure-Object).Count
}

Write-Host "  📁 Tiklangan papkalar: $TotalDirs" -ForegroundColor White
Write-Host "  📄 Tiklangan fayllar: $TotalFiles" -ForegroundColor White
Write-Host "  🏗️ Backend papkasidagi fayllar: $BackendFiles" -ForegroundColor White
Write-Host "  📂 Tiklangan fayllar: $RecoveryDir papkasida" -ForegroundColor White
Write-Host "  🎯 Asosiy fayllar: backend/ papkasida" -ForegroundColor White

Write-Host "`n🎉 Barcha servislar muvaffaqiyatli qaytarildi!" -ForegroundColor Green
Write-Host "💡 Endi loyihangizni ishga tushirishingiz mumkin!" -ForegroundColor Cyan

# Qo'shimcha ma'lumot
Write-Host "`n📋 Keyingi qadamlar:" -ForegroundColor Yellow
Write-Host "  1. npm install - barcha dependencies o'rnatish" -ForegroundColor White
Write-Host "  2. docker-compose up - loyihani ishga tushirish" -ForegroundColor White
Write-Host "  3. Prisma migrate - ma'lumotlar bazasini yangilash" -ForegroundColor White