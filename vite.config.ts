import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/admin/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              charts: ['recharts'],
              terminal: ['xterm', 'xterm-addon-fit'],
              icons: ['lucide-react']
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
