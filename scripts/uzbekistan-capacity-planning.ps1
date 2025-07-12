# UltraMarket Uzbekistan Capacity Planning Script
# O'zbekiston uchun server sig'im rejalashtirish

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [int]$ProjectedUsers = 100000,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "all",
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport = $false
)

Write-Host "🇺🇿 UltraMarket Uzbekistan Capacity Planning" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# O'zbekiston-specific configuration
$UzbekistanConfig = @{
    Regions = @{
        'TSH' = @{ Name = 'Toshkent'; Population = 2800000; InternetPenetration = 85; EcommercePenetration = 15 }
        'SAM' = @{ Name = 'Samarqand'; Population = 3800000; InternetPenetration = 75; EcommercePenetration = 12 }
        'BUX' = @{ Name = 'Buxoro'; Population = 1900000; InternetPenetration = 70; EcommercePenetration = 10 }
        'AND' = @{ Name = 'Andijon'; Population = 3000000; InternetPenetration = 78; EcommercePenetration = 11 }
        'FAR' = @{ Name = 'Fargona'; Population = 3700000; InternetPenetration = 76; EcommercePenetration = 13 }
        'NAM' = @{ Name = 'Namangan'; Population = 2800000; InternetPenetration = 74; EcommercePenetration = 11 }
        'QAS' = @{ Name = 'Qashqadaryo'; Population = 3200000; InternetPenetration = 68; EcommercePenetration = 9 }
        'SUR' = @{ Name = 'Surxondaryo'; Population = 2500000; InternetPenetration = 65; EcommercePenetration = 8 }
        'NAV' = @{ Name = 'Navoiy'; Population = 1000000; InternetPenetration = 72; EcommercePenetration = 10 }
        'JIZ' = @{ Name = 'Jizzax'; Population = 1400000; InternetPenetration = 70; EcommercePenetration = 9 }
        'SIR' = @{ Name = 'Sirdaryo'; Population = 800000; InternetPenetration = 68; EcommercePenetration = 8 }
        'XOR' = @{ Name = 'Xorazm'; Population = 1800000; InternetPenetration = 66; EcommercePenetration = 8 }
        'QOR' = @{ Name = 'Qoraqalpogiston'; Population = 1800000; InternetPenetration = 60; EcommercePenetration = 7 }
    }
    
    TrafficPatterns = @{
        PeakHours = @(9, 10, 12, 13, 18, 19, 20, 21)  # Toshkent vaqti
        PeakMultiplier = 2.5
        WeekendMultiplier = 1.8
        RamadanMultiplier = 3.2  # Ro'za oyida traffic ko'payadi
        NewYearMultiplier = 4.0  # Yangi yil va bayramlarda
    }
    
    PaymentMethods = @{
        'click' = @{ Share = 40; ProcessingLoad = 1.2; FailureRate = 0.015 }
        'payme' = @{ Share = 30; ProcessingLoad = 1.3; FailureRate = 0.022 }
        'uzcard' = @{ Share = 15; ProcessingLoad = 2.1; FailureRate = 0.038 }
        'humo' = @{ Share = 10; ProcessingLoad = 2.2; FailureRate = 0.042 }
        'cash_on_delivery' = @{ Share = 5; ProcessingLoad = 0.1; FailureRate = 0.078 }
    }
    
    ServiceRequirements = @{
        'web-app' = @{ CPUPerUser = 0.02; MemoryPerUser = 8; StoragePerUser = 0.1 }
        'api-gateway' = @{ CPUPerUser = 0.015; MemoryPerUser = 6; StoragePerUser = 0.05 }
        'user-service' = @{ CPUPerUser = 0.008; MemoryPerUser = 4; StoragePerUser = 2 }
        'product-service' = @{ CPUPerUser = 0.012; MemoryPerUser = 12; StoragePerUser = 5 }
        'order-service' = @{ CPUPerUser = 0.01; MemoryPerUser = 8; StoragePerUser = 3 }
        'payment-service' = @{ CPUPerUser = 0.025; MemoryPerUser = 16; StoragePerUser = 1 }
        'cart-service' = @{ CPUPerUser = 0.005; MemoryPerUser = 3; StoragePerUser = 0.5 }
        'search-service' = @{ CPUPerUser = 0.02; MemoryPerUser = 20; StoragePerUser = 10 }
        'analytics-service' = @{ CPUPerUser = 0.003; MemoryPerUser = 6; StoragePerUser = 8 }
        'notification-service' = @{ CPUPerUser = 0.004; MemoryPerUser = 2; StoragePerUser = 0.2 }
    }
}

