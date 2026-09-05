// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTimers } from "./use-timers";

describe("useTimers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs a scheduled callback after the given delay", () => {
    const { result } = renderHook(() => useTimers());
    const fn = vi.fn();
    act(() => result.current.schedule(fn, 300));

    act(() => vi.advanceTimersByTime(299));
    expect(fn).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("clearAll cancels every scheduled callback that hasn't fired yet", () => {
    const { result } = renderHook(() => useTimers());
    const a = vi.fn();
    const b = vi.fn();
    act(() => {
      result.current.schedule(a, 100);
      result.current.schedule(b, 200);
    });

    act(() => result.current.clearAll());
    act(() => vi.advanceTimersByTime(500));

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("clears any still-pending timers on unmount", () => {
    const { result, unmount } = renderHook(() => useTimers());
    const fn = vi.fn();
    act(() => result.current.schedule(fn, 100));

    unmount();
    act(() => vi.advanceTimersByTime(500));

    expect(fn).not.toHaveBeenCalled();
  });
});
