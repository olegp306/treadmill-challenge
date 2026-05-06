import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: Number(process.env.REMOTE_FRONTEND_PORT) || 5174,
        strictPort: true,
        proxy: {
            '/api': {
                target: process.env.VITE_REMOTE_API_BASE_URL || 'http://localhost:3002',
                changeOrigin: true,
            },
        },
    },
});
