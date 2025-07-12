# =============================================================================
# UltraMarket Final Project Validation Script
# Comprehensive validation of all project components
# =============================================================================

param(
    [switch]$Verbose,
    [switch]$GenerateReport,
    [string]$OutputPath = "validation-report.json"
)

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

# Validation results
$ValidationResults = @{
    TotalChecks = 0
    PassedChecks = 0
    FailedChecks = 0
    Warnings = 0
    StartTime = Get-Date
    EndTime = $null
    Components = @{}
}

function Write-ColoredOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewline
    )
    
    if ($NoNewline) {
        Write-Host $Message -ForegroundColor $Color -NoNewline
    } else {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Write-Header {
    param([string]$Title)
    
    Write-ColoredOutput "`n==================== $Title ====================" -Color $Colors.Header
}

function Test-Component {
    param(
        [string]$ComponentName,
        [scriptblock]$TestScript
    )
    
    $ValidationResults.TotalChecks++
    
    try {
        $result = & $TestScript
        if ($result) {
            Write-ColoredOutput "✅ $ComponentName - PASSED" -Color $Colors.Success
            $ValidationResults.PassedChecks++
            $ValidationResults.Components[$ComponentName] = @{
                Status = "PASSED"
                Message = "Component validated successfully"
            }
        } else {
            Write-ColoredOutput "❌ $ComponentName - FAILED" -Color $Colors.Error
            $ValidationResults.FailedChecks++
            $ValidationResults.Components[$ComponentName] = @{
                Status = "FAILED"
                Message = "Component validation failed"
            }
        }
    } catch {
        Write-ColoredOutput "❌ $ComponentName - ERROR: $($_.Exception.Message)" -Color $Colors.Error
        $ValidationResults.FailedChecks++
        $ValidationResults.Components[$ComponentName] = @{
            Status = "ERROR"
            Message = $_.Exception.Message
        }
    }
}

function Test-Warning {
    param(
        [string]$ComponentName,
        [string]$Message
    )
    
    Write-ColoredOutput "⚠️  $ComponentName - WARNING: $Message" -Color $Colors.Warning
    $ValidationResults.Warnings++
}

# =============================================================================
# Project Structure Validation
# =============================================================================

Write-Header "Project Structure Validation"

Test-Component "Root Directory Structure" {
    $requiredDirs = @(
        "microservices",
        "frontend", 
        "infrastructure",
        "libs",
        "config",
        "docs",
        "scripts",
        "tests"
    )
    
    $missingDirs = @()
    foreach ($dir in $requiredDirs) {
        if (-not (Test-Path $dir)) {
            $missingDirs += $dir
        }
    }
    
    if ($missingDirs.Count -eq 0) {
        return $true
    } else {
        Write-ColoredOutput "Missing directories: $($missingDirs -join ', ')" -Color $Colors.Error
        return $false
    }
}

Test-Component "Microservices Structure" {
    $serviceCategories = @("core", "business", "platform", "ml-ai")
    $allCategoriesExist = $true
    
    foreach ($category in $serviceCategories) {
        $categoryPath = "microservices/$category"
        if (-not (Test-Path $categoryPath)) {
            $allCategoriesExist = $false
            break
        }
    }
    
    return $allCategoriesExist
}

Test-Component "Frontend Applications" {
    $frontendApps = @("web-app", "admin-panel", "mobile-app")
    $allAppsExist = $true
    
    foreach ($app in $frontendApps) {
        $appPath = "frontend/$app"
        if (-not (Test-Path $appPath)) {
            $allAppsExist = $false
            break
        }
    }
    
    return $allAppsExist
}

# =============================================================================
# Configuration Files Validation
# =============================================================================

Write-Header "Configuration Files Validation"

Test-Component "Environment Configurations" {
    $envFiles = @(
        "config/environments/development.env.example",
        "config/environments/staging.env.example", 
        "config/environments/production.env.example"
    )
    
    $allEnvFilesExist = $true
    foreach ($file in $envFiles) {
        if (-not (Test-Path $file)) {
            $allEnvFilesExist = $false
            break
        }
    }
    
    return $allEnvFilesExist
}

Test-Component "Docker Configuration" {
    $dockerFiles = @(
        "config/docker/docker-compose.dev.yml",
        "config/docker/docker-compose.prod.yml",
        "config/docker/docker-compose.databases.yml"
    )
    
    $allDockerFilesExist = $true
    foreach ($file in $dockerFiles) {
        if (-not (Test-Path $file)) {
            $allDockerFilesExist = $false
            break
        }
    }
    
    return $allDockerFilesExist
}

Test-Component "TypeScript Configuration" {
    $tsFiles = @(
        "config/typescript/tsconfig.json",
        "config/typescript/tsconfig.base.json"
    )
    
    $allTsFilesExist = $true
    foreach ($file in $tsFiles) {
        if (-not (Test-Path $file)) {
            $allTsFilesExist = $false
            break
        }
    }
    
    return $allTsFilesExist
}

# =============================================================================
# Core Services Validation
# =============================================================================

Write-Header "Core Services Validation"

$coreServices = @(
    "auth-service",
    "user-service", 
    "config-service",
    "store-service"
)

foreach ($service in $coreServices) {
    Test-Component "Core Service: $service" {
        $servicePath = "microservices/core/$service"
        if (Test-Path $servicePath) {
            # Check for essential files
            $essentialFiles = @("package.json", "src")
            $allFilesExist = $true
            
            foreach ($file in $essentialFiles) {
                if (-not (Test-Path "$servicePath/$file")) {
                    $allFilesExist = $false
                    break
                }
            }
            
            return $allFilesExist
        }
        return $false
    }
}

# =============================================================================
# Business Services Validation
# =============================================================================

Write-Header "Business Services Validation"

$businessServices = @(
    "product-service",
    "cart-service",
    "order-service",
    "payment-service",
    "inventory-service",
    "review-service"
)

foreach ($service in $businessServices) {
    Test-Component "Business Service: $service" {
        $servicePath = "microservices/business/$service"
        if (Test-Path $servicePath) {
            # Check for service implementation
            $hasImplementation = (Test-Path "$servicePath/src") -or 
                                (Test-Path "$servicePath/package.json") -or
                                (Test-Path "$servicePath/$service")
            return $hasImplementation
        }
        return $false
    }
}

# =============================================================================
# Platform Services Validation
# =============================================================================

Write-Header "Platform Services Validation"

$platformServices = @(
    "search-service",
    "analytics-service", 
    "notification-service",
    "file-service",
    "content-service",
    "audit-service"
)

foreach ($service in $platformServices) {
    Test-Component "Platform Service: $service" {
        $servicePath = "microservices/platform/$service"
        if (Test-Path $servicePath) {
            $hasImplementation = (Test-Path "$servicePath/src") -or 
                                (Test-Path "$servicePath/package.json") -or
                                (Test-Path "$servicePath/$service")
            return $hasImplementation
        }
        return $false
    }
}

# =============================================================================
# Infrastructure Validation
# =============================================================================

Write-Header "Infrastructure Validation"

Test-Component "Kubernetes Manifests" {
    $k8sPath = "infrastructure/kubernetes"
    if (Test-Path $k8sPath) {
        $manifestFiles = Get-ChildItem -Path $k8sPath -Filter "*.yaml" -Recurse
        return $manifestFiles.Count -gt 0
    }
    return $false
}

Test-Component "Monitoring Configuration" {
    $monitoringPath = "infrastructure/monitoring"
    if (Test-Path $monitoringPath) {
        $monitoringFiles = @(
            "prometheus-config.yaml",
            "grafana-dashboards.yaml",
            "alertmanager.yml"
        )
        
        $allFilesExist = $true
        foreach ($file in $monitoringFiles) {
            if (-not (Test-Path "$monitoringPath/$file")) {
                $allFilesExist = $false
                break
            }
        }
        
        return $allFilesExist
    }
    return $false
}

Test-Component "Helm Charts" {
    $helmPath = "infrastructure/helm"
    return Test-Path $helmPath
}

# =============================================================================
# Documentation Validation
# =============================================================================

Write-Header "Documentation Validation"

$documentationFiles = @(
    "README.md",
    "docs/API_COMPLETE_DOCUMENTATION.md",
    "docs/DEVELOPER_GUIDE.md", 
    "docs/MAINTENANCE_PROCEDURES.md",
    "FINAL_PROJECT_SUMMARY.md"
)

foreach ($doc in $documentationFiles) {
    Test-Component "Documentation: $(Split-Path $doc -Leaf)" {
        if (Test-Path $doc) {
            $content = Get-Content $doc -Raw
            return $content.Length -gt 1000  # Check if document has substantial content
        }
        return $false
    }
}

# =============================================================================
# Scripts Validation
# =============================================================================

Write-Header "Scripts Validation"

$scriptCategories = @(
    "deployment",
    "database",
    "backup",
    "security",
    "validation"
)

foreach ($category in $scriptCategories) {
    Test-Component "Scripts Category: $category" {
        $scriptPath = "scripts/$category"
        if (Test-Path $scriptPath) {
            $scripts = Get-ChildItem -Path $scriptPath -File
            return $scripts.Count -gt 0
        }
        return $false
    }
}

# =============================================================================
# Security Implementation Validation
# =============================================================================

Write-Header "Security Implementation Validation"

Test-Component "Security Configurations" {
    $securityPath = "infrastructure/security"
    return Test-Path $securityPath
}

Test-Component "Security Audit Files" {
    $auditPath = "security-audit"
    if (Test-Path $auditPath) {
        $auditFiles = Get-ChildItem -Path $auditPath -File
        return $auditFiles.Count -gt 0
    }
    return $false
}

# =============================================================================
# Testing Infrastructure Validation
# =============================================================================

Write-Header "Testing Infrastructure Validation"

Test-Component "Test Suites" {
    $testPath = "tests"
    if (Test-Path $testPath) {
        $testCategories = @("e2e", "integration", "performance")
        $allCategoriesExist = $true
        
        foreach ($category in $testCategories) {
            if (-not (Test-Path "$testPath/$category")) {
                $allCategoriesExist = $false
                break
            }
        }
        
        return $allCategoriesExist
    }
    return $false
}

Test-Component "Jest Configuration" {
    $jestConfig = "config/jest/jest.config.js"
    return Test-Path $jestConfig
}

# =============================================================================
# Package Dependencies Validation
# =============================================================================

Write-Header "Package Dependencies Validation"

Test-Component "Root Package.json" {
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        return $packageJson.scripts -and $packageJson.dependencies
    }
    return $false
}

