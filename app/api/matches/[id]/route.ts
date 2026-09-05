import { NextResponse } from "next/server";

import { loadMatchDetail } from "@/lib/odf/matchDetail";
import { buildRecord } from "@/lib/odf/record";
import { getRecord, getSummaries, setRecord } from "@/lib/server/matchCache";

export const dynamic = "force-dynamic";

// Triggered when a match is selected/inspected in the UI (or by an export that needs it). Serves
// the cached record if this match has already been generated once; otherwise fetches just this
// match's detail from Olympics, builds the full record, caches it, and returns it — so repeat
// requests for the same match (from here or from the public reference endpoint) never re-fetch.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cached = getRecord(id);
  if (cached) return NextResponse.json(cached);

  const summaries = getSummaries();
  if (!summaries) {
    return NextResponse.json({ error: "No schedule loaded yet — run Load & generate first." }, { status: 409 });
  }

  const summary = summaries.find((candidate) => candidate.id === id);
  if (!summary) {
    return NextResponse.json({ error: `No football match found for id "${id}"` }, { status: 404 });
  }

  try {
    const detail = await loadMatchDetail(summary.id, summary.home, summary.away);
    const record = buildRecord(summary, detail);
    setRecord(summary.id, record);
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load match detail." },
      { status: 502 },
    );
  }
}
