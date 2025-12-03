import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Defensive approach: Only expose the API key if it exists and is not empty.
    const processEnv = {};
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
        processEnv['process.env.GEMINI_API_KEY'] = JSON.stringify(env.GEMINI_API_KEY);
        // Also map to API_KEY if needed for backward compatibility
        processEnv['process.env.API_KEY'] = JSON.stringify(env.GEMINI_API_KEY);
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:8080',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        ...processEnv
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
