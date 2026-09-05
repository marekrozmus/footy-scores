import { NextResponse } from "next/server";

import { buildMatchSlug } from "@/lib/odf/record";
import { ensureSummaries, getRecord } from "@/lib/server/matchCache";

export const dynamic = "force-dynamic";

// The "expected API endpoint" the tool generates per match — the reference value QA compares a
// real FootyScores deployment's response against. Still deliberately never fetches per-match detail
// from Olympics: the record itself must already have been generated (via the UI or an export), so
// this endpoint can't silently mask a slow or failed per-match fetch as its own behavior. The
// schedule listing itself is the one exception (via ensureSummaries(), see matchCache.ts) — it's
// cheap, deterministic, historical data, and self-healing it here avoids a 409 that has nothing to
// do with this specific match, only with which serverless instance happened to handle the request.
//
// The response body is exactly example.json's 8-key shape, always — nothing added.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let summaries;
  try {
    summaries = await ensureSummaries();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load the Olympic schedule." },
      { status: 502 },
    );
  }
  const summary = summaries.find((candidate) => buildMatchSlug(candidate) === slug);
  if (!summary) {
    return NextResponse.json({ error: `No football match found for slug "${slug}"` }, { status: 404 });
  }

  const record = getRecord(summary.id);
  if (!record) {
    return NextResponse.json(
      { error: "This match hasn't been generated yet — open it in the app (or run Export) first." },
      { status: 409 },
    );
  }

  return NextResponse.json(record);
}
