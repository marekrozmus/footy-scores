import { NextResponse } from "next/server";

import { getOrGenerateRecord, MatchNotFoundError } from "@/lib/server/records";

export const dynamic = "force-dynamic";

// Triggered when a match is selected/inspected in the UI (or by an export/compare that needs it).
// Serves the cached record if this match has already been generated once; otherwise fetches just
// this match's detail from Olympics, builds the full record, caches it, and returns it — so repeat
// requests for the same match (from here, the public reference endpoint, or a compare run) never
// re-fetch.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const record = await getOrGenerateRecord(id);
    return NextResponse.json(record);
  } catch (error) {
    if (error instanceof MatchNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load match detail." },
      { status: 502 },
    );
  }
}
