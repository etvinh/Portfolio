// In production/dev, Next.js's bundler aliases `server-only` to a no-op when
// it lands in a server bundle (and lets the throwing real module crash any
// client-side import). Vitest has no such bundler — so we point `server-only`
// at this empty module for tests. Without this, any service test that imports
// a `server-only` module crashes on import.
export {};
