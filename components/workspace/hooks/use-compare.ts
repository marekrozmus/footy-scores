import { useCallback, useMemo, useState } from "react";

import { diffJson } from "@/lib/odf/diff";
import type { MatchSummary } from "@/lib/odf/types";

import type { CompareResultEntry, DetailEntry, ExportScope, MatchRowData } from "../types";
import { useDismissOnEscape } from "./use-dismiss-on-escape";

export function useCompare({
  rows,
  filtered,
  selected,
  baseUrl,
  notify,
}: {
  rows: MatchRowData[];
  filtered: MatchRowData[];
  selected: MatchRowData | undefined;
  baseUrl: string;
  notify: (message: string) => void;
}) {
  const [compareResults, setCompareResults] = useState<Map<string, CompareResultEntry>>(new Map());
  const [comparing, setComparing] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareResultModalOpen, setCompareResultModalOpen] = useState(false);

  useDismissOnEscape(compareResultModalOpen, setCompareResultModalOpen);

  const runCompare = useCallback(
    async (scope: ExportScope) => {
      const targetRows = scope === "all" ? rows : scope === "filtered" ? filtered : selected ? [selected] : [];
      const matchIds = targetRows.map((row) => row.id);

      setCompareOpen(false);
      if (!matchIds.length) return;
      if (!baseUrl.trim()) {
        notify("Enter a test API base URL first");
        return;
      }

      setComparing(true);
      try {
        const response = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseUrl, matchIds }),
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          const message = body && typeof body === "object" && "error" in body ? String(body.error) : undefined;
          throw new Error(message ?? `Compare failed (${response.status})`);
        }
        const { results } = body as {
          results: ({ matchId: string } & CompareResultEntry)[];
        };
        setCompareResults((prev) => {
          const next = new Map(prev);
          for (const { matchId, ...result } of results) next.set(matchId, result);
          return next;
        });
        // Only for a single-match run — bulk (all/filtered) stays as the header summary badge, a
        // modal popping up once per match compared wouldn't make sense there.
        if (scope === "one") setCompareResultModalOpen(true);
        const passed = results.filter((result) => result.status === "pass").length;
        notify(`Compared ${results.length}: ${passed} passed, ${results.length - passed} failed`);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Comparison failed");
      } finally {
        setComparing(false);
      }
    },
    [rows, filtered, selected, baseUrl, notify],
  );

  // Client-side only, no server round-trip — unlike runCompare, there's nothing to fetch: the
  // "actual" side is whatever the user pasted, and the "expected" side (the selected match's
  // record) is already sitting in `details` from whenever this match was opened/loaded, and
  // already went through a real JSON.stringify/parse over the wire (via /api/matches/[id]), so it
  // doesn't need the undefined-vs-absent-key normalization the server-side compare route does.
  const comparePasted = useCallback(
    (selectedSummary: MatchSummary | undefined, detailEntry: DetailEntry | undefined, rawText: string) => {
      if (!selectedSummary || detailEntry?.status !== "ready") {
        notify("Select a match with loaded detail first");
        return;
      }

      let actual: unknown;
      try {
        actual = JSON.parse(rawText);
      } catch {
        notify("Pasted text is not valid JSON");
        return;
      }

      const diffs = diffJson(detailEntry.record, actual);
      setCompareResults((prev) => new Map(prev).set(selectedSummary.id, diffs.length === 0 ? { status: "pass" } : { status: "fail", diffs }));
      setCompareResultModalOpen(true);
      notify(diffs.length === 0 ? "Pasted JSON matches the generated reference" : `Pasted JSON differs in ${diffs.length} place${diffs.length === 1 ? "" : "s"}`);
    },
    [notify],
  );

  const compareSummary = useMemo(() => {
    if (compareResults.size === 0) return null;
    let passed = 0;
    for (const result of compareResults.values()) if (result.status === "pass") passed += 1;
    return { total: compareResults.size, passed };
  }, [compareResults]);

  return {
    compareResults,
    comparing,
    compareOpen,
    setCompareOpen,
    compareResultModalOpen,
    setCompareResultModalOpen,
    runCompare,
    comparePasted,
    compareSummary,
  };
}
