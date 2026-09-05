import type { DiffEntry } from "@/lib/odf/diff";
import type { FootballRecord } from "@/lib/odf/record";

export type MatchRowData = {
  id: string;
  iso: string;
  date: string;
  time: string;
  home: string;
  homeNoc: string;
  away: string;
  awayNoc: string;
  homeGoals: number | null;
  awayGoals: number | null;
  score: string;
  stage: string;
  round: string;
  gender: "Men" | "Women";
  venue: string;
  city: string;
  scheduleStatus: string;
  sourceUrl: string;
};

export type DetailEntry = { status: "loading" } | { status: "ready"; record: FootballRecord } | { status: "error"; message: string };

export type CompareResultEntry =
  | { status: "pass" }
  | { status: "fail"; diffs: DiffEntry[] }
  | { status: "error"; message: string };

export type Phase = "idle" | "loading" | "generating" | "complete" | "error";
export type SortField = "kickoff" | "match" | "score" | "stage" | "gender";
export type SortState = { field: SortField; dir: "asc" | "desc" };
export type ExportScope = "all" | "filtered" | "one";
