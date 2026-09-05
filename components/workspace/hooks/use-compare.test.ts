// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

import { matchRow } from "../test-fixtures";
import type { MatchRowData } from "../types";
import { useCompare } from "./use-compare";

const row: MatchRowData = matchRow();
const summary: MatchSummary = {
  id: row.id,
  kickoff: row.iso,
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
const record = { teams: { home: "Argentina", away: "Morocco" } } as unknown as FootballRecord;

function setup(overrides: Partial<{ rows: MatchRowData[]; filtered: MatchRowData[]; selected: MatchRowData | undefined; baseUrl: string }> = {}) {
  const notify = vi.fn();
  const { result } = renderHook(() =>
    useCompare({ rows: [row], filtered: [row], selected: row, baseUrl: "http://localhost:3000", notify, ...overrides }),
  );
  return { result, notify };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCompare", () => {
  it("compareSummary is null before any comparison has run", () => {
    const { result } = setup();
    expect(result.current.compareSummary).toBeNull();
  });

  it("runCompare: closes the dropdown, refuses without a base URL", async () => {
    const { result, notify } = setup({ baseUrl: "  " });

    await act(async () => {
      await result.current.runCompare("one");
    });

    expect(notify).toHaveBeenCalledWith("Enter a test API base URL first");
  });

  it("runCompare: stores per-match results and updates compareSummary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ results: [{ matchId: row.id, status: "pass" }] }), { status: 200 })),
    );
    const { result, notify } = setup();

    await act(async () => {
      await result.current.runCompare("all");
    });

    expect(result.current.compareResults.get(row.id)).toEqual({ status: "pass" });
    expect(result.current.compareSummary).toEqual({ total: 1, passed: 1 });
    expect(notify).toHaveBeenCalledWith("Compared 1: 1 passed, 0 failed");
  });

  it("runCompare: opens the result modal for a single-match run, not for bulk", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ results: [{ matchId: row.id, status: "pass" }] }), { status: 200 })),
    );
    const { result } = setup();

    await act(async () => {
      await result.current.runCompare("one");
    });
    expect(result.current.compareResultModalOpen).toBe(true);

    act(() => result.current.setCompareResultModalOpen(false));

    await act(async () => {
      await result.current.runCompare("all");
    });
    expect(result.current.compareResultModalOpen).toBe(false);
  });

  it("runCompare: notifies with the server's error message on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "tested API unreachable" }), { status: 502 })));
    const { result, notify } = setup();

    await act(async () => {
      await result.current.runCompare("one");
    });

    expect(notify).toHaveBeenCalledWith("tested API unreachable");
  });

  it("comparePasted: requires a selected match with ready detail", () => {
    const { result, notify } = setup();

    act(() => result.current.comparePasted(undefined, { status: "ready", record }, "{}"));
    expect(notify).toHaveBeenCalledWith("Select a match with loaded detail first");

    notify.mockClear();
    act(() => result.current.comparePasted(summary, { status: "loading" }, "{}"));
    expect(notify).toHaveBeenCalledWith("Select a match with loaded detail first");
  });

  it("comparePasted: rejects invalid JSON without touching compareResults", () => {
    const { result, notify } = setup();

    act(() => result.current.comparePasted(summary, { status: "ready", record }, "{not json"));

    expect(notify).toHaveBeenCalledWith("Pasted text is not valid JSON");
    expect(result.current.compareResults.size).toBe(0);
  });

  it("comparePasted: reports pass when the pasted JSON matches, and opens the modal", () => {
    const { result, notify } = setup();

    act(() => result.current.comparePasted(summary, { status: "ready", record }, JSON.stringify(record)));

    expect(result.current.compareResults.get(summary.id)).toEqual({ status: "pass" });
    expect(result.current.compareResultModalOpen).toBe(true);
    expect(notify).toHaveBeenCalledWith("Pasted JSON matches the generated reference");
  });

  it("comparePasted: reports fail with a diff count when the pasted JSON differs", () => {
    const { result, notify } = setup();

    act(() => result.current.comparePasted(summary, { status: "ready", record }, JSON.stringify({ teams: { home: "Someone Else" } })));

    const entry = result.current.compareResults.get(summary.id);
    expect(entry?.status).toBe("fail");
    expect(notify).toHaveBeenCalledWith(expect.stringMatching(/^Pasted JSON differs in \d+ places?$/));
  });
});
