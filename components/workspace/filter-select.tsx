import { useEffect, useRef, useState } from "react";

import { Check, ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn("flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-panel px-3 py-2 text-xs outline-none hover:border-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring", className)}
      >
        <span className="shrink-0 text-muted-foreground">{label}</span>
        <span className="ml-auto truncate font-medium text-foreground">{value}</span>
        <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" aria-label={label} className="absolute bottom-full left-0 z-20 mb-2 max-h-72 w-full min-w-48 overflow-auto rounded-md border border-border bg-popover shadow-lg lg:bottom-auto lg:top-full lg:mb-0 lg:mt-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => { onChange(option); setOpen(false); }}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${option === value ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              <Check className={`size-3.5 shrink-0 text-signal-green ${option === value ? "opacity-100" : "opacity-0"}`} />
              <span className="truncate">{option}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
