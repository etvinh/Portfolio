import 'server-only';
import postgres from 'postgres';

// IMPORTANT: don't throw at module load.
//
// `next build` runs a "collecting page data" pass that imports every route's
// compiled module to extract its config (dynamic vs static, runtime, etc.).
// If this file throws at import time, the build fails on a machine that
// hasn't set DATABASE_URL — e.g. inside a Docker build stage.
//
// Instead, we accept a placeholder URL when the real one isn't set. The
// postgres.js pool object constructs lazily (no socket is opened until the
// first query), so this is cheap and doesn't accidentally connect anywhere.
// If a route is actually hit at runtime without DATABASE_URL, postgres.js
// throws its own connect error — clearer than a module-load crash.
const url = process.env.DATABASE_URL;

if (!url && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[lib/db/client] DATABASE_URL is not set. Copy .env.example to .env and run `npm run db:up` for local dev; queries will fail until then.',
  );
}

export const sql = postgres(url || 'postgres://placeholder:placeholder@127.0.0.1:5432/placeholder', {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});
