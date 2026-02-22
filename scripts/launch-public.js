#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const npmRunner = isWindows ? 'npm.cmd' : 'npm';
const npxRunner = isWindows ? 'npx.cmd' : 'npx';

const children = [];
let shuttingDown = false;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: isWindows,
      ...opts,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
    child.on('error', reject);
  });
}

function startNgrokTunnel(port, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(npxRunner, ['ngrok', 'http', String(port), '--log', 'stdout'], {
      cwd: rootDir,
      shell: isWindows,
    });

    let resolved = false;
    child.stdout.on('data', (buf) => {
      const text = buf.toString();
      process.stdout.write(`[ngrok:${label}] ${text}`);
      const match = text.match(/url=(https:\/\/[^\s]+)/);
      if (!resolved && match?.[1]) {
        resolved = true;
        resolve({ child, url: match[1] });
      }
    });
    child.stderr.on('data', (buf) => process.stderr.write(`[ngrok:${label}] ${buf.toString()}`));

    child.on('close', (code) => {
      if (!resolved) reject(new Error(`ngrok ${label} exited early with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  console.log('\nZenith public launcher (ngrok)\n');
  console.log('This requires ngrok auth on your machine (run once: npx ngrok config add-authtoken <token>).\n');

  await run(npmRunner, ['install']);
  await run(npmRunner, ['run', 'db:generate']);
  await run(npmRunner, ['run', 'db:push']).catch(() => {
    console.warn('[warn] db:push failed; continuing.');
  });

  const apiTunnel = await startNgrokTunnel(4000, 'api');
  children.push(apiTunnel.child);
  const webTunnel = await startNgrokTunnel(3000, 'web');
  children.push(webTunnel.child);

  const env = {
    ...process.env,
    NEXT_PUBLIC_API_URL: apiTunnel.url,
    NEXT_PUBLIC_WS_URL: apiTunnel.url,
    WS_CORS_ORIGIN: webTunnel.url,
    UPLOAD_BASE_URL: `${apiTunnel.url}/uploads`,
  };

  console.log('\nPublic URLs:');
  console.log(`  Web: ${webTunnel.url}`);
  console.log(`  API: ${apiTunnel.url}`);
  console.log('\nShare the Web URL above. Press Ctrl+C to stop everything.\n');

  const dev = spawn(npmRunner, ['run', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: isWindows,
    env,
  });
  children.push(dev);

  dev.on('close', (code) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const c of children) if (!c.killed) c.kill('SIGTERM');
    process.exit(code ?? 0);
  });
}

process.on('SIGINT', () => {
  shuttingDown = true;
  for (const c of children) if (!c.killed) c.kill('SIGINT');
  process.exit(0);
});

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
