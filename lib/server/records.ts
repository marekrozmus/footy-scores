import { loadMatchDetail } from "@/lib/odf/matchDetail";
import { buildRecord, type FootballRecord } from "@/lib/odf/record";
import { ensureSummaries, getRecord, setRecord } from "@/lib/server/matchCache";

export class MatchNotFoundError extends Error {}

// Shared by GET /api/matches/[id] and POST /api/compare: serves the cached record if this match
// has already been generated, otherwise fetches its detail from Olympics once and caches it.
export async function getOrGenerateRecord(matchId: string): Promise<FootballRecord> {
  const cached = getRecord(matchId);
  if (cached) return cached;

  const summaries = await ensureSummaries();
  const summary = summaries.find((candidate) => candidate.id === matchId);
  if (!summary) throw new MatchNotFoundError(`No football match found for id "${matchId}"`);

  const detail = await loadMatchDetail(summary.id, summary.home, summary.away);
  const record = buildRecord(summary, detail);
  setRecord(summary.id, record);
  return record;
}
