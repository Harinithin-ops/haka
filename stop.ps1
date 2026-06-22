# HAKA Process Cleanup Script for PowerShell

Write-Host "Cleaning up orphaned Next.js and Socket.io server processes..." -ForegroundColor Cyan

# 1. Kill process on Port 3000
$netstat3000 = netstat -ano | Select-String "LISTENING" | Select-String ":3000\s"
if ($netstat3000) {
    $pid3000 = $netstat3000.Line.Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)[-1]
    Write-Host "Killing process using port 3000 (PID: $pid3000)..." -ForegroundColor Yellow
    taskkill /F /PID $pid3000 2>&1 | Out-Null
} else {
    Write-Host "Port 3000 is already free." -ForegroundColor Gray
}

# 2. Kill process on Port 3001
$netstat3001 = netstat -ano | Select-String "LISTENING" | Select-String ":3001\s"
if ($netstat3001) {
    $pid3001 = $netstat3001.Line.Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)[-1]
    Write-Host "Killing process using port 3001 (PID: $pid3001)..." -ForegroundColor Yellow
    taskkill /F /PID $pid3001 2>&1 | Out-Null
} else {
    Write-Host "Port 3001 is already free." -ForegroundColor Gray
}

# 3. Clean up Next.js dev lock file
$lockPath = Join-Path $PSScriptRoot ".next\dev\lock"
if (Test-Path $lockPath) {
    Write-Host "Removing Next.js dev lock file..." -ForegroundColor Yellow
    Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
}

Write-Host "[SUCCESS] Cleanup complete! You can now run .\run.ps1 again." -ForegroundColor Green