function Calculate-RegionalUsers {
    param([string]$TargetRegion, [int]$TotalUsers)
    
    $result = @{}
    
    if ($TargetRegion -eq "all") {
        $totalPotential = 0
        foreach ($region in $UzbekistanConfig.Regions.GetEnumerator()) {
            $potential = $region.Value.Population * ($region.Value.InternetPenetration / 100) * ($region.Value.EcommercePenetration / 100)
            $totalPotential += $potential
        }
        
        foreach ($region in $UzbekistanConfig.Regions.GetEnumerator()) {
            $potential = $region.Value.Population * ($region.Value.InternetPenetration / 100) * ($region.Value.EcommercePenetration / 100)
            $share = $potential / $totalPotential
            $result[$region.Key] = @{
                Name = $region.Value.Name
                Users = [math]::Round($TotalUsers * $share)
                Share = [math]::Round($share * 100, 2)
                Potential = [math]::Round($potential)
            }
        }
    } else {
        $result[$TargetRegion] = @{
            Name = $UzbekistanConfig.Regions[$TargetRegion].Name
            Users = $TotalUsers
            Share = 100
            Potential = $UzbekistanConfig.Regions[$TargetRegion].Population * 
                       ($UzbekistanConfig.Regions[$TargetRegion].InternetPenetration / 100) * 
                       ($UzbekistanConfig.Regions[$TargetRegion].EcommercePenetration / 100)
        }
    }
    
    return $result
}

function Calculate-PeakCapacity {
    param([int]$BaseUsers)
    
    $peakMultiplier = $UzbekistanConfig.TrafficPatterns.PeakMultiplier
    $ramadanMultiplier = $UzbekistanConfig.TrafficPatterns.RamadanMultiplier
    $newYearMultiplier = $UzbekistanConfig.TrafficPatterns.NewYearMultiplier
    
    return @{
        Normal = $BaseUsers
        Peak = [math]::Ceiling($BaseUsers * $peakMultiplier)
        Weekend = [math]::Ceiling($BaseUsers * $UzbekistanConfig.TrafficPatterns.WeekendMultiplier)
        Ramadan = [math]::Ceiling($BaseUsers * $ramadanMultiplier)
        NewYear = [math]::Ceiling($BaseUsers * $newYearMultiplier)
        MaxCapacity = [math]::Ceiling($BaseUsers * $newYearMultiplier * 1.5)  # 50% buffer
    }
}

function Calculate-ServiceResources {
    param([int]$Users, [string]$ServiceName)
    
    $requirements = $UzbekistanConfig.ServiceRequirements[$ServiceName]
    if (-not $requirements) {
        Write-Warning "Service '$ServiceName' not found in requirements"
        return $null
    }
    
    return @{
        CPU = [math]::Ceiling($Users * $requirements.CPUPerUser)
        Memory = [math]::Ceiling($Users * $requirements.MemoryPerUser / 1024)  # GB
        Storage = [math]::Ceiling($Users * $requirements.StoragePerUser)  # GB
        Instances = [math]::Max(2, [math]::Ceiling($Users / 5000))  # Min 2 instances for HA
    }
}

function Calculate-DatabaseResources {
    param([int]$Users)
    
    # Database calculations based on Uzbekistan usage patterns
    $ordersPerUser = 2.5  # Average orders per user per month
    $productsViewed = 25   # Average products viewed per user per month
    
    return @{
        PostgreSQL = @{
            CPU = [math]::Ceiling($Users * 0.01)
            Memory = [math]::Ceiling($Users * 15 / 1024)  # GB
            Storage = [math]::Ceiling($Users * 50)  # GB
            IOPS = [math]::Ceiling($Users * 2)
        }
        MongoDB = @{
            CPU = [math]::Ceiling($Users * 0.008)
            Memory = [math]::Ceiling($Users * 12 / 1024)  # GB
            Storage = [math]::Ceiling($Users * 100)  # GB (product catalog)
            IOPS = [math]::Ceiling($Users * 3)
        }
        Redis = @{
            CPU = [math]::Ceiling($Users * 0.003)
            Memory = [math]::Ceiling($Users * 8 / 1024)  # GB
            Storage = [math]::Ceiling($Users * 2)  # GB (cache)
        }
    }
}

