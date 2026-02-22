@echo off
title Zenith (Public via ngrok)
cd /d "%~dp0"

echo Starting Zenith public launcher...
echo This will print progress steps and public URLs when ready.
echo.

node scripts\launch-public.js
if %ERRORLEVEL% neq 0 (
  echo.
  echo Public launcher failed. Check output above.
  echo Ensure ngrok auth token is configured:
  echo   npx ngrok config add-authtoken YOUR_TOKEN
  pause
  exit /b 1
)
