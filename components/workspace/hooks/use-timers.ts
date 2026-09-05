import { useCallback, useEffect, useRef } from "react";

// A small managed-timeout bag shared by useToast (auto-dismiss) and useMatchRun (the delayed
// "generating" -> "complete" phase transition) — clearing it on a fresh run/reset cancels any
// stale phase-transition timeout from a previous run, exactly like the toast's own dismiss timer.
export function useTimers() {
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const clearAll = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  return { schedule, clearAll };
}
