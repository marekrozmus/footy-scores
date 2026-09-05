import { useCallback, useRef, useState } from "react";

import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

import type { DetailEntry } from "../types";

export function useMatchDetails() {
  const [details, setDetails] = useState<Map<string, DetailEntry>>(new Map());
  const detailRequests = useRef(new Map<string, Promise<FootballRecord>>());

  const ensureDetail = useCallback((summary: MatchSummary): Promise<FootballRecord> => {
    const cached = detailRequests.current.get(summary.id);
    if (cached) return cached;
    setDetails((prev) => new Map(prev).set(summary.id, { status: "loading" }));
    const request = fetch(`/api/matches/${encodeURIComponent(summary.id)}`)
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) {
          const message = body && typeof body === "object" && "error" in body ? String(body.error) : undefined;
          throw new Error(message ?? `Match detail request failed (${response.status})`);
        }
        return body as FootballRecord;
      })
      .then((record) => {
        setDetails((prev) => new Map(prev).set(summary.id, { status: "ready", record }));
        return record;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Failed to load match detail.";
        setDetails((prev) => new Map(prev).set(summary.id, { status: "error", message }));
        detailRequests.current.delete(summary.id);
        throw error;
      });
    detailRequests.current.set(summary.id, request);
    return request;
  }, []);

  const retryDetail = useCallback(
    (summary: MatchSummary) => {
      detailRequests.current.delete(summary.id);
      ensureDetail(summary).catch(() => {});
    },
    [ensureDetail],
  );

  const resetDetails = useCallback(() => {
    setDetails(new Map());
    detailRequests.current.clear();
  }, []);

  return { details, ensureDetail, retryDetail, resetDetails };
}
