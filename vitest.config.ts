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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Cover the money paths; skip Three.js / WebGL code that jsdom can't run.
      include: ['lib/services/**', 'app/api/**', 'lib/auth/**', 'lib/db/**'],
      exclude: ['**/*.test.ts', '**/*.d.ts', 'lib/three/**', 'components/Game/**'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
});
