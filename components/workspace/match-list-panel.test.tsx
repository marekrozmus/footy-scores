// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MatchListPanel } from "./match-list-panel";
import { matchRow } from "./test-fixtures";

const baseProps = {
  leftWidth: 58,
  phase: "idle" as const,
  dataReady: false,
  rows: [],
  filtered: [],
  compareSummary: null,
  sort: { field: "kickoff" as const, dir: "asc" as const },
  onSortChange: vi.fn(),
  selected: undefined,
  onSelectRow: vi.fn(),
  errorMessage: "",
  onRun: vi.fn(),
  gender: "All",
  onGenderChange: vi.fn(),
  stage: "All stages",
  onStageChange: vi.fn(),
  stages: ["All stages"],
  team: "All teams",
  onTeamChange: vi.fn(),
  teams: ["All teams"],
  query: "",
  onQueryChange: vi.fn(),
  filtersOpen: false,
  onFiltersOpenChange: vi.fn(),
  activeFilterCount: 0,
  onClearFilters: vi.fn(),
  onClearFiltersAndQuery: vi.fn(),
  comparing: false,
  exporting: false,
  compareOpen: false,
  exportOpen: false,
  onToggleCompare: vi.fn(),
  onToggleExport: vi.fn(),
  onCompare: vi.fn(),
  onExport: vi.fn(),
  selectedReady: false,
};

describe("MatchListPanel", () => {
  it("idle: clicking the call-to-action calls onRun", async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    render(<MatchListPanel {...baseProps} phase="idle" onRun={onRun} />);

    await user.click(screen.getByRole("button", { name: "Load & generate" }));

    expect(onRun).toHaveBeenCalledOnce();
  });

  it("loading: shows a loading message and no match rows", () => {
    render(<MatchListPanel {...baseProps} phase="loading" />);
    expect(screen.getByText(/fetching and parsing schedule/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /versus/i })).not.toBeInTheDocument();
  });

  it("error: shows the error message and Retry run calls onRun", async () => {
    const onRun = vi.fn();
    const user = userEvent.setup();
    render(<MatchListPanel {...baseProps} phase="error" errorMessage="Olympic schedule request failed (502)" onRun={onRun} />);

    expect(screen.getByText("Olympic schedule request failed (502)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry run/i }));

    expect(onRun).toHaveBeenCalledOnce();
  });

  it("complete with matches: renders one row per match and selecting one calls onSelectRow", async () => {
    const onSelectRow = vi.fn();
    const user = userEvent.setup();
    const rows = [matchRow({ id: "match-1", home: "Argentina", away: "Morocco" }), matchRow({ id: "match-2", home: "Spain", away: "Japan" })];
    render(<MatchListPanel {...baseProps} phase="complete" dataReady={true} rows={rows} filtered={rows} onSelectRow={onSelectRow} />);

    expect(screen.getAllByRole("button", { name: /versus/i })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /spain versus japan/i }));

    expect(onSelectRow).toHaveBeenCalledWith("match-2");
  });

  it("complete with no matches after filtering: shows the empty state and Clear filters calls onClearFiltersAndQuery", async () => {
    const onClearFiltersAndQuery = vi.fn();
    const user = userEvent.setup();
    render(<MatchListPanel {...baseProps} phase="complete" dataReady={true} rows={[matchRow()]} filtered={[]} onClearFiltersAndQuery={onClearFiltersAndQuery} />);

    expect(screen.getByText(/no football matches found/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(onClearFiltersAndQuery).toHaveBeenCalledOnce();
  });

  it("shows a compare summary badge only once a compare run has happened", () => {
    const { rerender } = render(<MatchListPanel {...baseProps} compareSummary={null} />);
    expect(screen.queryByText(/compared/i)).not.toBeInTheDocument();

    rerender(<MatchListPanel {...baseProps} compareSummary={{ total: 58, passed: 55 }} />);
    expect(screen.getByText(/compared/i)).toBeInTheDocument();
  });
});
