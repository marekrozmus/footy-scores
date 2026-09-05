import { Button } from "@/components/button";
import { AlertTriangle, Check, Clipboard, Copy, GitCompareArrows, LoaderCircle, RefreshCw, X } from "@/components/icons";
import { stripMeta } from "@/lib/odf/record";

import { ExportCompareMenu } from "./export-compare-menu";
import { Flag } from "./flag";
import type { CompareResultEntry, DetailEntry, ExportScope, MatchRowData, SortState } from "./types";

type InspectorTab = "endpoint" | "data" | "compare";

const TABS: readonly (readonly [InspectorTab, string])[] = [
  ["endpoint", "Endpoint"],
  ["data", "Source data"],
  ["compare", "Compare"],
];

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
}) {
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
          {TABS.map(([value, label]) => <Button key={value} variant={inspector === value ? "console" : "ghost"} size="sm" role="tab" aria-selected={inspector === value} onClick={() => onInspectorChange(value)} className="min-h-10 px-3 text-xs">{value === "compare" && <GitCompareArrows />}{label}</Button>)}
        </div>
        <span className="hidden truncate text-xs text-muted-foreground xl:inline">{selected?.id ?? "—"}</span>
        <Button variant="ghost" size="sm" className="min-h-11 shrink-0 px-3 text-xs md:hidden" onClick={() => onSheetOpenChange(false)}><X />Close</Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden" role="tablist" aria-label="Match inspector sections">
        {TABS.map(([value, label]) => <Button key={value} variant={inspector === value ? "console" : "ghost"} size="sm" role="tab" aria-selected={inspector === value} onClick={() => onInspectorChange(value)} className="min-h-11 shrink-0 px-3 text-xs">{value === "compare" && <GitCompareArrows />}{label}</Button>)}
      </div>

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
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Compare the generated reference (strict example.json shape, no meta) with the response from the tested FootyScores API. Runs server-side, so the tested API doesn&apos;t need CORS enabled for this app&apos;s origin.</p>
                  </div>
                </div>
                <label className="mt-4 block text-xs uppercase tracking-14 text-muted-foreground">
                  Test API base URL
                  <input className="mt-2 min-h-10 w-full rounded-md border border-border bg-panel px-3 text-xs text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" value={baseUrl} onChange={(event) => onBaseUrlChange(event.target.value)} />
                </label>
                <Button variant="consoleOutline" className="mt-3 min-h-10 w-full text-xs" onClick={onCompareSelected} disabled={comparing}>{comparing ? <LoaderCircle className="animate-spin" /> : <GitCompareArrows />}{comparing ? "Comparing…" : "Compare this match"}</Button>
                <p className="mt-2 text-xs text-muted-foreground">Need every match at once? Use the <b className="text-foreground">Compare</b> button next to Export JSON instead.</p>
              </div>
              {!compareResult ? (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-signal-gold/30 bg-signal-gold/5 p-3 text-xs text-muted-foreground">
                  <AlertTriangle className="size-5 shrink-0 text-signal-gold" />
                  <span>Comparison has not run for this match yet.</span>
                </div>
              ) : compareResult.status === "error" ? (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-signal-red/30 bg-signal-red/5 p-3 text-xs text-signal-red">
                  <AlertTriangle className="size-5 shrink-0" />
                  <span className="break-all">{compareResult.message}</span>
                </div>
              ) : compareResult.status === "pass" ? (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-signal-green/30 bg-signal-green/5 p-3 text-xs text-signal-green">
                  <Check className="size-4 shrink-0" />
                  <span>Exact match — the tested API&apos;s response matches the generated reference.</span>
                </div>
              ) : (
                <div className="mt-3 overflow-hidden rounded-md border border-border">
                  <div className="grid grid-compare-row gap-2 border-b border-border bg-panel px-3 py-2.5 text-xs uppercase tracking-widest text-muted-foreground"><span>Field</span><span>Expected</span><span>Actual</span></div>
                  {compareResult.diffs.map((diff) => (
                    <div key={diff.path} className="grid grid-compare-row gap-2 border-b border-border bg-signal-red/5 px-3 py-2.5 text-xs last:border-0">
                      <span className="break-all text-muted-foreground">{diff.path}</span>
                      <span className="break-all">{diff.kind === "extra" ? "—" : JSON.stringify(diff.expected)}</span>
                      <span className="break-all text-signal-red">{diff.kind === "missing" ? "—" : JSON.stringify(diff.actual)}</span>
                    </div>
                  ))}
                  <p className="bg-panel px-3 py-2.5 text-xs text-muted-foreground">{compareResult.diffs.length} difference{compareResult.diffs.length === 1 ? "" : "s"}</p>
                </div>
              )}
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
        />
      </div>
    </section>
  );
}

export type { InspectorTab };
