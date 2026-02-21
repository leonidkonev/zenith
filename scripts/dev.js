#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const runner = isWindows ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

function start(cwd, args) {
  const child = spawn(runner, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  child.on('exit', (code) => {
    if (shuttingDown) return;
    const label = cwd.includes(path.sep + 'api') ? 'api' : 'web';
    console.error(`[dev] ${label} exited with code ${code ?? 0}. Other process kept running.`);
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
