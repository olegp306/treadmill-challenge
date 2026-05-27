import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version?: string };
const remoteAdminVersion = pkg.version ?? 'unknown';

export default defineConfig({
  plugins: [react()],
  define: {
    __REMOTE_ADMIN_VERSION__: JSON.stringify(remoteAdminVersion),
  },
  /** Reuse kiosk fonts/assets from local frontend (Druk woff2, etc.). */
  publicDir: path.resolve(__dirname, '../frontend/public'),
  resolve: {
    alias: {
      '@local-fe': path.resolve(__dirname, '../frontend/src'),
      '@treadmill-challenge/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    host: true,
    port: Number(process.env.REMOTE_FRONTEND_PORT) || 5174,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, '..'), path.resolve(__dirname, '../frontend')],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_REMOTE_API_BASE_URL || 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});
