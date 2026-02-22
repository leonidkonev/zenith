# Zenith One-Click Launcher (PowerShell)
# Downloads Node.js portable if needed, sets up SQLite, installs deps, and starts the app

$ErrorActionPreference = 'Stop'
$script:RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $script:RootDir

function Step([string]$n, [string]$text) {
    Write-Host ("[{0}/6] {1}" -f $n, $text) -ForegroundColor Yellow
}

function Ensure-Node {
    $nodeVersion = $null
    try { $nodeVersion = node --version 2>$null } catch {}

    if ($nodeVersion) {
        Write-Host ("[1/6] Node.js found: {0}" -f $nodeVersion) -ForegroundColor Green
        return
    }

    Step '1' 'Node.js not found. Downloading portable Node.js...'

    $nodeDir = Join-Path $script:RootDir 'node-portable'
    $nodeZip = Join-Path $script:RootDir 'node.zip'
    $nodeUrl = 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip'

    if (-not (Test-Path $nodeDir)) {
        Write-Host '  Downloading from nodejs.org...' -ForegroundColor Gray
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing

        Write-Host '  Extracting...' -ForegroundColor Gray
        Expand-Archive -Path $nodeZip -DestinationPath $script:RootDir -Force

        $extracted = Get-ChildItem -Path $script:RootDir -Filter 'node-v*-win-x64' -Directory | Select-Object -First 1
        if (-not $extracted) {
            throw 'Portable Node.js extraction failed.'
        }

        if (Test-Path $nodeDir) {
            Remove-Item -Path $nodeDir -Recurse -Force
        }
        Move-Item -Path $extracted.FullName -Destination $nodeDir -Force
        Remove-Item -Path $nodeZip -Force -ErrorAction SilentlyContinue
    }

    $nodeExe = Join-Path $nodeDir 'node.exe'
    if (-not (Test-Path $nodeExe)) {
        throw ("Node.js portable not found at {0}" -f $nodeExe)
    }

    $env:PATH = $nodeDir + ';' + $env:PATH
    $nodeVersion = & $nodeExe --version
    Write-Host ("  Using Node.js {0}" -f $nodeVersion) -ForegroundColor Green
}

function Ensure-Pnpm {
    $pnpmVersion = $null
    try { $pnpmVersion = pnpm --version 2>$null } catch {}

    if ($pnpmVersion) {
        Write-Host ("[2/6] pnpm found: {0}" -f $pnpmVersion) -ForegroundColor Green
        return
    }

    Step '2' 'pnpm not found. Installing pnpm...'
    npm install -g pnpm
    $pnpmVersion = pnpm --version
    Write-Host ("  pnpm installed: {0}" -f $pnpmVersion) -ForegroundColor Green
}

function Ensure-Directories {
    $dataDir = Join-Path $script:RootDir 'data'
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir | Out-Null
        Write-Host '[3/6] Created data directory for SQLite database' -ForegroundColor Green
    } else {
        Write-Host '[3/6] Data directory exists' -ForegroundColor Green
    }

    $uploadsDir = Join-Path $script:RootDir 'uploads'
    if (-not (Test-Path $uploadsDir)) {
        New-Item -ItemType Directory -Path $uploadsDir | Out-Null
        Write-Host '  Created uploads directory' -ForegroundColor Green
    }
}

function Ensure-EnvFile {
    $envFile = Join-Path $script:RootDir '.env'
    if (Test-Path $envFile) {
        Write-Host '[4/6] .env file exists' -ForegroundColor Green
        return
    }

    Step '4' 'Creating .env file...'
    $envExample = Join-Path $script:RootDir '.env.example'
    if (Test-Path $envExample) {
        Copy-Item -Path $envExample -Destination $envFile
        Write-Host '  .env created from .env.example' -ForegroundColor Green
        return
    }

    $defaultEnvLines = @(
        'DATABASE_URL=file:./data/zenith.db'
        'JWT_SECRET=zenith-local-secret-change-in-production'
        'JWT_EXPIRY=7d'
        'WS_CORS_ORIGIN=http://localhost:3000'
        'PORT=4000'
        'UPLOAD_PATH=./uploads'
        'UPLOAD_BASE_URL=http://localhost:4000/uploads'
        'NEXT_PUBLIC_API_URL=http://localhost:4000'
        'NEXT_PUBLIC_WS_URL=http://localhost:4000'
        ''
    )

    [System.IO.File]::WriteAllLines($envFile, $defaultEnvLines, [System.Text.Encoding]::UTF8)
    Write-Host '  .env created with defaults' -ForegroundColor Green
}

try {
    Write-Host ''
    Write-Host '  Zenith Launcher' -ForegroundColor Magenta
    Write-Host ''

    Ensure-Node
    Ensure-Pnpm
    Ensure-Directories
    Ensure-EnvFile

    Step '5' 'Installing dependencies (this may take a few minutes)...'
    pnpm install
    Write-Host '  Dependencies installed!' -ForegroundColor Green

    Step '6' 'Setting up database...'
    try {
        pnpm run db:generate
        pnpm run db:push
        Write-Host '  Database ready!' -ForegroundColor Green
    } catch {
        Write-Host '  WARNING: Database setup had issues, but continuing...' -ForegroundColor Yellow
    }

    Write-Host ''
    Write-Host '  Starting Zenith...' -ForegroundColor Green
    Write-Host '  Web:  http://localhost:3000' -ForegroundColor Cyan
    Write-Host '  API:  http://localhost:4000' -ForegroundColor Cyan
    Write-Host '  Press Ctrl+C to stop.' -ForegroundColor Gray
    Write-Host ''

    pnpm run dev
} catch {
    Write-Host ("ERROR: {0}" -f $_.Exception.Message) -ForegroundColor Red
    pause
    exit 1
}
