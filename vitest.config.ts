import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// UI tests run in jsdom; service tests run in node (they touch Postgres).
// Vitest picks the environment per-folder via environmentMatchGlobs.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // `@/*` mirrors tsconfig's path alias so test files can `import '@/lib/...'`
      '@': path.resolve(__dirname, './'),
      // `server-only` throws on import in plain Node — Next aliases it to a
      // no-op in real bundles. Mirror that for vitest.
      'server-only': path.resolve(__dirname, './test/_mocks/server-only.ts'),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./test/setup.ts'],
    // Apply schema.sql to brickvoyage_test exactly once per test run, in a
    // separate process so it never collides with per-file module init.
    globalSetup: ['./test/services/_global-setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [
      ['test/ui/**', 'jsdom'],
      ['test/services/**', 'node'],
    ],
    // Service tests share a real (test) DB. We rely on `--no-file-parallelism`
    // in the npm scripts to run test files serially so they don't step on each
    // other's rows. Vitest's default pool (forks since v1) is fine.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Cover the money paths; skip Three.js / WebGL code that jsdom can't run.
      include: ['lib/services/**', 'app/api/**', 'lib/auth/**', 'lib/db/**'],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        'lib/three/**',
        'components/Game/**',
        // Pure wiring — the only branch is a defensive throw for a missing
        // DATABASE_URL, which would mean the dev forgot to copy .env.example.
        'lib/db/client.ts',
      ],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
});
