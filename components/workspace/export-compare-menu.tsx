import { Button } from "@/components/button";
import { ChevronDown, Download, GitCompareArrows, LoaderCircle } from "@/components/icons";

import type { ExportScope } from "./types";

const SCOPE_LABELS: readonly (readonly [ExportScope, (total: number, filteredCount: number) => string])[] = [
  ["all", (total) => `All ${total} matches`],
  ["filtered", (_total, filteredCount) => `Filtered (${filteredCount})`],
  ["one", () => "Selected match only"],
];

export function ExportCompareMenu({
  variant,
  totalCount,
  filteredCount,
  dataReady,
  comparing,
  exporting,
  compareOpen,
  exportOpen,
  onToggleCompare,
  onToggleExport,
  onCompare,
  onExport,
  selectedReady,
}: {
  variant: "mobile" | "desktop";
  totalCount: number;
  filteredCount: number;
  dataReady: boolean;
  comparing: boolean;
  exporting: boolean;
  compareOpen: boolean;
  exportOpen: boolean;
  onToggleCompare: () => void;
  onToggleExport: () => void;
  onCompare: (scope: ExportScope) => void;
  onExport: (scope: ExportScope) => void;
  selectedReady: boolean;
}) {
  const minHeight = variant === "mobile" ? "min-h-11" : "min-h-10";
  const zIndex = variant === "mobile" ? "z-30" : "z-10";
  const itemClasses = variant === "mobile" ? "py-3 text-sm" : "py-3 text-xs";

  return (
    <div className="relative flex shrink-0 items-center gap-2 ml-auto">
      <Button variant="consoleOutline" size="sm" className={`${minHeight} text-xs`} onClick={onToggleCompare} aria-expanded={compareOpen} disabled={!dataReady || comparing}>
        {comparing ? <LoaderCircle className="animate-spin" /> : <GitCompareArrows />}
        {comparing ? "Comparing…" : "Compare"}
        <ChevronDown />
      </Button>
      {compareOpen && (
        <div className={`absolute bottom-full left-0 ${zIndex} mb-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg`}>
          {SCOPE_LABELS.map(([scope, label]) => {
            const disabled = scope === "one" && !selectedReady;
            return (
              <button key={scope} onClick={() => onCompare(scope)} disabled={disabled} className={`block w-full px-3 ${itemClasses} text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${disabled ? "cursor-not-allowed text-muted-foreground/50" : "cursor-pointer hover:bg-border"}`}>
                {label(totalCount, filteredCount)}
              </button>
            );
          })}
        </div>
      )}
      <Button variant="console" size="sm" className={`${minHeight} text-xs`} onClick={onToggleExport} aria-expanded={exportOpen} disabled={!dataReady || exporting}>
        {exporting ? <LoaderCircle className="animate-spin" /> : <Download />}
        {exporting ? "Exporting…" : "Export JSON"}
        <ChevronDown />
      </Button>
      {exportOpen && (
        <div className={`absolute bottom-full right-0 ${zIndex} mb-2 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg`}>
          {SCOPE_LABELS.map(([scope, label]) => {
            const disabled = scope === "one" && !selectedReady;
            return (
              <button key={scope} onClick={() => onExport(scope)} disabled={disabled} className={`block w-full px-3 ${itemClasses} text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${disabled ? "cursor-not-allowed text-muted-foreground/50" : "cursor-pointer hover:bg-border"}`}>
                {label(totalCount, filteredCount)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
