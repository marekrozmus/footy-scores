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

  it("diffs arrays element-by-element by index", () => {
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
