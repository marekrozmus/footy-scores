import { useEffect, useState } from "react";

import { Button } from "@/components/button";
import { AlertTriangle, Clipboard, Copy, GitCompareArrows, LoaderCircle, RefreshCw, X } from "@/components/icons";
import { stripMeta } from "@/lib/odf/record";

import { CompareResultView } from "./compare-result-view";
import { ExportCompareMenu } from "./export-compare-menu";
import { Flag } from "./flag";
import type { CompareResultEntry, DetailEntry, ExportScope, MatchRowData, SortState } from "./types";

type InspectorTab = "endpoint" | "data" | "compare";

const TABS: readonly (readonly [InspectorTab, string])[] = [
  ["endpoint", "Endpoint"],
  ["data", "Source data"],
  ["compare", "Compare"],
];

// Only ever rendered by the parent while the thing it's gating is actually happening (see the
// `showDetailLoading &&` call site below), so "reset" is just "this instance gets unmounted" —
// no synchronous setState-on-deactivate needed, `setShown` only ever fires from the timer
// callback itself. Mount a fresh instance per match via `key` so a quick match A -> match B
// switch (both loading) restarts the delay instead of inheriting A's elapsed time.
function DelayedAppear({ delayMs, children }: { delayMs: number; children: React.ReactNode }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return shown ? children : null;
}

