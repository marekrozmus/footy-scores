import type { MatchRowData } from "./types";

// Shared by this directory's *.test.tsx files — not itself a test file, so it's exempt from the
// "co-located test, no shared tree" rule (it's a fixture helper, same as lib/odf/*.test.ts each
// building their own small MatchSummary/MatchDetail fixtures, just factored out since three
// different component tests need the exact same MatchRowData shape).
export function matchRow(overrides: Partial<MatchRowData> = {}): MatchRowData {
  return {
    id: "FBLMTEAM11------------GPB-000100--",
    iso: "2024-07-24T15:00:00+02:00",
    date: "24 Jul",
    time: "15:00",
    home: "Argentina",
    homeNoc: "ARG",
    away: "Morocco",
    awayNoc: "MAR",
    homeGoals: 1,
    awayGoals: 2,
    score: "1–2",
    stage: "Group B",
    round: "Men's Group B",
    gender: "Men",
    venue: "Geoffroy-Guichard Stadium",
    city: "Saint-Etienne",
    scheduleStatus: "Finished",
    sourceUrl: "https://stacy.olympics.com/en/paris-2024/results/football/men/gpb-000100--",
    ...overrides,
  };
}
