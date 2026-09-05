// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FootballRecord } from "@/lib/odf/record";

import { MatchInspectorPanel } from "./match-inspector-panel";
import { matchRow } from "./test-fixtures";
import type { DetailEntry } from "./types";

const record: FootballRecord = {
  competition: { name: "Olympic Games Paris 2024 · Football Men", season: "2024", round: "Men's Group B" },
  venue: { name: "Geoffroy-Guichard Stadium", city: "Saint-Etienne" },
  kickoff: "2024-07-24T15:00:00+02:00",
  status: "FT",
  teams: { home: "Argentina", away: "Morocco" },
  score: { home: 1, away: 2, halfTime: { home: 0, away: 1 } },
  scorers: [],
  lineups: {
    home: { team: "Argentina", formation: "4-4-2", coach: "MASCHERANO Javier", startingXI: [], bench: [] },
    away: { team: "Morocco", formation: "4-2-3-1", coach: "SEKTIOUI Tarik", startingXI: [], bench: [] },
  },
  meta: {
    eventId: "FBLMTEAM11------------GPB-000100--",
    discipline: "Football",
    gender: "Men",
    endpoint: "/v1/football/matches/2024-07-24-argentina-vs-morocco",
    sourceUrl: "https://stacy.olympics.com/en/paris-2024/results/football/men/gpb-000100--",
    attendance: 26717,
    referee: "NYBERG Glenn",
  },
};

const baseProps = {
  sheetOpen: false,
  onSheetOpenChange: vi.fn(),
  selected: matchRow(),
  endpoint: "/v1/football/matches/2024-07-24-argentina-vs-morocco",
  baseUrl: "http://localhost:3000",
  onBaseUrlChange: vi.fn(),
  detailEntry: undefined as DetailEntry | undefined,
  inspector: "endpoint" as const,
  onInspectorChange: vi.fn(),
  onCopy: vi.fn(),
  onRetryDetail: vi.fn(),
  compareResult: undefined,
  comparing: false,
  onCompareSelected: vi.fn(),
  rows: [matchRow()],
  filtered: [matchRow()],
  dataReady: true,
  sort: { field: "kickoff" as const, dir: "asc" as const },
  exporting: false,
  compareOpen: false,
  exportOpen: false,
  onToggleCompare: vi.fn(),
  onToggleExport: vi.fn(),
  onCompare: vi.fn(),
  onExport: vi.fn(),
  selectedReady: false,
};