function Calculate-BandwidthRequirements {
    param([int]$Users)
    
    # Bandwidth calculations for Uzbekistan internet infrastructure
    $avgPageSize = 2.5  # MB per page
    $pagesPerSession = 8
    $sessionsPerDay = 1.5
    $concurrencyFactor = 0.15  # 15% of users online simultaneously
    
    $concurrentUsers = [math]::Ceiling($Users * $concurrencyFactor)
    $peakConcurrentUsers = [math]::Ceiling($concurrentUsers * $UzbekistanConfig.TrafficPatterns.PeakMultiplier)
    
    return @{
        ConcurrentUsers = $concurrentUsers
        PeakConcurrentUsers = $peakConcurrentUsers
        AvgBandwidth = [math]::Ceiling($concurrentUsers * $avgPageSize * 0.1)  # Mbps
        PeakBandwidth = [math]::Ceiling($peakConcurrentUsers * $avgPageSize * 0.15)  # Mbps
        CDNBandwidth = [math]::Ceiling($peakConcurrentUsers * 5)  # Mbps for static content
    }
}

function Generate-InfrastructureRecommendations {
    param([hashtable]$CapacityData)
    
    $recommendations = @()
    
    # Kubernetes cluster sizing
    $totalCPU = 0
    $totalMemory = 0
    foreach ($service in $CapacityData.Services.GetEnumerator()) {
        $totalCPU += $service.Value.CPU
        $totalMemory += $service.Value.Memory
    }
    
    # Add database resources
    $totalCPU += $CapacityData.Database.PostgreSQL.CPU + $CapacityData.Database.MongoDB.CPU + $CapacityData.Database.Redis.CPU
    $totalMemory += $CapacityData.Database.PostgreSQL.Memory + $CapacityData.Database.MongoDB.Memory + $CapacityData.Database.Redis.Memory
    
    # Kubernetes node recommendations
    $nodeCount = [math]::Max(3, [math]::Ceiling($totalCPU / 14))  # Assuming 16 core nodes with 2 core buffer
    $nodeMemory = [math]::Max(32, [math]::Ceiling($totalMemory / $nodeCount * 1.3))  # 30% buffer
    
    $recommendations += "Kubernetes Cluster:"
    $recommendations += "  - Nodes: $nodeCount (minimum 3 for HA)"
    $recommendations += "  - Node CPU: 16 cores per node"
    $recommendations += "  - Node Memory: ${nodeMemory}GB per node"
    $recommendations += "  - Node Storage: 500GB SSD per node"
    $recommendations += ""
    
    # CDN recommendations for Uzbekistan
    $recommendations += "CDN Configuration for Uzbekistan:"
    $recommendations += "  - Primary CDN: CloudFlare with Tashkent PoP"
    $recommendations += "  - Bandwidth: $($CapacityData.Bandwidth.CDNBandwidth) Mbps"
    $recommendations += "  - Cache regions: Tashkent, Almaty, Moscow"
    $recommendations += "  - Image optimization: WebP format for modern browsers"
    $recommendations += ""
    
    # Monitoring and alerting
    $recommendations += "Monitoring & Alerting:"
    $recommendations += "  - Prometheus with $($CapacityData.Users.MaxCapacity * 30) metrics/sec capacity"
    $recommendations += "  - Grafana with Uzbekistan timezone (Asia/Tashkent)"
    $recommendations += "  - Alert channels: Telegram bot for Uzbekistan team"
    $recommendations += "  - Log retention: 90 days for compliance"
    $recommendations += ""
    
    # Security recommendations
    $recommendations += "Security for Uzbekistan:"
    $recommendations += "  - SSL certificates for *.ultramarket.uz"
    $recommendations += "  - WAF rules for Uzbekistan-specific threats"
    $recommendations += "  - DDoS protection with 10Gbps capacity"
    $recommendations += "  - GDPR compliance for EU users"
    $recommendations += "  - Local data residency for Uzbekistan user data"
    
    return $recommendations
}

