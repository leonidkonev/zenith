#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const npmRunner = isWindows ? 'npm.cmd' : 'npm';
const npxRunner = isWindows ? 'npx.cmd' : 'npx';

const children = [];
let shuttingDown = false;

const baseEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || 'file:./prisma/data/zenith.db',
  HOST: '127.0.0.1',
};

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: isWindows,
      env: baseEnv,
      ...opts,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
    child.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readNgrokTunnels() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`ngrok API returned status ${res.statusCode}`));
        res.resume();
        return;
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Failed to parse ngrok API response'));
        }
      });
    });
    req.on('error', reject);
  });
}

async function waitForTunnel(port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const data = await readNgrokTunnels();
      const tunnels = Array.isArray(data?.tunnels) ? data.tunnels : [];
      const tunnel = tunnels.find((t) => String(t?.config?.addr || '').endsWith(`:${port}`) && String(t?.public_url || '').startsWith('https://'));
      if (tunnel?.public_url) return tunnel.public_url;
    } catch {}
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ngrok tunnel on port ${port}`);
}

async function startNgrokTunnel(port, label) {
  console.log(`[ngrok:${label}] Starting tunnel for localhost:${port} ...`);
  const child = spawn(npxRunner, ['ngrok', 'http', String(port), '--log', 'stdout'], {
    cwd: rootDir,
    shell: isWindows,
  });

  child.stdout.on('data', (buf) => process.stdout.write(`[ngrok:${label}] ${buf.toString()}`));
  child.stderr.on('data', (buf) => process.stderr.write(`[ngrok:${label}] ${buf.toString()}`));

  const url = await waitForTunnel(port, 30000);
  console.log(`[ngrok:${label}] Ready: ${url}`);
  return { child, url };
}

async function main() {
  console.log('\nZenith public launcher (ngrok)\n');
  console.log('Requires ngrok auth token once: npx ngrok config add-authtoken <token>\n');

  console.log('Step 1/4: Installing dependencies...');
  await run(npmRunner, ['install']);

  console.log('Step 2/4: Generating Prisma client...');
  await run(npmRunner, ['run', 'db:generate']);

  console.log('Step 3/4: Ensuring DB schema...');
  await run(npmRunner, ['run', 'db:push']);

  console.log('Step 4/4: Creating public tunnel (web only)...');
  const webTunnel = await startNgrokTunnel(3000, 'web');
  children.push(webTunnel.child);

  const env = {
    ...baseEnv,
    NEXT_PUBLIC_API_URL: `${webTunnel.url}/__api`,
    NEXT_PUBLIC_WS_URL: `${webTunnel.url}`,
    WS_CORS_ORIGIN: webTunnel.url,
    UPLOAD_BASE_URL: `${webTunnel.url}/__api/uploads`,
  };

  console.log('\nPublic URL:');
  console.log(`  Web: ${webTunnel.url}`);
  console.log('\nSecurity mode: API remains localhost-only; only the web tunnel is public.');
  console.log('REST API is proxied via /__api through the web server.\n');

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
  console.error('\n[launch:public] Failed:', err.message);
  console.error('Tips:');
  console.error('  1) Ensure ngrok token is set: npx ngrok config add-authtoken <token>');
  console.error('  2) Ensure ports 3000/4000 are free');
  console.error('  3) Ensure DATABASE_URL is set or let launcher default it');
  process.exit(1);
});
