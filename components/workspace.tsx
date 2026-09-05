"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Copy,
  Download,
  GitCompareArrows,
  LoaderCircle,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Menu,
  ChevronRight,
  X,
} from "@/components/icons";
import type { DiffEntry } from "@/lib/odf/diff";
import { NOC_TO_ISO2 } from "@/lib/odf/flags";
import { buildEndpoint } from "@/lib/odf/record";
import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

type MatchRow = {
  id: string;
  iso: string;
  date: string;
  time: string;
  home: string;
  homeNoc: string;
  away: string;
  awayNoc: string;
  homeGoals: number | null;
  awayGoals: number | null;
  score: string;
  stage: string;
  round: string;
  gender: "Men" | "Women";
  venue: string;
  city: string;
  scheduleStatus: string;
  sourceUrl: string;
};

type DetailEntry = { status: "loading" } | { status: "ready"; record: FootballRecord } | { status: "error"; message: string };

type CompareResultEntry =
  | { status: "pass" }
  | { status: "fail"; diffs: DiffEntry[] }
  | { status: "error"; message: string };

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso: string): string {
  const day = iso.slice(8, 10);
  const monthIndex = Number(iso.slice(5, 7)) - 1;
  return `${day} ${MONTH_ABBR[monthIndex] ?? ""}`;
}

function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

function toRow(summary: MatchSummary): MatchRow {
  const home = summary.home.score;
  const away = summary.away.score;
  return {
    id: summary.id,
    iso: summary.kickoff,
    date: formatDate(summary.kickoff),
    time: formatTime(summary.kickoff),
    home: summary.home.name,
    homeNoc: summary.home.noc,
    away: summary.away.name,
    awayNoc: summary.away.noc,
    homeGoals: home,
    awayGoals: away,
    score: home !== null && away !== null ? `${home}–${away}` : "–",
    stage: summary.stage,
    round: summary.round,
    gender: summary.gender,
    venue: summary.venueName,
    city: summary.city,
    scheduleStatus: summary.scheduleStatus,
    sourceUrl: summary.sourceUrl,
  };
}

// Fixed display order for the stage filter; any stage not in this list (shouldn't happen for a
// finished tournament) is appended, sorted, rather than silently dropped.
const STAGE_ORDER = [
  "Group A",
  "Group B",
  "Group C",
  "Group D",
  "Quarter-final",
  "Semi-final",
  "Bronze Medal Match",
  "Gold Medal Match",
];

const Flag = ({ noc, className = "" }: { noc: string; className?: string }) => {
  const code = NOC_TO_ISO2[noc];
  if (!code) return <span aria-hidden="true" className={`inline-block h-3 w-4 shrink-0 rounded-sm bg-border ${className}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w20/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 2x`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={16}
      height={12}
      className={`h-3 w-4 shrink-0 rounded-sm object-cover ring-1 ring-border ${className}`}
    />
  );
};

type Phase = "idle" | "loading" | "generating" | "complete" | "error";
type SortField = "kickoff" | "match" | "score" | "stage" | "gender";

const phaseProgress: Record<Phase, number | null> = { idle: null, loading: 45, generating: 90, complete: 100, error: null };
const sortFieldLabels: Record<SortField, string> = { kickoff: "Kickoff", match: "Match", score: "Result", stage: "Stage", gender: "Gender" };

