// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

import { matchRow } from "../test-fixtures";
import type { MatchRowData } from "../types";
import { useExportJson } from "./use-export-json";

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

const row: MatchRowData = matchRow({ id: summary.id });
const record = { teams: { home: "Argentina", away: "Morocco" } } as unknown as FootballRecord;

function setup({
  rows,
  filtered,
  selected,
  ensureDetail = vi.fn(async () => record),
}: {
  rows: MatchRowData[];
  filtered: MatchRowData[];
  selected: MatchRowData | undefined;
  ensureDetail?: (summary: MatchSummary) => Promise<FootballRecord>;
}) {
  const summaryById = new Map([[summary.id, summary]]);
  const notify = vi.fn();
  const onDone = vi.fn();
  const { result } = renderHook(() => useExportJson({ rows, filtered, selected, summaryById, ensureDetail, notify, onDone }));
  return { result, ensureDetail, notify, onDone };
}

let clickSpy: ReturnType<typeof vi.fn>;
let capturedBlob: Blob | undefined;

beforeEach(() => {
  capturedBlob = undefined;
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn((blob: Blob) => { capturedBlob = blob; return "blob:mock"; }),
    revokeObjectURL: vi.fn(),
  });
  clickSpy = vi.fn();
  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = realCreateElement(tag);
    if (tag === "a") el.click = clickSpy as unknown as typeof el.click;
    return el;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useExportJson", () => {
  it("scope 'one': downloads a single record named after its match slug", async () => {
    const { result, ensureDetail, onDone } = setup({ rows: [row], filtered: [row], selected: row });

    await act(async () => {
      await result.current.exportJson("one");
    });

    expect(onDone).toHaveBeenCalledOnce();
    expect(ensureDetail).toHaveBeenCalledWith(summary);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(capturedBlob?.type).toBe("application/json");
    await expect(capturedBlob!.text()).resolves.toBe(JSON.stringify(record, null, 2));
  });

  it("scope 'all'/'filtered': downloads a zip with one JSON file per match, named by slug", async () => {
    const { result } = setup({ rows: [row], filtered: [row], selected: row });

    await act(async () => {
      await result.current.exportJson("all");
    });

    expect(clickSpy).toHaveBeenCalledOnce();
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(capturedBlob!);
    expect(Object.keys(zip.files)).toEqual(["2024-07-24-argentina-vs-morocco.json"]);
    await expect(zip.files["2024-07-24-argentina-vs-morocco.json"]!.async("string")).resolves.toBe(JSON.stringify(record, null, 2));
  });

  it("does nothing when the scope has no matches (still closes the dropdown)", async () => {
    const { result, ensureDetail, onDone } = setup({ rows: [], filtered: [], selected: undefined });

    await act(async () => {
      await result.current.exportJson("one");
    });

    expect(onDone).toHaveBeenCalledOnce();
    expect(ensureDetail).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("notifies failure and resets exporting when a match's detail can't be loaded", async () => {
    const ensureDetail = vi.fn(async (): Promise<FootballRecord> => { throw new Error("boom"); });
    const { result, notify } = setup({ rows: [row], filtered: [row], selected: row, ensureDetail });

    await act(async () => {
      await result.current.exportJson("one");
    });

    expect(notify).toHaveBeenCalledWith("Export failed — one or more matches could not be loaded");
    expect(result.current.exporting).toBe(false);
  });
});
