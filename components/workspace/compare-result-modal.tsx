import { Button } from "@/components/button";
import { X } from "@/components/icons";

import { CompareResultView } from "./compare-result-view";
import type { CompareResultEntry } from "./types";

// Pops open right after a single-match compare (URL-based or pasted) finishes, so the result is
// impossible to miss regardless of scroll position — unlike showing it inline further down the
// tab, which is what this replaced. Follows the same backdrop-button + role="dialog" pattern as
// the mobile menu/filter sheets elsewhere in this app (see RunControls/MatchFilters), just
// centered on the page instead of docked to an edge, since this one isn't mobile-only.
export function CompareResultModal({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: CompareResultEntry | undefined;
}) {
  if (!open) return null;

  return (
    <>
      <button aria-label="Close comparison result" onClick={onClose} className="fixed inset-0 z-40 cursor-pointer bg-background/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comparison result"
        className="animate-rise fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-md border border-border bg-panel-raised shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-4">
          <h3 className="font-display text-sm font-bold uppercase">Comparison result</h3>
          <Button variant="ghost" size="sm" className="min-h-11 px-3 text-xs" onClick={onClose}><X />Close</Button>
        </div>
        <div className="overflow-auto p-4">
          <CompareResultView result={result} />
        </div>
      </div>
    </>
  );
}
