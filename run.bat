@echo off
title HAKA Chat Application Launcher
echo ========================================================
echo               HAKA CHAT APP LAUNCHER
echo ========================================================
echo.

:: Check for pnpm installation, fallback to npm
set PKG_MGR=pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] pnpm is not installed. Falling back to npm...
    set PKG_MGR=npm
    where npm >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Neither pnpm nor npm is installed or in PATH.
        echo Please install Node.js and npm first.
        pause
        exit /b 1
    )
)

:: Install dependencies
echo [1/3] Installing dependencies with %PKG_MGR%...
if "%PKG_MGR%"=="pnpm" (
    call pnpm install
) else (
    call npm install
)

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed.
echo.

:: Start Socket.io server in a separate window
echo [2/3] Starting Socket.io server on port 3001...
start "HAKA Socket Server (Port 3001)" cmd /k "node server.js"
echo [SUCCESS] Socket server launched in separate window.
echo.

:: Start Next.js frontend dev server
echo [3/3] Starting Next.js frontend on port 3000...
echo.
echo ========================================================
echo  HAKA Chat App is starting!
echo  - Frontend: http://localhost:3000
echo  - Socket Server: http://localhost:3001
echo ========================================================
echo.

if "%PKG_MGR%"=="pnpm" (
    call pnpm dev
) else (
    call npm run dev
)

pause
