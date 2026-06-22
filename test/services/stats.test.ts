import { describe, it, expect } from 'vitest';
import { sql } from '@/lib/db/client';
import {
  TOTAL_ISLANDS,
  getStats,
  recordDiscovery,
  recordVisit,
} from '@/lib/services/stats.service';
import { useTestDb } from './_helpers';

useTestDb();

const ANON_A = '11111111-1111-1111-1111-111111111111';
const ANON_B = '22222222-2222-2222-2222-222222222222';

describe('stats.service', () => {
  describe('recordVisit', () => {
    it('inserts a visitor on first call', async () => {
      await recordVisit(ANON_A);
      const rows = await sql<{ anon_id: string }[]>`SELECT anon_id FROM visitors`;
      expect(rows).toHaveLength(1);
      expect(rows[0].anon_id).toBe(ANON_A);
    });

    it('is idempotent — dupes upsert last_seen instead of erroring', async () => {
      await recordVisit(ANON_A);
      const firstRows = await sql<{ last_seen: Date }[]>`
        SELECT last_seen FROM visitors WHERE anon_id = ${ANON_A}
      `;
      // Spin briefly so last_seen actually advances (now() is statement-level).
      await new Promise((r) => setTimeout(r, 10));
      await recordVisit(ANON_A);
      const secondRows = await sql<{ last_seen: Date }[]>`
        SELECT last_seen FROM visitors WHERE anon_id = ${ANON_A}
      `;

      const countRows = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM visitors
      `;
      expect(countRows[0].count).toBe(1);
      expect(secondRows[0].last_seen.getTime()).toBeGreaterThan(
        firstRows[0].last_seen.getTime(),
      );
    });
  });

  describe('recordDiscovery', () => {
    it('creates a discovery row and auto-creates the visitor', async () => {
      await recordDiscovery(ANON_A, 'home');

      const visitors = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM visitors WHERE anon_id = ${ANON_A}
      `;
      const discoveries = await sql<{ island_id: string }[]>`
        SELECT island_id FROM island_discoveries WHERE anon_id = ${ANON_A}
      `;
      expect(visitors[0].count).toBe(1);
      expect(discoveries.map((d) => d.island_id)).toEqual(['home']);
    });

    it('dedupes per (anon_id, island_id) — a repeat dock does not double-count', async () => {
      await recordDiscovery(ANON_A, 'house');
      await recordDiscovery(ANON_A, 'house');

      const rows = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM island_discoveries WHERE anon_id = ${ANON_A}
      `;
      expect(rows[0].count).toBe(1);
    });

    it('flips found_all once the visitor has discovered every island', async () => {
      const islands = Array.from({ length: TOTAL_ISLANDS }, (_, i) => `island_${i}`);

      // Discover everything except the last — found_all stays false.
      for (const id of islands.slice(0, -1)) {
        await recordDiscovery(ANON_A, id);
      }
      const partial = await sql<{ found_all: boolean }[]>`
        SELECT found_all FROM visitors WHERE anon_id = ${ANON_A}
      `;
      expect(partial[0].found_all).toBe(false);

      // Last one flips it.
      await recordDiscovery(ANON_A, islands.at(-1)!);
      const complete = await sql<{ found_all: boolean }[]>`
        SELECT found_all FROM visitors WHERE anon_id = ${ANON_A}
      `;
      expect(complete[0].found_all).toBe(true);
    });
  });

  describe('getStats', () => {
    it('returns zeros on an empty DB', async () => {
      const stats = await getStats();
      expect(stats).toEqual({ explorers: 0, foundAll: 0, perIsland: {} });
    });

    it('aggregates explorers, found-all, and per-island counts', async () => {
      // Two visitors: A finds 2 islands, B finds 1 (overlapping with A).
      await recordDiscovery(ANON_A, 'home');
      await recordDiscovery(ANON_A, 'house');
      await recordDiscovery(ANON_B, 'home');

      const stats = await getStats();
      expect(stats.explorers).toBe(2);
      expect(stats.foundAll).toBe(0);
      expect(stats.perIsland).toEqual({ home: 2, house: 1 });
    });

    it('counts found-all visitors after a full sweep', async () => {
      const islands = Array.from({ length: TOTAL_ISLANDS }, (_, i) => `i_${i}`);
      for (const id of islands) {
        await recordDiscovery(ANON_A, id);
      }
      await recordVisit(ANON_B); // visitor that has found nothing

      const stats = await getStats();
      expect(stats.explorers).toBe(2);
      expect(stats.foundAll).toBe(1);
    });
  });
});
