import { ChevronRight } from "@/components/icons";

import { Flag } from "./flag";
import type { MatchRowData } from "./types";

export function MatchRow({ row, selected, onSelect }: { row: MatchRowData; selected: boolean; onSelect: () => void }) {
  return (
    <button aria-label={`${row.home} versus ${row.away}, ${row.date} at ${row.time}, ${row.gender}`} onClick={onSelect} className={`grid min-h-16 w-full cursor-pointer grid-cols-1 content-start items-start gap-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[1fr_auto] md:items-center md:gap-3 lg:grid-match-row lg:items-center ${selected ? "md:bg-signal-gold/10 md:shadow-[inset_2px_0_0_var(--signal-gold)]" : "hover:bg-panel-raised"}`}>
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
  );
}