export function MatchInspectorPanel({
  sheetOpen,
  onSheetOpenChange,
  selected,
  endpoint,
  baseUrl,
  onBaseUrlChange,
  detailEntry,
  inspector,
  onInspectorChange,
  onCopy,
  onRetryDetail,
  compareResult,
  comparing,
  onCompareSelected,
  onComparePasted,
  rows,
  filtered,
  dataReady,
  sort,
  exporting,
  compareOpen,
  exportOpen,
  onToggleCompare,
  onToggleExport,
  onCompare,
  onExport,
  selectedReady,
}: {
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  selected: MatchRowData | undefined;
  endpoint: string;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
  detailEntry: DetailEntry | undefined;
  inspector: InspectorTab;
  onInspectorChange: (tab: InspectorTab) => void;
  onCopy: (text: string, message: string) => void;
  onRetryDetail: () => void;
  compareResult: CompareResultEntry | undefined;
  comparing: boolean;
  onCompareSelected: () => void;
  onComparePasted: (json: string) => void;
  rows: MatchRowData[];
  filtered: MatchRowData[];
  dataReady: boolean;
  sort: SortState;
  exporting: boolean;
  compareOpen: boolean;
  exportOpen: boolean;
  onToggleCompare: () => void;
  onToggleExport: () => void;
  onCompare: (scope: ExportScope) => void;
  onExport: (scope: ExportScope) => void;
  selectedReady: boolean;
}) {
  // Disabled (not just visually) while there's genuinely nothing to show yet — but not on error,
  // since that's exactly where the retry action lives, and not on "ready", obviously.
  const sourceTabDisabled = detailEntry === undefined || detailEntry.status === "loading";

  // Local, ephemeral scratch input — nothing else needs to read it, so unlike baseUrl it isn't
  // lifted to the parent.
  const [pastedJson, setPastedJson] = useState("");

  return (
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
          {TABS.map(([value, label]) => <Button key={value} variant={inspector === value ? "console" : "ghost"} size="sm" role="tab" aria-selected={inspector === value} disabled={value === "data" && sourceTabDisabled} onClick={() => onInspectorChange(value)} className="min-h-10 px-3 text-xs">{value === "compare" && <GitCompareArrows />}{label}</Button>)}
        </div>
        <span className="hidden truncate text-xs text-muted-foreground xl:inline">{selected?.id ?? "—"}</span>
        <Button variant="ghost" size="sm" className="min-h-11 shrink-0 px-3 text-xs md:hidden" onClick={() => onSheetOpenChange(false)}><X />Close</Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden" role="tablist" aria-label="Match inspector sections">
        {TABS.map(([value, label]) => <Button key={value} variant={inspector === value ? "console" : "ghost"} size="sm" role="tab" aria-selected={inspector === value} disabled={value === "data" && sourceTabDisabled} onClick={() => onInspectorChange(value)} className="min-h-11 shrink-0 px-3 text-xs">{value === "compare" && <GitCompareArrows />}{label}</Button>)}
      </div>

      {detailEntry?.status === "loading" && (
        <DelayedAppear key={selected?.id} delayMs={300}>
          <div className="flex items-center gap-2 border-b border-border bg-panel px-4 py-2 text-xs text-muted-foreground" aria-live="polite">
            <LoaderCircle className="size-3.5 animate-spin text-signal-cyan" />
            Loading match detail…
          </div>
        </DelayedAppear>
      )}

      {detailEntry?.status === "error" && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-signal-red/5 px-4 py-2 text-xs text-signal-red" role="alert">
          <span className="flex min-w-0 items-center gap-2"><AlertTriangle className="size-3.5 shrink-0" /><span className="break-all">Failed to load match detail: {detailEntry.message}</span></span>
          <Button variant="consoleOutline" size="sm" className="h-7 shrink-0 text-xs" onClick={onRetryDetail}><RefreshCw />Retry</Button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {!selected ? <div className="flex-1 grid place-items-center px-6 text-center text-sm text-muted-foreground">Select a match to inspect its generated endpoint.</div> : (
          <>
            {inspector === "endpoint" && <div role="tabpanel" className="flex flex-col">
              <div className="px-4 pt-4">
                <div className="rounded-md border border-border bg-background px-3 py-3 text-xs leading-relaxed break-all">
                  <span className="text-signal-green">GET </span>{endpoint}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="console" size="sm" className="min-h-10 flex-1 text-xs" onClick={() => onCopy(`${baseUrl}${endpoint}`, "Endpoint copied to clipboard")}><Clipboard />Copy endpoint</Button>
                  <Button variant="consoleOutline" size="sm" className="min-h-10 text-xs" onClick={() => onCopy(`curl -s '${baseUrl}${endpoint}' -H 'Accept: application/json'`, "cURL command copied")}><Copy />cURL</Button>
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
                <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={detailEntry?.status !== "ready"} onClick={() => { if (detailEntry?.status === "ready") onCopy(JSON.stringify(stripMeta(detailEntry.record), null, 2), "Record JSON copied"); }}><Copy />Copy JSON</Button>
              </div>
              {detailEntry?.status === "ready" ? (
                <pre className="mx-4 flex-1 overflow-auto rounded-md border border-border bg-background p-3 text-xs leading-6 text-muted-foreground"><code>{JSON.stringify(stripMeta(detailEntry.record), null, 2)}</code></pre>
              ) : detailEntry?.status === "error" ? (
                <div className="mx-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-signal-red/30 bg-signal-red/5 p-4 text-center text-xs text-signal-red">
                  <AlertTriangle className="size-5" />
                  {detailEntry.message}
                  <Button variant="consoleOutline" size="sm" className="mt-1 text-xs" onClick={onRetryDetail}><RefreshCw />Retry</Button>
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
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Compare the generated reference with the response from the tested FootyScores API.</p>
                  </div>
                </div>
                <label className="mt-4 block text-xs uppercase tracking-14 text-muted-foreground">
                  Test API base URL
                  <input className="mt-2 min-h-10 w-full rounded-md border border-border bg-panel px-3 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" value={baseUrl} onChange={(event) => onBaseUrlChange(event.target.value)} />
                </label>
                <Button variant="consoleOutline" className="mt-3 min-h-10 w-full text-xs" onClick={onCompareSelected} disabled={comparing || detailEntry?.status !== "ready"}>{comparing ? <LoaderCircle className="animate-spin" /> : <GitCompareArrows />}{comparing ? "Comparing…" : "Compare this match"}</Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  {detailEntry?.status === "loading"
                    ? "Waiting for match detail to finish loading…"
                    : <>Need every match at once? Use the <b className="text-foreground">Compare</b> button next to Export JSON instead.</>}
                </p>
              </div>

              <div className="mt-3 rounded-md border border-border bg-background p-4">
                <label className="block text-xs uppercase tracking-14 text-muted-foreground">
                  Or paste a JSON response to compare directly
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-md border border-border bg-panel px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                    placeholder='{"competition": ..., "teams": ..., "score": ...}'
                    value={pastedJson}
                    onChange={(event) => setPastedJson(event.target.value)}
                  />
                </label>
                <Button
                  variant="consoleOutline"
                  className="mt-3 min-h-10 w-full text-xs"
                  onClick={() => onComparePasted(pastedJson)}
                  disabled={detailEntry?.status !== "ready" || pastedJson.trim() === ""}
                >
                  <GitCompareArrows />Compare pasted JSON
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">Runs entirely in the browser — no base URL or live API needed, since the match&apos;s reference data is already loaded.</p>
              </div>

              <div className="mt-3">
                <CompareResultView result={compareResult} />
              </div>
            </div>}
          </>
        )}
      </div>

      <div className="mt-auto hidden flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 md:flex">
        <div>
          <p className="text-xs uppercase tracking-14 text-muted-foreground">Export run</p>
          <p className="mt-0.5 text-xs">{filtered.length} of {dataReady ? rows.length : 0} records · JSON · {sort.field} {sort.dir}</p>
        </div>
        <ExportCompareMenu
          variant="desktop"
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
          selectedReady={selectedReady}
        />
      </div>
    </section>
  );
}

export type { InspectorTab };
