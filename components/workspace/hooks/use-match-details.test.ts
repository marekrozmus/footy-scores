// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

import { useMatchDetails } from "./use-match-details";

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

const record = { teams: { home: "Argentina", away: "Morocco" } } as unknown as FootballRecord;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMatchDetails", () => {
  it("goes loading -> ready and stores the fetched record", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(record), { status: 200 })));
    const { result } = renderHook(() => useMatchDetails());

    act(() => {
      void result.current.ensureDetail(summary);
    });
    expect(result.current.details.get(summary.id)).toEqual({ status: "loading" });

    await waitFor(() => expect(result.current.details.get(summary.id)).toEqual({ status: "ready", record }));
  });

  it("goes loading -> error with the server's message on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "boom" }), { status: 500 })));
    const { result } = renderHook(() => useMatchDetails());

    act(() => {
      result.current.ensureDetail(summary).catch(() => {});
    });

    await waitFor(() => expect(result.current.details.get(summary.id)).toEqual({ status: "error", message: "boom" }));
  });

  it("only fetches once for concurrent calls with the same match id (in-flight dedup)", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(record), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useMatchDetails());

    await act(async () => {
      await Promise.all([result.current.ensureDetail(summary), result.current.ensureDetail(summary)]);
    });

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("retryDetail clears the in-flight cache and fetches again", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "down" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useMatchDetails());

    await act(async () => {
      await result.current.ensureDetail(summary).catch(() => {});
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    act(() => {
      result.current.retryDetail(summary);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("resetDetails clears both the cache map and the in-flight request map", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(record), { status: 200 })));
    const { result } = renderHook(() => useMatchDetails());

    await act(async () => {
      await result.current.ensureDetail(summary);
    });
    expect(result.current.details.size).toBe(1);

    act(() => result.current.resetDetails());

    expect(result.current.details.size).toBe(0);
  });
});