function Generate-CostEstimation {
    param([hashtable]$CapacityData)
    
    # Cost calculations in USD (will be converted to UZS)
    $costs = @{
        Infrastructure = @{
            Kubernetes = $CapacityData.KubernetesNodes * 120  # $120/month per node
            LoadBalancer = 50  # $50/month
            Storage = ($CapacityData.TotalStorage / 100) * 10  # $0.10/GB/month
        }
        Database = @{
            PostgreSQL = 200  # Managed PostgreSQL
            MongoDB = 180     # Managed MongoDB
            Redis = 80        # Managed Redis
        }
        CDN = @{
            Bandwidth = $CapacityData.Bandwidth.CDNBandwidth * 0.05  # $0.05/Mbps/month
            Requests = 30     # Fixed cost for requests
        }
        Monitoring = @{
            Prometheus = 100
            Grafana = 50
            Logs = 80
        }
        External = @{
            ClickAPI = 150    # Click payment gateway
            PaymeAPI = 150    # Payme payment gateway
            SMS = 200         # SMS notifications
            Email = 50        # Email service
        }
    }
    
    $totalUSD = 0
    foreach ($category in $costs.GetEnumerator()) {
        foreach ($item in $category.Value.GetEnumerator()) {
            $totalUSD += $item.Value
        }
    }
    
    $uzsRate = 12300  # Current USD to UZS rate
    $totalUZS = $totalUSD * $uzsRate
    
    return @{
        USD = $totalUSD
        UZS = $totalUZS
        Monthly = $totalUZS
        Yearly = $totalUZS * 12
        Breakdown = $costs
    }
}

# Main execution
Write-Host "📊 Calculating capacity for $ProjectedUsers users..." -ForegroundColor Cyan

# Calculate regional distribution
$regionalUsers = Calculate-RegionalUsers -TargetRegion $Region -TotalUsers $ProjectedUsers

Write-Host "`n🌍 Regional Distribution:" -ForegroundColor Yellow
foreach ($region in $regionalUsers.GetEnumerator()) {
    Write-Host "  $($region.Value.Name): $($region.Value.Users) users ($($region.Value.Share)%)" -ForegroundColor White
}

# Calculate peak capacity
$peakCapacity = Calculate-PeakCapacity -BaseUsers $ProjectedUsers

Write-Host "`n📈 Peak Capacity Requirements:" -ForegroundColor Yellow
Write-Host "  Normal: $($peakCapacity.Normal) users" -ForegroundColor White
Write-Host "  Peak Hours: $($peakCapacity.Peak) users" -ForegroundColor White
Write-Host "  Weekend: $($peakCapacity.Weekend) users" -ForegroundColor White
Write-Host "  Ramadan: $($peakCapacity.Ramadan) users" -ForegroundColor White
Write-Host "  New Year: $($peakCapacity.NewYear) users" -ForegroundColor White
Write-Host "  Max Capacity (with buffer): $($peakCapacity.MaxCapacity) users" -ForegroundColor Red

# Calculate service resources for max capacity
$serviceResources = @{}
foreach ($service in $UzbekistanConfig.ServiceRequirements.Keys) {
    $serviceResources[$service] = Calculate-ServiceResources -Users $peakCapacity.MaxCapacity -ServiceName $service
}

Write-Host "`n💻 Service Resources (Max Capacity):" -ForegroundColor Yellow
foreach ($service in $serviceResources.GetEnumerator()) {
    $res = $service.Value
    Write-Host "  $($service.Key):" -ForegroundColor White
    Write-Host "    CPU: $($res.CPU) cores" -ForegroundColor Gray
    Write-Host "    Memory: $($res.Memory) GB" -ForegroundColor Gray
    Write-Host "    Storage: $($res.Storage) GB" -ForegroundColor Gray
    Write-Host "    Instances: $($res.Instances)" -ForegroundColor Gray
}

# Calculate database resources
$databaseResources = Calculate-DatabaseResources -Users $peakCapacity.MaxCapacity

Write-Host "`n🗄️ Database Resources:" -ForegroundColor Yellow
foreach ($db in $databaseResources.GetEnumerator()) {
    Write-Host "  $($db.Key):" -ForegroundColor White
    Write-Host "    CPU: $($db.Value.CPU) cores" -ForegroundColor Gray
    Write-Host "    Memory: $($db.Value.Memory) GB" -ForegroundColor Gray
    Write-Host "    Storage: $($db.Value.Storage) GB" -ForegroundColor Gray
    if ($db.Value.IOPS) {
        Write-Host "    IOPS: $($db.Value.IOPS)" -ForegroundColor Gray
    }
}

# Calculate bandwidth requirements
$bandwidthReqs = Calculate-BandwidthRequirements -Users $ProjectedUsers

