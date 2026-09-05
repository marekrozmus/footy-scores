import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

// Server-only module: imported exclusively by route handlers under app/api and app/v1, never by
// the client component. Don't import this from components/workspace.tsx.
//
// A process-lifetime in-memory cache. It resets on server restart and isn't shared across multiple
// instances of a multi-process/serverless deployment — acceptable for a single dev/demo server,
// but not a durable store. Populated once via POST /api/generate (summaries) and then lazily, one
// match at a time, via GET /api/matches/[id] (full records) — so a plain Node module singleton is
// enough; nothing here needs to survive a restart.
type Cache = {
  summaries: MatchSummary[] | null;
  records: Map<string, FootballRecord>;
};

const cache: Cache = { summaries: null, records: new Map() };

export function getSummaries(): MatchSummary[] | null {
  return cache.summaries;
}

export function setSummaries(summaries: MatchSummary[]): void {
  cache.summaries = summaries;
}

export function getRecord(matchId: string): FootballRecord | undefined {
  return cache.records.get(matchId);
}

export function setRecord(matchId: string, record: FootballRecord): void {
  cache.records.set(matchId, record);
}

// Invalidates everything without restarting the process — the next POST /api/generate (or any
// GET /api/matches/[id]) will re-fetch from Olympics instead of serving stale cached data.
export function clearCache(): void {
  cache.summaries = null;
  cache.records.clear();
}
