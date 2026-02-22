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

async function waitForTunnel(publicPort, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const data = await readNgrokTunnels();
      const tunnels = Array.isArray(data?.tunnels) ? data.tunnels : [];
      const tunnel = tunnels.find((t) => String(t?.config?.addr || '').endsWith(`:${publicPort}`) && String(t?.public_url || '').startsWith('https://'));
      if (tunnel?.public_url) return tunnel.public_url;
    } catch {
      // ngrok API not ready yet
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ngrok tunnel on port ${publicPort}`);
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
  await run(npmRunner, ['run', 'db:push']).catch(() => {
    console.warn('[warn] db:push failed; continuing.');
  });

  console.log('Step 4/4: Creating ngrok tunnels...');
  const apiTunnel = await startNgrokTunnel(4000, 'api');
  children.push(apiTunnel.child);
  const webTunnel = await startNgrokTunnel(3000, 'web');
  children.push(webTunnel.child);

  const env = {
    ...process.env,
    HOST: '127.0.0.1',
    NEXT_PUBLIC_API_URL: apiTunnel.url,
    NEXT_PUBLIC_WS_URL: apiTunnel.url,
    WS_CORS_ORIGIN: webTunnel.url,
    UPLOAD_BASE_URL: `${apiTunnel.url}/uploads`,
  };

  console.log('\nPublic URLs:');
  console.log(`  Web: ${webTunnel.url}`);
  console.log(`  API: ${apiTunnel.url}`);
  console.log('\nSecurity mode: API binds to 127.0.0.1 and only ngrok tunnels are exposed.\n');
  console.log('Zenith is now starting. Share the Web URL above. Press Ctrl+C to stop everything.\n');

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
  process.exit(1);
});
