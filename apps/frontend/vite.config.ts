import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lanQrPlugin } from './vite-plugin-lan-qr';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readRootVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const rootVersion = readRootVersion();

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(rootVersion),
  },
  plugins: [react(), lanQrPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      /** Bundle shared from TS source so Vite gets proper ESM named exports (dist is CJS). */
      '@treadmill-challenge/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    /** Listen on all interfaces so the app is reachable at http://<local-ip>:5173 on the LAN. */
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
