"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildEndpoint, stripMeta } from "@/lib/odf/record";
import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

import { MatchInspectorPanel } from "./workspace/match-inspector-panel";
import type { InspectorTab } from "./workspace/match-inspector-panel";
import { MatchListPanel } from "./workspace/match-list-panel";
import { RunControls } from "./workspace/run-controls";
import { RunProgress } from "./workspace/run-progress";
import { Toast } from "./workspace/toast";
import type { CompareResultEntry, DetailEntry, ExportScope, Phase, SortState } from "./workspace/types";
import { phaseProgress, STAGE_ORDER, toRow } from "./workspace/utils";
import { WorkspaceFooter } from "./workspace/workspace-footer";

export function Workspace({ brand }: { brand: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [summaries, setSummaries] = useState<MatchSummary[]>([]);
  const [details, setDetails] = useState<Map<string, DetailEntry>>(new Map());
  const detailRequests = useRef(new Map<string, Promise<FootballRecord>>());

  const [gender, setGender] = useState("All");
  const [stage, setStage] = useState("All stages");
  const [team, setTeam] = useState("All teams");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ field: "kickoff", dir: "asc" });

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [inspector, setInspector] = useState<InspectorTab>("endpoint");
  const [toast, setToast] = useState("");
  // Defaults to wherever this app is actually being served from (works on localhost in dev and on
  // whatever domain it's deployed to) instead of a placeholder domain that never resolves. Safe as
  // a lazy initializer (no effect needed): this field only renders once data is loaded and a match
  // is selected, long after the initial server-rendered/hydrated paint, so there's no mismatch risk.
  const [baseUrl, setBaseUrl] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [compareResults, setCompareResults] = useState<Map<string, CompareResultEntry>>(new Map());
  const [comparing, setComparing] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(58);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeFilterCount = [gender !== "All", stage !== "All stages", team !== "All teams"].filter(Boolean).length;

  const timers = useRef<number[]>([]);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSheetOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const min = rect.width * 0.28;
      const max = rect.width * 0.72;
      const x = Math.max(min, Math.min(event.clientX - rect.left, max));
      setLeftWidth((x / rect.width) * 100);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    timers.current.push(window.setTimeout(() => setToast(""), 2200));
  };

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const run = async () => {
    clearTimers();
    setDetails(new Map());
    detailRequests.current.clear();
    setSelectedId(undefined);
    setPhase("loading");
    try {
      const response = await fetch("/api/generate", { method: "POST" });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = body && typeof body === "object" && "error" in body ? String(body.error) : undefined;
        throw new Error(message ?? `Generate failed (${response.status})`);
      }
      const { matches } = body as { matches: MatchSummary[] };
      setPhase("generating");
      setSummaries(matches);
      timers.current.push(window.setTimeout(() => setPhase("complete"), 250));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The Olympic schedule could not be loaded.");
      setPhase("error");
    }
  };

  const reset = async () => {
    clearTimers();
    setPhase("idle");
    setSummaries([]);
    setDetails(new Map());
    detailRequests.current.clear();
    setSelectedId(undefined);
    setGender("All"); setStage("All stages"); setTeam("All teams"); setQuery(""); setSort({ field: "kickoff", dir: "asc" });
    setExportOpen(false);
    try {
      await fetch("/api/generate", { method: "DELETE" });
      notify("Run reset — server cache cleared");
    } catch {
      notify("Run reset (server cache clear failed — will still refresh on next generate)");
    }
  };

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

  const ensureDetail = useCallback((summary: MatchSummary): Promise<FootballRecord> => {
    const cached = detailRequests.current.get(summary.id);
    if (cached) return cached;
    setDetails((prev) => new Map(prev).set(summary.id, { status: "loading" }));
    const request = fetch(`/api/matches/${encodeURIComponent(summary.id)}`)
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) {
          const message = body && typeof body === "object" && "error" in body ? String(body.error) : undefined;
          throw new Error(message ?? `Match detail request failed (${response.status})`);
        }
        return body as FootballRecord;
      })
      .then((record) => {
        setDetails((prev) => new Map(prev).set(summary.id, { status: "ready", record }));
        return record;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Failed to load match detail.";
        setDetails((prev) => new Map(prev).set(summary.id, { status: "error", message }));
        detailRequests.current.delete(summary.id);
        throw error;
      });
    detailRequests.current.set(summary.id, request);
    return request;
  }, []);

  const retryDetail = (summary: MatchSummary) => {
    detailRequests.current.delete(summary.id);
    ensureDetail(summary).catch(() => {});
  };

  useEffect(() => {
    if (!selectedSummary) return;
    ensureDetail(selectedSummary).catch(() => {});
  }, [selectedSummary, ensureDetail]);

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(message);
    } catch {
      notify("Copy blocked by browser");
    }
  };

  const exportJson = async (scope: ExportScope) => {
    const targetRows = scope === "all" ? rows : scope === "filtered" ? filtered : selected ? [selected] : [];
    const targets = targetRows
      .map((row) => summaryById.get(row.id))
      .filter((summary): summary is MatchSummary => Boolean(summary));

    setExportOpen(false);
    if (!targets.length) return;

    setExporting(true);
    try {
      const records = (await Promise.all(targets.map((summary) => ensureDetail(summary)))).map(stripMeta);
      const payload = { competition: "paris-2024", sport: "football", schema: "example.json", order: `${sort.field} ${sort.dir}`, generatedCount: records.length, matches: records };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `footyscores-paris2024-${scope}.json`;
      link.click();
      URL.revokeObjectURL(url);
      notify(`Exported ${records.length} record${records.length === 1 ? "" : "s"} as JSON`);
    } catch {
      notify("Export failed — one or more matches could not be loaded");
    } finally {
      setExporting(false);
    }
  };

  const runCompare = async (scope: ExportScope) => {
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
      const passed = results.filter((result) => result.status === "pass").length;
      notify(`Compared ${results.length}: ${passed} passed, ${results.length - passed} failed`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Comparison failed");
    } finally {
      setComparing(false);
    }
  };

  const compareSummary = useMemo(() => {
    if (compareResults.size === 0) return null;
    let passed = 0;
    for (const result of compareResults.values()) if (result.status === "pass") passed += 1;
    return { total: compareResults.size, passed };
  }, [compareResults]);

  const startResize = (event: React.MouseEvent) => {
    event.preventDefault();
    dragging.current = true;
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
    </main>
  );
}
