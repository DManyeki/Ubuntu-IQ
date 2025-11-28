import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This ensures your code using `process.env.API_KEY` works in the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});