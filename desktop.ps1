# ParquetPeek desktop launcher (Windows / PowerShell)
# - Builds the frontend if needed
# - Activates the Python venv
# - Launches the native pywebview window

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Frontend build
$dist = Join-Path $root "frontend\dist"
$pkgLock = Join-Path $root "frontend\package-lock.json"
$indexHtml = Join-Path $dist "index.html"

if (-not (Test-Path $indexHtml) -or ((Get-Item $pkgLock).LastWriteTime -gt (Get-Item $indexHtml).LastWriteTime)) {
    Write-Host "[1/3] Building frontend..." -ForegroundColor Cyan
    Push-Location (Join-Path $root "frontend")
    if (-not (Test-Path "node_modules")) {
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
    Pop-Location
} else {
    Write-Host "[1/3] Frontend already built (skipping)" -ForegroundColor DarkGray
}

# 2. Activate venv
$venv = Join-Path $root "backend\.venv\Scripts\Activate.ps1"
if (-not (Test-Path $venv)) {
    Write-Host "[2/3] Creating venv & installing requirements..." -ForegroundColor Cyan
    python -m venv (Join-Path $root "backend\.venv")
    if ($LASTEXITCODE -ne 0) { throw "venv creation failed" }
    & $venv
    pip install -r (Join-Path $root "backend\requirements.txt")
    if ($LASTEXITCODE -ne 0) { throw "pip install failed" }
} else {
    Write-Host "[2/3] Activating venv" -ForegroundColor DarkGray
    & $venv
}

# 3. Launch desktop app
Write-Host "[3/3] Launching ParquetPeek..." -ForegroundColor Green
Push-Location (Join-Path $root "backend")
python run_desktop.py
Pop-Location
