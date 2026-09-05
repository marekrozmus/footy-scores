import type {
  MatchSummary,
  MatchTeam,
  OdfCompetitionDaysResponse,
  OdfCompetitor,
  OdfDayScheduleResponse,
  OdfScheduleUnit,
} from "./types";
import { fetchOdfJson } from "./http";

const SRM_BASE = "https://stacy.olympics.com/srm/data/oly";

// Discovered via srm/data/oly/info/disciplinesevents/ENG.json — the IOC discipline code for football.
const FOOTBALL_DISCIPLINE_CODE = "FBL";

function competitorAt(competitors: OdfCompetitor[], order: number): OdfCompetitor {
  const competitor = competitors.find((entry) => entry.order === order);
  if (!competitor) throw new Error(`Missing competitor at order ${order}`);
  return competitor;
}

function toTeam(competitor: OdfCompetitor): MatchTeam {
  const mark = Number(competitor.results.mark);
  return {
    name: competitor.name,
    noc: competitor.noc,
    code: competitor.code,
    score: Number.isNaN(mark) ? null : mark,
    result: competitor.results.winnerLoserTie,
  };
}

function stripGenderPrefix(round: string): string {
  return round.replace(/^(Men's|Women's)\s+/, "");
}

function cityFromLocation(locationDescription: string): string {
  const parts = locationDescription.split(",");
  return parts.length > 1 ? parts.slice(1).join(",").trim() : locationDescription;
}

function toSummary(unit: OdfScheduleUnit): MatchSummary {
  return {
    id: unit.id,
    kickoff: unit.startDate,
    gender: unit.genderCode === "W" ? "Women" : "Men",
    round: unit.eventUnitName,
    stage: stripGenderPrefix(unit.eventUnitName),
    venueName: unit.venueDescription,
    city: cityFromLocation(unit.locationDescription),
    scheduleStatus: unit.statusDescription,
    home: toTeam(competitorAt(unit.competitors, 0)),
    away: toTeam(competitorAt(unit.competitors, 1)),
    sourceUrl: unit.extraData?.detailUrl ? `https://stacy.olympics.com${unit.extraData.detailUrl}` : "",
  };
}

function isFootballMatch(unit: OdfScheduleUnit): boolean {
  return (
    unit.disciplineCode === FOOTBALL_DISCIPLINE_CODE &&
    unit.eventUnitType === "HTEAM" &&
    unit.scheduleItemType === "H2H_NOC" &&
    unit.competitors.length === 2
  );
}

// Fetches the full Paris 2024 competition calendar (one request), then every day's schedule in
// parallel, and filters down to real two-team football matches — no per-discipline endpoint
// exists, so this cross-discipline day-by-day sweep is the only way to get the complete set.
export async function loadMatchSummaries(): Promise<MatchSummary[]> {
  const { days } = await fetchOdfJson<OdfCompetitionDaysResponse>(`${SRM_BASE}/schedule/competitiondays/ENG.json`);

  const dayResponses = await Promise.all(
    days.map((day) => fetchOdfJson<OdfDayScheduleResponse>(`${SRM_BASE}/schedule/day/ENG/${day.id}.json`)),
  );

  return dayResponses
    .flatMap((day) => day.units)
    .filter(isFootballMatch)
    .map(toSummary)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}
