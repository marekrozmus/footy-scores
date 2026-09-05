import { AlertTriangle, Check } from "@/components/icons";

import type { CompareResultEntry } from "./types";

// Shared by the Compare tab's inline "last result" view and CompareResultModal, so the two never
// drift out of sync with each other.
export function CompareResultView({ result }: { result: CompareResultEntry | undefined }) {
  if (!result) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-signal-gold/30 bg-signal-gold/5 p-3 text-xs text-muted-foreground">
        <AlertTriangle className="size-5 shrink-0 text-signal-gold" />
        <span>Comparison has not run for this match yet.</span>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-signal-red/30 bg-signal-red/5 p-3 text-xs text-signal-red">
        <AlertTriangle className="size-5 shrink-0" />
        <span className="break-all">{result.message}</span>
      </div>
    );
  }

  if (result.status === "pass") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-signal-green/30 bg-signal-green/5 p-3 text-xs text-signal-green">
        <Check className="size-4 shrink-0" />
        <span>Exact match — the tested API&apos;s response matches the generated reference.</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
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
}