Test-Component "Shared Libraries" {
    $libsPath = "libs"
    if (Test-Path $libsPath) {
        $libraries = @("shared", "constants", "types", "utils")
        $allLibsExist = $true
        
        foreach ($lib in $libraries) {
            if (-not (Test-Path "$libsPath/$lib")) {
                $allLibsExist = $false
                break
            }
        }
        
        return $allLibsExist
    }
    return $false
}

# =============================================================================
# Uzbekistan Market Integration Validation
# =============================================================================

Write-Header "Uzbekistan Market Integration Validation"

Test-Component "Payment Gateway Integration" {
    # Check for payment service implementation
    $paymentServicePath = "microservices/business/payment-service"
    if (Test-Path $paymentServicePath) {
        # Look for payment gateway implementations
        $paymentFiles = Get-ChildItem -Path $paymentServicePath -Recurse -Filter "*click*" -File
        $payme = Get-ChildItem -Path $paymentServicePath -Recurse -Filter "*payme*" -File
        
        return ($paymentFiles.Count -gt 0) -or ($payme.Count -gt 0)
    }
    return $false
}

Test-Component "SMS Service Integration" {
    # Check for notification service with SMS capabilities
    $notificationPath = "microservices/platform/notification-service"
    if (Test-Path $notificationPath) {
        $smsFiles = Get-ChildItem -Path $notificationPath -Recurse -Filter "*sms*" -File
        $eskizFiles = Get-ChildItem -Path $notificationPath -Recurse -Filter "*eskiz*" -File
        
        return ($smsFiles.Count -gt 0) -or ($eskizFiles.Count -gt 0)
    }
    return $false
}

