@echo off
title Zenith (Public via ngrok)
cd /d "%~dp0"

node scripts\launch-public.js
if %ERRORLEVEL% neq 0 (
  echo.
  echo Public launcher failed. Ensure ngrok auth token is configured:
  echo   npx ngrok config add-authtoken YOUR_TOKEN
  pause
  exit /b 1
)
