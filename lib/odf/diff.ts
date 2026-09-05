export type DiffEntry = {
  path: string;
  kind: "missing" | "extra" | "changed";
  expected?: unknown;
  actual?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Structural JSON diff: expected (our generated reference) vs actual (the tested API's response).
// Arrays are compared element-by-element by index, not matched by content — so a reordering-only
// difference in an array of objects (e.g. scorers listed in a different order but with the same
// entries) shows up as per-index "changed" entries rather than being recognized as "same items,
// different order". Acceptable for a first pass; a known limitation, not a bug.
export function diffJson(expected: unknown, actual: unknown, path = "$"): DiffEntry[] {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const diffs: DiffEntry[] = [];
    const length = Math.max(expected.length, actual.length);
    for (let i = 0; i < length; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= expected.length) {
        diffs.push({ path: itemPath, kind: "extra", actual: actual[i] });
        continue;
      }
      if (i >= actual.length) {
        diffs.push({ path: itemPath, kind: "missing", expected: expected[i] });
        continue;
      }
      diffs.push(...diffJson(expected[i], actual[i], itemPath));
    }
    return diffs;
  }

  if (isPlainObject(expected) && isPlainObject(actual)) {
    const diffs: DiffEntry[] = [];
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const key of keys) {
      const keyPath = path === "$" ? key : `${path}.${key}`;
      const hasExpected = Object.hasOwn(expected, key);
      const hasActual = Object.hasOwn(actual, key);
      if (!hasActual) {
        diffs.push({ path: keyPath, kind: "missing", expected: expected[key] });
        continue;
      }
      if (!hasExpected) {
        diffs.push({ path: keyPath, kind: "extra", actual: actual[key] });
        continue;
      }
      diffs.push(...diffJson(expected[key], actual[key], keyPath));
    }
    return diffs;
  }

  if (expected !== actual) {
    return [{ path, kind: "changed", expected, actual }];
  }

  return [];
}
