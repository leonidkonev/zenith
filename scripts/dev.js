#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const runner = isWindows ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;
const requiredEnv = {
  DATABASE_URL: process.env.DATABASE_URL || 'file:./prisma/data/zenith.db',
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000',
};

console.log('[dev] API URL:', requiredEnv.NEXT_PUBLIC_API_URL);
console.log('[dev] WS URL:', requiredEnv.NEXT_PUBLIC_WS_URL);
console.log('[dev] DATABASE_URL:', requiredEnv.DATABASE_URL);

function start(cwd, args) {
  const child = spawn(runner, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...requiredEnv },
  });

  child.on('exit', (code) => {
    if (shuttingDown) return;
    const label = cwd.includes(path.sep + 'api') ? 'api' : 'web';
    const exitCode = code ?? 0;
    console.error(`[dev] ${label} exited with code ${exitCode}. Stopping all services.`);
    shuttingDown = true;
    for (const c of children) {
      if (c !== child && !c.killed) c.kill('SIGTERM');
    }
    process.exit(exitCode);
  });

  children.push(child);
}

process.on('SIGINT', () => {
  shuttingDown = true;
  for (const c of children) {
    if (!c.killed) c.kill('SIGINT');
  }
  process.exit(0);
});

start(path.join(rootDir, 'apps', 'api'), ['run', 'dev']);
start(path.join(rootDir, 'apps', 'web'), ['run', 'dev']);
