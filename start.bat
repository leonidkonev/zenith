@echo off
title Zenith
cd /d "%~dp0"

set "FORCE_SETUP=0"
if /I "%~1"=="--fresh" set "FORCE_SETUP=1"

echo.
echo  Zenith - One-click start
echo  ========================
echo.

set "DATABASE_URL=file:%CD%\apps\api\prisma\data\zenith.db"
if not exist "apps\api\prisma\data" mkdir "apps\api\prisma\data"
echo Using DATABASE_URL=%DATABASE_URL%

if not exist "package.json" (
  echo Error: package.json not found. Run this from the ZenithApp folder.
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo pnpm not found. Install Node.js and run: npm install -g pnpm
  echo Or use: npm install ^& npm run db:generate ^& npm run db:push ^& npm run dev
  pause
  exit /b 1
)

echo [1/4] Installing dependencies...
call pnpm install
if %ERRORLEVEL% neq 0 (
  echo Install failed.
  pause
  exit /b 1
)

echo.
echo [2/4] Generating Prisma client...
call pnpm run db:generate
if %ERRORLEVEL% neq 0 (
  echo db:generate failed. Continuing anyway.
)

echo.
echo [3/4] Setting up database (SQLite - no installation needed)...
call pnpm run db:push
if %ERRORLEVEL% neq 0 (
    echo Database setup had issues, but continuing...
)

echo.
echo [4/4] Starting Zenith...
echo   Web:  http://localhost:3000
echo   API:  http://localhost:4000
echo   Press Ctrl+C to stop.
echo.

call pnpm run dev
pause
