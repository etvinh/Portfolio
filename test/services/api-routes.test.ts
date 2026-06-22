import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getStats } from '@/app/api/stats/route';
import { POST as postVisits } from '@/app/api/visits/route';
import { recordDiscovery, recordVisit } from '@/lib/services/stats.service';
import { useTestDb } from './_helpers';

useTestDb();

const ANON_A = '11111111-1111-1111-1111-111111111111';

function makeVisitReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/visits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/stats', () => {
  it('returns zeros on an empty DB', async () => {
    const res = await getStats();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ explorers: 0, foundAll: 0, perIsland: {} });
  });

  it('reflects recorded visits and discoveries', async () => {
    await recordVisit(ANON_A);
    await recordDiscovery(ANON_A, 'home');

    const res = await getStats();
    const body = await res.json();
    expect(body.explorers).toBe(1);
    expect(body.perIsland.home).toBe(1);
  });
});

describe('POST /api/visits', () => {
  it('records a visit on valid body', async () => {
    const res = await postVisits(makeVisitReq({ event: 'visit', anonId: ANON_A }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('records a discovery and creates the visitor', async () => {
    const res = await postVisits(
      makeVisitReq({ event: 'island_discovered', anonId: ANON_A, islandId: 'home' }),
    );
    expect(res.status).toBe(200);
    const stats = await (await getStats()).json();
    expect(stats.perIsland.home).toBe(1);
  });

  it('400s on invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/visits', {
      method: 'POST',
      body: '{not json',
    });
    const res = await postVisits(req);
    expect(res.status).toBe(400);
  });

  it('400s on missing anonId', async () => {
    const res = await postVisits(makeVisitReq({ event: 'visit' }));
    expect(res.status).toBe(400);
  });

  it('400s on malformed anonId (not a UUID)', async () => {
    const res = await postVisits(makeVisitReq({ event: 'visit', anonId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('400s on unknown event type', async () => {
    const res = await postVisits(makeVisitReq({ event: 'all_found', anonId: ANON_A }));
    expect(res.status).toBe(400);
  });

  it('400s on island_discovered without an islandId', async () => {
    const res = await postVisits(
      makeVisitReq({ event: 'island_discovered', anonId: ANON_A }),
    );
    expect(res.status).toBe(400);
  });

  it('400s on island_discovered with a malformed islandId', async () => {
    const res = await postVisits(
      makeVisitReq({ event: 'island_discovered', anonId: ANON_A, islandId: 'BAD ID!!!' }),
    );
    expect(res.status).toBe(400);
  });
});
