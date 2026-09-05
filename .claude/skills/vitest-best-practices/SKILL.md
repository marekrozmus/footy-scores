---
name: vitest-best-practices
description: Vitest conventions for this project — test file layout, mocking fetch/network boundaries, testing pure vs. impure modules, and what not to bother testing. Load before writing or editing any *.test.ts file, or when asked to add test coverage.
---

# Vitest best practices (this project)

Tests live co-located with the source file they cover: `lib/odf/diff.ts` →
`lib/odf/diff.test.ts`, `lib/server/concurrency.ts` → `lib/server/concurrency.test.ts`.
Don't introduce a parallel `__tests__/` tree — co-location keeps a test's
relevance to its source file unambiguous and both files move together.

Run with `npm test` (single run) or `npm run test:watch` (watch mode).
`vitest.config.ts` sets `environment: "node"` project-wide since almost
everything here is server-side/pure logic, not DOM — don't add
`@vitest-environment jsdom` unless a specific test actually renders a React
component.

## What's worth testing here

This codebase splits cleanly into two kinds of modules — test them differently:

- **Pure logic** (`lib/odf/diff.ts`, `lib/odf/record.ts`,
  `lib/server/concurrency.ts`): plain functions, no I/O. Test these directly
  and exhaustively — they're cheap to test and where real bugs have actually
  been found (e.g. the `stripMeta`/optional-field-`undefined` bug in
  `record.ts`, caught by comparing generated output against itself).
- **Network-boundary modules** (`lib/odf/schedule.ts`, `lib/odf/matchDetail.ts`):
  these call `fetch` against the real Olympic ODF API. Never let a test hit
  the network — mock `global.fetch` with `vi.stubGlobal("fetch", ...)` and a
  small realistic fixture (see existing `*.test.ts` files next to these for
  the fixture shape). Restore with `vi.unstubAllGlobals()` in `afterEach`.
  Assert on the parsed *domain* output (`MatchSummary`/`MatchDetail`), not on
  having called fetch with particular arguments — the interesting bugs here
  have all been in the parsing (field name typos, wrong ODF field used,
  optional-field handling), not in the request construction.

Don't write tests for: Next.js route handlers under `app/api/**` or
`app/v1/**` (thin glue over the already-tested `lib/` functions — the
one-off `curl`-based live verification already exercises the actual routing,
and re-mocking `NextResponse`/route params for these adds test weight without
catching bugs that unit-testing `lib/` wouldn't already catch), and
`components/workspace/**` (no component-testing setup exists yet — flag this
as a gap rather than improvising a one-off React Testing Library config for a
single component).

## Mocking fetch: the pattern this project uses

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("parses the schedule feed", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("competitiondays")) return new Response(JSON.stringify({ days: [{ id: "2024-07-24" }] }));
    return new Response(JSON.stringify({ units: [/* fixture */] }));
  }));

  const summaries = await loadMatchSummaries();
  expect(summaries).toHaveLength(1);
});
```

Keep fixtures minimal — include only the fields the parser actually reads
(cross-check against the `Odf*` types in `lib/odf/types.ts`), not a full copy
of a real captured API response. A fixture with 40 irrelevant fields hides
which ones the test actually depends on.

## Assertions

- Prefer `toEqual`/`toMatchObject` for whole-object comparisons over
  asserting field-by-field — it's both shorter and catches unintended extra
  fields (which has been a real bug class in this codebase — see the `meta`
  strict-shape work in `lib/odf/record.ts`).
- When testing a function that returns an array order-sensitively (e.g.
  `loadMatchSummaries`'s kickoff-ascending sort), assert the actual order,
  not just membership (`toEqual([...])`, not `toEqual(expect.arrayContaining([...]))`).
- For the diff/comparison logic specifically, assert on `{ path, kind }` pairs
  (sorted, since `diffJson`'s own ordering isn't part of its contract) rather
  than deep-equaling the whole `DiffEntry[]` including `expected`/`actual`
  payloads, to keep failures readable.
