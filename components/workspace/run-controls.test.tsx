// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RunControls } from "./run-controls";

describe("RunControls", () => {
  it("shows 'Load & generate' enabled when not running", () => {
    render(<RunControls running={false} menuOpen={false} onMenuOpenChange={vi.fn()} onReset={vi.fn()} onRun={vi.fn()} />);
    const runButtons = screen.getAllByRole("button", { name: /load & generate/i });
    expect(runButtons[0]).toBeEnabled();
  });

  it("disables the run button and shows 'Running…' while running", () => {
    render(<RunControls running={true} menuOpen={false} onMenuOpenChange={vi.fn()} onReset={vi.fn()} onRun={vi.fn()} />);
    const runButtons = screen.getAllByRole("button", { name: /running…/i });
    expect(runButtons[0]).toBeDisabled();
  });

  it("calls onRun when the desktop run button is clicked", async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    render(<RunControls running={false} menuOpen={false} onMenuOpenChange={vi.fn()} onReset={vi.fn()} onRun={onRun} />);

    await user.click(screen.getAllByRole("button", { name: /load & generate/i })[0]!);

    expect(onRun).toHaveBeenCalledOnce();
  });

  it("opens the mobile menu via the hamburger button", async () => {
    const onMenuOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<RunControls running={false} menuOpen={false} onMenuOpenChange={onMenuOpenChange} onReset={vi.fn()} onRun={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /open workspace menu/i }));

    expect(onMenuOpenChange).toHaveBeenCalledWith(true);
  });

  it("renders the mobile menu dialog when menuOpen is true, and its Reset both closes the menu and calls onReset", async () => {
    const onMenuOpenChange = vi.fn();
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(<RunControls running={false} menuOpen={true} onMenuOpenChange={onMenuOpenChange} onReset={onReset} onRun={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: /workspace menu/i });
    await user.click(within(dialog).getByRole("button", { name: /reset/i }));

    expect(onReset).toHaveBeenCalledOnce();
    expect(onMenuOpenChange).toHaveBeenCalledWith(false);
  });
});
