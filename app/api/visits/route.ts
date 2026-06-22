import { NextRequest, NextResponse } from 'next/server';
import { recordDiscovery, recordVisit } from '@/lib/services/stats.service';

export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISLAND_ID_RE = /^[a-z0-9_-]{1,32}$/;

type VisitBody =
  | { event: 'visit'; anonId: string }
  | { event: 'island_discovered'; anonId: string; islandId: string };

function parseBody(body: unknown): VisitBody | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  if (typeof b.anonId !== 'string' || !UUID_RE.test(b.anonId)) return null;

  if (b.event === 'visit') {
    return { event: 'visit', anonId: b.anonId };
  }
  if (b.event === 'island_discovered') {
    if (typeof b.islandId !== 'string' || !ISLAND_ID_RE.test(b.islandId)) return null;
    return { event: 'island_discovered', anonId: b.anonId, islandId: b.islandId };
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  if (body.event === 'visit') {
    await recordVisit(body.anonId);
  } else {
    await recordDiscovery(body.anonId, body.islandId);
  }

  return NextResponse.json({ ok: true });
}
