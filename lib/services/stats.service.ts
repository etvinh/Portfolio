import 'server-only';
import { sql } from '@/lib/db/client';

// Bumped each time a new island ships. The "explorer found all islands"
// flag flips when a visitor has discovered exactly this many distinct
// island IDs — keeps the leaderboard count honest as the world grows.
export const TOTAL_ISLANDS = 7;

export type Stats = {
  explorers: number;
  foundAll: number;
  perIsland: Record<string, number>;
};

export async function recordVisit(anonId: string): Promise<void> {
  await sql`
    INSERT INTO visitors (anon_id, first_seen, last_seen)
    VALUES (${anonId}, now(), now())
    ON CONFLICT (anon_id) DO UPDATE SET last_seen = now()
  `;
}

export async function recordDiscovery(anonId: string, islandId: string): Promise<void> {
  // Ensure the visitor row exists so the FK on island_discoveries doesn't trip
  // if the client skipped the initial /visits ping.
  await recordVisit(anonId);

  await sql`
    INSERT INTO island_discoveries (anon_id, island_id)
    VALUES (${anonId}, ${islandId})
    ON CONFLICT (anon_id, island_id) DO NOTHING
  `;

  // Server-derived completion flag — don't trust a client claim of "all_found".
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM island_discoveries
    WHERE anon_id = ${anonId}
  `;
  if (rows[0].count >= TOTAL_ISLANDS) {
    await sql`UPDATE visitors SET found_all = true WHERE anon_id = ${anonId}`;
  }
}

export async function getStats(): Promise<Stats> {
  const [explorersRows, foundAllRows, perIslandRows] = await Promise.all([
    sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM visitors`,
    sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM visitors WHERE found_all`,
    sql<{ island_id: string; count: number }[]>`
      SELECT island_id, COUNT(*)::int AS count
      FROM island_discoveries
      GROUP BY island_id
    `,
  ]);

  const perIsland: Record<string, number> = {};
  for (const row of perIslandRows) {
    perIsland[row.island_id] = row.count;
  }

  return {
    explorers: explorersRows[0].count,
    foundAll: foundAllRows[0].count,
    perIsland,
  };
}
