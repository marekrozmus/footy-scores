import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "./concurrency";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe("mapWithConcurrency", () => {
  it("preserves result order regardless of completion order", async () => {
    const gates = [deferred<number>(), deferred<number>(), deferred<number>()];
    const runPromise = mapWithConcurrency([0, 1, 2], 3, async (index) => gates[index]!.promise);

    // Resolve out of order — results must still land in input order.
    gates[2]!.resolve(20);
    gates[0]!.resolve(0);
    gates[1]!.resolve(10);

    expect(await runPromise).toEqual([0, 10, 20]);
  });

  it("never runs more than `limit` calls concurrently", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return item * 2;
    });

    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it("processes every item exactly once", async () => {
    const seen: number[] = [];
    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      seen.push(item);
      return item;
    });
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("caps concurrency at the number of items when limit is larger", async () => {
    const results = await mapWithConcurrency(["a", "b"], 10, async (item) => item.toUpperCase());
    expect(results).toEqual(["A", "B"]);
  });

  it("returns an empty array for an empty input without calling fn", async () => {
    let calls = 0;
    const results = await mapWithConcurrency<number, number>([], 5, async (item) => { calls += 1; return item; });
    expect(results).toEqual([]);
    expect(calls).toBe(0);
  });

  it("rejects if any single call rejects", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (item) => {
        if (item === 2) throw new Error("boom");
        return item;
      }),
    ).rejects.toThrow("boom");
  });
});