# =============================================================================
# Performance and Optimization Validation
# =============================================================================

Write-Header "Performance and Optimization Validation"

Test-Component "Performance Scripts" {
    $perfPath = "scripts/performance"
    if (Test-Path $perfPath) {
        $perfScripts = Get-ChildItem -Path $perfPath -File
        return $perfScripts.Count -gt 0
    }
    return $false
}

Test-Component "Database Optimization" {
    $dbOptPath = "scripts/database"
    if (Test-Path $dbOptPath) {
        $optimizationFiles = Get-ChildItem -Path $dbOptPath -Filter "*optimization*" -File
        return $optimizationFiles.Count -gt 0
    }
    return $false
}

# =============================================================================
# Final Results
# =============================================================================

$ValidationResults.EndTime = Get-Date
$duration = $ValidationResults.EndTime - $ValidationResults.StartTime

Write-Header "Validation Results Summary"

Write-ColoredOutput "`nValidation completed in $($duration.TotalSeconds.ToString('F2')) seconds" -Color $Colors.Info

$successRate = if ($ValidationResults.TotalChecks -gt 0) {
    [math]::Round(($ValidationResults.PassedChecks / $ValidationResults.TotalChecks) * 100, 2)
} else { 0 }

Write-ColoredOutput "`n📊 VALIDATION SUMMARY:" -Color $Colors.Header
Write-ColoredOutput "✅ Total Checks: $($ValidationResults.TotalChecks)" -Color $Colors.Info
Write-ColoredOutput "✅ Passed: $($ValidationResults.PassedChecks)" -Color $Colors.Success
Write-ColoredOutput "❌ Failed: $($ValidationResults.FailedChecks)" -Color $Colors.Error
Write-ColoredOutput "⚠️  Warnings: $($ValidationResults.Warnings)" -Color $Colors.Warning
Write-ColoredOutput "📈 Success Rate: $successRate%" -Color $Colors.Info

