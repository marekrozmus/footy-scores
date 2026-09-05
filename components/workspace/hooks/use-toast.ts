import { useCallback, useState } from "react";

export function useToast(schedule: (fn: () => void, ms: number) => void) {
  const [toast, setToast] = useState("");

  const notify = useCallback(
    (message: string) => {
      setToast(message);
      schedule(() => setToast(""), 2200);
    },
    [schedule],
  );

  return { toast, notify };
}
