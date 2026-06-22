// Runs once per test-run, before any service-test file is imported.
// Drops + re-applies db/schema.sql against brickvoyage_test. Tests themselves
// only need to TRUNCATE — they share the schema set up here.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  throw new Error('DATABASE_URL_TEST is required for service tests.');
}

export async function setup(): Promise<void> {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const rows = await sql<{ current_database: string }[]>`SELECT current_database()`;
    if (rows[0].current_database !== 'brickvoyage_test') {
      throw new Error(
        `Refusing to wipe "${rows[0].current_database}". DATABASE_URL_TEST must point at brickvoyage_test.`,
      );
    }

    await sql.unsafe(`
      SET client_min_messages = WARNING;
      DROP TABLE IF EXISTS race_scores CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS island_discoveries CASCADE;
      DROP TABLE IF EXISTS visitors CASCADE;
    `);

    const schemaPath = resolve(process.cwd(), 'db/schema.sql');
    await sql.unsafe(readFileSync(schemaPath, 'utf-8'));
  } finally {
    await sql.end({ timeout: 5 });
  }
}
