// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MatchFilters } from "./match-filters";

const baseProps = {
  gender: "All",
  onGenderChange: vi.fn(),
  stage: "All stages",
  onStageChange: vi.fn(),
  stages: ["All stages", "Group A", "Group B"],
  team: "All teams",
  onTeamChange: vi.fn(),
  teams: ["All teams", "Argentina", "Morocco"],
  query: "",
  onQueryChange: vi.fn(),
  sort: { field: "kickoff" as const, dir: "asc" as const },
  onSortChange: vi.fn(),
  filtersOpen: true, // the mobile sheet (with the sort-by control) only renders when open
  onFiltersOpenChange: vi.fn(),
  activeFilterCount: 0,
  filteredCount: 12,
  onClearFilters: vi.fn(),
};

describe("MatchFilters", () => {
  it("shows the active-filter count badge only when filters are applied", () => {
    const { rerender } = render(<MatchFilters {...baseProps} filtersOpen={false} activeFilterCount={0} />);
    expect(screen.queryByText("2")).not.toBeInTheDocument();

    rerender(<MatchFilters {...baseProps} filtersOpen={false} activeFilterCount={2} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("picking a sort option in the mobile sheet resolves the label back to the correct SortField", async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(<MatchFilters {...baseProps} onSortChange={onSortChange} />);

    await user.click(screen.getByRole("button", { name: /sort by/i }));
    await user.click(screen.getByRole("option", { name: "Result" }));

    expect(onSortChange).toHaveBeenCalledWith({ field: "score", dir: "asc" });
  });

  it("the direction toggle flips dir without changing field", async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(<MatchFilters {...baseProps} onSortChange={onSortChange} sort={{ field: "kickoff", dir: "asc" }} />);

    await user.click(screen.getByRole("button", { name: "asc" }));

    expect(onSortChange).toHaveBeenCalledWith({ field: "kickoff", dir: "desc" });
  });

  it("shows how many matches clicking 'Show N matches' will reveal", () => {
    render(<MatchFilters {...baseProps} filteredCount={7} />);
    expect(screen.getByRole("button", { name: "Show 7 matches" })).toBeInTheDocument();
  });
});
