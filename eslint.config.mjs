// Flat ESLint config. Wired into predev/prebuild/pretest hooks in package.json,
// so a dirty tree blocks dev/build/test. `npm run lint` runs with
// --max-warnings 0; warnings rot into noise otherwise.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// `eslint-config-next` patches ESLint via @rushstack/eslint-patch in a way
// that breaks on ESLint 9 + flat config. typescript-eslint already catches
// the meaningful bugs; Next's rules are mostly stylistic warnings. Add them
// back via the flat-config-compatible package if/when one ships cleanly.
export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'coverage/**',
      'lib/three/**',         // Three.js scene code — many `any`s, low signal
      'components/Game/**',   // ditto: WebGL plumbing
      'HelloWorld/**',        // separate app, deployed independently
      'reference/**',         // prototype + dc-runtime, read-only reference
      'next-env.d.ts',        // generated
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Add project-specific overrides here.
    },
  },
];
