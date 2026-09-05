import { Check } from "@/components/icons";

export function Toast({ message }: { message: string }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      {message && <div className="flex items-center gap-2 rounded-md border border-signal-green/40 bg-panel px-3 py-2 text-xs text-signal-green shadow-lg"><Check className="size-3.5" />{message}</div>}
    </div>
  );
}
