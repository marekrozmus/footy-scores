import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MatchDetail, MatchSummary } from "@/lib/odf/types";

const { loadMatchDetail, loadMatchSummaries } = vi.hoisted(() => ({
  loadMatchDetail: vi.fn<() => Promise<MatchDetail>>(),
  loadMatchSummaries: vi.fn<() => Promise<MatchSummary[]>>(),
}));
vi.mock("@/lib/odf/matchDetail", () => ({ loadMatchDetail }));
vi.mock("@/lib/odf/schedule", () => ({ loadMatchSummaries }));

import { clearCache, getRecord } from "@/lib/server/matchCache";
import { getOrGenerateRecord, MatchNotFoundError } from "@/lib/server/records";

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
  scorers: [],
  lineups: {
    home: { team: "Argentina", formation: "4-4-2", coach: "MASCHERANO Javier", startingXI: [], bench: [] },
    away: { team: "Morocco", formation: "4-2-3-1", coach: "SEKTIOUI Tarik", startingXI: [], bench: [] },
  },
};

beforeEach(() => {
  clearCache();
  loadMatchDetail.mockReset();
  loadMatchSummaries.mockReset();
});

describe("getOrGenerateRecord", () => {
  it("self-heals a missing schedule instead of failing — the fix for the serverless 'wrong instance' bug", async () => {
    // Regression test: on a serverless deployment, POST /api/generate and this call can land on two
    // different, cold instances, each with its own empty in-memory cache. This used to throw
    // ScheduleNotLoadedError ("run Load & generate first") even though the schedule had genuinely
    // already been generated moments earlier — just on a different instance. It must now recover by
    // fetching the (historical, deterministic) schedule itself rather than erroring.
    loadMatchSummaries.mockResolvedValue([summary]);
    loadMatchDetail.mockResolvedValue(detail);

    const record = await getOrGenerateRecord(summary.id);

    expect(record.teams).toEqual({ home: "Argentina", away: "Morocco" });
    expect(loadMatchSummaries).toHaveBeenCalledOnce();
  });

  it("serves the cached record on a repeat call without fetching detail again", async () => {
    loadMatchSummaries.mockResolvedValue([summary]);
    loadMatchDetail.mockResolvedValue(detail);

    const first = await getOrGenerateRecord(summary.id);
    const second = await getOrGenerateRecord(summary.id);

    expect(second).toEqual(first);
    expect(loadMatchDetail).toHaveBeenCalledOnce();
  });

  it("throws MatchNotFoundError for an id not present in the (possibly freshly re-fetched) schedule", async () => {
    loadMatchSummaries.mockResolvedValue([summary]);

    await expect(getOrGenerateRecord("no-such-id")).rejects.toThrow(MatchNotFoundError);
    expect(loadMatchDetail).not.toHaveBeenCalled();
  });

  it("caches the built record so it's available via getRecord afterwards", async () => {
    loadMatchSummaries.mockResolvedValue([summary]);
    loadMatchDetail.mockResolvedValue(detail);

    await getOrGenerateRecord(summary.id);

    expect(getRecord(summary.id)).toBeDefined();
  });

  it("propagates a schedule-fetch failure as-is (e.g. Olympics unreachable)", async () => {
    loadMatchSummaries.mockRejectedValue(new Error("Olympics is down"));

    await expect(getOrGenerateRecord(summary.id)).rejects.toThrow("Olympics is down");
  });
});
