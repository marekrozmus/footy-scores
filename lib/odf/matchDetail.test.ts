import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMatchDetail } from "./matchDetail";
import type { MatchTeam, OdfMatchDetailResponse, OdfPeriod, OdfResultItem } from "./types";

const home: MatchTeam = { name: "Argentina", noc: "ARG", code: "FBLMTEAM11--ARG01", score: 1, result: "L" };
const away: MatchTeam = { name: "Morocco", noc: "MAR", code: "FBLMTEAM11--MAR01", score: 2, result: "W" };

function period(code: string, homeScore: string, awayScore: string, extra: Partial<{ homePeriodScore: string; awayPeriodScore: string }> = {}): OdfPeriod {
  return {
    p_code: code,
    home: { score: homeScore, periodScore: extra.homePeriodScore },
    away: { score: awayScore, periodScore: extra.awayPeriodScore },
  };
}

function resultItem(overrides: Partial<OdfResultItem> & Pick<OdfResultItem, "teamCode">): OdfResultItem {
  return {
    teamCoaches: [{ function: { functionCode: "COACH" }, coach: { name: "MASCHERANO Javier" } }],
    eventUnitEntries: [{ eue_code: "FORMATION", eue_value: "4-4-2" }],
    teamAthletes: [
      { bib: "1", athlete: { name: "RULLI Geronimo" }, eventUnitEntries: [{ eue_code: "STARTER", eue_value: "Y" }, { eue_code: "POSITION", eue_value: "GK" }] },
      { bib: "12", athlete: { name: "BREY Leandro" }, eventUnitEntries: [{ eue_code: "STARTER", eue_value: "N" }, { eue_code: "POSITION", eue_value: "GK" }] },
    ],
    ...overrides,
  };
}

function baseResponse(overrides: Partial<OdfMatchDetailResponse["results"]> = {}): OdfMatchDetailResponse {
  return {
    results: {
      extendedInfos: [{ ei_code: "ATTENDANCE", ei_value: "26717" }],
      officials: [{ function: { functionCode: "RE" }, official: { name: "NYBERG Glenn" } }],
      periods: [period("H1", "0", "1"), period("H2", "1", "2"), period("TOT", "1", "2")],
      items: [resultItem({ teamCode: home.code }), resultItem({ teamCode: away.code })],
      playByPlay: [],
      ...overrides,
    },
  };
}

