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
  // Additive fields beyond example.json's core shape, kept for QA traceability. Drop this block
  // if the generated record needs to match example.json's exact key set with nothing added.
  meta: {
    eventId: string;
    discipline: "Football";
    gender: MatchSummary["gender"];
    endpoint: string;
    sourceUrl: string;
    attendance: number | null;
    referee: string | null;
    penaltyShootout?: { home: number; away: number };
  };
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
    scorers: detail.scorers.map((scorer) => ({
      team: scorer.team === "home" ? summary.home.name : summary.away.name,
      player: scorer.player,
      minute: scorer.minute,
      stoppage: scorer.stoppage,
      assist: scorer.assist,
      type: scorer.type,
    })),
    lineups: detail.lineups,
    meta: {
      eventId: summary.id,
      discipline: "Football",
      gender: summary.gender,
      endpoint: buildEndpoint(summary),
      sourceUrl: summary.sourceUrl,
      attendance: detail.attendance,
      referee: detail.referee,
      penaltyShootout: detail.penaltyShootout,
    },
  };
}
