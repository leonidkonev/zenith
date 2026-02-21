@echo off
title Zenith - One-Click Start
color 0A
cd /d "%~dp0"

echo.
echo   ╔═══════════════════════════════════════╗
echo   ║         Zenith Launcher                ║
echo   ║    One-click Discord clone             ║
echo   ╚═══════════════════════════════════════╝
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: PowerShell is required but not found.
    echo Please install PowerShell or use Windows 10/11.
    pause
    exit /b 1
)

REM Run PowerShell launcher
powershell.exe -ExecutionPolicy Bypass -File "%~dp0scripts\zenith-launcher.ps1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Launcher failed. Check the messages above.
    pause
)
