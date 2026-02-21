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
echo NOTE: http://localhost:4000 is API only. Open http://localhost:3000 for the UI.

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

set "HAS_NODE_MODULES=0"
if exist "node_modules\.modules.yaml" set "HAS_NODE_MODULES=1"

if "%FORCE_SETUP%"=="1" goto RUN_SETUP
if "%HAS_NODE_MODULES%"=="1" if exist "apps\api\prisma\data\zenith.db" goto SKIP_SETUP

:RUN_SETUP
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
goto START_APP

:SKIP_SETUP
echo [fast] Existing dependencies and DB detected. Skipping install/database setup.
echo [fast] Use start.bat --fresh to force install and DB setup.

:START_APP
echo.
echo [4/4] Starting Zenith...
echo   Web:  http://localhost:3000
echo   API:  http://localhost:4000
echo   Press Ctrl+C to stop.
echo.

call pnpm run dev
pause
