# Zenith One-Click Launcher (PowerShell)
# Downloads Node.js portable if needed, sets up SQLite, installs deps, and starts the app

$ErrorActionPreference = "Stop"
$script:RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $script:RootDir

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║         Zenith Launcher                ║" -ForegroundColor Magenta
Write-Host "  ║    One-click Discord clone             ║" -ForegroundColor Magenta
Write-Host "  ╚═══════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Check for Node.js
$nodeVersion = $null
try {
    $nodeVersion = node --version 2>$null
} catch {}

if (-not $nodeVersion) {
    Write-Host "[1/6] Node.js not found. Downloading portable Node.js..." -ForegroundColor Yellow
    
    $nodeDir = Join-Path $script:RootDir "node-portable"
    $nodeZip = Join-Path $script:RootDir "node.zip"
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip"
    
    if (-not (Test-Path $nodeDir)) {
        Write-Host "  Downloading from nodejs.org..." -ForegroundColor Gray
        try {
            Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
            Write-Host "  Extracting..." -ForegroundColor Gray
            Expand-Archive -Path $nodeZip -DestinationPath $script:RootDir -Force
            $extracted = Get-ChildItem -Path $script:RootDir -Filter "node-v*-win-x64" -Directory | Select-Object -First 1
            if ($extracted) {
                Move-Item -Path $extracted.FullName -Destination $nodeDir -Force
            }
            Remove-Item $nodeZip -ErrorAction SilentlyContinue
            Write-Host "  Node.js portable installed!" -ForegroundColor Green
        } catch {
            Write-Host "  ERROR: Could not download Node.js. Please install Node.js manually from https://nodejs.org/" -ForegroundColor Red
            Write-Host "  Or run this script as Administrator." -ForegroundColor Yellow
            pause
            exit 1
        }
    }
    
    $nodeExe = Join-Path $nodeDir "node.exe"
    if (Test-Path $nodeExe) {
        $env:PATH = $nodeDir + ';' + $env:PATH
        $nodeVersion = & $nodeExe --version
        Write-Host ('  Using Node.js {0}' -f $nodeVersion) -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Node.js portable not found at $nodeExe" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "[1/6] Node.js found: $nodeVersion" -ForegroundColor Green
}

# Check for pnpm
$pnpmVersion = $null
try {
    $pnpmVersion = pnpm --version 2>$null
} catch {}

if (-not $pnpmVersion) {
    Write-Host "[2/6] pnpm not found. Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    $pnpmVersion = pnpm --version
    Write-Host "  pnpm installed: $pnpmVersion" -ForegroundColor Green
} else {
    Write-Host "[2/6] pnpm found: $pnpmVersion" -ForegroundColor Green
}

# Create data directory for SQLite
$dataDir = Join-Path $script:RootDir "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
    Write-Host "[3/6] Created data directory for SQLite database" -ForegroundColor Green
} else {
    Write-Host "[3/6] Data directory exists" -ForegroundColor Green
}

# Create uploads directory
$uploadsDir = Join-Path $script:RootDir "uploads"
if (-not (Test-Path $uploadsDir)) {
    New-Item -ItemType Directory -Path $uploadsDir | Out-Null
    Write-Host "  Created uploads directory" -ForegroundColor Green
}

# Create .env if missing
$envFile = Join-Path $script:RootDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "[4/6] Creating .env file..." -ForegroundColor Yellow
    $envExample = Join-Path $script:RootDir ".env.example"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Host "  .env created from .env.example" -ForegroundColor Green
    } else {
        # Create minimal .env
        @"
DATABASE_URL=file:./data/zenith.db
JWT_SECRET=zenith-local-secret-change-in-production
JWT_EXPIRY=7d
WS_CORS_ORIGIN=http://localhost:3000
PORT=4000
UPLOAD_PATH=./uploads
UPLOAD_BASE_URL=http://localhost:4000/uploads
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
"@ | Out-File -FilePath $envFile -Encoding utf8
        Write-Host "  .env created with defaults" -ForegroundColor Green
    }
} else {
    Write-Host "[4/6] .env file exists" -ForegroundColor Green
}

# Install dependencies
Write-Host "[5/6] Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
try {
    pnpm install
    Write-Host "  Dependencies installed!" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Failed to install dependencies" -ForegroundColor Red
    pause
    exit 1
}

# Generate Prisma client and push schema
Write-Host "[6/6] Setting up database..." -ForegroundColor Yellow
try {
    pnpm run db:generate
    pnpm run db:push
    Write-Host "  Database ready!" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Database setup had issues, but continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║      Starting Zenith...                ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Web:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  API:  http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

# Start the app
pnpm run dev
