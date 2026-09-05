import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMatchSummaries } from "./schedule";
import type { OdfCompetitionDaysResponse, OdfCompetitor, OdfDayScheduleResponse, OdfScheduleUnit } from "./types";

function competitor(overrides: Partial<OdfCompetitor> & Pick<OdfCompetitor, "order" | "name" | "noc" | "code">): OdfCompetitor {
  return { results: { mark: "0", winnerLoserTie: "" }, ...overrides };
}

function footballUnit(overrides: Partial<OdfScheduleUnit> = {}): OdfScheduleUnit {
  return {
    eventUnitName: "Men's Group B",
    id: "FBLMTEAM11------------GPB-000100--",
    disciplineCode: "FBL",
    genderCode: "M",
    eventUnitType: "HTEAM",
    scheduleItemType: "H2H_NOC",
    startDate: "2024-07-24T15:00:00+02:00",
    venueDescription: "Geoffroy-Guichard Stadium",
    locationDescription: "Geoffroy-Guichard Stadium, Saint-Etienne",
    statusDescription: "Finished",
    competitors: [
      competitor({ order: 0, name: "Argentina", noc: "ARG", code: "FBLMTEAM11--ARG01", results: { mark: "1", winnerLoserTie: "L" } }),
      competitor({ order: 1, name: "Morocco", noc: "MAR", code: "FBLMTEAM11--MAR01", results: { mark: "2", winnerLoserTie: "W" } }),
    ],
    extraData: { detailUrl: "/en/paris-2024/results/football/men/gpb-000100--" },
    ...overrides,
  };
}

function fetchJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(days: OdfCompetitionDaysResponse["days"], responses: Record<string, OdfDayScheduleResponse>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("competitiondays")) return fetchJsonResponse({ days });
      for (const [dayId, response] of Object.entries(responses)) {
        if (url.includes(`/day/ENG/${dayId}.json`)) return fetchJsonResponse(response);
      }
      throw new Error(`Unexpected URL in test: ${url}`);
    }),
  );
}

describe("loadMatchSummaries", () => {
  it("keeps only real two-team football matches, dropping other disciplines and non-match units", () => {
    const basketball: OdfScheduleUnit = { ...footballUnit(), disciplineCode: "BK3", id: "basketball-unit" };
    const victoryCeremony: OdfScheduleUnit = { ...footballUnit(), id: "victory-ceremony", eventUnitType: "CEREMONY", scheduleItemType: "VICTMEDAL", competitors: [] };

    stubFetch([{ id: "2024-07-24", name: "07/24/2024" }], {
      "2024-07-24": { units: [footballUnit(), basketball, victoryCeremony] },
    });

    return loadMatchSummaries().then((summaries) => {
      expect(summaries).toHaveLength(1);
      expect(summaries[0]!.id).toBe("FBLMTEAM11------------GPB-000100--");
    });
  });

  it("sorts matches ascending by kickoff across multiple days", async () => {
    const laterMatch = footballUnit({ id: "later", startDate: "2024-08-09T16:00:00+02:00" });
    const earlierMatch = footballUnit({ id: "earlier", startDate: "2024-07-25T17:00:00+02:00" });

    stubFetch(
      [{ id: "2024-07-24", name: "07/24/2024" }, { id: "2024-08-09", name: "08/09/2024" }],
      {
        "2024-07-24": { units: [laterMatch] },
        "2024-08-09": { units: [earlierMatch] },
      },
    );
    // Note: laterMatch/earlierMatch names describe kickoff order, not which day-file they're
    // returned from — the point of this test is that loadMatchSummaries sorts by kickoff, not by
    // the order the day requests happen to resolve in.

    const summaries = await loadMatchSummaries();
    expect(summaries.map((summary) => summary.id)).toEqual(["earlier", "later"]);
  });

  it("maps every field of a real match correctly", async () => {
    stubFetch([{ id: "2024-07-24", name: "07/24/2024" }], { "2024-07-24": { units: [footballUnit()] } });

    const [summary] = await loadMatchSummaries();

    expect(summary).toEqual({
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
    });
  });

  it("maps genderCode W to 'Women'", async () => {
    stubFetch([{ id: "2024-07-25", name: "07/25/2024" }], {
      "2024-07-25": { units: [footballUnit({ genderCode: "W", eventUnitName: "Women's Group C" })] },
    });

    const [summary] = await loadMatchSummaries();
    expect(summary!.gender).toBe("Women");
    expect(summary!.stage).toBe("Group C");
  });

  it("falls back to an empty sourceUrl when extraData.detailUrl is missing", async () => {
    stubFetch([{ id: "2024-07-24", name: "07/24/2024" }], {
      "2024-07-24": { units: [footballUnit({ extraData: undefined })] },
    });

    const [summary] = await loadMatchSummaries();
    expect(summary!.sourceUrl).toBe("");
  });

  it("keeps the full locationDescription as the city when there's no comma to split on", async () => {
    stubFetch([{ id: "2024-07-24", name: "07/24/2024" }], {
      "2024-07-24": { units: [footballUnit({ locationDescription: "Some Venue Only" })] },
    });

    const [summary] = await loadMatchSummaries();
    expect(summary!.city).toBe("Some Venue Only");
  });
});
