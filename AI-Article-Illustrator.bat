@echo off
chcp 65001 >nul
echo.
echo   AI Article Illustrator - 全文配图生成器
echo   ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   Error: Node.js is not installed.
    echo   Please install from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do echo   Node.js %%i

if not exist "node_modules" (
    echo.
    echo   Installing dependencies...
    call npm install
)

echo.
echo   Starting...
echo   Open http://localhost:3000 in your browser
echo.

call npm run dev
pause
