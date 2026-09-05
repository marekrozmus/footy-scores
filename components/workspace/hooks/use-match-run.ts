import { useCallback, useEffect, useRef, useState } from "react";

import type { MatchSummary } from "@/lib/odf/types";

import type { Phase } from "../types";

// Owns its own delayed-transition timer rather than sharing one with useToast's dismiss timer —
// see that hook's comment for why they used to share a bag and what that broke.
export function useMatchRun({
  notify,
  onBeforeRun,
  onReset,
}: {
  notify: (message: string) => void;
  onBeforeRun: () => void;
  onReset: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [summaries, setSummaries] = useState<MatchSummary[]>([]);
  const completeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(completeTimer.current), []);

  const run = useCallback(async () => {
    window.clearTimeout(completeTimer.current);
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
      completeTimer.current = window.setTimeout(() => setPhase("complete"), 250);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The Olympic schedule could not be loaded.");
      setPhase("error");
    }
  }, [onBeforeRun]);

  const reset = useCallback(async () => {
    window.clearTimeout(completeTimer.current);
    setPhase("idle");
    setSummaries([]);
    onReset();
    try {
      await fetch("/api/generate", { method: "DELETE" });
      notify("Run reset — server cache cleared");
    } catch {
      notify("Run reset (server cache clear failed — will still refresh on next generate)");
    }
  }, [notify, onReset]);

  return { phase, errorMessage, summaries, run, reset };
}
