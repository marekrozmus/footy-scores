import type { CSSProperties } from "react";

import { Button } from "@/components/button";
import { AlertTriangle, LoaderCircle, Play, RefreshCw, Search } from "@/components/icons";

import { ExportCompareMenu } from "./export-compare-menu";
import { MatchFilters } from "./match-filters";
import { MatchRow } from "./match-row";
import { SortHeader } from "./sort-header";
import type { ExportScope, MatchRowData, Phase, SortState } from "./types";

export function MatchListPanel({
  leftWidth,
  phase,
  dataReady,
  rows,
  filtered,
  compareSummary,
  sort,
  onSortChange,
  selected,
  onSelectRow,
  errorMessage,
  onRun,
  gender,
  onGenderChange,
  stage,
  onStageChange,
  stages,
  team,
  onTeamChange,
  teams,
  query,
  onQueryChange,
  filtersOpen,
  onFiltersOpenChange,
  activeFilterCount,
  onClearFilters,
  onClearFiltersAndQuery,
  comparing,
  exporting,
  compareOpen,
  exportOpen,
  onToggleCompare,
  onToggleExport,
  onCompare,
  onExport,
}: {
  leftWidth: number;
  phase: Phase;
  dataReady: boolean;
  rows: MatchRowData[];
  filtered: MatchRowData[];
  compareSummary: { total: number; passed: number } | null;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  selected: MatchRowData | undefined;
  onSelectRow: (id: string) => void;
  errorMessage: string;
  onRun: () => void;
  gender: string;
  onGenderChange: (value: string) => void;
  stage: string;
  onStageChange: (value: string) => void;
  stages: string[];
  team: string;
  onTeamChange: (value: string) => void;
  teams: string[];
  query: string;
  onQueryChange: (value: string) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  onClearFiltersAndQuery: () => void;
  comparing: boolean;
  exporting: boolean;
  compareOpen: boolean;
  exportOpen: boolean;
  onToggleCompare: () => void;
  onToggleExport: () => void;
  onCompare: (scope: ExportScope) => void;
  onExport: (scope: ExportScope) => void;
}) {
  return (
    <section className="animate-rise flex w-full min-w-0 flex-none flex-col overflow-hidden rounded-md border border-border bg-panel [animation-delay:120ms] md:w-[var(--left-pane)] md:rounded-l-md md:rounded-r-none md:border-r-0" style={{ ["--left-pane" as string]: `${leftWidth}%` } as CSSProperties}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-sm font-bold uppercase">Football match inventory</h2>
              <span className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${phase === "error" ? "border-signal-red/30 text-signal-red" : dataReady ? "border-signal-green/30 text-signal-green" : "border-signal-cyan/30 text-signal-cyan"}`}><span className={`size-1.5 rounded-full ${phase === "error" ? "bg-signal-red" : dataReady ? "bg-signal-green" : "bg-signal-cyan"}`} />{phase === "error" ? "Failed" : dataReady ? "Complete" : phase === "idle" ? "Idle" : "Running"}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span><b className="text-foreground">{dataReady ? rows.length : 0}</b> matches</span>
              <span><b className="text-signal-green">{dataReady ? rows.length : 0}</b> generated</span>
              {compareSummary && <span><b className={compareSummary.passed === compareSummary.total ? "text-signal-green" : "text-signal-red"}>{compareSummary.passed}</b>/<b>{compareSummary.total}</b> compared</span>}
              <span>· {sort.field} {sort.dir}</span>
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">Showing {filtered.length} of {dataReady ? rows.length : 0}</span>
        </div>
        <MatchFilters
          gender={gender}
          onGenderChange={onGenderChange}
          stage={stage}
          onStageChange={onStageChange}
          stages={stages}
          team={team}
          onTeamChange={onTeamChange}
          teams={teams}
          query={query}
          onQueryChange={onQueryChange}
          sort={sort}
          onSortChange={onSortChange}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={onFiltersOpenChange}
          activeFilterCount={activeFilterCount}
          filteredCount={filtered.length}
          onClearFilters={onClearFilters}
        />
      </div>
      <div className="hidden grid-match-row gap-3 border-b border-border px-4 py-2.5 lg:grid">
        <SortHeader field="kickoff" sort={sort} onSort={onSortChange} />
        <SortHeader field="match" sort={sort} onSort={onSortChange} />
        <SortHeader field="score" sort={sort} onSort={onSortChange} />
        <SortHeader field="stage" sort={sort} onSort={onSortChange} />
        <SortHeader field="gender" sort={sort} onSort={onSortChange} />
      </div>
      <div className="flex-1 overflow-auto"><div className="divide-y divide-border">
        {phase === "loading" || phase === "generating" ? (
          <div className="grid min-h-64 place-items-center text-center text-sm text-muted-foreground">
            <div>
              <LoaderCircle className="mx-auto mb-2 size-6 animate-spin text-signal-cyan" />
              Fetching and parsing schedule…<br />
              <span className="text-xs">{phase === "loading" ? "Fetching the Olympic daily schedule (19 requests)" : "Generating endpoints"}</span>
            </div>
          </div>
        ) : phase === "error" ? (
          <div className="grid min-h-64 place-items-center px-6 text-center text-sm text-signal-red">
            <div>
              <AlertTriangle className="mx-auto mb-2 size-6" />
              Schedule source unavailable<br />
              <span className="text-xs text-muted-foreground">{errorMessage}</span>
              <Button variant="consoleOutline" size="sm" className="mt-3 text-xs" onClick={onRun}><RefreshCw />Retry run</Button>
            </div>
          </div>
        ) : phase === "idle" ? (
          <div className="grid min-h-64 place-items-center px-6 text-center text-sm text-muted-foreground">
            <div>
              <Play className="mx-auto mb-2 size-6" />
              No run yet<br />
              <span className="text-xs">Press Load &amp; generate to fetch the official Paris 2024 schedule and build the reference endpoints.</span>
            </div>
          </div>
        ) : filtered.length ? filtered.map((row) => (
          <MatchRow key={row.id} row={row} selected={selected?.id === row.id} onSelect={() => onSelectRow(row.id)} />
        )) : (
          <div className="grid min-h-64 place-items-center px-6 text-center text-sm text-muted-foreground">
            <div>
              <Search className="mx-auto mb-2 size-6" />No football matches found<br />
              <span className="text-xs">Adjust filters or clear the search.</span>
              <Button variant="consoleOutline" size="sm" className="mt-3 text-xs" onClick={onClearFiltersAndQuery}>Clear filters</Button>
            </div>
          </div>
        )}
      </div></div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 md:hidden">
        <p className="min-w-0 truncate text-xs text-muted-foreground">{filtered.length} of {dataReady ? rows.length : 0} records · {sort.field} {sort.dir}</p>
        <ExportCompareMenu
          variant="mobile"
          totalCount={rows.length}
          filteredCount={filtered.length}
          dataReady={dataReady}
          comparing={comparing}
          exporting={exporting}
          compareOpen={compareOpen}
          exportOpen={exportOpen}
          onToggleCompare={onToggleCompare}
          onToggleExport={onToggleExport}
          onCompare={onCompare}
          onExport={onExport}
        />
      </div>
    </section>
  );
}
