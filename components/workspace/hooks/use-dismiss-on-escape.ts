import { useEffect } from "react";

// Callers pass a useState setter directly (stable identity) rather than an inline "close" callback,
// so this effect doesn't re-attach its listener on every render while `open` is true.
export function useDismissOnEscape(open: boolean, onOpenChange: (open: boolean) => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);
}