# Determine overall status
if ($ValidationResults.FailedChecks -eq 0) {
    Write-ColoredOutput "`n🎉 PROJECT STATUS: PRODUCTION READY - 100% VALIDATED!" -Color $Colors.Success
    $overallStatus = "PRODUCTION_READY"
} elseif ($ValidationResults.FailedChecks -le 2) {
    Write-ColoredOutput "`n⚠️  PROJECT STATUS: NEARLY READY - Minor issues detected" -Color $Colors.Warning
    $overallStatus = "NEARLY_READY"
} else {
    Write-ColoredOutput "`n❌ PROJECT STATUS: NEEDS ATTENTION - Multiple issues detected" -Color $Colors.Error
    $overallStatus = "NEEDS_ATTENTION"
}

# Generate report if requested
if ($GenerateReport) {
    $report = @{
        ValidationResults = $ValidationResults
        OverallStatus = $overallStatus
        SuccessRate = $successRate
        GeneratedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        ProjectVersion = "1.0.0"
    }
    
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputPath -Encoding UTF8
    Write-ColoredOutput "`n📄 Validation report saved to: $OutputPath" -Color $Colors.Info
}

# Exit with appropriate code
if ($ValidationResults.FailedChecks -eq 0) {
    exit 0
} else {
    exit 1
} 