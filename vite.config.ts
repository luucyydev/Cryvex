import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'buffer',
      'events',
      'assert',
      'path-browserify',
      'stream-browserify',
      'util',
      'browserify-zlib'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      zlib: 'browserify-zlib',
      util: 'util',
      buffer: 'buffer',
      asset: resolve(__dirname, 'src/assets'),
      events: 'events',
      assert: 'assert',
      path: 'path-browserify'
    }
  },
  define: {
    'process.env': process.env,
    'global': 'globalThis'
  }
});