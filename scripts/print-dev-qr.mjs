#!/usr/bin/env node
/**
 * Optional: print LAN URL + QR without starting Vite (same URL logic as the dev server).
 * Default port 5173; override with: PORT=5174 node scripts/print-dev-qr.mjs
 */
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(fileURLToPath(import.meta.url));
const qrcode = require('qrcode-terminal');

function getLanIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.internal) continue;
      if (net.family === 'IPv4' || net.family === 4) return net.address;
    }
  }
  return null;
}

const port = Number(process.env.PORT) || 5173;
const ip = getLanIPv4();
if (!ip) {
  console.log(`No LAN IPv4 found. On this machine: http://localhost:${port}`);
  process.exit(0);
}
const url = `http://${ip}:${port}`;
console.log(`\nPhone (same Wi‑Fi):\n  ${url}\n`);
qrcode.generate(url, { small: true });
console.log('');
