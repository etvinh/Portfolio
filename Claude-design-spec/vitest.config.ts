import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// UI tests run in jsdom; service tests run in node (they touch Postgres).
// Vitest picks the environment per-folder via environmentMatchGlobs.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [
      ['test/ui/**', 'jsdom'],
      ['test/services/**', 'node'],
    ],
    // service tests hit a real (test) DB — keep them serial to avoid cross-talk
    poolOptions: { threads: { singleThread: true } },
  },
});
