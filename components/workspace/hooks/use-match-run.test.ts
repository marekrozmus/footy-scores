// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MatchSummary } from "@/lib/odf/types";

import { useMatchRun } from "./use-match-run";

const summary = { id: "m1" } as MatchSummary;

function setup(overrides: Partial<Parameters<typeof useMatchRun>[0]> = {}) {
  const schedule = vi.fn((fn: () => void) => fn());
  const clearAll = vi.fn();
  const notify = vi.fn();
  const onBeforeRun = vi.fn();
  const onReset = vi.fn();
  const { result } = renderHook(() => useMatchRun({ schedule, clearAll, notify, onBeforeRun, onReset, ...overrides }));
  return { result, schedule, clearAll, notify, onBeforeRun, onReset };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMatchRun", () => {
  it("starts idle with no summaries", () => {
    const { result } = setup();
    expect(result.current.phase).toBe("idle");
    expect(result.current.summaries).toEqual([]);
  });

  it("run(): clears timers, calls onBeforeRun, then goes loading -> generating -> complete with the fetched summaries", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ matches: [summary] }), { status: 200 })));
    const { result, clearAll, onBeforeRun } = setup();

    await act(async () => {
      await result.current.run();
    });

    expect(clearAll).toHaveBeenCalledOnce();
    expect(onBeforeRun).toHaveBeenCalledOnce();
    expect(result.current.summaries).toEqual([summary]);
    expect(result.current.phase).toBe("complete");
  });

  it("run(): goes to error with the server's message on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Olympics is down" }), { status: 502 })));
    const { result } = setup();

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.phase).toBe("error");
    expect(result.current.errorMessage).toBe("Olympics is down");
  });

  it("reset(): clears timers, resets phase/summaries, calls onReset, and notifies success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    const { result, clearAll, onReset, notify } = setup();

    await act(async () => {
      await result.current.reset();
    });

    expect(clearAll).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
    expect(result.current.phase).toBe("idle");
    expect(result.current.summaries).toEqual([]);
    expect(notify).toHaveBeenCalledWith("Run reset — server cache cleared");
  });

  it("reset(): still resets local state and notifies even if the server cache clear fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const { result, onReset, notify } = setup();

    await act(async () => {
      await result.current.reset();
    });

    expect(onReset).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("server cache clear failed"));
  });
});