function SortHeader({ field, className, sort, onSort }: { field: SortField; className?: string; sort: { field: SortField; dir: "asc" | "desc" }; onSort: (sort: { field: SortField; dir: "asc" | "desc" }) => void }) {
  const active = sort.field === field;
  return (
    <button
      type="button"
      role="columnheader"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      onClick={() => onSort(active ? { field, dir: sort.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" })}
      className={`flex cursor-pointer items-center gap-1 text-left text-xs uppercase tracking-widest hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "font-semibold text-foreground" : "text-muted-foreground"} ${className}`}
    >
      {sortFieldLabels[field]}
      {active && (sort.dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />)}
    </button>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="relative flex min-h-10 items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-xs hover:border-muted-foreground focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
      <span className="text-muted-foreground">{label}</span>
      <select className="cursor-pointer appearance-none bg-transparent pr-5 font-medium text-foreground outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} className="bg-popover" value={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
    </label>
  );
}

export function Workspace() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [summaries, setSummaries] = useState<MatchSummary[]>([]);
  const [details, setDetails] = useState<Map<string, DetailEntry>>(new Map());
  const detailRequests = useRef(new Map<string, Promise<FootballRecord>>());

  const [gender, setGender] = useState("All");
  const [stage, setStage] = useState("All stages");
  const [team, setTeam] = useState("All teams");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({ field: "kickoff", dir: "asc" });

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [inspector, setInspector] = useState<"endpoint" | "data" | "compare">("endpoint");
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

  const exportJson = async (scope: "all" | "filtered" | "one") => {
    const targetRows = scope === "all" ? rows : scope === "filtered" ? filtered : selected ? [selected] : [];
    const targets = targetRows
      .map((row) => summaryById.get(row.id))
      .filter((summary): summary is MatchSummary => Boolean(summary));

    if (!targets.length) {
      setExportOpen(false);
      return;
    }

    setExporting(true);
    try {
      const records = await Promise.all(targets.map((summary) => ensureDetail(summary)));
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
      setExportOpen(false);
    }
  };

  const runCompare = async (scope: "all" | "filtered" | "one") => {
    const targetRows = scope === "all" ? rows : scope === "filtered" ? filtered : selected ? [selected] : [];
    const matchIds = targetRows.map((row) => row.id);

    if (!matchIds.length) {
      setCompareOpen(false);
      return;
    }
    if (!baseUrl.trim()) {
      notify("Enter a test API base URL first");
      setCompareOpen(false);
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
      setCompareOpen(false);
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

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-signal-gold/30">
      <div className="mx-auto flex h-full max-w-workspace flex-col px-4 py-5 sm:px-6">
        <header className="animate-rise flex flex-nowrap items-center justify-between gap-3 border-b border-border pb-4 lg:gap-4 lg:pb-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image doesn't optimize .ico files */}
            <img src="/favicon.ico" alt="" className="size-8 shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-extrabold leading-none lg:text-lg">FOOTYSCORES · PARIS 2024 QA</h1>
              <p className="mt-1 truncate text-xs uppercase tracking-20 text-muted-foreground">Reference endpoint workspace · live Olympic data</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex lg:w-auto">
            <Button variant="consoleOutline" size="sm" className="min-h-11 text-xs" onClick={reset}><RefreshCw />Reset</Button>
            <Button variant="console" size="sm" className="min-h-11 text-xs" onClick={run} disabled={running}>{running ? <LoaderCircle className="animate-spin" /> : <Play />}{running ? "Running…" : "Load & generate"}</Button>
          </div>
          <Button variant="consoleOutline" size="sm" className="min-h-11 px-3 lg:hidden" aria-label="Open workspace menu" aria-expanded={menuOpen} aria-controls="workspace-menu" onClick={() => setMenuOpen(true)}><Menu className="size-5" /></Button>

        </header>

        {menuOpen && (
          <div className="lg:hidden">
            <button aria-label="Close workspace menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 cursor-pointer bg-background/70 backdrop-blur-sm" />
            <div id="workspace-menu" role="dialog" aria-modal="true" aria-label="Workspace menu" className="animate-rise fixed inset-y-0 right-0 z-50 w-72 max-w-[80vw] border-l border-border bg-panel-raised p-4 shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <h3 className="font-display text-sm font-bold uppercase">Workspace</h3>
                <Button variant="ghost" size="sm" className="min-h-11 px-3 text-xs" onClick={() => setMenuOpen(false)}><X />Close</Button>
              </div>
              <div className="mt-4 grid gap-3">
                <Button variant="consoleOutline" size="sm" className="min-h-11 w-full justify-start text-xs" onClick={() => { setMenuOpen(false); reset(); }}><RefreshCw />Reset</Button>
                <Button variant="console" size="sm" className="min-h-11 w-full justify-start text-xs" onClick={() => { setMenuOpen(false); run(); }} disabled={running}>{running ? <LoaderCircle className="animate-spin" /> : <Play />}{running ? "Running…" : "Load & generate"}</Button>
              </div>
            </div>
          </div>
        )}

        {running && typeof progress === "number" && (

          <div className="animate-rise mt-5" aria-label="Run progress">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><LoaderCircle className="size-3.5 animate-spin text-signal-gold" />{phase === "loading" ? "Retrieving Olympic schedule" : "Generating endpoints"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div className="animate-rise h-full rounded-full bg-gradient-to-r from-signal-cyan via-signal-gold to-signal-green transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 overflow-hidden" ref={splitRef}>
            <section className="animate-rise flex w-full min-w-0 flex-none flex-col overflow-hidden rounded-md border border-border bg-panel [animation-delay:120ms] md:w-[var(--left-pane)] md:rounded-l-md md:rounded-r-none md:border-r-0" style={{ ["--left-pane" as string]: `${leftWidth}%` } as React.CSSProperties}>

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
                <div className="mt-3 flex items-center gap-2 lg:hidden">
                  <label className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <span className="sr-only">Search matches</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring" placeholder="Search team, venue, ID…" />
                  </label>
                  <Button variant="consoleOutline" size="sm" className="relative min-h-11 shrink-0 px-3" aria-label={`Filters and sorting${activeFilterCount ? `, ${activeFilterCount} active` : ""}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>
                    <SlidersHorizontal className="size-4" />
                    {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-signal-gold text-xs font-bold text-background">{activeFilterCount}</span>}
                  </Button>
                </div>
                <div className="mt-3 hidden items-center gap-2 lg:flex lg:flex-wrap" aria-label="Match filters">
                  <FilterSelect label="Gender" value={gender} options={["All", "Men", "Women"]} onChange={setGender} />
                  <FilterSelect label="Stage" value={stage} options={stages} onChange={setStage} />
                  <FilterSelect label="Team" value={team} options={teams} onChange={setTeam} />
                  <label className="relative ml-auto hidden min-w-56 flex-1 lg:block lg:max-w-72">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <span className="sr-only">Search matches</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-10 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring" placeholder="Search team, venue, ID…" />
                  </label>
                </div>
                {filtersOpen && (
                  <div className="lg:hidden">
                    <button aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="fixed inset-0 z-40 cursor-pointer bg-background/70 backdrop-blur-sm" />
                    <div role="dialog" aria-modal="true" aria-label="Filters and sorting" className="animate-rise fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border bg-panel-raised p-4 shadow-2xl">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-display text-sm font-bold uppercase">Filters &amp; sorting</h3>
                        <Button variant="ghost" size="sm" className="min-h-11 px-3 text-xs" onClick={() => setFiltersOpen(false)}><X />Close</Button>
                      </div>
                      <div className="mt-3 grid gap-2 [&_label]:min-h-12 [&_label]:w-full [&_select]:ml-auto [&_select]:text-sm">
                        <FilterSelect label="Gender" value={gender} options={["All", "Men", "Women"]} onChange={setGender} />
                        <FilterSelect label="Stage" value={stage} options={stages} onChange={setStage} />
                        <FilterSelect label="Team" value={team} options={teams} onChange={setTeam} />
                        <div className="flex min-h-12 items-center gap-2 rounded-md border border-border bg-panel px-3">
                          <label className="relative flex flex-1 cursor-pointer items-center gap-2">
                            <span className="text-xs text-muted-foreground">Sort by</span>
                            <select className="cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium text-foreground outline-none" value={sort.field} onChange={(event) => setSort({ field: event.target.value as SortField, dir: sort.dir })}>
                              {(["kickoff", "match", "score", "stage", "gender"] as const).map((field) => <option key={field} className="bg-popover capitalize" value={field}>{sortFieldLabels[field]}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-0 size-3.5 text-muted-foreground" />
                          </label>
                          <button type="button" onClick={() => setSort({ field: sort.field, dir: sort.dir === "asc" ? "desc" : "asc" })} className="flex min-h-8 cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium uppercase text-foreground hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {sort.dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}{sort.dir}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Button variant="consoleOutline" size="sm" className="min-h-11 flex-1 text-xs" onClick={() => { setGender("All"); setStage("All stages"); setTeam("All teams"); setSort({ field: "kickoff", dir: "asc" }); }}>Clear all</Button>
                        <Button size="sm" className="min-h-11 flex-1 text-xs" onClick={() => setFiltersOpen(false)}>Show {filtered.length} matches</Button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
              <div className="hidden grid-match-row gap-3 border-b border-border px-4 py-2.5 lg:grid">
                <SortHeader field="kickoff" sort={sort} onSort={setSort} />
                <SortHeader field="match" sort={sort} onSort={setSort} />
                <SortHeader field="score" sort={sort} onSort={setSort} />
                <SortHeader field="stage" sort={sort} onSort={setSort} />
                <SortHeader field="gender" sort={sort} onSort={setSort} />
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
                      <Button variant="consoleOutline" size="sm" className="mt-3 text-xs" onClick={run}><RefreshCw />Retry run</Button>
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
                  <button key={row.id} aria-label={`${row.home} versus ${row.away}, ${row.date} at ${row.time}, ${row.gender}`} onClick={() => { setSelectedId(row.id); setSheetOpen(true); }} className={`grid min-h-16 w-full cursor-pointer grid-cols-1 content-start items-start gap-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[1fr_auto] md:items-center md:gap-3 lg:grid-match-row lg:items-center ${selected?.id === row.id ? "md:bg-signal-gold/10 md:shadow-[inset_2px_0_0_var(--signal-gold)]" : "hover:bg-panel-raised"}`}>
                    <span className="flex items-center gap-1.5 text-base font-medium leading-tight md:hidden">
                      <Flag noc={row.homeNoc} /><span className="truncate">{row.home}</span> <span className="text-muted-foreground">vs</span> <Flag noc={row.awayNoc} /><span className="truncate">{row.away}</span>
                    </span>
                    <span className="flex items-center justify-between gap-3 text-xs text-muted-foreground md:hidden">
                      <span className="min-w-0 truncate">{row.date} · {row.time} · {row.gender}</span>
                      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-foreground">{row.score}<ChevronRight className="size-4 text-muted-foreground" /></span>
                    </span>
                    <span className="flex items-center gap-3 text-xs md:hidden">
                      <span className="min-w-0 truncate text-muted-foreground"><span className="text-foreground">Stage</span> · <span className={row.stage.includes("Gold") ? "text-signal-gold" : "text-signal-cyan"}>{row.stage}</span></span>
                      <span className="flex shrink-0 items-center gap-1 text-signal-green"><span className="text-foreground">Output</span> · <span className="size-2 rounded-full bg-signal-green" />Generated</span>
                    </span>

                    <span className="hidden text-sm lg:block"><strong className="block font-medium">{row.date}</strong><span className="text-xs text-muted-foreground">{row.time} local</span></span>
                    <span className="hidden min-w-0 text-sm font-medium leading-tight md:block">
                      <span className="flex min-w-0 items-center gap-1.5 truncate max-lg:text-base"><Flag noc={row.homeNoc} /><span className="truncate">{row.home}</span> <span className="text-muted-foreground">vs</span> <Flag noc={row.awayNoc} /><span className="truncate">{row.away}</span></span>
                      <span className="mt-1 block truncate text-xs font-normal text-muted-foreground lg:hidden">{row.date} · {row.time} · {row.gender}</span>
                      <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal lg:hidden">
                        <span className="min-w-0 truncate text-muted-foreground"><span className="text-foreground">Stage</span> · <span className={row.stage.includes("Gold") ? "text-signal-gold" : "text-signal-cyan"}>{row.stage}</span></span>
                        <span className="flex shrink-0 items-center gap-1 text-signal-green"><span className="text-foreground">Output</span> · <span className="size-2 rounded-full bg-signal-green" />Generated</span>
                      </span>
                      <span className="mt-1 hidden truncate text-xs font-normal text-muted-foreground lg:block">{row.gender} · {row.venue}, {row.city}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-2 text-sm md:flex">{row.score}</span>
                    <span className={`hidden text-xs lg:block ${row.stage.includes("Gold") ? "text-signal-gold" : "text-signal-cyan"}`}>{row.stage}</span>
                    <span className="hidden items-center gap-1.5 text-xs lg:flex text-signal-green"><span className="size-2 rounded-full bg-signal-green" />Generated</span>
                  </button>

                )) : <div className="grid min-h-64 place-items-center px-6 text-center text-sm text-muted-foreground"><div><Search className="mx-auto mb-2 size-6" />No football matches found<br /><span className="text-xs">Adjust filters or clear the search.</span><Button variant="consoleOutline" size="sm" className="mt-3 text-xs" onClick={() => { setGender("All"); setStage("All stages"); setTeam("All teams"); setQuery(""); }}>Clear filters</Button></div></div>}
              </div></div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 md:hidden">
                <p className="min-w-0 truncate text-xs text-muted-foreground">{filtered.length} of {dataReady ? rows.length : 0} records · {sort.field} {sort.dir}</p>
                <div className="relative flex shrink-0 items-center gap-2">
                  <Button variant="consoleOutline" size="sm" className="min-h-11 text-xs" onClick={() => { setExportOpen(false); setCompareOpen(!compareOpen); }} aria-expanded={compareOpen} disabled={!dataReady || comparing}>{comparing ? <LoaderCircle className="animate-spin" /> : <GitCompareArrows />}{comparing ? "Comparing…" : "Compare"}<ChevronDown /></Button>
                  {compareOpen && <div className="absolute bottom-full right-0 z-30 mb-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                    {([["all", `All ${rows.length} matches`], ["filtered", `Filtered (${filtered.length})`], ["one", "Selected match only"]] as const).map(([scope, label]) => <button key={scope} onClick={() => runCompare(scope)} className="block w-full cursor-pointer px-3 py-3 text-left text-sm hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{label}</button>)}
                  </div>}
                  <Button variant="console" size="sm" className="min-h-11 text-xs" onClick={() => { setCompareOpen(false); setExportOpen(!exportOpen); }} aria-expanded={exportOpen} disabled={!dataReady || exporting}>{exporting ? <LoaderCircle className="animate-spin" /> : <Download />}{exporting ? "Exporting…" : "Export JSON"}<ChevronDown /></Button>
                  {exportOpen && <div className="absolute bottom-full right-0 z-30 mb-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                    {([["all", `All ${rows.length} matches`], ["filtered", `Filtered (${filtered.length})`], ["one", "Selected match only"]] as const).map(([scope, label]) => <button key={scope} onClick={() => exportJson(scope)} className="block w-full cursor-pointer px-3 py-3 text-left text-sm hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{label}</button>)}
                  </div>}
                </div>
              </div>
            </section>


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

            <section
              aria-label="Match inspector"
              className={`animate-rise flex flex-1 flex-col overflow-hidden border border-border bg-panel-raised [animation-delay:170ms] md:static md:inset-auto md:z-auto md:flex md:rounded-r-md ${sheetOpen ? "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-16 max-md:z-50 max-md:rounded-t-2xl max-md:shadow-2xl" : "max-md:hidden"}`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0 md:hidden">
                  <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">{selected ? <><Flag noc={selected.homeNoc} /><span className="truncate">{selected.home}</span><span className="text-muted-foreground">vs</span><Flag noc={selected.awayNoc} /><span className="truncate">{selected.away}</span></> : "No match selected"}</p>
                  <p className="truncate text-xs text-muted-foreground">{selected ? `${selected.date} · ${selected.time} local` : "—"}</p>
                </div>
                <div className="hidden min-w-0 gap-1 md:flex" role="tablist" aria-label="Match inspector">
                  {([['endpoint', 'Endpoint'], ['data', 'Source data'], ['compare', 'Compare']] as const).map(([value, label]) => <Button key={value} variant={inspector === value ? "console" : "ghost"} size="sm" role="tab" aria-selected={inspector === value} onClick={() => setInspector(value)} className="min-h-10 px-3 text-xs">{value === "compare" && <GitCompareArrows />}{label}</Button>)}
                </div>
                <span className="hidden truncate text-xs text-muted-foreground xl:inline">{selected?.id ?? "—"}</span>
                <Button variant="ghost" size="sm" className="min-h-11 shrink-0 px-3 text-xs md:hidden" onClick={() => setSheetOpen(false)}><X />Close</Button>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden" role="tablist" aria-label="Match inspector sections">
                {([['endpoint', 'Endpoint'], ['data', 'Source data'], ['compare', 'Compare']] as const).map(([value, label]) => <Button key={value} variant={inspector === value ? "console" : "ghost"} size="sm" role="tab" aria-selected={inspector === value} onClick={() => setInspector(value)} className="min-h-11 shrink-0 px-3 text-xs">{value === "compare" && <GitCompareArrows />}{label}</Button>)}
              </div>


              <div className="flex-1 overflow-auto">
                {!selected ? <div className="flex-1 grid place-items-center px-6 text-center text-sm text-muted-foreground">Select a match to inspect its generated endpoint.</div> : (
                <>
                  {inspector === "endpoint" && <div role="tabpanel" className="flex flex-col">
                    <div className="px-4 pt-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="rounded bg-signal-red/15 px-2 py-0.5 text-xs font-semibold text-signal-red">GET</span>
                          <span className="text-xs text-muted-foreground">Expected API request</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs text-signal-green"><Check className="size-3.5" />Reference endpoint ready</span>
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-3 text-xs leading-relaxed break-all">
                        <span className="text-signal-green">GET </span>{endpoint}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="console" size="sm" className="min-h-10 flex-1 text-xs" onClick={() => copy(`${baseUrl}${endpoint}`, "Endpoint copied to clipboard")}><Clipboard />Copy endpoint</Button>
                        <Button variant="consoleOutline" size="sm" className="min-h-10 text-xs" onClick={() => copy(`curl -s '${baseUrl}${endpoint}' -H 'Accept: application/json'`, "cURL command copied")}><Copy />cURL</Button>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-border px-4 py-3">
                      <p className="mb-3 text-xs uppercase tracking-16 text-muted-foreground">Fields used to generate this endpoint</p>
                      <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-xs">
                        <dt className="text-muted-foreground">sport</dt><dd>football</dd>
                        <dt className="text-muted-foreground">competition</dt><dd>paris-2024</dd>
                        <dt className="text-muted-foreground">kickoff date</dt><dd>{selected.date} · {selected.time} local</dd>
                        <dt className="text-muted-foreground">home</dt><dd className="flex items-center gap-1.5"><Flag noc={selected.homeNoc} />{selected.home}</dd>
                        <dt className="text-muted-foreground">away</dt><dd className="flex items-center gap-1.5"><Flag noc={selected.awayNoc} />{selected.away}</dd>
                      </dl>
                      <p className="mt-3 mb-3 text-xs uppercase tracking-16 text-muted-foreground">Additional match context</p>
                      <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-xs">
                        <dt className="text-muted-foreground">round</dt><dd>{selected.round}</dd>
                        <dt className="text-muted-foreground">venue</dt><dd>{selected.venue}, {selected.city}</dd>
                        <dt className="text-muted-foreground">source event id</dt><dd className="break-all">{selected.id}</dd>
                      </dl>
                    </div>
                  </div>}

                  {inspector === "data" && <div role="tabpanel" className="flex h-full flex-col">
                    <div className="mb-3 flex items-center justify-between px-4 pt-4">
                      <p className="text-xs uppercase tracking-16 text-muted-foreground">Parsed match record (example.json shape)</p>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={detailEntry?.status !== "ready"} onClick={() => { if (detailEntry?.status === "ready") copy(JSON.stringify(detailEntry.record, null, 2), "Record JSON copied"); }}><Copy />Copy JSON</Button>
                    </div>
                    {detailEntry?.status === "ready" ? (
                      <pre className="mx-4 flex-1 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-6 text-muted-foreground"><code>{JSON.stringify(detailEntry.record, null, 2)}</code></pre>
                    ) : detailEntry?.status === "error" ? (
                      <div className="mx-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-signal-red/30 bg-signal-red/5 p-4 text-center text-xs text-signal-red">
                        <AlertTriangle className="size-5" />
                        {detailEntry.message}
                        <Button variant="consoleOutline" size="sm" className="mt-1 text-xs" onClick={() => selectedSummary && retryDetail(selectedSummary)}><RefreshCw />Retry</Button>
                      </div>
                    ) : (
                      <div className="mx-4 flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading match detail…</div>
                    )}
                  </div>}

                  {inspector === "compare" && <div role="tabpanel" className="flex flex-col p-4">
                    <div className="rounded-md border border-border bg-background p-4">
                      <div className="flex items-start gap-3">
                        <GitCompareArrows className="mt-0.5 size-5 text-signal-gold" />
                        <div>
                          <h3 className="font-display text-sm font-bold uppercase">Automated JSON comparison</h3>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Compare the generated reference (strict example.json shape, no meta) with the response from the tested FootyScores API. Runs server-side, so the tested API doesn&apos;t need CORS enabled for this app&apos;s origin.</p>
                        </div>
                      </div>
                      <label className="mt-4 block text-xs uppercase tracking-14 text-muted-foreground">
                        Test API base URL
                        <input className="mt-2 min-h-10 w-full rounded-md border border-border bg-panel px-3 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
                      </label>
                      <Button variant="consoleOutline" className="mt-3 min-h-10 w-full text-xs" onClick={() => runCompare("one")} disabled={comparing}>{comparing ? <LoaderCircle className="animate-spin" /> : <GitCompareArrows />}{comparing ? "Comparing…" : "Compare this match"}</Button>
                      <p className="mt-2 text-xs text-muted-foreground">Need every match at once? Use the <b className="text-foreground">Compare</b> button next to Export JSON instead.</p>
                    </div>
                    {(() => {
                      const result = compareResults.get(selected.id);
                      if (!result) {
                        return (
                          <div className="mt-3 flex items-start gap-2 rounded-md border border-signal-gold/30 bg-signal-gold/5 p-3 text-xs text-muted-foreground">
                            <AlertTriangle className="size-5 shrink-0 text-signal-gold" />
                            <span>Comparison has not run for this match yet.</span>
                          </div>
                        );
                      }
                      if (result.status === "error") {
                        return (
                          <div className="mt-3 flex items-start gap-2 rounded-md border border-signal-red/30 bg-signal-red/5 p-3 text-xs text-signal-red">
                            <AlertTriangle className="size-5 shrink-0" />
                            <span className="break-all">{result.message}</span>
                          </div>
                        );
                      }
                      if (result.status === "pass") {
                        return (
                          <div className="mt-3 flex items-center gap-2 rounded-md border border-signal-green/30 bg-signal-green/5 p-3 text-xs text-signal-green">
                            <Check className="size-4 shrink-0" />
                            <span>Exact match — the tested API&apos;s response matches the generated reference.</span>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-3 overflow-hidden rounded-md border border-border">
                          <div className="grid grid-compare-row gap-2 border-b border-border bg-panel px-3 py-2.5 text-xs uppercase tracking-widest text-muted-foreground"><span>Field</span><span>Expected</span><span>Actual</span></div>
                          {result.diffs.map((diff) => (
                            <div key={diff.path} className="grid grid-compare-row gap-2 border-b border-border bg-signal-red/5 px-3 py-2.5 text-xs last:border-0">
                              <span className="break-all text-muted-foreground">{diff.path}</span>
                              <span className="break-all">{diff.kind === "extra" ? "—" : JSON.stringify(diff.expected)}</span>
                              <span className="break-all text-signal-red">{diff.kind === "missing" ? "—" : JSON.stringify(diff.actual)}</span>
                            </div>
                          ))}
                          <p className="bg-panel px-3 py-2.5 text-xs text-muted-foreground">{result.diffs.length} difference{result.diffs.length === 1 ? "" : "s"}</p>
                        </div>
                      );
                    })()}
                  </div>}
                </>
              )}
              </div>

              <div className="mt-auto hidden flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 md:flex">
                <div>
                  <p className="text-xs uppercase tracking-14 text-muted-foreground">Export run</p>
                  <p className="mt-0.5 text-xs">{filtered.length} of {dataReady ? rows.length : 0} records · JSON · {sort.field} {sort.dir}</p>
                </div>
                <div className="relative flex items-center gap-2">
                  <Button variant="consoleOutline" size="sm" className="min-h-10 text-xs" onClick={() => { setExportOpen(false); setCompareOpen(!compareOpen); }} aria-expanded={compareOpen} disabled={!dataReady || comparing}>{comparing ? <LoaderCircle className="animate-spin" /> : <GitCompareArrows />}{comparing ? "Comparing…" : "Compare"}<ChevronDown /></Button>
                  {compareOpen && <div className="absolute bottom-full right-0 z-10 mb-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                    {([["all", `All ${rows.length} matches`], ["filtered", `Filtered (${filtered.length})`], ["one", "Selected match only"]] as const).map(([scope, label]) => <button key={scope} onClick={() => runCompare(scope)} className="block w-full px-3 py-3 text-left text-xs hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{label}</button>)}
                  </div>}
                  <Button variant="console" size="sm" className="min-h-10 text-xs" onClick={() => { setCompareOpen(false); setExportOpen(!exportOpen); }} aria-expanded={exportOpen} disabled={!dataReady || exporting}>{exporting ? <LoaderCircle className="animate-spin" /> : <Download />}{exporting ? "Exporting…" : "Export JSON"}<ChevronDown /></Button>
                  {exportOpen && <div className="absolute bottom-full right-0 z-10 mb-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                    {([["all", `All ${rows.length} matches`], ["filtered", `Filtered (${filtered.length})`], ["one", "Selected match only"]] as const).map(([scope, label]) => <button key={scope} onClick={() => exportJson(scope)} className="block w-full px-3 py-3 text-left text-xs hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">{label}</button>)}
                  </div>}
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="mt-4 hidden flex-wrap lg:flex items-center justify-between gap-2 border-t border-border pt-4 text-xs uppercase tracking-widest text-muted-foreground">
          <span>Reference schema · example.json</span>
          <span>Deterministic order · {sort.field} {sort.dir}</span>
          <span>Live source · stacy.olympics.com (Official Olympic Data Feed)</span>
        </footer>
      </div>

      <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
        {toast && <div className="flex items-center gap-2 rounded-md border border-signal-green/40 bg-panel px-3 py-2 text-xs text-signal-green shadow-lg"><Check className="size-3.5" />{toast}</div>}
      </div>
    </main>
  );
}
