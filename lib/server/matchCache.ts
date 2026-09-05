import { loadMatchSummaries } from "@/lib/odf/schedule";
import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

// Server-only module: imported exclusively by route handlers under app/api and app/v1, never by
// the client component. Don't import this from components/workspace.tsx.
//
// A process-lifetime in-memory cache. It resets on server restart and isn't shared across multiple
// instances of a multi-process/serverless deployment (e.g. Vercel may route POST /api/generate and
// a later GET /api/matches/[id] to two different, cold instances, each with its own empty cache) —
// see ensureSummaries() below for how read paths stay correct despite that.
type Cache = {
  summaries: MatchSummary[] | null;
  records: Map<string, FootballRecord>;
};

const cache: Cache = { summaries: null, records: new Map() };
let pendingSummaries: Promise<MatchSummary[]> | null = null;

export function getSummaries(): MatchSummary[] | null {
  return cache.summaries;
}

export function setSummaries(summaries: MatchSummary[]): void {
  cache.summaries = summaries;
}

// Self-heals the "schedule not loaded on this instance" gap that plain in-memory caching hits under
// serverless deployment: the Paris 2024 schedule is historical and deterministic, so re-fetching it
// here (instead of requiring a prior POST /api/generate to have hit this exact instance) is always
// safe and cheap — unlike per-match detail, which stays lazy and explicit. Concurrent callers within
// the same instance share one in-flight fetch rather than each triggering their own.
export async function ensureSummaries(): Promise<MatchSummary[]> {
  if (cache.summaries) return cache.summaries;
  if (!pendingSummaries) {
    pendingSummaries = loadMatchSummaries()
      .then((summaries) => {
        cache.summaries = summaries;
        return summaries;
      })
      .finally(() => {
        pendingSummaries = null;
      });
  }
  return pendingSummaries;
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
