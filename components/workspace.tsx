"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { buildEndpoint } from "@/lib/odf/record";

import { CompareResultModal } from "./workspace/compare-result-modal";
import { useCompare } from "./workspace/hooks/use-compare";
import { useDismissOnEscape } from "./workspace/hooks/use-dismiss-on-escape";
import { useExportJson } from "./workspace/hooks/use-export-json";
import { useMatchDetails } from "./workspace/hooks/use-match-details";
import { useMatchRun } from "./workspace/hooks/use-match-run";
import { useResizableSplit } from "./workspace/hooks/use-resizable-split";
import { useToast } from "./workspace/hooks/use-toast";
import { MatchInspectorPanel } from "./workspace/match-inspector-panel";
import type { InspectorTab } from "./workspace/match-inspector-panel";
import { MatchListPanel } from "./workspace/match-list-panel";
import { RunControls } from "./workspace/run-controls";
import { RunProgress } from "./workspace/run-progress";
import { Toast } from "./workspace/toast";
import type { SortState } from "./workspace/types";
import { phaseProgress, STAGE_ORDER, toRow } from "./workspace/utils";
import { WorkspaceFooter } from "./workspace/workspace-footer";

export function Workspace({ brand }: { brand: ReactNode }) {
  const [gender, setGender] = useState("All");
  const [stage, setStage] = useState("All stages");
  const [team, setTeam] = useState("All teams");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ field: "kickoff", dir: "asc" });

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [inspector, setInspector] = useState<InspectorTab>("endpoint");
  // Defaults to wherever this app is actually being served from (works on localhost in dev and on
  // whatever domain it's deployed to) instead of a placeholder domain that never resolves. Safe as
  // a lazy initializer (no effect needed): this field only renders once data is loaded and a match
  // is selected, long after the initial server-rendered/hydrated paint, so there's no mismatch risk.
  const [baseUrl, setBaseUrl] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [exportOpen, setExportOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeFilterCount = [gender !== "All", stage !== "All stages", team !== "All teams"].filter(Boolean).length;

  useDismissOnEscape(sheetOpen, setSheetOpen);
  useDismissOnEscape(filtersOpen, setFiltersOpen);
  useDismissOnEscape(menuOpen, setMenuOpen);

  const { leftWidth, splitRef, startResize } = useResizableSplit(58);
  const { toast, notify } = useToast();
  const { details, ensureDetail, retryDetail, resetDetails } = useMatchDetails();

  const { phase, errorMessage, summaries, run, reset } = useMatchRun({
    notify,
    onBeforeRun: () => {
      resetDetails();
      setSelectedId(undefined);
    },
    onReset: () => {
      resetDetails();
      setSelectedId(undefined);
      setGender("All");
      setStage("All stages");
      setTeam("All teams");
      setQuery("");
      setSort({ field: "kickoff", dir: "asc" });
      setExportOpen(false);
    },
  });

  const rows = useMemo(() => summaries.map(toRow), [summaries]);
  const summaryById = useMemo(() => new Map(summaries.map((summary) => [summary.id, summary])), [summaries]);

  const dataReady = phase === "complete";
  const running = phase === "loading" || phase === "generating";
  const progress = phaseProgress[phase];

  const stages = useMemo(() => {
    const present = new Set(rows.map((row) => row.stage));
    const known = STAGE_ORDER.filter((label) => present.has(label));
    const extra = [...present].filter((label) => !STAGE_ORDER.includes(label)).sort();
    return ["All stages", ...known, ...extra];
  }, [rows]);

  const teams = useMemo(() => ["All teams", ...Array.from(new Set(rows.flatMap((row) => [row.home, row.away]))).sort()], [rows]);

  const filtered = useMemo(() => {
    if (!dataReady) return [];
    const q = query.trim().toLowerCase();
    const matched = rows.filter((row) =>
      (gender === "All" || row.gender === gender) &&
      (stage === "All stages" || row.stage === stage) &&
      (team === "All teams" || row.home === team || row.away === team) &&
      (!q || [row.home, row.away, row.venue, row.id].some((field) => field.toLowerCase().includes(q))));
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => {
      let cmp = 0;
      switch (sort.field) {
        case "kickoff": cmp = a.iso.localeCompare(b.iso); break;
        case "match": cmp = a.home.localeCompare(b.home) || a.away.localeCompare(b.away); break;
        case "score": cmp = (a.homeGoals ?? 0) + (a.awayGoals ?? 0) - ((b.homeGoals ?? 0) + (b.awayGoals ?? 0)); break;
        case "stage": cmp = a.stage.localeCompare(b.stage); break;
        case "gender": cmp = a.gender.localeCompare(b.gender); break;
      }
      return cmp * dir;
    });
  }, [dataReady, rows, gender, stage, team, query, sort]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0];
  const selectedSummary = selected ? summaryById.get(selected.id) : undefined;
  const endpoint = selectedSummary ? buildEndpoint(selectedSummary) : "";
  const detailEntry = selectedSummary ? details.get(selectedSummary.id) : undefined;
  const selectedReady = detailEntry?.status === "ready";

  useEffect(() => {
    if (!selectedSummary) return;
    ensureDetail(selectedSummary).catch(() => {});
  }, [selectedSummary, ensureDetail]);

  const { exporting, exportJson } = useExportJson({
    rows,
    filtered,
    selected,
    summaryById,
    ensureDetail,
    notify,
    onDone: () => setExportOpen(false),
  });

  const {
    compareResults,
    comparing,
    compareOpen,
    setCompareOpen,
    compareResultModalOpen,
    setCompareResultModalOpen,
    runCompare,
    comparePasted,
    compareSummary,
  } = useCompare({ rows, filtered, selected, baseUrl, notify });

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(message);
    } catch {
      notify("Copy blocked by browser");
    }
  };

  const selectRow = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const clearFiltersAndSort = () => {
    setGender("All"); setStage("All stages"); setTeam("All teams"); setSort({ field: "kickoff", dir: "asc" });
  };

  const clearFiltersAndQuery = () => {
    setGender("All"); setStage("All stages"); setTeam("All teams"); setQuery("");
  };

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-signal-gold/30">
      <div className="mx-auto flex h-full max-w-workspace flex-col px-4 py-5 sm:px-6">
        <header className="animate-rise flex flex-nowrap items-center justify-between gap-3 border-b border-border pb-4 lg:gap-4 lg:pb-5">
          {brand}
          <RunControls running={running} menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} onReset={reset} onRun={run} />
        </header>

        {running && typeof progress === "number" && <RunProgress phase={phase} progress={progress} />}

        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 overflow-hidden" ref={splitRef}>
            <MatchListPanel
              leftWidth={leftWidth}
              phase={phase}
              dataReady={dataReady}
              rows={rows}
              filtered={filtered}
              compareSummary={compareSummary}
              sort={sort}
              onSortChange={setSort}
              selected={selected}
              onSelectRow={selectRow}
              errorMessage={errorMessage}
              onRun={run}
              gender={gender}
              onGenderChange={setGender}
              stage={stage}
              onStageChange={setStage}
              stages={stages}
              team={team}
              onTeamChange={setTeam}
              teams={teams}
              query={query}
              onQueryChange={setQuery}
              filtersOpen={filtersOpen}
              onFiltersOpenChange={setFiltersOpen}
              activeFilterCount={activeFilterCount}
              onClearFilters={clearFiltersAndSort}
              onClearFiltersAndQuery={clearFiltersAndQuery}
              comparing={comparing}
              exporting={exporting}
              compareOpen={compareOpen}
              exportOpen={exportOpen}
              onToggleCompare={() => { setExportOpen(false); setCompareOpen((open) => !open); }}
              onToggleExport={() => { setCompareOpen(false); setExportOpen((open) => !open); }}
              onCompare={runCompare}
              onExport={exportJson}
              selectedReady={selectedReady}
            />

            <div
              role="separator"
              aria-label="Resize panels"
              aria-orientation="vertical"
              aria-valuemin={28}
              aria-valuemax={72}
              aria-valuenow={Math.round(leftWidth)}
              onMouseDown={startResize}
              className="group relative z-10 hidden cursor-col-resize items-center justify-center bg-background transition-colors hover:bg-border md:flex"
              style={{ width: 8, minWidth: 8, flex: "0 0 auto" }}
            >
              <div className="h-10 w-1 rounded-full bg-border group-hover:bg-muted-foreground transition-colors" />
            </div>

            {sheetOpen && <button aria-label="Close match details" onClick={() => setSheetOpen(false)} className="fixed inset-0 z-40 cursor-pointer bg-background/70 backdrop-blur-sm md:hidden" />}

            <MatchInspectorPanel
              sheetOpen={sheetOpen}
              onSheetOpenChange={setSheetOpen}
              selected={selected}
              endpoint={endpoint}
              baseUrl={baseUrl}
              onBaseUrlChange={setBaseUrl}
              detailEntry={detailEntry}
              inspector={inspector}
              onInspectorChange={setInspector}
              onCopy={copy}
              onRetryDetail={() => selectedSummary && retryDetail(selectedSummary)}
              compareResult={selected ? compareResults.get(selected.id) : undefined}
              comparing={comparing}
              onCompareSelected={() => runCompare("one")}
              onComparePasted={(text) => comparePasted(selectedSummary, detailEntry, text)}
              rows={rows}
              filtered={filtered}
              dataReady={dataReady}
              sort={sort}
              exporting={exporting}
              compareOpen={compareOpen}
              exportOpen={exportOpen}
              onToggleCompare={() => { setExportOpen(false); setCompareOpen((open) => !open); }}
              onToggleExport={() => { setCompareOpen(false); setExportOpen((open) => !open); }}
              onCompare={runCompare}
              onExport={exportJson}
              selectedReady={selectedReady}
            />
          </div>
        </div>

        <WorkspaceFooter sort={sort} />
      </div>

      <Toast message={toast} />
      <CompareResultModal
        open={compareResultModalOpen}
        onClose={() => setCompareResultModalOpen(false)}
        result={selected ? compareResults.get(selected.id) : undefined}
      />
    </main>
  );
}
