// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDismissOnEscape } from "./use-dismiss-on-escape";

describe("useDismissOnEscape", () => {
  it("does nothing on Escape while closed", () => {
    const onOpenChange = vi.fn();
    renderHook(() => useDismissOnEscape(false, onOpenChange));

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("calls onOpenChange(false) on Escape while open", () => {
    const onOpenChange = vi.fn();
    renderHook(() => useDismissOnEscape(true, onOpenChange));

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));

    expect(onOpenChange).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("ignores keys other than Escape", () => {
    const onOpenChange = vi.fn();
    renderHook(() => useDismissOnEscape(true, onOpenChange));

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })));

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("stops listening once open flips back to false", () => {
    const onOpenChange = vi.fn();
    const { rerender } = renderHook(({ open }) => useDismissOnEscape(open, onOpenChange), { initialProps: { open: true } });

    rerender({ open: false });
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
