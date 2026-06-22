@echo off
title HAKA Process Cleanup
echo Cleaning up orphaned Next.js and Socket.io server processes...
echo.

:: Kill process on Port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process on port 3000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill process on Port 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    echo Killing process on port 3001 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Remove lock file
if exist .next\dev\lock (
    echo Removing Next.js dev lock file...
    del /f /q .next\dev\lock >nul 2>&1
)

echo.
echo Cleanup complete! You can now run run.bat or run.ps1 again.
pause
