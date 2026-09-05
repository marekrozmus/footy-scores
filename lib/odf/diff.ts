export type DiffEntry = {
  path: string;
  kind: "missing" | "extra" | "changed";
  expected?: unknown;
  actual?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return diffJson(a, b).length === 0;
}

// Order-independent: first pairs up array elements that are exactly equal regardless of position
// (so scorers/lineups listed in a different order than we generated them, but with identical
// entries, produce no diff at all), then diffs whatever's left over pairwise in their remaining
// relative order, and only reports genuine count mismatches as missing/extra. Matching is O(n*m)
// per array, fine for the small arrays this app diffs (scorers, startingXI, bench).
function diffArrays(expected: unknown[], actual: unknown[], path: string): DiffEntry[] {
  const matchedExpected = new Set<number>();
  const matchedActual = new Set<number>();

  for (let i = 0; i < expected.length; i++) {
    for (let j = 0; j < actual.length; j++) {
      if (matchedActual.has(j)) continue;
      if (deepEqual(expected[i], actual[j])) {
        matchedExpected.add(i);
        matchedActual.add(j);
        break;
      }
    }
  }

  const leftoverExpected = expected.map((_, i) => i).filter((i) => !matchedExpected.has(i));
  const leftoverActual = actual.map((_, j) => j).filter((j) => !matchedActual.has(j));

  const diffs: DiffEntry[] = [];
  const pairCount = Math.min(leftoverExpected.length, leftoverActual.length);
  for (let k = 0; k < pairCount; k++) {
    const expectedIndex = leftoverExpected[k]!;
    const actualIndex = leftoverActual[k]!;
    diffs.push(...diffJson(expected[expectedIndex], actual[actualIndex], `${path}[${expectedIndex}]`));
  }
  for (let k = pairCount; k < leftoverExpected.length; k++) {
    const expectedIndex = leftoverExpected[k]!;
    diffs.push({ path: `${path}[${expectedIndex}]`, kind: "missing", expected: expected[expectedIndex] });
  }
  for (let k = pairCount; k < leftoverActual.length; k++) {
    const actualIndex = leftoverActual[k]!;
    diffs.push({ path: `${path}[${actualIndex}]`, kind: "extra", actual: actual[actualIndex] });
  }
  return diffs;
}

// Structural JSON diff: expected (our generated reference) vs actual (the tested API's response).
export function diffJson(expected: unknown, actual: unknown, path = "$"): DiffEntry[] {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    return diffArrays(expected, actual, path);
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