function stubFetchOnce(response: OdfMatchDetailResponse) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(response), { status: 200 })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadMatchDetail", () => {
  it("reads half-time and full-time score from the H1 and TOT periods", async () => {
    stubFetchOnce(baseResponse());
    const detail = await loadMatchDetail("unit-id", home, away);
    expect(detail.halfTime).toEqual({ home: 0, away: 1 });
    expect(detail.fullTime).toEqual({ home: 1, away: 2 });
  });

  it("derives status FT when only H1/H2/TOT periods are present", async () => {
    stubFetchOnce(baseResponse());
    const detail = await loadMatchDetail("unit-id", home, away);
    expect(detail.status).toBe("FT");
    expect(detail.penaltyShootout).toBeUndefined();
  });

  it("derives status AET when extra-time periods are present", async () => {
    stubFetchOnce(baseResponse({ periods: [period("H1", "1", "1"), period("H2", "1", "1"), period("ET-H1", "1", "1"), period("ET-H2", "1", "2"), period("TOT", "1", "2")] }));
    const detail = await loadMatchDetail("unit-id", home, away);
    expect(detail.status).toBe("AET");
  });

  it("derives status PEN and reads the shootout tally from periodScore, not score", async () => {
    // Regression test for a real bug: the shootout score lives in `periodScore` on the PSO period —
    // `score` there stays the pre-shootout (tied) goal score. Using the wrong field silently reports
    // a 0-0 shootout regardless of the real result.
    stubFetchOnce(
      baseResponse({
        periods: [
          period("H1", "0", "0"),
          period("H2", "0", "0"),
          period("ET-H1", "0", "0"),
          period("ET-H2", "0", "0"),
          period("PSO", "0", "0", { homePeriodScore: "2", awayPeriodScore: "4" }),
          period("TOT", "0", "0"),
        ],
      }),
    );
    const detail = await loadMatchDetail("unit-id", home, away);
    expect(detail.status).toBe("PEN");
    expect(detail.penaltyShootout).toEqual({ home: 2, away: 4 });
    expect(detail.fullTime).toEqual({ home: 0, away: 0 });
  });

  it("reads attendance and referee from extendedInfos/officials", async () => {
    stubFetchOnce(baseResponse());
    const detail = await loadMatchDetail("unit-id", home, away);
    expect(detail.attendance).toBe(26717);
    expect(detail.referee).toBe("NYBERG Glenn");
  });

  it("returns null attendance/referee when absent, instead of NaN or throwing", async () => {
    stubFetchOnce(baseResponse({ extendedInfos: [], officials: [] }));
    const detail = await loadMatchDetail("unit-id", home, away);
    expect(detail.attendance).toBeNull();
    expect(detail.referee).toBeNull();
  });

  it("splits starters into startingXI and everyone else into bench, reading formation/coach/position/number", async () => {
    stubFetchOnce(baseResponse());
    const detail = await loadMatchDetail("unit-id", home, away);
    expect(detail.lineups.home.formation).toBe("4-4-2");
    expect(detail.lineups.home.coach).toBe("MASCHERANO Javier");
    expect(detail.lineups.home.startingXI).toEqual([{ name: "RULLI Geronimo", number: 1, position: "GK" }]);
    expect(detail.lineups.home.bench).toEqual([{ name: "BREY Leandro", number: 12, position: "GK" }]);
  });

  it("throws when a team's result item can't be found by team code", async () => {
    stubFetchOnce(baseResponse({ items: [resultItem({ teamCode: home.code })] }));
    await expect(loadMatchDetail("unit-id", home, away)).rejects.toThrow(/missing team result data/i);
  });

  describe("scorers", () => {
    const goalAction = (overrides: Record<string, unknown> = {}) => ({
      pbpa_Action: "SHOT",
      pbpa_When: "45' +2",
      pbpa_Result: "GOAL",
      competitors: [{ pbpc_code: home.code, athletes: [{ pbpat_bib: "10", pbpat_role: "SCR" }] }],
      ...overrides,
    });

    it("only counts actions with pbpa_Result GOAL, ignoring fouls/offsides/etc.", async () => {
      stubFetchOnce(
        baseResponse({
          items: [
            resultItem({ teamCode: home.code, teamAthletes: [{ bib: "10", athlete: { name: "MESSI Lionel" }, eventUnitEntries: [] }] }),
            resultItem({ teamCode: away.code }),
          ],
          playByPlay: [{ actions: [goalAction(), { pbpa_Action: "FOUL", pbpa_When: "11'", competitors: [] }] }],
        }),
      );
      const detail = await loadMatchDetail("unit-id", home, away);
      expect(detail.scorers).toHaveLength(1);
    });

    it("parses the minute and stoppage time from pbpa_When", async () => {
      stubFetchOnce(
        baseResponse({
          items: [
            resultItem({ teamCode: home.code, teamAthletes: [{ bib: "10", athlete: { name: "MESSI Lionel" }, eventUnitEntries: [] }] }),
            resultItem({ teamCode: away.code }),
          ],
          playByPlay: [{ actions: [goalAction({ pbpa_When: "45' +2" })] }],
        }),
      );
      const [scorer] = (await loadMatchDetail("unit-id", home, away)).scorers;
      expect(scorer!.minute).toBe(45);
      expect(scorer!.stoppage).toBe(2);
    });

    it("omits stoppage entirely (not as undefined) when there's no added time", async () => {
      stubFetchOnce(
        baseResponse({
          items: [
            resultItem({ teamCode: home.code, teamAthletes: [{ bib: "10", athlete: { name: "MESSI Lionel" }, eventUnitEntries: [] }] }),
            resultItem({ teamCode: away.code }),
          ],
          playByPlay: [{ actions: [goalAction({ pbpa_When: "18'" })] }],
        }),
      );
      const [scorer] = (await loadMatchDetail("unit-id", home, away)).scorers;
      expect(scorer!.minute).toBe(18);
      expect(scorer).not.toHaveProperty("stoppage");
    });

    it("maps SHOT/FRD/PEN action codes to open_play/free_kick/penalty, and anything else to other", async () => {
      stubFetchOnce(
        baseResponse({
          items: [
            resultItem({ teamCode: home.code, teamAthletes: [{ bib: "10", athlete: { name: "MESSI Lionel" }, eventUnitEntries: [] }] }),
            resultItem({ teamCode: away.code }),
          ],
          playByPlay: [{
            actions: [
              goalAction({ pbpa_Action: "SHOT", pbpa_When: "1'" }),
              goalAction({ pbpa_Action: "FRD", pbpa_When: "2'" }),
              goalAction({ pbpa_Action: "PEN", pbpa_When: "3'" }),
              goalAction({ pbpa_Action: "HDR", pbpa_When: "4'" }),
            ],
          }],
        }),
      );
      const { scorers } = await loadMatchDetail("unit-id", home, away);
      expect(scorers.map((scorer) => scorer.type)).toEqual(["open_play", "free_kick", "penalty", "other"]);
    });

    it("resolves the scoring team and assist by cross-referencing bib numbers against each team's roster", async () => {
      stubFetchOnce(
        baseResponse({
          items: [
            resultItem({
              teamCode: home.code,
              teamAthletes: [
                { bib: "9", athlete: { name: "ALVAREZ Julian" }, eventUnitEntries: [] },
                { bib: "5", athlete: { name: "FERNANDEZ Ezequiel" }, eventUnitEntries: [] },
              ],
            }),
            resultItem({ teamCode: away.code }),
          ],
          playByPlay: [{
            actions: [{
              pbpa_Action: "SHOT",
              pbpa_When: "68'",
              pbpa_Result: "GOAL",
              competitors: [{ pbpc_code: home.code, athletes: [{ pbpat_bib: "9", pbpat_role: "SCR" }, { pbpat_bib: "5", pbpat_role: "ASSIST" }] }],
            }],
          }],
        }),
      );
      const [scorer] = (await loadMatchDetail("unit-id", home, away)).scorers;
      expect(scorer).toMatchObject({ team: "home", player: "ALVAREZ Julian", assist: "FERNANDEZ Ezequiel" });
    });

    it("sorts scorers by minute, regardless of play-by-play order", async () => {
      stubFetchOnce(
        baseResponse({
          items: [
            resultItem({ teamCode: home.code, teamAthletes: [{ bib: "10", athlete: { name: "MESSI Lionel" }, eventUnitEntries: [] }] }),
            resultItem({ teamCode: away.code }),
          ],
          playByPlay: [{ actions: [goalAction({ pbpa_When: "80'" }), goalAction({ pbpa_When: "10'" }), goalAction({ pbpa_When: "45'" })] }],
        }),
      );
      const { scorers } = await loadMatchDetail("unit-id", home, away);
      expect(scorers.map((scorer) => scorer.minute)).toEqual([10, 45, 80]);
    });
  });
});
