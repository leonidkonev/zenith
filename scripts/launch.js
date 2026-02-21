#!/usr/bin/env node
/**
 * Zenith one-click launcher: installs dependencies, runs DB setup, then starts API + Web.
 * Run: node scripts/launch.js
 * Or build to .exe: npx pkg scripts/launch.js --targets node18-win-x64 --output zenith.exe
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const cwd = opts.cwd || root;
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: isWindows,
      cwd,
      ...opts,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    child.on('error', reject);
  });
}

function hasPnpm() {
  try {
    require('child_process').execSync('pnpm --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║         Zenith Launcher                ║');
  console.log('║    One-click Discord clone             ║');
  console.log('╚═══════════════════════════════════════╝\n');
  
  process.chdir(root);

  if (!fs.existsSync(path.join(root, 'package.json'))) {
    console.error('package.json not found. Run this script from the ZenithApp root.');
    process.exit(1);
  }

  // Create data directory for SQLite
  const dataDir = path.join(root, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[1/6] Created data directory for SQLite database');
  } else {
    console.log('[1/6] Data directory exists');
  }

  // Create uploads directory
  const uploadsDir = path.join(root, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('  Created uploads directory');
  }

  // Create .env if missing
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) {
    console.log('[2/6] Creating .env file...');
    const envExample = path.join(root, '.env.example');
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envFile);
      console.log('  .env created from .env.example');
    } else {
      // Create minimal .env
      const defaultEnv = `DATABASE_URL=file:./data/zenith.db
JWT_SECRET=zenith-local-secret-change-in-production
JWT_EXPIRY=7d
WS_CORS_ORIGIN=http://localhost:3000
PORT=4000
UPLOAD_PATH=./uploads
UPLOAD_BASE_URL=http://localhost:4000/uploads
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
`;
      fs.writeFileSync(envFile, defaultEnv, 'utf8');
      console.log('  .env created with defaults');
    }
  } else {
    console.log('[2/6] .env file exists');
  }

  const usePnpm = hasPnpm();
  const pm = usePnpm ? 'pnpm' : 'npm';
  console.log(`[3/6] Using package manager: ${pm}`);

  console.log('\n[4/6] Installing dependencies (this may take a few minutes)...');
  try {
    if (usePnpm) await run('pnpm', ['install'], { cwd: root });
    else await run('npm', ['install'], { cwd: root });
    console.log('  Dependencies installed!');
  } catch (e) {
    console.error('Install failed:', e.message);
    process.exit(1);
  }

  console.log('\n[5/6] Setting up database...');
  try {
    if (usePnpm) await run('pnpm', ['run', 'db:generate'], { cwd: root });
    else await run('npm', ['run', 'db:generate'], { cwd: root });
    
    if (usePnpm) await run('pnpm', ['run', 'db:push'], { cwd: root });
    else await run('npm', ['run', 'db:push'], { cwd: root });
    console.log('  Database ready!');
  } catch (e) {
    console.warn('  WARNING: Database setup had issues, but continuing...');
  }

  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║      Starting Zenith...                ║');
  console.log('╚═══════════════════════════════════════╝\n');
  console.log('  Web:  http://localhost:3000');
  console.log('  API:  http://localhost:4000');
  console.log('\n  Press Ctrl+C to stop.\n');

  const devArgs = usePnpm ? ['run', 'dev'] : ['run', 'dev'];
  const child = spawn(pm, devArgs, {
    stdio: 'inherit',
    shell: isWindows,
    cwd: root,
  });
  child.on('close', (code) => process.exit(code ?? 0));
  child.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
