import type { MatchSummary } from "@/lib/odf/types";

import type { MatchRowData, Phase, SortField } from "./types";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string): string {
  const day = iso.slice(8, 10);
  const monthIndex = Number(iso.slice(5, 7)) - 1;
  return `${day} ${MONTH_ABBR[monthIndex] ?? ""}`;
}

export function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

export function toRow(summary: MatchSummary): MatchRowData {
  const home = summary.home.score;
  const away = summary.away.score;
  return {
    id: summary.id,
    iso: summary.kickoff,
    date: formatDate(summary.kickoff),
    time: formatTime(summary.kickoff),
    home: summary.home.name,
    homeNoc: summary.home.noc,
    away: summary.away.name,
    awayNoc: summary.away.noc,
    homeGoals: home,
    awayGoals: away,
    score: home !== null && away !== null ? `${home}–${away}` : "–",
    stage: summary.stage,
    round: summary.round,
    gender: summary.gender,
    venue: summary.venueName,
    city: summary.city,
    scheduleStatus: summary.scheduleStatus,
    sourceUrl: summary.sourceUrl,
  };
}

// Fixed display order for the stage filter; any stage not in this list (shouldn't happen for a
// finished tournament) is appended, sorted, rather than silently dropped.
export const STAGE_ORDER = [
  "Group A",
  "Group B",
  "Group C",
  "Group D",
  "Quarter-final",
  "Semi-final",
  "Bronze Medal Match",
  "Gold Medal Match",
];

export const phaseProgress: Record<Phase, number | null> = { idle: null, loading: 45, generating: 90, complete: 100, error: null };
export const sortFieldLabels: Record<SortField, string> = { kickoff: "Kickoff", match: "Match", score: "Result", stage: "Stage", gender: "Gender" };
