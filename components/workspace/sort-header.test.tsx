// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SortHeader } from "./sort-header";

describe("SortHeader", () => {
  it("shows aria-sort=none and no direction arrow for an inactive field", () => {
    render(<SortHeader field="score" sort={{ field: "kickoff", dir: "asc" }} onSort={vi.fn()} />);
    expect(screen.getByRole("columnheader", { name: "Result" })).toHaveAttribute("aria-sort", "none");
  });

  it("reflects ascending/descending for the active field", () => {
    render(<SortHeader field="kickoff" sort={{ field: "kickoff", dir: "asc" }} onSort={vi.fn()} />);
    expect(screen.getByRole("columnheader")).toHaveAttribute("aria-sort", "ascending");
  });

  it("switching to a field that isn't active yet defaults to ascending", async () => {
    const onSort = vi.fn();
    const user = userEvent.setup();
    render(<SortHeader field="score" sort={{ field: "kickoff", dir: "asc" }} onSort={onSort} />);

    await user.click(screen.getByRole("columnheader"));

    expect(onSort).toHaveBeenCalledWith({ field: "score", dir: "asc" });
  });

  it("clicking the already-active field flips its direction instead of resetting to ascending", async () => {
    const onSort = vi.fn();
    const user = userEvent.setup();
    render(<SortHeader field="kickoff" sort={{ field: "kickoff", dir: "asc" }} onSort={onSort} />);

    await user.click(screen.getByRole("columnheader"));

    expect(onSort).toHaveBeenCalledWith({ field: "kickoff", dir: "desc" });
  });
});
