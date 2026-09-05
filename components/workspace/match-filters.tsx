import { Button } from "@/components/button";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "@/components/icons";

import { FilterSelect } from "./filter-select";
import type { SortField, SortState } from "./types";
import { sortFieldLabels } from "./utils";

const SORT_FIELDS: readonly SortField[] = ["kickoff", "match", "score", "stage", "gender"];

export function MatchFilters({
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
  sort,
  onSortChange,
  filtersOpen,
  onFiltersOpenChange,
  activeFilterCount,
  filteredCount,
  onClearFilters,
}: {
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
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  activeFilterCount: number;
  filteredCount: number;
  onClearFilters: () => void;
}) {
  return (
    <>
      <div className="mt-3 flex items-center gap-2 lg:hidden">
        <label className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search matches</span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} className="min-h-11 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring" placeholder="Search team, venue, ID…" />
        </label>
        <Button variant="consoleOutline" size="sm" className="relative min-h-11 shrink-0 px-3" aria-label={`Filters and sorting${activeFilterCount ? `, ${activeFilterCount} active` : ""}`} aria-expanded={filtersOpen} onClick={() => onFiltersOpenChange(true)}>
          <SlidersHorizontal className="size-4" />
          {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-signal-gold text-xs font-bold text-background">{activeFilterCount}</span>}
        </Button>
      </div>
      <div className="mt-3 hidden items-center gap-2 lg:flex lg:flex-wrap" aria-label="Match filters">
        <FilterSelect label="Gender" value={gender} options={["All", "Men", "Women"]} onChange={onGenderChange} />
        <FilterSelect label="Stage" value={stage} options={stages} onChange={onStageChange} />
        <FilterSelect label="Team" value={team} options={teams} onChange={onTeamChange} />
        <label className="relative ml-auto hidden min-w-56 flex-1 lg:block lg:max-w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search matches</span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} className="min-h-10 w-full rounded-md border border-border bg-panel pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring" placeholder="Search team, venue, ID…" />
        </label>
      </div>
      {filtersOpen && (
        <div className="lg:hidden">
          <button aria-label="Close filters" onClick={() => onFiltersOpenChange(false)} className="fixed inset-0 z-40 cursor-pointer bg-background/70 backdrop-blur-sm" />
          <div role="dialog" aria-modal="true" aria-label="Filters and sorting" className="animate-rise fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border bg-panel-raised p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-sm font-bold uppercase">Filters &amp; sorting</h3>
              <Button variant="ghost" size="sm" className="min-h-11 px-3 text-xs" onClick={() => onFiltersOpenChange(false)}><X />Close</Button>
            </div>
            <div className="mt-3 grid gap-2">
              <FilterSelect label="Gender" value={gender} options={["All", "Men", "Women"]} onChange={onGenderChange} className="min-h-12" />
              <FilterSelect label="Stage" value={stage} options={stages} onChange={onStageChange} className="min-h-12" />
              <FilterSelect label="Team" value={team} options={teams} onChange={onTeamChange} className="min-h-12" />
              <div className="flex items-center gap-2">
                <FilterSelect
                  label="Sort by"
                  value={sortFieldLabels[sort.field]}
                  options={SORT_FIELDS.map((field) => sortFieldLabels[field])}
                  onChange={(label) => {
                    const field = SORT_FIELDS.find((candidate) => sortFieldLabels[candidate] === label) ?? sort.field;
                    onSortChange({ field, dir: sort.dir });
                  }}
                  className="min-h-12 flex-1"
                />
                <button type="button" onClick={() => onSortChange({ field: sort.field, dir: sort.dir === "asc" ? "desc" : "asc" })} className="flex min-h-12 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-border px-3 text-xs font-medium uppercase text-foreground transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {sort.dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}{sort.dir}
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="consoleOutline" size="sm" className="min-h-11 flex-1 text-xs" onClick={onClearFilters}>Clear all</Button>
              <Button size="sm" className="min-h-11 flex-1 text-xs" onClick={() => onFiltersOpenChange(false)}>Show {filteredCount} matches</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
