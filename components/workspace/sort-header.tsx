import { ChevronDown, ChevronUp } from "@/components/icons";

import type { SortField, SortState } from "./types";
import { sortFieldLabels } from "./utils";

export function SortHeader({
  field,
  className,
  sort,
  onSort,
}: {
  field: SortField;
  className?: string;
  sort: SortState;
  onSort: (sort: SortState) => void;
}) {
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
