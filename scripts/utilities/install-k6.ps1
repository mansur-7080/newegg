$tempDir = "C:\temp"
$k6Dir = "C:\k6"
$k6Zip = "$tempDir\k6.zip"

# Create temporary directory if it doesn't exist
if (!(Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# Create K6 directory if it doesn't exist
if (!(Test-Path $k6Dir)) {
    New-Item -ItemType Directory -Path $k6Dir | Out-Null
}

# Download K6
Write-Host "Downloading K6..."
try {
    Invoke-WebRequest -Uri "https://github.com/grafana/k6/releases/download/v0.43.1/k6-v0.43.1-windows-amd64.zip" -OutFile $k6Zip -ErrorAction Stop
} catch {
    Write-Error "Failed to download K6: $_"
    exit 1
}

# Extract K6
Write-Host "Extracting K6..."
if (Test-Path $k6Zip) {
    Expand-Archive -Path $k6Zip -DestinationPath $tempDir -Force
} else {
    Write-Error "K6 zip file not found for extraction."
    exit 1
}

$extractedExe = "$tempDir\k6-v0.43.1-windows-amd64\k6.exe"
if (Test-Path $extractedExe) {
    Copy-Item $extractedExe -Destination $k6Dir -Force
} else {
    Write-Error "K6 executable not found after extraction."
    exit 1
}

# Add K6 to PATH for current session
$env:Path += ";$k6Dir"

# Add K6 to PATH permanently
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$k6Dir*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$k6Dir", "User")
}

# Clean up
Remove-Item $k6Zip -Force
if (Test-Path "$tempDir\k6-v0.43.1-windows-amd64") {
    Remove-Item "$tempDir\k6-v0.43.1-windows-amd64" -Recurse -Force
}

Write-Host "K6 has been installed successfully!"
& "$k6Dir\k6.exe" version
