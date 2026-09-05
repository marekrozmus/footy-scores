import { NextResponse } from "next/server";

import { diffJson, type DiffEntry } from "@/lib/odf/diff";
import { buildEndpoint } from "@/lib/odf/record";
import { mapWithConcurrency } from "@/lib/server/concurrency";
import { getSummaries } from "@/lib/server/matchCache";
import { getOrGenerateRecord, MatchNotFoundError } from "@/lib/server/records";

export const dynamic = "force-dynamic";

const CONCURRENCY = 6;
const TIMEOUT_MS = 8000;

type CompareRequestBody = { baseUrl?: string; matchIds?: string[] };

export type CompareResult =
  | { matchId: string; status: "pass" }
  | { matchId: string; status: "fail"; diffs: DiffEntry[] }
  | { matchId: string; status: "error"; message: string };

// Bulk (or single, when matchIds has one entry) comparison against a real FootyScores deployment.
// Runs server-side deliberately — the tested API being reachable from *this server* (not from the
// QA engineer's browser) is what makes this work regardless of whether that API has CORS enabled
// for wherever this tool happens to be hosted, same reasoning as fetching Olympics server-side.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CompareRequestBody;
  const baseUrl = body.baseUrl?.trim();
  const matchIds = body.matchIds;

  if (!baseUrl) {
    return NextResponse.json({ error: "baseUrl is required." }, { status: 400 });
  }
  if (!Array.isArray(matchIds) || matchIds.length === 0) {
    return NextResponse.json({ error: "matchIds must be a non-empty array." }, { status: 400 });
  }

  const trimmedBaseUrl = baseUrl.replace(/\/$/, "");

  const results = await mapWithConcurrency(matchIds, CONCURRENCY, async (matchId): Promise<CompareResult> => {
    try {
      const record = await getOrGenerateRecord(matchId);
      const summary = getSummaries()?.find((candidate) => candidate.id === matchId);
      if (!summary) return { matchId, status: "error", message: `No football match found for id "${matchId}"` };

      // Round-tripped through JSON: optional fields like scorer.stoppage/assist are set to the
      // literal value `undefined` in the in-memory object (present-but-undefined) when absent,
      // whereas `actual` below always comes from a real JSON response (`fetch().json()`), which can
      // never have an undefined-valued key — only present-with-a-value or absent. Diffing the raw
      // in-memory object against that would flag every omitted optional field as "missing" even
      // when the tested API is behaving correctly. This puts `expected` through the same lossy
      // JSON round-trip so both sides are judged purely as JSON values.
      const expected = JSON.parse(JSON.stringify(record)) as unknown;
      const url = `${trimmedBaseUrl}${buildEndpoint(summary)}`;

      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Request to tested API failed.";
        return { matchId, status: "error", message: `${message} (${url})` };
      }
      if (!response.ok) {
        return { matchId, status: "error", message: `Tested API returned ${response.status} for ${url}` };
      }

      let actual: unknown;
      try {
        actual = await response.json();
      } catch {
        return { matchId, status: "error", message: `Tested API response for ${url} was not valid JSON.` };
      }

      const diffs = diffJson(expected, actual);
      return diffs.length === 0 ? { matchId, status: "pass" } : { matchId, status: "fail", diffs };
    } catch (error) {
      if (error instanceof MatchNotFoundError) {
        return { matchId, status: "error", message: error.message };
      }
      return { matchId, status: "error", message: error instanceof Error ? error.message : "Comparison failed." };
    }
  });

  return NextResponse.json({ results });
}