describe("MatchInspectorPanel", () => {
  it("shows a placeholder and no tabs content when nothing is selected", () => {
    render(<MatchInspectorPanel {...baseProps} selected={undefined} />);
    expect(screen.getByText(/select a match to inspect/i)).toBeInTheDocument();
  });

  it("clicking a tab calls onInspectorChange with that tab", async () => {
    const onInspectorChange = vi.fn();
    const user = userEvent.setup();
    render(<MatchInspectorPanel {...baseProps} onInspectorChange={onInspectorChange} detailEntry={{ status: "ready", record }} />);

    await user.click(screen.getAllByRole("tab", { name: "Compare" })[0]!);

    expect(onInspectorChange).toHaveBeenCalledWith("compare");
  });

  describe("Source data tab gating", () => {
    it("is disabled while detail hasn't started loading yet", () => {
      render(<MatchInspectorPanel {...baseProps} detailEntry={undefined} />);
      expect(screen.getAllByRole("tab", { name: "Source data" })[0]).toBeDisabled();
    });

    it("is disabled while detail is loading", () => {
      render(<MatchInspectorPanel {...baseProps} detailEntry={{ status: "loading" }} />);
      expect(screen.getAllByRole("tab", { name: "Source data" })[0]).toBeDisabled();
    });

    it("is enabled once detail is ready", () => {
      render(<MatchInspectorPanel {...baseProps} detailEntry={{ status: "ready", record }} />);
      expect(screen.getAllByRole("tab", { name: "Source data" })[0]).toBeEnabled();
    });

    it("is enabled on error too, so the retry UI stays reachable", () => {
      render(<MatchInspectorPanel {...baseProps} detailEntry={{ status: "error", message: "boom" }} />);
      expect(screen.getAllByRole("tab", { name: "Source data" })[0]).toBeEnabled();
    });
  });

  describe("loading and error banners", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not show the loading banner immediately (debounced to avoid flicker)", () => {
      render(<MatchInspectorPanel {...baseProps} detailEntry={{ status: "loading" }} />);
      expect(screen.queryByText(/loading match detail/i)).not.toBeInTheDocument();
    });

    it("shows the loading banner once the delay elapses", () => {
      render(<MatchInspectorPanel {...baseProps} detailEntry={{ status: "loading" }} />);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByText(/loading match detail/i)).toBeInTheDocument();
    });

    it("shows the error banner immediately, with no debounce, and Retry calls onRetryDetail", () => {
      // fireEvent instead of userEvent here — userEvent's internal delay loop doesn't mix well
      // with fake timers, and this test has no need for real timing/debounce behavior anyway.
      const onRetryDetail = vi.fn();
      render(<MatchInspectorPanel {...baseProps} detailEntry={{ status: "error", message: "Match detail request failed (502)" }} onRetryDetail={onRetryDetail} />);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Match detail request failed (502)");
      fireEvent.click(within(alert).getByRole("button", { name: /retry/i }));

      expect(onRetryDetail).toHaveBeenCalledOnce();
    });
  });

  describe("Endpoint tab", () => {
    it("shows the GET endpoint and copies the full URL with base URL prefixed", async () => {
      const onCopy = vi.fn();
      const user = userEvent.setup();
      render(<MatchInspectorPanel {...baseProps} inspector="endpoint" onCopy={onCopy} />);

      expect(screen.getByText("/v1/football/matches/2024-07-24-argentina-vs-morocco")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /copy endpoint/i }));

      expect(onCopy).toHaveBeenCalledWith("http://localhost:3000/v1/football/matches/2024-07-24-argentina-vs-morocco", expect.any(String));
    });

    it("copies a working curl command", async () => {
      const onCopy = vi.fn();
      const user = userEvent.setup();
      render(<MatchInspectorPanel {...baseProps} inspector="endpoint" onCopy={onCopy} />);

      await user.click(screen.getByRole("button", { name: /curl/i }));

      expect(onCopy).toHaveBeenCalledWith(expect.stringContaining("curl -s 'http://localhost:3000/v1/football/matches/2024-07-24-argentina-vs-morocco'"), expect.any(String));
    });
  });

  describe("Source data tab content", () => {
    it("shows the strict (no meta) JSON when ready", () => {
      render(<MatchInspectorPanel {...baseProps} inspector="data" detailEntry={{ status: "ready", record }} />);
      const pre = screen.getByText(/"competition"/).textContent!;
      expect(pre).not.toContain('"meta"');
      expect(pre).toContain('"teams"');
    });

    it("copies the strict JSON, not the raw record with meta", async () => {
      const onCopy = vi.fn();
      const user = userEvent.setup();
      render(<MatchInspectorPanel {...baseProps} inspector="data" detailEntry={{ status: "ready", record }} onCopy={onCopy} />);

      await user.click(screen.getByRole("button", { name: /copy json/i }));

      const [copiedText] = onCopy.mock.calls[0] as [string, string];
      expect(copiedText).not.toContain("meta");
    });

    it("shows the error message and a working retry button", async () => {
      const onRetryDetail = vi.fn();
      const user = userEvent.setup();
      render(<MatchInspectorPanel {...baseProps} inspector="data" detailEntry={{ status: "error", message: "Failed to load match detail." }} onRetryDetail={onRetryDetail} />);

      expect(screen.getByText("Failed to load match detail.")).toBeInTheDocument();
      // Both the global error banner and this tab's own error state render a "Retry" button —
      // scope to the tabpanel to click this tab's one specifically.
      await user.click(within(screen.getByRole("tabpanel")).getByRole("button", { name: /retry/i }));

      expect(onRetryDetail).toHaveBeenCalledOnce();
    });
  });

  describe("Compare tab", () => {
    it("disables 'Compare this match' until detail is ready", () => {
      render(<MatchInspectorPanel {...baseProps} inspector="compare" detailEntry={{ status: "loading" }} />);
      expect(screen.getByRole("button", { name: /compare this match/i })).toBeDisabled();
    });

    it("enables 'Compare this match' once detail is ready, and clicking it calls onCompareSelected", async () => {
      const onCompareSelected = vi.fn();
      const user = userEvent.setup();
      render(<MatchInspectorPanel {...baseProps} inspector="compare" detailEntry={{ status: "ready", record }} onCompareSelected={onCompareSelected} />);

      const button = screen.getByRole("button", { name: /compare this match/i });
      expect(button).toBeEnabled();
      await user.click(button);

      expect(onCompareSelected).toHaveBeenCalledOnce();
    });

    it("shows 'not run yet' when there's no result", () => {
      render(<MatchInspectorPanel {...baseProps} inspector="compare" compareResult={undefined} />);
      expect(screen.getByText(/comparison has not run/i)).toBeInTheDocument();
    });

    it("shows a pass state", () => {
      render(<MatchInspectorPanel {...baseProps} inspector="compare" compareResult={{ status: "pass" }} />);
      expect(screen.getByText(/exact match/i)).toBeInTheDocument();
    });

    it("shows an error state with the message", () => {
      render(<MatchInspectorPanel {...baseProps} inspector="compare" compareResult={{ status: "error", message: "Tested API returned 500" }} />);
      expect(screen.getByText("Tested API returned 500")).toBeInTheDocument();
    });

    it("shows a fail state with a diff row per difference", () => {
      render(
        <MatchInspectorPanel
          {...baseProps}
          inspector="compare"
          compareResult={{ status: "fail", diffs: [{ path: "score.home", kind: "changed", expected: 1, actual: 2 }] }}
        />,
      );
      expect(screen.getByText("score.home")).toBeInTheDocument();
      expect(screen.getByText("1 difference")).toBeInTheDocument();
    });
  });
});
