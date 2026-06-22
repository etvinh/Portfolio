import { NextResponse } from 'next/server';
import { getStats } from '@/lib/services/stats.service';

// postgres.js opens a TCP socket — needs the Node runtime, not edge.
export const runtime = 'nodejs';

// Always render at request time. Without this, Next.js tries to pre-render
// the route during `next build` (because the previous `revalidate = 30`
// flagged it as a static candidate), which calls getStats() and crashes
// when Postgres isn't reachable from the build container.
//
// TODO: add Cache-Control headers on the NextResponse to recover the
// "cache for 30s" behavior we lost from revalidate.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const stats = await getStats();
  return NextResponse.json(stats);
}
