// Raw shapes returned by the Official Olympic Data Feed (ODF), as served by stacy.olympics.com.
// Only the fields this app actually reads are typed here — the real payloads carry more.

export type OdfCompetitionDay = { id: string; name: string };
export type OdfCompetitionDaysResponse = { days: OdfCompetitionDay[] };

export type OdfCompetitorResult = {
  mark: string;
  winnerLoserTie: "W" | "L" | "D" | "";
};

export type OdfCompetitor = {
  code: string;
  noc: string;
  name: string;
  order: number;
  results: OdfCompetitorResult;
};

export type OdfScheduleUnit = {
  eventUnitName: string;
  id: string;
  disciplineCode: string;
  genderCode: "M" | "W" | "X";
  eventUnitType: string;
  scheduleItemType: string;
  startDate: string;
  venueDescription: string;
  locationDescription: string;
  statusDescription: string;
  competitors: OdfCompetitor[];
  extraData?: { detailUrl?: string };
};

export type OdfDayScheduleResponse = { units: OdfScheduleUnit[] };

// --- per-match detail (RES_ByRSC_H2H) ---

export type OdfExtendedInfo = { ei_code: string; ei_value: string };

export type OdfOfficial = {
  function: { functionCode: string };
  official: { name: string };
};

export type OdfPeriodScore = { score: string; periodScore?: string };
export type OdfPeriod = { p_code: string; home: OdfPeriodScore; away: OdfPeriodScore };

export type OdfEventUnitEntry = { eue_code: string; eue_value: string };

export type OdfCoachEntry = {
  function: { functionCode: string };
  coach: { name: string };
};

export type OdfAthlete = { name: string };

export type OdfTeamAthlete = {
  bib: string;
  athlete: OdfAthlete;
  eventUnitEntries: OdfEventUnitEntry[];
};

export type OdfResultItem = {
  teamCode: string;
  teamCoaches?: OdfCoachEntry[];
  eventUnitEntries: OdfEventUnitEntry[];
  teamAthletes: OdfTeamAthlete[];
};

export type OdfPbpAthlete = { pbpat_bib: string; pbpat_role?: string };
export type OdfPbpCompetitor = { pbpc_code: string; athletes: OdfPbpAthlete[] };
export type OdfPbpAction = {
  pbpa_Action: string;
  pbpa_When: string;
  pbpa_Result?: string;
  competitors: OdfPbpCompetitor[];
};
export type OdfPlayByPlayPeriod = { actions: OdfPbpAction[] };

export type OdfMatchResults = {
  extendedInfos: OdfExtendedInfo[];
  officials: OdfOfficial[];
  periods: OdfPeriod[];
  items: OdfResultItem[];
  playByPlay: OdfPlayByPlayPeriod[];
};

export type OdfMatchDetailResponse = { results: OdfMatchResults };

// --- domain types used by the UI ---

export type Side = "home" | "away";

export type MatchTeam = {
  name: string;
  noc: string;
  code: string; // ODF team code, e.g. FBLMTEAM11--ARG01
  score: number | null;
  result: "W" | "L" | "D" | "";
};

export type MatchSummary = {
  id: string; // ODF event-unit id, e.g. FBLMTEAM11------------GPB-000100--
  kickoff: string; // ISO 8601 with UTC offset, straight from the feed
  gender: "Men" | "Women";
  round: string; // full label, e.g. "Men's Group B", "Women's Gold Medal Match"
  stage: string; // round with the gender prefix stripped, for cross-gender filtering
  venueName: string;
  city: string;
  scheduleStatus: string; // e.g. "Finished" — from the schedule feed, not FT/AET/PEN precise
  home: MatchTeam;
  away: MatchTeam;
  sourceUrl: string; // absolute stacy.olympics.com match page URL
};

export type Player = { name: string; number: number | null; position: string };

export type Scorer = {
  team: Side;
  player: string;
  minute: number;
  stoppage?: number;
  assist?: string;
  type: "open_play" | "free_kick" | "penalty" | "other";
};

export type Lineup = {
  team: string;
  formation: string;
  coach: string;
  startingXI: Player[];
  bench: Player[];
};

export type MatchDetail = {
  status: "FT" | "AET" | "PEN";
  halfTime: { home: number; away: number };
  fullTime: { home: number; away: number };
  penaltyShootout?: { home: number; away: number };
  attendance: number | null;
  referee: string | null;
  scorers: Scorer[];
  lineups: { home: Lineup; away: Lineup };
};
