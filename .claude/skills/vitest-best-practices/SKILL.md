---
name: vitest-best-practices
description: Vitest conventions for this project — test file layout, mocking fetch/network boundaries, testing pure logic vs. React components vs. what's not worth testing. Load before writing or editing any *.test.ts(x) file, or when asked to add test coverage.
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

- **React components** (`components/workspace/*.tsx`): the presentational,
  props-in/JSX-out ones (`sort-header.tsx`, `filter-select.tsx`,
  `match-list-panel.tsx`, `match-inspector-panel.tsx`, `export-compare-menu.tsx`,
  etc.) are tested with `@testing-library/react` + jsdom — see the pattern
  below. `components/workspace.tsx` (the orchestrator) is deliberately **not**
  covered: it owns the real `fetch` calls to `/api/generate`/`/api/matches/[id]`/
  `/api/compare` and wires everything together, so testing it meaningfully
  means mocking three endpoints and simulating async state transitions —
  a much bigger lift for less signal than testing the pieces it renders.
  `brand-header.tsx`/`workspace-footer.tsx` are skipped too: static markup,
  no props-driven branching, so a test there would just be re-asserting
  hardcoded text.

Don't write tests for Next.js route handlers under `app/api/**` or
`app/v1/**` either — thin glue over the already-tested `lib/` functions; the
one-off `curl`-based live verification already exercises the actual routing,
and re-mocking `NextResponse`/route params for these adds test weight without
catching bugs that unit-testing `lib/` wouldn't already catch.

## Testing components

Component test files are `*.test.tsx`, still co-located
(`match-list-panel.tsx` → `match-list-panel.test.tsx`). Each one opts into a
DOM environment per-file with a pragma comment as its first line —
`// @vitest-environment jsdom` — rather than flipping the project default,
since most tests here are plain Node/pure-logic and jsdom is slower to spin
up. `vitest.setup.ts` wires up `@testing-library/jest-dom` matchers and a
global `afterEach(cleanup)` — this project doesn't use vitest's
`globals: true`, so Testing Library's own auto-cleanup-detection never fires;
without that `afterEach`, elements from one test leak into the next and
`getByRole` starts finding duplicates.

A shared `test-fixtures.ts` next to the components (not itself a test file,
so vitest's `*.test.ts(x)` glob skips it) holds a `matchRow()` builder —
several component tests need the same `MatchRowData` shape, so build it once
with sensible defaults and override just what each test cares about, rather
than repeating a 15-field object per file.

Two real gotchas hit while writing these, worth knowing before you add more:

- **Controlled dropdowns aren't opened by clicking their trigger in a test.**
  `ExportCompareMenu`'s `exportOpen`/`compareOpen` (and similarly
  `MatchListPanel`'s `filtersOpen`) are props owned by the parent — clicking
  the toggle button only calls the `onToggle*` callback (a `vi.fn()` mock in
  a test, which does nothing). To test what's *inside* an open dropdown, pass
  `exportOpen={true}` directly; reserve the click-based test for asserting
  `onToggleExport` was called.
- **`userEvent` + fake timers don't mix well.** `MatchInspectorPanel`'s
  loading banner is debounced via a timer (see `DelayedAppear` in that file),
  so testing it needs `vi.useFakeTimers()` + `vi.advanceTimersByTime()`
  wrapped in `act()`. Any *other* interaction in a fake-timers test (e.g.
  clicking "Retry" on the adjacent error banner) should use `fireEvent.click`
  instead of `userEvent`, which internally waits on real timers between
  steps and will hang for the full real-time duration even with fake timers
  installed.

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
