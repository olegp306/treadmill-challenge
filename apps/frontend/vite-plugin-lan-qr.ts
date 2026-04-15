import type { Plugin } from 'vite';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const qrcode = require('qrcode-terminal') as {
  generate: (input: string, opts?: { small?: boolean }, cb?: (out: string) => void) => void;
};

function isLanIPv4(net: os.NetworkInterfaceInfo): boolean {
  if (net.internal) return false;
  const fam = net.family as string | number;
  return fam === 'IPv4' || fam === 4;
}

/** First non-internal IPv4 (typical Wi‑Fi / Ethernet on the LAN). */
export function getLanIPv4(): string | null {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (isLanIPv4(net)) return net.address;
    }
  }
  return null;
}

export function lanQrPlugin(): Plugin {
  return {
    name: 'lan-qr',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const addr = server.httpServer?.address();
        const port =
          typeof addr === 'object' && addr && 'port' in addr && addr.port != null ? addr.port : 5173;
        const ip = getLanIPv4();
        if (!ip) {
          console.log(
            `\n\x1b[33m[LAN]\x1b[0m No LAN IPv4 detected. On this machine use: http://localhost:${port}\n`
          );
          return;
        }
        const url = `http://${ip}:${port}`;
        console.log(`\n\x1b[32m[LAN]\x1b[0m Phone (same Wi‑Fi) — scan or open:\n  ${url}\n`);
        qrcode.generate(url, { small: true });
        console.log('');
      });
    },
  };
}
