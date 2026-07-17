@echo off
title ComX v2 - SAP Commodity Intelligence + Clean Core ABAP Suite

echo.
echo  ============================================================
echo   ComX v2 - Starting Server...
echo   SAP Commodity Intelligence + SAP Clean Core ABAP Suite
echo  ============================================================
echo.

cd /d "%~dp0"

:: Check node is available
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check node_modules exists
if not exist "node_modules\" (
    echo  [INFO] node_modules not found. Running npm install first...
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
)

:: Check .env.local exists
if not exist ".env.local" (
    echo  [WARN] .env.local not found. Copying from .env.example...
    copy ".env.example" ".env.local" >nul
    echo  [WARN] Please edit .env.local and add your GEMINI_API_KEY.
    echo.
)

echo  [OK] Starting ComX v2 on http://localhost:3000
echo  [OK] Press Ctrl+C to stop the server
echo.

:: Open browser after 5 seconds in background
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

:: Start the server
node_modules\.bin\tsx.cmd server.ts

echo.
echo  [INFO] Server stopped.
pause
