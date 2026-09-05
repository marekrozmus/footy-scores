import { useCallback, useState } from "react";

import { buildMatchSlug } from "@/lib/odf/record";
import type { FootballRecord } from "@/lib/odf/record";
import type { MatchSummary } from "@/lib/odf/types";

import type { ExportScope, MatchRowData } from "../types";

export function useExportJson({
  rows,
  filtered,
  selected,
  summaryById,
  ensureDetail,
  notify,
  onDone,
}: {
  rows: MatchRowData[];
  filtered: MatchRowData[];
  selected: MatchRowData | undefined;
  summaryById: Map<string, MatchSummary>;
  ensureDetail: (summary: MatchSummary) => Promise<FootballRecord>;
  notify: (message: string) => void;
  onDone: () => void;
}) {
  const [exporting, setExporting] = useState(false);

  const exportJson = useCallback(
    async (scope: ExportScope) => {
      const targetRows = scope === "all" ? rows : scope === "filtered" ? filtered : selected ? [selected] : [];
      const targets = targetRows.map((row) => summaryById.get(row.id)).filter((summary): summary is MatchSummary => Boolean(summary));

      onDone();
      if (!targets.length) return;

      setExporting(true);
      try {
        const records = await Promise.all(targets.map((summary) => ensureDetail(summary)));
        let blob: Blob;
        let filename: string;
        if (scope === "one") {
          blob = new Blob([JSON.stringify(records[0], null, 2)], { type: "application/json" });
          filename = targets[0] ? `${buildMatchSlug(targets[0])}.json` : "footyscores-paris2024-one.json";
        } else {
          const { default: JSZip } = await import("jszip");
          const zip = new JSZip();
          targets.forEach((summary, index) => {
            zip.file(`${buildMatchSlug(summary)}.json`, JSON.stringify(records[index], null, 2));
          });
          blob = await zip.generateAsync({ type: "blob" });
          filename = `footyscores-paris2024-${scope}.zip`;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        notify(`Exported ${records.length} record${records.length === 1 ? "" : "s"} as ${scope === "one" ? "JSON" : "a zip of JSON files"}`);
      } catch {
        notify("Export failed — one or more matches could not be loaded");
      } finally {
        setExporting(false);
      }
    },
    [rows, filtered, selected, summaryById, ensureDetail, notify, onDone],
  );

  return { exporting, exportJson };
}
