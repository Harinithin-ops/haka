# HAKA Database Migrator for PowerShell

Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "               HAKA DATABASE MIGRATOR" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "This script will apply the HAKA schema to your Supabase PostgreSQL database." -ForegroundColor Yellow
Write-Host ""

# 1. Check for psql installation
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "[INFO] psql is not installed or not in PATH." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To manually run the migration:" -ForegroundColor Cyan
    Write-Host "1. Go to your Supabase Dashboard: https://supabase.com" -ForegroundColor Cyan
    Write-Host "2. Select project 'vbgqcdosupkdlwopvgff'" -ForegroundColor Cyan
    Write-Host "3. Open the SQL Editor and click 'New Query'" -ForegroundColor Cyan
    Write-Host "4. Copy and paste the contents of 'scripts/04_setup_haka_no_rls.sql'" -ForegroundColor Cyan
    Write-Host "5. Click 'Run'" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    Exit 1
}

# 2. Ask for connection string
Write-Host "Enter your Supabase connection string URI." -ForegroundColor Cyan
Write-Host "(Retrieve from: Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI)" -ForegroundColor Gray
$connStr = Read-Host "Connection string URI"

# 3. Apply migration using psql
Write-Host ""
Write-Host "[1/1] Applying migration using psql..." -ForegroundColor Cyan
psql $connStr -f scripts/04_setup_haka_no_rls.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to run SQL migration." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    Exit 1
}

Write-Host ""
Write-Host "[SUCCESS] Database schema successfully setup!" -ForegroundColor Green
Read-Host "Press Enter to exit"
