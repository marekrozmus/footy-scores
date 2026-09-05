import { useCallback, useEffect, useRef, useState } from "react";

export function useResizableSplit(initialLeftWidth: number) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const min = rect.width * 0.28;
      const max = rect.width * 0.72;
      const x = Math.max(min, Math.min(event.clientX - rect.left, max));
      setLeftWidth((x / rect.width) * 100);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    dragging.current = true;
  }, []);

  return { leftWidth, splitRef, startResize };
}
