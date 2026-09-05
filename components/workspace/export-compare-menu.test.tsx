// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ExportCompareMenu } from "./export-compare-menu";

const baseProps = {
  variant: "desktop" as const,
  totalCount: 58,
  filteredCount: 12,
  dataReady: true,
  comparing: false,
  exporting: false,
  compareOpen: false,
  exportOpen: false,
  onToggleCompare: vi.fn(),
  onToggleExport: vi.fn(),
  onCompare: vi.fn(),
  onExport: vi.fn(),
  selectedReady: true,
};

describe("ExportCompareMenu", () => {
  it("disables both top-level buttons until the schedule is loaded", () => {
    render(<ExportCompareMenu {...baseProps} dataReady={false} />);
    expect(screen.getByRole("button", { name: /compare/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export json/i })).toBeDisabled();
  });

  it("disables Compare while a comparison is already running, independent of Export JSON", () => {
    render(<ExportCompareMenu {...baseProps} comparing={true} />);
    expect(screen.getByRole("button", { name: /comparing…/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export json/i })).toBeEnabled();
  });

  it("calls onToggleExport, not onExport, when the top-level Export JSON button itself is clicked", async () => {
    // This is a fully controlled component — exportOpen/compareOpen come from the parent, so
    // clicking the toggle button only requests a state change; it doesn't open anything by itself.
    const onToggleExport = vi.fn();
    const user = userEvent.setup();
    render(<ExportCompareMenu {...baseProps} onToggleExport={onToggleExport} />);

    await user.click(screen.getByRole("button", { name: /export json/i }));

    expect(onToggleExport).toHaveBeenCalledOnce();
  });

  it("shows the total/filtered counts in the export scope options when open", () => {
    render(<ExportCompareMenu {...baseProps} exportOpen={true} />);
    expect(screen.getByText("All 58 matches")).toBeInTheDocument();
    expect(screen.getByText("Filtered (12)")).toBeInTheDocument();
  });

  it("calls onExport with the clicked scope", async () => {
    const onExport = vi.fn();
    const user = userEvent.setup();
    render(<ExportCompareMenu {...baseProps} exportOpen={true} onExport={onExport} />);

    await user.click(screen.getByText("Filtered (12)"));

    expect(onExport).toHaveBeenCalledWith("filtered");
  });

  it("disables 'Selected match only' in both dropdowns when selectedReady is false", () => {
    render(<ExportCompareMenu {...baseProps} selectedReady={false} exportOpen={true} compareOpen={true} />);

    const selectedOnlyButtons = screen.getAllByText("Selected match only").map((el) => el.closest("button")!);
    expect(selectedOnlyButtons).toHaveLength(2);
    for (const button of selectedOnlyButtons) expect(button).toBeDisabled();
  });

  it("does not call onExport/onCompare when clicking the disabled 'Selected match only' option", async () => {
    const onExport = vi.fn();
    const user = userEvent.setup();
    render(<ExportCompareMenu {...baseProps} selectedReady={false} exportOpen={true} onExport={onExport} />);

    await user.click(screen.getByText("Selected match only"));

    expect(onExport).not.toHaveBeenCalled();
  });

  it("keeps 'Selected match only' enabled when selectedReady is true", () => {
    render(<ExportCompareMenu {...baseProps} selectedReady={true} exportOpen={true} />);
    expect(screen.getByText("Selected match only").closest("button")).toBeEnabled();
  });
});
