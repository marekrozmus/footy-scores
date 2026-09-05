import { LoaderCircle } from "@/components/icons";

import type { Phase } from "./types";

export function RunProgress({ phase, progress }: { phase: Phase; progress: number }) {
  return (
    <div className="animate-rise mt-5" aria-label="Run progress">
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><LoaderCircle className="size-3.5 animate-spin text-signal-gold" />{phase === "loading" ? "Retrieving Olympic schedule" : "Generating endpoints"}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className="animate-rise h-full rounded-full bg-gradient-to-r from-signal-cyan via-signal-gold to-signal-green transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
