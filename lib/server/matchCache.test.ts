import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

const { loadMatchSummaries } = vi.hoisted(() => ({ loadMatchSummaries: vi.fn<() => Promise<MatchSummary[]>>() }));
vi.mock("@/lib/odf/schedule", () => ({ loadMatchSummaries }));

import { clearCache, ensureSummaries, getRecord, getSummaries, setRecord, setSummaries } from "./matchCache";

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

const record: FootballRecord = {
  competition: { name: "Olympic Games Paris 2024 · Football Men", season: "2024", round: "Men's Group B" },
  venue: { name: "Geoffroy-Guichard Stadium", city: "Saint-Etienne" },
  kickoff: summary.kickoff,
  status: "FT",
  teams: { home: "Argentina", away: "Morocco" },
  score: { home: 1, away: 2, halfTime: { home: 0, away: 1 } },
  scorers: [],
  lineups: {
    home: { team: "Argentina", formation: "4-4-2", coach: "MASCHERANO Javier", startingXI: [], bench: [] },
    away: { team: "Morocco", formation: "4-2-3-1", coach: "SEKTIOUI Tarik", startingXI: [], bench: [] },
  },
};

// This module is a true process-lifetime singleton — reset it before every test so tests don't
// leak state into each other via shared module scope.
beforeEach(() => {
  clearCache();
  loadMatchSummaries.mockReset();
});

describe("matchCache", () => {
  it("has no summaries and no records until populated", () => {
    expect(getSummaries()).toBeNull();
    expect(getRecord(summary.id)).toBeUndefined();
  });

  it("returns what was set for summaries", () => {
    setSummaries([summary]);
    expect(getSummaries()).toEqual([summary]);
  });

  it("returns what was set for a record, keyed by match id", () => {
    setRecord(summary.id, record);
    expect(getRecord(summary.id)).toEqual(record);
    expect(getRecord("some-other-id")).toBeUndefined();
  });

  it("clearCache resets both summaries and records", () => {
    setSummaries([summary]);
    setRecord(summary.id, record);

    clearCache();

    expect(getSummaries()).toBeNull();
    expect(getRecord(summary.id)).toBeUndefined();
  });

  it("setSummaries overwrites the previous list rather than merging", () => {
    setSummaries([summary]);
    setSummaries([]);
    expect(getSummaries()).toEqual([]);
  });

  it("setRecord overwrites a previous record for the same id", () => {
    setRecord(summary.id, record);
    const updated: FootballRecord = { ...record, status: "AET" };
    setRecord(summary.id, updated);
    expect(getRecord(summary.id)?.status).toBe("AET");
  });

  describe("ensureSummaries", () => {
    it("returns the cached summaries without fetching when already populated", async () => {
      setSummaries([summary]);

      const result = await ensureSummaries();

      expect(result).toEqual([summary]);
      expect(loadMatchSummaries).not.toHaveBeenCalled();
    });

    it("fetches and caches the schedule when nothing is cached yet — the serverless self-heal path", async () => {
      loadMatchSummaries.mockResolvedValue([summary]);

      const result = await ensureSummaries();

      expect(result).toEqual([summary]);
      expect(getSummaries()).toEqual([summary]);
      expect(loadMatchSummaries).toHaveBeenCalledOnce();
    });

    it("shares one in-flight fetch across concurrent callers instead of fetching twice", async () => {
      let resolve!: (summaries: MatchSummary[]) => void;
      loadMatchSummaries.mockReturnValue(new Promise((res) => { resolve = res; }));

      const first = ensureSummaries();
      const second = ensureSummaries();
      resolve([summary]);

      expect(await first).toEqual([summary]);
      expect(await second).toEqual([summary]);
      expect(loadMatchSummaries).toHaveBeenCalledOnce();
    });

    it("re-fetches after clearCache, rather than reusing a stale in-flight promise", async () => {
      loadMatchSummaries.mockResolvedValue([summary]);
      await ensureSummaries();

      clearCache();
      await ensureSummaries();

      expect(loadMatchSummaries).toHaveBeenCalledTimes(2);
    });

    it("propagates a failure (e.g. Olympics unreachable) without caching anything", async () => {
      loadMatchSummaries.mockRejectedValue(new Error("Olympics is down"));

      await expect(ensureSummaries()).rejects.toThrow("Olympics is down");
      expect(getSummaries()).toBeNull();
    });
  });
});
