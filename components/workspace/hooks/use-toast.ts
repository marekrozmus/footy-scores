import { useCallback, useEffect, useRef, useState } from "react";

// Owns its own dismiss timer rather than sharing one with other timed state (e.g. useMatchRun's
// phase transition) — they used to share a single timer bag, and clearing it for one purpose (a
// fresh run/reset starting) silently cancelled the other's pending dismissal too, leaving a stale
// toast on screen indefinitely after e.g. Reset -> Load & generate in quick succession.
export function useToast() {
  const [toast, setToast] = useState("");
  const dismissTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(dismissTimer.current), []);

  const notify = useCallback((message: string) => {
    window.clearTimeout(dismissTimer.current);
    setToast(message);
    dismissTimer.current = window.setTimeout(() => setToast(""), 2200);
  }, []);

  return { toast, notify };
}
