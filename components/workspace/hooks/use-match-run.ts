import { useCallback, useState } from "react";

import type { MatchSummary } from "@/lib/odf/types";

import type { Phase } from "../types";

export function useMatchRun({
  schedule,
  clearAll,
  notify,
  onBeforeRun,
  onReset,
}: {
  schedule: (fn: () => void, ms: number) => void;
  clearAll: () => void;
  notify: (message: string) => void;
  onBeforeRun: () => void;
  onReset: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [summaries, setSummaries] = useState<MatchSummary[]>([]);

  const run = useCallback(async () => {
    clearAll();
    onBeforeRun();
    setPhase("loading");
    try {
      const response = await fetch("/api/generate", { method: "POST" });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = body && typeof body === "object" && "error" in body ? String(body.error) : undefined;
        throw new Error(message ?? `Generate failed (${response.status})`);
      }
      const { matches } = body as { matches: MatchSummary[] };
      setPhase("generating");
      setSummaries(matches);
      schedule(() => setPhase("complete"), 250);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The Olympic schedule could not be loaded.");
      setPhase("error");
    }
  }, [clearAll, onBeforeRun, schedule]);

  const reset = useCallback(async () => {
    clearAll();
    setPhase("idle");
    setSummaries([]);
    onReset();
    try {
      await fetch("/api/generate", { method: "DELETE" });
      notify("Run reset — server cache cleared");
    } catch {
      notify("Run reset (server cache clear failed — will still refresh on next generate)");
    }
  }, [clearAll, notify, onReset]);

  return { phase, errorMessage, summaries, run, reset };
}
