import type { MatchDetail, MatchSummary } from "./types";

// Strips diacritics and punctuation so slugs stay stable and URL-safe
// (e.g. "Côte d'Ivoire" -> "cote-d-ivoire").
function slugifyTeam(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Deterministic, human-readable slug: {date}-{home}-vs-{away}. Unique within this tournament since
// no two matches share both a kickoff date and a team pairing.
export function buildMatchSlug(summary: MatchSummary): string {
  const date = summary.kickoff.slice(0, 10);
  return `${date}-${slugifyTeam(summary.home.name)}-vs-${slugifyTeam(summary.away.name)}`;
}

export function buildEndpoint(summary: MatchSummary): string {
  return `/v1/football/matches/${buildMatchSlug(summary)}`;
}

// Exactly example.json's structure — competition, venue, kickoff, status, teams, score, scorers,
// lineups — nothing added. (An earlier version added a `meta` block here for "QA traceability";
// removed — it traced back to the original mock UI's invented demo data, not to any actual
// requirement or real need, and contradicted the "exactly the same as example.json" spec.)
export type FootballRecord = {
  competition: { name: string; season: string; round: string };
  venue: { name: string; city: string };
  kickoff: string;
  status: MatchDetail["status"];
  teams: { home: string; away: string };
  score: { home: number; away: number; halfTime: { home: number; away: number } };
  scorers: {
    team: string;
    player: string;
    minute: number;
    stoppage?: number;
    assist?: string;
    type: string;
  }[];
  lineups: MatchDetail["lineups"];
};

export function buildRecord(summary: MatchSummary, detail: MatchDetail): FootballRecord {
  return {
    competition: {
      name: `Olympic Games Paris 2024 · Football ${summary.gender}`,
      season: "2024",
      round: summary.round,
    },
    venue: { name: summary.venueName, city: summary.city },
    kickoff: summary.kickoff,
    status: detail.status,
    teams: { home: summary.home.name, away: summary.away.name },
    score: {
      home: detail.fullTime.home,
      away: detail.fullTime.away,
      halfTime: detail.halfTime,
    },
    // Optional fields (stoppage/assist) are spread in only when present, never assigned
    // `undefined` — see the matching comment in matchDetail.ts's toScorers for why that distinction
    // matters (an object with a key explicitly set to undefined isn't the same as one without that
    // key at all once JSON is involved).
    scorers: detail.scorers.map((scorer) => ({
      team: scorer.team === "home" ? summary.home.name : summary.away.name,
      player: scorer.player,
      minute: scorer.minute,
      ...(scorer.stoppage !== undefined ? { stoppage: scorer.stoppage } : {}),
      ...(scorer.assist !== undefined ? { assist: scorer.assist } : {}),
      type: scorer.type,
    })),
    lineups: detail.lineups,
  };
}
