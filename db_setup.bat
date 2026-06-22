@echo off
title HAKA Database Migrator
echo ========================================================
echo               HAKA DATABASE MIGRATOR
echo ========================================================
echo.
echo This script will apply the HAKA schema to your Supabase PostgreSQL database.
echo.

:: Check for psql installation
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] psql is not installed or not in PATH.
    echo.
    echo To manually run the migration:
    echo 1. Go to your Supabase Dashboard: https://supabase.com
    echo 2. Select project 'vbgqcdosupkdlwopvgff'
    echo 3. Open the SQL Editor and click "New Query"
    echo 4. Copy and paste the contents of 'scripts/04_setup_haka_no_rls.sql'
    echo 5. Click "Run"
    echo.
    pause
    exit /b 1
)

echo Enter your Supabase connection string.
echo (Retrieve from: Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI)
echo.
set /p CONN_STR="Connection string URI: "

echo.
echo [1/1] Applying migration using psql...
psql "%CONN_STR%" -f scripts/04_setup_haka_no_rls.sql
if %errorlevel% neq 0 (
    echo [ERROR] Failed to run SQL migration.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Database schema successfully setup!
pause
