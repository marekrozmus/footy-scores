import type {
  Lineup,
  MatchDetail,
  MatchTeam,
  OdfEventUnitEntry,
  OdfMatchDetailResponse,
  OdfPeriod,
  OdfResultItem,
  Player,
  Scorer,
} from "./types";
import { fetchOdfJson } from "./http";

const OG2024_BASE = "https://stacy.olympics.com/OG2024/data";

function entryValue(entries: OdfEventUnitEntry[], code: string): string | undefined {
  return entries.find((entry) => entry.eue_code === code)?.eue_value;
}

function findPeriod(periods: OdfPeriod[], code: string): OdfPeriod | undefined {
  return periods.find((period) => period.p_code === code);
}

function periodScore(period: OdfPeriod | undefined): { home: number; away: number } {
  return { home: Number(period?.home.score ?? 0), away: Number(period?.away.score ?? 0) };
}

// PSO (penalty shoot-out) and ET-H1/ET-H2 (extra time) period codes confirmed by inspecting real
// Paris 2024 knockout matches; anything else falls back to a standard full-time result.
function deriveStatus(periods: OdfPeriod[]): MatchDetail["status"] {
  const codes = periods.map((period) => period.p_code);
  if (codes.includes("PSO")) return "PEN";
  if (codes.some((code) => code.startsWith("ET"))) return "AET";
  return "FT";
}

function toPlayer(athlete: OdfResultItem["teamAthletes"][number]): Player {
  const bib = Number(athlete.bib);
  return {
    name: athlete.athlete.name,
    number: Number.isNaN(bib) ? null : bib,
    position: entryValue(athlete.eventUnitEntries, "POSITION") ?? "",
  };
}

function toLineup(item: OdfResultItem, teamName: string): Lineup {
  const isStarter = (athlete: OdfResultItem["teamAthletes"][number]) =>
    entryValue(athlete.eventUnitEntries, "STARTER") === "Y";

  return {
    team: teamName,
    formation: entryValue(item.eventUnitEntries, "FORMATION") ?? "",
    coach: item.teamCoaches?.find((entry) => entry.function.functionCode === "COACH")?.coach.name ?? "",
    startingXI: item.teamAthletes.filter(isStarter).map(toPlayer),
    bench: item.teamAthletes.filter((athlete) => !isStarter(athlete)).map(toPlayer),
  };
}

const GOAL_TYPE_BY_ACTION: Record<string, Scorer["type"]> = {
  SHOT: "open_play",
  FRD: "free_kick",
  PEN: "penalty",
};

// "45' +2" -> { minute: 45, stoppage: 2 }; "18'" -> { minute: 18 }
function parseMinute(when: string): { minute: number; stoppage?: number } {
  const match = /(\d+)'\s*(?:\+(\d+))?/.exec(when);
  return {
    minute: match ? Number(match[1]) : 0,
    stoppage: match?.[2] ? Number(match[2]) : undefined,
  };
}

function athleteName(items: OdfResultItem[], teamCode: string, bib: string): string {
  const item = items.find((entry) => entry.teamCode === teamCode);
  const athlete = item?.teamAthletes.find((entry) => entry.bib === bib);
  return athlete?.athlete.name ?? `#${bib}`;
}

function toScorers(response: OdfMatchDetailResponse, homeCode: string): Scorer[] {
  const items = response.results.items;
  const scorers: Scorer[] = [];

  for (const period of response.results.playByPlay) {
    for (const action of period.actions) {
      if (action.pbpa_Result !== "GOAL") continue;
      for (const competitor of action.competitors) {
        const scorer = competitor.athletes.find((athlete) => athlete.pbpat_role === "SCR");
        if (!scorer) continue;
        const assist = competitor.athletes.find((athlete) => athlete.pbpat_role === "ASSIST");
        const { minute, stoppage } = parseMinute(action.pbpa_When);

        // Optional fields are omitted entirely when absent, not set to `undefined` — so this object
        // has exactly the same shape whether it's used in-memory or round-tripped through JSON
        // (JSON.stringify drops undefined-valued keys but can't distinguish "omitted" from
        // "explicitly undefined" on the way in, so building it right the first time avoids a whole
        // class of false-positive diffs when this gets compared against a real JSON API response).
        scorers.push({
          team: competitor.pbpc_code === homeCode ? "home" : "away",
          player: athleteName(items, competitor.pbpc_code, scorer.pbpat_bib),
          minute,
          ...(stoppage !== undefined ? { stoppage } : {}),
          ...(assist ? { assist: athleteName(items, competitor.pbpc_code, assist.pbpat_bib) } : {}),
          type: GOAL_TYPE_BY_ACTION[action.pbpa_Action] ?? "other",
        });
      }
    }
  }

  return scorers.sort((a, b) => a.minute - b.minute);
}

export async function loadMatchDetail(unitId: string, home: MatchTeam, away: MatchTeam): Promise<MatchDetail> {
  const url = `${OG2024_BASE}/RES_ByRSC_H2H~comp=OG2024~disc=FBL~rscResult=${unitId}~lang=ENG.json`;
  const response = await fetchOdfJson<OdfMatchDetailResponse>(url);
  const { periods, items } = response.results;

  const homeItem = items.find((item) => item.teamCode === home.code);
  const awayItem = items.find((item) => item.teamCode === away.code);
  if (!homeItem || !awayItem) throw new Error(`Match ${unitId} is missing team result data`);

  return {
    status: deriveStatus(periods),
    halfTime: periodScore(findPeriod(periods, "H1")),
    fullTime: periodScore(findPeriod(periods, "TOT")),
    scorers: toScorers(response, home.code),
    lineups: {
      home: toLineup(homeItem, home.name),
      away: toLineup(awayItem, away.name),
    },
  };
}