Write-Host "`n🌐 Bandwidth Requirements:" -ForegroundColor Yellow
Write-Host "  Concurrent Users: $($bandwidthReqs.ConcurrentUsers)" -ForegroundColor White
Write-Host "  Peak Concurrent: $($bandwidthReqs.PeakConcurrentUsers)" -ForegroundColor White
Write-Host "  Average Bandwidth: $($bandwidthReqs.AvgBandwidth) Mbps" -ForegroundColor White
Write-Host "  Peak Bandwidth: $($bandwidthReqs.PeakBandwidth) Mbps" -ForegroundColor White
Write-Host "  CDN Bandwidth: $($bandwidthReqs.CDNBandwidth) Mbps" -ForegroundColor White

# Prepare capacity data for recommendations and costs
$capacityData = @{
    Users = $peakCapacity
    Services = $serviceResources
    Database = $databaseResources
    Bandwidth = $bandwidthReqs
    KubernetesNodes = [math]::Max(3, [math]::Ceiling(($serviceResources.Values | ForEach-Object { $_.CPU } | Measure-Object -Sum).Sum / 14))
    TotalStorage = ($serviceResources.Values | ForEach-Object { $_.Storage } | Measure-Object -Sum).Sum + 
                   ($databaseResources.Values | ForEach-Object { $_.Storage } | Measure-Object -Sum).Sum
}

# Generate recommendations
$recommendations = Generate-InfrastructureRecommendations -CapacityData $capacityData

Write-Host "`n💡 Infrastructure Recommendations:" -ForegroundColor Yellow
foreach ($rec in $recommendations) {
    if ($rec -eq "") {
        Write-Host ""
    } else {
        Write-Host "  $rec" -ForegroundColor White
    }
}

# Calculate costs
$costEstimation = Generate-CostEstimation -CapacityData $capacityData

Write-Host "`n💰 Cost Estimation:" -ForegroundColor Yellow
Write-Host "  Monthly Cost: $([math]::Round($costEstimation.USD, 2)) USD" -ForegroundColor White
Write-Host "  Monthly Cost: $([math]::Round($costEstimation.UZS / 1000000, 2)) million UZS" -ForegroundColor White
Write-Host "  Yearly Cost: $([math]::Round($costEstimation.Yearly / 1000000000, 2)) billion UZS" -ForegroundColor White

# Generate detailed report if requested
if ($GenerateReport) {
    $reportPath = "uzbekistan-capacity-report-$(Get-Date -Format 'yyyy-MM-dd-HHmm').txt"
    
    $reportContent = @"
UltraMarket Uzbekistan Capacity Planning Report
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
===============================================

EXECUTIVE SUMMARY
- Target Users: $ProjectedUsers
- Peak Capacity: $($peakCapacity.MaxCapacity) users
- Estimated Monthly Cost: $([math]::Round($costEstimation.USD, 2)) USD
- Kubernetes Nodes Required: $($capacityData.KubernetesNodes)

REGIONAL DISTRIBUTION
$(foreach ($region in $regionalUsers.GetEnumerator()) { "- $($region.Value.Name): $($region.Value.Users) users ($($region.Value.Share)%)" })

INFRASTRUCTURE REQUIREMENTS
$($recommendations -join "`n")

DETAILED COST BREAKDOWN (USD)
$(foreach ($category in $costEstimation.Breakdown.GetEnumerator()) {
    "$($category.Key):"
    foreach ($item in $category.Value.GetEnumerator()) {
        "  - $($item.Key): $($item.Value)"
    }
})

NEXT STEPS
1. Procure Kubernetes cluster with $($capacityData.KubernetesNodes) nodes
2. Set up managed databases (PostgreSQL, MongoDB, Redis)
3. Configure CDN with Uzbekistan optimization
4. Implement monitoring and alerting
5. Set up payment gateway integrations (Click, Payme)
6. Configure backup and disaster recovery
7. Implement security measures and compliance
8. Load testing with Uzbekistan traffic patterns
9. Training for Uzbekistan operations team
10. Go-live checklist and monitoring

RISK MITIGATION
- Internet infrastructure limitations in remote regions
- Currency exchange rate fluctuations (UZS/USD)
- Local compliance and data residency requirements
- Seasonal traffic variations (Ramadan, New Year)
- Payment gateway availability and reliability
"@

    $reportContent | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "`n📄 Detailed report generated: $reportPath" -ForegroundColor Green
}

Write-Host "`n✅ Capacity planning completed!" -ForegroundColor Green
Write-Host "Ready for UltraMarket Uzbekistan deployment! 🇺🇿" -ForegroundColor Green 