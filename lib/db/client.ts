import 'server-only';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and run `npm run db:up`.',
  );
}

// One pool, sized for a long-lived Node server (not serverless — see CLAUDE.md §9).
// Service modules import `sql` from here and run tagged-template queries.
export const sql = postgres(process.env.DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});
