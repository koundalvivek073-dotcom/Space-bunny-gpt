import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.VITE_OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(apiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/openrouter': {
          target: 'https://openrouter.ai',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/openrouter/, ''),
        },
      },
    },
  };
});
