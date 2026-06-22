# HAKA Chat Application PowerShell Launcher

# 1. Determine Package Manager (pnpm fallback to npm)
$packageManager = "pnpm"
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "[INFO] pnpm is not installed. Falling back to npm..." -ForegroundColor Yellow
    $packageManager = "npm"
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "[ERROR] Neither pnpm nor npm is installed or in PATH." -ForegroundColor Red
        Write-Host "Please install Node.js and npm first." -ForegroundColor Yellow
        Exit 1
    }
}

# 2. Install dependencies
Write-Host "[1/3] Installing dependencies with $packageManager..." -ForegroundColor Cyan
if ($packageManager -eq "pnpm") {
    pnpm install
} else {
    npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies." -ForegroundColor Red
    Exit 1
}
Write-Host "[SUCCESS] Dependencies installed." -ForegroundColor Green
Write-Host ""

# 3. Kill any existing socket server on port 3001
Write-Host "[2/3] Checking for existing process on port 3001..." -ForegroundColor Cyan
$existing = netstat -ano | Select-String ":3001" | Select-String "LISTENING"
if ($existing) {
    $pid = ($existing -split '\s+')[-1]
    try {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "[INFO] Killed existing process on port 3001 (PID: $pid)" -ForegroundColor Yellow
    } catch {}
}

# Start Socket.io server in a new PowerShell window
Write-Host "Starting Socket.io server on port 3001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "title 'HAKA Socket Server'; Set-Location '$PWD'; node server.js"
Write-Host "[SUCCESS] Socket server launched in a separate window." -ForegroundColor Green

# Wait for socket server to initialize
Write-Host "[INFO] Waiting 3 seconds for socket server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Verify socket server is responding
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "[SUCCESS] Socket server is healthy!" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARNING] Could not verify socket server. It may still be starting..." -ForegroundColor Yellow
}

Write-Host ""

# 4. Start Next.js frontend dev server
Write-Host "[3/3] Starting Next.js frontend on port 3000..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host " HAKA Chat App is starting!" -ForegroundColor Green
Write-Host " - Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host " - Socket Server: http://localhost:3001" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host ""

if ($packageManager -eq "pnpm") {
    pnpm dev
} else {
    npm run dev
}
