import { NextResponse } from "next/server";

import { loadMatchSummaries } from "@/lib/odf/schedule";
import { clearCache, setSummaries } from "@/lib/server/matchCache";

export const dynamic = "force-dynamic";

// Fetches the Paris 2024 football schedule from the official Olympic feed and caches it in memory
// server-side. This is the only route that talks to Olympics for the match list; per-match detail
// is fetched lazily, one match at a time, by GET /api/matches/[id] when it's actually needed.
export async function POST() {
  try {
    const matches = await loadMatchSummaries();
    setSummaries(matches);
    return NextResponse.json({ matches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load the Olympic schedule." },
      { status: 502 },
    );
  }
}

// Invalidates the server-side cache (summaries + every generated record) without restarting the
// process. The next POST /api/generate, or GET /api/matches/[id] for any match, re-fetches from
// Olympics from scratch.
export async function DELETE() {
  clearCache();
  return NextResponse.json({ cleared: true });
}
