import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const { VITE_BASE_PATH } = loadEnv(mode, process.cwd(), 'VITE_');
  return { base: VITE_BASE_PATH || '/' };
});
