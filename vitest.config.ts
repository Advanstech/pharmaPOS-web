import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Vitest v3: pool defaults to 'forks' — explicit for clarity
    pool: 'forks',
    coverage: {
      provider: 'v8',
      thresholds: {
        // React components: ≥70% per testing strategy
        lines: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
