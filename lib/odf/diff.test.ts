import { describe, expect, it } from "vitest";

import { diffJson } from "./diff";

function paths(diffs: ReturnType<typeof diffJson>): string[] {
  return diffs.map((diff) => `${diff.kind}:${diff.path}`).sort();
}

describe("diffJson", () => {
  it("returns no diffs for identical objects", () => {
    expect(diffJson({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toEqual([]);
  });

  it("flags a changed primitive with its exact path", () => {
    const diffs = diffJson({ score: { home: 1, away: 2 } }, { score: { home: 1, away: 3 } });
    expect(paths(diffs)).toEqual(["changed:score.away"]);
  });

  it("flags a key present in expected but missing from actual", () => {
    const diffs = diffJson({ a: 1, b: 2 }, { a: 1 });
    expect(paths(diffs)).toEqual(["missing:b"]);
  });

  it("flags a key present in actual but not in expected", () => {
    const diffs = diffJson({ a: 1 }, { a: 1, b: 2 });
    expect(paths(diffs)).toEqual(["extra:b"]);
  });

  it("diffs the one array element that actually differs, once identical ones are matched off", () => {
    const diffs = diffJson({ scorers: [{ minute: 10 }, { minute: 20 }] }, { scorers: [{ minute: 10 }, { minute: 25 }] });
    expect(paths(diffs)).toEqual(["changed:scorers[1].minute"]);
  });

  it("flags an extra trailing array element as extra, not changed", () => {
    const diffs = diffJson({ scorers: [{ minute: 10 }] }, { scorers: [{ minute: 10 }, { minute: 20 }] });
    expect(paths(diffs)).toEqual(["extra:scorers[1]"]);
  });

  it("flags a missing trailing array element as missing", () => {
    const diffs = diffJson({ scorers: [{ minute: 10 }, { minute: 20 }] }, { scorers: [{ minute: 10 }] });
    expect(paths(diffs)).toEqual(["missing:scorers[1]"]);
  });

  describe("order-independent array matching", () => {
    it("reports no diff when the same items appear in a different order", () => {
      const diffs = diffJson(
        { scorers: [{ player: "A", minute: 10 }, { player: "B", minute: 20 }] },
        { scorers: [{ player: "B", minute: 20 }, { player: "A", minute: 10 }] },
      );
      expect(diffs).toEqual([]);
    });

    it("still finds a genuine change when it's mixed in with reordered items", () => {
      // A and C are identical (just reordered); B changed to D — only that pairing should diff.
      const diffs = diffJson(
        { items: [{ id: "A" }, { id: "B" }, { id: "C" }] },
        { items: [{ id: "C" }, { id: "A" }, { id: "D" }] },
      );
      expect(diffs).toEqual([{ path: "items[1].id", kind: "changed", expected: "B", actual: "D" }]);
    });

    it("matches duplicate entries pairwise rather than collapsing them", () => {
      const diffs = diffJson({ items: [{ n: 1 }, { n: 1 }] }, { items: [{ n: 1 }, { n: 1 }] });
      expect(diffs).toEqual([]);
    });

    it("reports a real count mismatch as missing/extra even after matching off duplicates", () => {
      const diffs = diffJson({ items: [{ n: 1 }, { n: 1 }] }, { items: [{ n: 1 }] });
      expect(paths(diffs)).toEqual(["missing:items[1]"]);
    });
  });

  it("treats null vs. object as a changed value, not a key-by-key diff", () => {
    const diffs = diffJson({ lineups: null }, { lineups: { home: {} } });
    expect(paths(diffs)).toEqual(["changed:lineups"]);
  });

  it("finds a change nested several levels deep", () => {
    const diffs = diffJson({ lineups: { home: { formation: "4-4-2" } } }, { lineups: { home: { formation: "4-3-3" } } });
    expect(paths(diffs)).toEqual(["changed:lineups.home.formation"]);
  });

  it("carries the expected/actual values on a changed entry", () => {
    const diffs = diffJson({ status: "FT" }, { status: "AET" });
    expect(diffs).toEqual([{ path: "status", kind: "changed", expected: "FT", actual: "AET" }]);
  });
});
