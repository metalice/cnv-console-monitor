import path from 'path';

import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@cnv-monitor/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        changeOrigin: true,
        target: 'http://localhost:8080',
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
