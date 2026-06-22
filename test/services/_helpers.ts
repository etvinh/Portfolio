import { beforeAll, beforeEach } from 'vitest';
import { sql } from '@/lib/db/client';

/**
 * Call at the top of every service test file. Schema apply happens once in
 * `_global-setup.ts`; this just:
 *
 * - `beforeAll`: assert we're on `brickvoyage_test`, never the dev DB.
 *   Defence-in-depth against a misconfigured DATABASE_URL_TEST.
 * - `beforeEach`: truncate every table so tests don't see each other's data.
 */
export function useTestDb(): void {
  beforeAll(async () => {
    const rows = await sql<{ current_database: string }[]>`SELECT current_database()`;
    if (rows[0].current_database !== 'brickvoyage_test') {
      throw new Error(
        `Refusing to truncate "${rows[0].current_database}". ` +
          `Service tests must connect to brickvoyage_test (check DATABASE_URL_TEST).`,
      );
    }
  });

  beforeEach(async () => {
    await sql`TRUNCATE race_scores, island_discoveries, users, visitors CASCADE`;
  });
}
