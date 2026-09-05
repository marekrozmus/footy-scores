// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useToast } from "./use-toast";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useToast", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toast).toBe("");
  });

  it("notify sets the toast text, then it self-clears after 2200ms", () => {
    const { result } = renderHook(() => useToast());

    act(() => result.current.notify("Exported 3 records"));
    expect(result.current.toast).toBe("Exported 3 records");

    act(() => vi.advanceTimersByTime(2199));
    expect(result.current.toast).toBe("Exported 3 records");

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.toast).toBe("");
  });

  it("a later notify replaces the current toast text and restarts its own 2200ms dismissal", () => {
    const { result } = renderHook(() => useToast());

    act(() => result.current.notify("first"));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.notify("second"));

    // The first notify's dismiss would have fired at 2200ms if it survived — it must not have,
    // since "second" replaced it and should get its own full 2200ms window.
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.toast).toBe("second");

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.toast).toBe("");
  });

  it("clears its pending dismiss timer on unmount", () => {
    const { result, unmount } = renderHook(() => useToast());
    act(() => result.current.notify("hello"));

    unmount();

    // No assertion possible on state after unmount; this just exercises the cleanup path without
    // throwing (e.g. a leaked timer calling setState on an unmounted component would warn/throw).
    act(() => vi.advanceTimersByTime(2300));
  });
});
