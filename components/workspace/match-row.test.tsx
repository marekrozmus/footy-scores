// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MatchRow } from "./match-row";
import { matchRow } from "./test-fixtures";

describe("MatchRow", () => {
  it("exposes an accessible name describing the fixture", () => {
    render(<MatchRow row={matchRow()} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Argentina versus Morocco, 24 Jul at 15:00, Men" })).toBeInTheDocument();
  });

  it("calls onSelect when clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<MatchRow row={matchRow()} selected={false} onSelect={onSelect} />);

    await user.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("shows the score", () => {
    render(<MatchRow row={matchRow({ score: "1–2" })} selected={false} onSelect={vi.fn()} />);
    expect(screen.getAllByText("1–2").length).toBeGreaterThan(0);
  });
});
