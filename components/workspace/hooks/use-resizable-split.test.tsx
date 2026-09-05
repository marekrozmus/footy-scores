// @vitest-environment jsdom
import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useResizableSplit } from "./use-resizable-split";

function TestHarness({ onLeftWidth }: { onLeftWidth: (width: number) => void }) {
  const { leftWidth, splitRef, startResize } = useResizableSplit(58);
  onLeftWidth(leftWidth);
  return <div ref={splitRef} onMouseDown={startResize} data-testid="split" />;
}

function setupHarness() {
  let leftWidth = 58;
  const { container } = render(<TestHarness onLeftWidth={(w) => { leftWidth = w; }} />);
  const div = container.querySelector('[data-testid="split"]') as HTMLDivElement;
  div.getBoundingClientRect = () => ({ width: 1000, left: 0, right: 1000, top: 0, bottom: 0, height: 0, x: 0, y: 0, toJSON() {} });
  return { div, getLeftWidth: () => leftWidth };
}

describe("useResizableSplit", () => {
  it("starts at the given initial width", () => {
    const { getLeftWidth } = setupHarness();
    expect(getLeftWidth()).toBe(58);
  });

  it("updates leftWidth while dragging, as a percentage of the split container's width", () => {
    const { div, getLeftWidth } = setupHarness();
    fireEvent.mouseDown(div);
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 500 }));
    });
    expect(getLeftWidth()).toBe(50);
  });

  it("clamps to 28%-72% regardless of how far the cursor moves", () => {
    const { div, getLeftWidth } = setupHarness();
    fireEvent.mouseDown(div);
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: -500 }));
    });
    expect(getLeftWidth()).toBeCloseTo(28);

    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 1500 }));
    });
    expect(getLeftWidth()).toBe(72);
  });

  it("stops responding to mousemove once mouseup fires", () => {
    const { div, getLeftWidth } = setupHarness();
    fireEvent.mouseDown(div);
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 500 }));
    });
    expect(getLeftWidth()).toBe(50);

    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 900 }));
    });
    expect(getLeftWidth()).toBe(50);
  });

  it("ignores mousemove before any drag has started", () => {
    const { getLeftWidth } = setupHarness();
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 900 }));
    });
    expect(getLeftWidth()).toBe(58);
  });
});
