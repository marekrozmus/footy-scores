// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useToast } from "./use-toast";

describe("useToast", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useToast(vi.fn()));
    expect(result.current.toast).toBe("");
  });

  it("notify sets the toast text and schedules its own dismissal", () => {
    let dismiss: (() => void) | undefined;
    const schedule = vi.fn((fn: () => void) => { dismiss = fn; });
    const { result } = renderHook(() => useToast(schedule));

    act(() => result.current.notify("Exported 3 records"));

    expect(result.current.toast).toBe("Exported 3 records");
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 2200);

    act(() => dismiss?.());
    expect(result.current.toast).toBe("");
  });

  it("a later notify replaces the current toast text", () => {
    const scheduled: (() => void)[] = [];
    const schedule = vi.fn((fn: () => void) => scheduled.push(fn));
    const { result } = renderHook(() => useToast(schedule));

    act(() => result.current.notify("first"));
    act(() => result.current.notify("second"));

    expect(result.current.toast).toBe("second");
  });
});
