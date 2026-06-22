import { NextResponse } from 'next/server';
import { getStats } from '@/lib/services/stats.service';

// postgres.js opens a TCP socket — needs the Node runtime, not edge.
export const runtime = 'nodejs';

// Cache the response at the route segment level for 30s so a viral hit doesn't
// hammer Postgres with COUNT(*)s. Hit /api/visits invalidates nothing — stats
// stay stale up to the TTL, which is fine for "1,240 explorers" copy.
export const revalidate = 30;

export async function GET(): Promise<NextResponse> {
  const stats = await getStats();
  return NextResponse.json(stats);
}
