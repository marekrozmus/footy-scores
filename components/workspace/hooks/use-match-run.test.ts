// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MatchSummary } from "@/lib/odf/types";

import { useMatchRun } from "./use-match-run";

const summary = { id: "m1" } as MatchSummary;

function setup(overrides: Partial<Parameters<typeof useMatchRun>[0]> = {}) {
  const notify = vi.fn();
  const onBeforeRun = vi.fn();
  const onReset = vi.fn();
  const { result } = renderHook(() => useMatchRun({ notify, onBeforeRun, onReset, ...overrides }));
  return { result, notify, onBeforeRun, onReset };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useMatchRun", () => {
  it("starts idle with no summaries", () => {
    const { result } = setup();
    expect(result.current.phase).toBe("idle");
    expect(result.current.summaries).toEqual([]);
  });

  it("run(): calls onBeforeRun, goes loading -> generating immediately, then complete after its own delay", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ matches: [summary] }), { status: 200 })));
    const { result, onBeforeRun } = setup();

    await act(async () => {
      await result.current.run();
    });

    expect(onBeforeRun).toHaveBeenCalledOnce();
    expect(result.current.summaries).toEqual([summary]);
    expect(result.current.phase).toBe("generating");

    act(() => vi.advanceTimersByTime(250));
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

  it("a second run() cancels the first run's pending phase-transition timer instead of stacking", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ matches: [summary] }), { status: 200 })));
    const { result } = setup();

    await act(async () => {
      await result.current.run();
    });
    act(() => vi.advanceTimersByTime(100));

    await act(async () => {
      await result.current.run();
    });
    // The first run's 250ms timer had 150ms left when the second run started — it must not fire.
    act(() => vi.advanceTimersByTime(150));
    expect(result.current.phase).toBe("generating");

    act(() => vi.advanceTimersByTime(100));
    expect(result.current.phase).toBe("complete");
  });

  it("reset(): resets phase/summaries, calls onReset, and notifies success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    const { result, onReset, notify } = setup();

    await act(async () => {
      await result.current.reset();
    });

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

  it("reset(): cancels a run's pending phase-transition timer — the fix for the stuck-toast bug", async () => {
    // Regression test: reset() and useToast's dismiss timer used to share one timer bag, so
    // resetting shortly after a run (or clicking Load & generate shortly after Reset) would
    // silently cancel the *other* hook's pending timer too. Now each hook owns its own timer, so
    // this only has to prove reset() still cancels its own leftover run-transition timer.
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "DELETE" ? new Response(null, { status: 200 }) : new Response(JSON.stringify({ matches: [summary] }), { status: 200 }),
    ));
    const { result } = setup();

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.phase).toBe("generating");

    await act(async () => {
      await result.current.reset();
    });
    act(() => vi.advanceTimersByTime(250));

    expect(result.current.phase).toBe("idle");
  });
});
