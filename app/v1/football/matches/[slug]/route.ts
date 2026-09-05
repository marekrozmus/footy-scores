import { NextResponse } from "next/server";

import { buildMatchSlug, stripMeta } from "@/lib/odf/record";
import { getRecord, getSummaries } from "@/lib/server/matchCache";

export const dynamic = "force-dynamic";

// The "expected API endpoint" the tool generates per match — the reference value QA compares a
// real FootyScores deployment's response against. Deliberately never calls Olympics: it only ever
// reads what's already been generated (via the UI or an export), so it can't silently mask a slow
// or failed upstream fetch as this endpoint's own behavior.
//
// The response body is exactly example.json's 8-key shape by default — no query param needed to
// get the spec-compliant form, since that's what an automated comparison will hit unmodified. The
// additive traceability fields (source event id, endpoint, attendance, referee, ...) are still
// available two ways: always, via the X-Match-Meta response header (JSON-encoded); or in the body
// too, for a human browsing this in a tab, via ?meta=true.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const includeMetaInBody = new URL(request.url).searchParams.get("meta") === "true";

  const summaries = getSummaries();
  if (!summaries) {
    return NextResponse.json(
      { error: "No data generated yet. Open the app and click 'Load & generate' first." },
      { status: 409 },
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

  return NextResponse.json(includeMetaInBody ? record : stripMeta(record), {
    headers: { "X-Match-Meta": JSON.stringify(record.meta) },
  });
}
