import type { SortState } from "./types";

export function WorkspaceFooter({ sort }: { sort: SortState }) {
  return (
    <footer className="mt-4 hidden flex-wrap lg:flex items-center justify-between gap-2 border-t border-border pt-4 text-xs uppercase tracking-widest text-muted-foreground">
      <span>Reference schema · example.json</span>
      <span>Deterministic order · {sort.field} {sort.dir}</span>
      <span>Live source · stacy.olympics.com (Official Olympic Data Feed)</span>
    </footer>
  );
}
