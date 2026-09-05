import { describe, expect, it } from "vitest";

import { buildEndpoint, buildMatchSlug, buildRecord, stripMeta } from "./record";
import type { MatchDetail, MatchSummary } from "./types";

const summary: MatchSummary = {
  id: "FBLMTEAM11------------GPB-000100--",
  kickoff: "2024-07-24T15:00:00+02:00",
  gender: "Men",
  round: "Men's Group B",
  stage: "Group B",
  venueName: "Geoffroy-Guichard Stadium",
  city: "Saint-Etienne",
  scheduleStatus: "Finished",
  home: { name: "Argentina", noc: "ARG", code: "FBLMTEAM11--ARG01", score: 1, result: "L" },
  away: { name: "Morocco", noc: "MAR", code: "FBLMTEAM11--MAR01", score: 2, result: "W" },
  sourceUrl: "https://stacy.olympics.com/en/paris-2024/results/football/men/gpb-000100--",
};

const detail: MatchDetail = {
  status: "FT",
  halfTime: { home: 0, away: 1 },
  fullTime: { home: 1, away: 2 },
  attendance: 26717,
  referee: "NYBERG Glenn",
  scorers: [
    { team: "away", player: "RAHIMI Soufiane", minute: 45, stoppage: 2, assist: "EL KHANNOUSS Bilal", type: "open_play" },
    { team: "away", player: "RAHIMI Soufiane", minute: 49, type: "penalty" },
    { team: "home", player: "SIMEONE Giuliano", minute: 68, assist: "SOLER Julio", type: "open_play" },
  ],
  lineups: {
    home: { team: "Argentina", formation: "4-4-2", coach: "MASCHERANO Javier", startingXI: [], bench: [] },
    away: { team: "Morocco", formation: "4-2-3-1", coach: "SEKTIOUI Tarik", startingXI: [], bench: [] },
  },
};

describe("buildMatchSlug / buildEndpoint", () => {
  it("builds a {date}-{home}-vs-{away} slug from the kickoff date and team names", () => {
    expect(buildMatchSlug(summary)).toBe("2024-07-24-argentina-vs-morocco");
  });

  it("wraps the slug in the /v1/football/matches path", () => {
    expect(buildEndpoint(summary)).toBe("/v1/football/matches/2024-07-24-argentina-vs-morocco");
  });

  it("strips diacritics and punctuation from team names", () => {
    const withAccent: MatchSummary = {
      ...summary,
      home: { ...summary.home, name: "Côte d'Ivoire" },
      away: { ...summary.away, name: "São Paulo FC" },
    };
    expect(buildMatchSlug(withAccent)).toBe("2024-07-24-cote-d-ivoire-vs-sao-paulo-fc");
  });

  it("produces the same slug for the same inputs (deterministic)", () => {
    expect(buildMatchSlug(summary)).toBe(buildMatchSlug({ ...summary }));
  });
});

describe("buildRecord", () => {
  it("assembles the example.json-shaped record from a summary and detail", () => {
    const record = buildRecord(summary, detail);
    expect(record.competition).toEqual({ name: "Olympic Games Paris 2024 · Football Men", season: "2024", round: "Men's Group B" });
    expect(record.venue).toEqual({ name: "Geoffroy-Guichard Stadium", city: "Saint-Etienne" });
    expect(record.kickoff).toBe("2024-07-24T15:00:00+02:00");
    expect(record.status).toBe("FT");
    expect(record.teams).toEqual({ home: "Argentina", away: "Morocco" });
    expect(record.score).toEqual({ home: 1, away: 2, halfTime: { home: 0, away: 1 } });
  });

  it("resolves scorer team codes to team names", () => {
    const record = buildRecord(summary, detail);
    expect(record.scorers.map((scorer) => scorer.team)).toEqual(["Morocco", "Morocco", "Argentina"]);
  });

  it("omits stoppage/assist keys entirely when absent, rather than setting them to undefined", () => {
    const record = buildRecord(summary, detail);
    const penalty = record.scorers[1]!;
    expect(penalty).not.toHaveProperty("stoppage");
    expect(penalty).not.toHaveProperty("assist");
    // Round-tripping through JSON must not change the key set — this is exactly the bug that was
    // caught during the compare-feature's own verification (see docs/DATA_PIPELINE_PLAN.md).
    expect(Object.keys(JSON.parse(JSON.stringify(penalty)))).toEqual(Object.keys(penalty));
  });

  it("keeps stoppage/assist when present", () => {
    const record = buildRecord(summary, detail);
    const withStoppageAndAssist = record.scorers[0]!;
    expect(withStoppageAndAssist.stoppage).toBe(2);
    expect(withStoppageAndAssist.assist).toBe("EL KHANNOUSS Bilal");
  });

  it("puts source event id, endpoint, attendance and referee under meta", () => {
    const record = buildRecord(summary, detail);
    expect(record.meta).toEqual({
      eventId: summary.id,
      discipline: "Football",
      gender: "Men",
      endpoint: "/v1/football/matches/2024-07-24-argentina-vs-morocco",
      sourceUrl: summary.sourceUrl,
      attendance: 26717,
      referee: "NYBERG Glenn",
      penaltyShootout: undefined,
    });
  });
});

describe("stripMeta", () => {
  it("removes exactly the meta key, keeping example.json's other 8 keys untouched", () => {
    const record = buildRecord(summary, detail);
    const stripped = stripMeta(record);
    expect(Object.keys(stripped).sort()).toEqual(["competition", "kickoff", "lineups", "score", "scorers", "status", "teams", "venue"]);
    expect(stripped).not.toHaveProperty("meta");
  });

  it("doesn't mutate the original record", () => {
    const record = buildRecord(summary, detail);
    stripMeta(record);
    expect(record).toHaveProperty("meta");
  });
});
