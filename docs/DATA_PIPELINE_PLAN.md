# Paris 2024 football data pipeline — decisions & plan

## Status: implemented

- `lib/odf/types.ts`, `schedule.ts`, `matchDetail.ts`, `record.ts`, `flags.ts` — the data layer
  described below.
- `components/workspace.tsx` — rewired to the real pipeline as described below (mock data,
  `endpointFor`/`recordFor`/`compareRows`, and the "Simulate source failure" toggle removed).
- Verified against the live API (via a scratch script exercising the real `lib/odf/*` functions,
  since this sandbox has no installable browser and can't keep a background dev server alive
  across tool calls — manual `npm run dev` + click-through in a real browser is still recommended
  before considering this done):
  - **58 matches** total (32 men + 26 women), sorted ascending by kickoff, all 58 ids and all 58
    generated endpoint slugs unique.
  - A group-stage match (Argentina v Morocco) and the men's gold medal match (France v Spain, AET)
    both produce fully-populated `example.json`-shaped records — scorers with correct minute /
    stoppage-time / assist / type, full lineups with formation/coach/starters/bench.
  - A real penalty-shootout match (women's QF, Canada v Germany) correctly derives `status: "PEN"`.
    This caught a genuine bug during verification: the shootout tally lives in the ODF feed's
    `periodScore` field, not `score` (which stays the pre-shootout goal score) — fixed in
    `matchDetail.ts`'s `toPenaltyShootout`.
- `npx tsc --noEmit` and `npm run lint` both clean.

### Update: generated endpoints are now real, live routes in this app

Initially the "generated endpoint" was a display-only string — copying it or opening it always
404'd, since nothing in this app served that path. That's backwards from what the reference
endpoints are for: they need to be real URLs a QA engineer (or an automated test) can actually
fetch to get the aggregated JSON, not just a value shown inside our own UI.

Fixed by adding a small server-side layer, all reachable on localhost in dev and on whatever domain
this app is deployed to:

- **`POST /api/generate`** — runs `loadMatchSummaries()` (the 19-request daily-schedule sweep) and
  caches the result in memory, server-side. This is what the "Load & generate" button calls now,
  instead of fetching Olympics directly from the browser. Only endpoint that talks to Olympics for
  the match list.
- **`GET /api/matches/[id]`** — lazy, click-triggered detail fetch. Serves the cached record if this
  match has already been generated; otherwise fetches just that match's detail from Olympics via
  `loadMatchDetail()` + `buildRecord()`, caches it, and returns it. Triggered when a match is
  selected in the inspector, or by an export that needs a match nobody's viewed yet. Subsequent
  requests for the same match — from here or from the endpoint below — are served from cache, no
  repeat Olympics calls.
- **`GET /v1/football/matches/[slug]`** — the actual "generated endpoint" deliverable. Deliberately
  **never** calls Olympics — pure cache read. Returns 409 with a clear message if the schedule
  hasn't been loaded yet, or if this specific match hasn't been generated yet (nobody's opened it or
  exported it); 404 if the slug doesn't match any real match; the full record once it's cached.

Cache is `lib/server/matchCache.ts` — a plain in-memory module singleton (not a database). It
resets on server restart and wouldn't be shared across multiple instances of a multi-process/
serverless deployment. Fine for a single dev/demo Node process; flagged here rather than silently
overstated.

`components/workspace.tsx` now talks only to these three routes (`fetch("/api/generate", ...)`,
`fetch("/api/matches/...")`) — it no longer imports `loadMatchSummaries`/`loadMatchDetail`/
`buildRecord` directly, those are server-only now. `buildEndpoint`/`buildMatchSlug` stay shared
(pure string functions, safe to import client-side) so the UI can still show the endpoint path
immediately, before detail has loaded.

Verified end-to-end live (temporarily shimmed the one `fetch()` call in `lib/odf/http.ts` to shell
out to `curl` for this test only, since this specific sandbox's Node process can't resolve external
hostnames — confirmed a sandbox quirk, not a code issue, since the identical request already worked
from both a real browser and plain `curl`; reverted immediately after, `tsc`/`eslint` re-confirmed
clean post-revert):
`POST /api/generate` → 58 matches cached → `GET /v1/football/matches/2024-07-24-argentina-vs-morocco`
correctly 409s ("hasn't been generated yet") → `GET /api/matches/FBLMTEAM11------------GPB-000100--`
fetches and caches the real Argentina v Morocco record → the same reference URL now returns 200 with
the full, real `example.json`-shaped record.

### Update: cache invalidation, and a strict/exact-shape mode

**Cache invalidation without a restart.** `lib/server/matchCache.ts` gained `clearCache()`, and
`DELETE /api/generate` calls it — resets both cached summaries and every generated record. The
UI's **Reset** button now calls this (previously it only cleared client-side state), so Reset
genuinely invalidates the server cache too, not just the browser's view of it.

**Position granularity — checked, confirmed as a real data-source limit, not a parsing gap.** A
review flagged that lineups only expose broad positions (`GK`/`DF`/`MF`/`FW`) versus example.json's
illustrative specific ones (`RB`, `CB`, `CM`, `LW`, ...). Fetched the ODF's own canonical glossary
(`GLO_Positions~comp=OG2024~disc=FBL~lang=ENG.json`) — it defines exactly those four codes, nothing
more specific. There is a second per-starter code in the raw feed (e.g. `M27`, `D05`, `F03`), but
cross-referencing a full lineup shows it's a pitch/formation-diagram grid slot (line letter + slot
number, present only for starters), not a semantic role — deriving `RB` vs `CB` from it would mean
guessing based on the team's formation shape rather than reading real data, so it's intentionally
not used. Left as broad categories.

**`meta` is strict-by-default now, not opt-out.** First pass had `meta` included by default with an
opt-out `?meta=false` — backwards, since it meant the spec-compliant shape (the one an automated
comparison actually needs) required knowing about a query param, while the default silently didn't
match example.json. Flipped it: `GET /v1/football/matches/[slug]` now returns exactly example.json's
8 keys with **no param needed** (via `stripMeta()` in `lib/odf/record.ts`;
`StrictFootballRecord` = `FootballRecord` minus `meta`). The traceability fields (source event id,
endpoint, attendance, referee, penalty shootout) aren't gone — they're always in the
`X-Match-Meta` response header (JSON-encoded), and `?meta=true` additionally puts the `meta` block
back in the body for a human browsing this in a tab. Verified live: default body is exactly
`competition, kickoff, lineups, score, scorers, status, teams, venue` with `X-Match-Meta` present in
headers; `?meta=true` adds `meta` back into the body too.

### Update: bulk comparison against a real FootyScores deployment

The single-match Compare tab was a stub ("not implemented yet"). Built it for real, plus a bulk
mode, since bulk compare is meaningless without actual diff logic behind it:

- **`lib/odf/diff.ts`** — `diffJson(expected, actual)`, a structural JSON diff (missing/extra/changed
  per field path). Arrays (`scorers`, `startingXI`, `bench`) are matched **by content, not index**:
  items that are exactly equal are paired off regardless of position first, so a reordering-only
  difference reports no diff at all; only genuine leftovers (after matching) get diffed pairwise or
  reported missing/extra. (First pass compared strictly by index — reordered-but-identical arrays
  produced spurious per-index "changed" noise; fixed by matching on content instead.) Verified with
  hand-written cases (identical, changed primitive, missing/extra key, array length mismatch in both
  directions, null-vs-object, nested change, reordered arrays, a genuine change mixed in with
  reordered items, duplicate entries) run directly with `node --experimental-strip-types`, all
  passing.
- **`POST /api/compare`** (`{ baseUrl, matchIds }` → `{ results }`) — runs **server-side**
  deliberately, so the tested API being reachable from this server (not the QA engineer's browser)
  is what matters, regardless of whether that API has CORS enabled for wherever this tool is hosted.
  Concurrency-capped at 6 (`lib/server/concurrency.ts`), 8s timeout per match. Compares the generated
  record (exactly example.json's 8 keys) against whatever JSON the tested API returns for that match's endpoint;
  `getOrGenerateRecord` (`lib/server/records.ts`, factored out of `/api/matches/[id]` so both routes
  share it) fills in any match that hasn't been generated yet.
- **UI**: a "Compare" dropdown next to Export JSON (all/filtered/selected match, mirroring the
  export scope options) triggers a bulk run; a header badge shows `{passed}/{total} compared`. The
  per-match inspector's Compare tab now shows the real result for that match (pass / fail with a
  field-by-field diff table / error), with its own single-match "Compare this match" button.

### Update: paste-JSON compare, no URL required

The only way to supply the "actual" side was a base URL the server fetches from — no way to just
paste a JSON response directly. Added a second option in the per-match Compare tab, entirely
client-side: a textarea + "Compare pasted JSON" button. This needs no server round-trip at all —
the selected match's reference record is already sitting in the client's `details` state (fetched
once via `/api/matches/[id]` when the match was opened), and unlike the in-memory record
`/api/compare` diffs against, this one has already gone through a real `JSON.stringify`/`parse` over
the wire, so it doesn't need the undefined-vs-absent-key normalization the server route applies. So
comparing is just `diffJson(detailEntry.record, JSON.parse(pastedText))`, run directly in
the browser, writing into the same `compareResults` map the URL-based path uses (so the header
badge and per-match result view are agnostic to which method produced them). Scoped to the single
selected match only — bulk compare (all/filtered) still needs a URL, since there's no way to paste
58 different responses at once.

### Update: comparison result shown in a modal

The result of a single-match compare (URL-based or pasted) rendered inline at the bottom of the
Compare tab, below two input cards — easy to miss if the result landed off-screen (a first attempt
at fixing this by reordering the tab and auto-scrolling was tried and rolled back; a modal is more
direct). `CompareResultModal` (`components/workspace/compare-result-modal.tsx`) now pops open
automatically right when `runCompare("one")` or `comparePasted` produces a result — impossible to
miss regardless of scroll position, follows the same backdrop-button + `role="dialog"` pattern
already used for the mobile menu/filter sheets (`RunControls`/`MatchFilters`), just centered on the
page instead of docked to an edge, since it isn't mobile-only. Bulk compare (all/filtered) does
**not** trigger the modal — it stays as the header's `{passed}/{total} compared` summary badge,
since a modal popping up once per match wouldn't make sense there.

The pass/fail/error/diff-table rendering itself was extracted into `CompareResultView`
(`components/workspace/compare-result-view.tsx`), shared between the modal and the Compare tab's
own inline "last result" view (kept, for reference after the modal's closed) — so the two can't
drift out of sync with each other.

**Bug found and fixed during verification.** First live test: compared every match against this
app's *own* `/v1/football/matches/[slug]` endpoint (same data on both sides — should be a guaranteed
pass, so a genuinely useful check of the compare *mechanism* itself). Got real failures instead, all
on `scorers[].stoppage`/`scorers[].assist` — optional fields. Root cause: `toScorers()` in
`matchDetail.ts` and the scorers mapping in `buildRecord()` (`record.ts`) built those objects with
`stoppage`/`assist` explicitly set to the value `undefined` when absent, rather than omitting the
key. `JSON.stringify` drops `undefined`-valued keys, so the real HTTP response (`actual`, always
`fetch().json()`) correctly lacks the key — but the in-memory `expected` object used directly inside
`/api/compare` (never round-tripped through JSON) still had it, present-with-undefined. `diffJson`'s
`Object.hasOwn` check saw that asymmetry as a real "missing" field. Fixed both ways: the object
construction now spreads those fields in conditionally instead of assigning `undefined`
(`...(stoppage !== undefined ? { stoppage } : {})`), and `/api/compare` additionally round-trips
`expected` through `JSON.parse(JSON.stringify(...))` as a defensive normalization, so both sides of
every comparison are judged purely as JSON values. Re-verified live: all 58 matches now report
`pass` comparing against the app's own endpoint.

### Update: `meta` block removed entirely — it was never a real requirement

Traced where `meta` (and its only dependents: `attendance`, `referee`, `penaltyShootout`) actually
came from, and it wasn't requirements or fetched data — it was carried forward, uncritically, from
the very first mock-UI commit's fictional demo data, then never questioned while the real pipeline
was built on top of it. `example.json` has exactly 8 top-level keys; the task says the generated
records must match that shape. Nothing ever asked for a 9th `meta` key, an `X-Match-Meta` header, or
a `?meta=true` toggle — the "strict-by-default" design described in the previous section was solving
a problem (a spec-compliant shape needing an opt-out) that only existed because of this unrequested
addition in the first place.

Removed everything: `meta`/`StrictFootballRecord`/`stripMeta()` from `lib/odf/record.ts`, the
`X-Match-Meta` header and `?meta=true` handling from `GET /v1/football/matches/[slug]`,
`OdfExtendedInfo`/`OdfOfficial` types and the attendance/referee/penalty-shootout parsing from
`lib/odf/types.ts` and `matchDetail.ts` (including `toPenaltyShootout()`, referenced in the
verification note above — the `periodScore` vs `score` distinction it encoded is retained inside
`deriveStatus`, since that part *is* real behavior derived from the feed, just no longer surfaced as
a standalone `penaltyShootout` field), and every downstream reference in `app/api/compare/route.ts`,
`components/workspace.tsx`, and `components/workspace/match-inspector-panel.tsx`. The two routes that
read `record.meta.endpoint` now compute the endpoint via `buildEndpoint(summary)` looked up
separately instead. `GET /v1/football/matches/[slug]` now returns exactly example.json's 8 keys,
unconditionally — no header, no query param, no toggle.

Verified post-removal: `npx tsc --noEmit` and `npm run lint` clean, full Vitest suite green (128
tests, 19 files), and a live end-to-end run against the real ODF API (generate → detail fetch →
reference endpoint → self-compare) confirmed the reference endpoint returns exactly
`competition, kickoff, lineups, score, scorers, status, teams, venue` and `POST /api/compare` still
reports `pass` using the new `buildEndpoint(summary)` lookup.

### Update: `Workspace`'s state logic extracted into hooks

`components/workspace.tsx` had already been split into presentational subcomponents, but the state
logic behind them — run/reset, per-match detail caching, export, compare, plus a handful of small
UI concerns (drag-to-resize, escape-to-dismiss, toast) — was still one ~490-line component. Server
Components + Suspense don't fit here: every fetch (`/api/generate`, `/api/matches/[id]`,
`/api/compare`) is triggered by a button click or a selection change, not by initial render, so
there's no render-time data dependency for Suspense to hang off — this needed custom hooks, not RSC.

Extracted into `components/workspace/hooks/`:

- **`useDismissOnEscape(open, onOpenChange)`** — collapsed four near-identical
  open/Escape-listener effects (sheet/filters/menu/compare-modal) into one hook called four times.
  Takes the raw `useState` setter directly (not an inline closure) so the effect doesn't re-attach
  its listener every render.
- **`useResizableSplit(initialLeftWidth)`** — the drag-to-resize `leftWidth`/`splitRef`/`dragging`
  logic.
- **`useTimers()`** — the managed-setTimeout bag, shared by `useToast` (dismiss) and `useMatchRun`
  (the delayed "generating" → "complete" phase transition), preserving the original behavior that a
  fresh run/reset cancels any stale pending timer of either kind.
- **`useToast(schedule)`** — `toast` state + `notify`.
- **`useMatchDetails()`** — `details` map, in-flight request de-dup, `ensureDetail`/`retryDetail`.
- **`useMatchRun({ schedule, clearAll, notify, onBeforeRun, onReset })`** — `phase`/`summaries`/
  `errorMessage` plus `run`/`reset`; the two callbacks let it stay decoupled from knowing about
  details/filters/selection specifics while still triggering the right resets at the right point.
- **`useExportJson({ ..., ensureDetail, notify, onDone })`** and **`useCompare({ ... })`** — the two
  largest async handlers, each with their own local state (`exporting`; `compareResults`/
  `comparing`/`compareOpen`/`compareResultModalOpen`).

`Workspace` itself dropped from ~490 lines to ~275, now mostly hook composition + JSX. Each hook got
its own co-located test (`renderHook` from Testing Library, `vi.stubGlobal("fetch", ...)` for the
network-boundary ones) — 38 new tests, taking the suite to 166. One lint snag hit along the way:
`react-hooks/refs` flagged a test harness that forwarded a hook's whole return object and accessed
`.splitRef`/`.startResize` on it inline in JSX — fixed by destructuring at the call site instead
(`const { splitRef, startResize } = useResizableSplit(...)`), matching how `Workspace` itself already
consumed the hook.

### Update: fixed a real production bug — the in-memory cache's serverless gap, hit on Vercel

The "wouldn't be shared across multiple instances of a multi-process/serverless deployment" caveat
flagged above wasn't just theoretical — reported after deploying to Vercel: load the schedule, select
a match, and sometimes get "Failed to load match detail: No schedule loaded yet — run Load & generate
first," even though Load & generate had just succeeded. Retrying the whole load-and-select sequence a
second time usually "fixed" it. Root cause: on Vercel, `POST /api/generate` and a later
`GET /api/matches/[id]` can each land on a different serverless instance, and each instance has its
own empty in-memory cache — the second request's instance genuinely never saw the first one's
`setSummaries(...)` call. A second attempt "worked" only by coincidence (warm-instance reuse).

Fixed by making the schedule listing self-healing instead of requiring a prior request to have hit
the same instance: `ensureSummaries()` (`lib/server/matchCache.ts`) returns the cached list if
present, otherwise fetches it itself (deduping concurrent callers onto one in-flight fetch) and
caches the result. Safe to do because the Paris 2024 schedule is historical and deterministic —
re-fetching it is never "wrong," just occasionally redundant across instances. Used by
`getOrGenerateRecord` (`lib/server/records.ts`, dropping the old `ScheduleNotLoadedError` — that
state literally can't occur anymore, a genuine Olympics-unreachable failure now just propagates as a
normal error) and by `GET /v1/football/matches/[slug]`'s summary lookup. Per-match **detail** stays
exactly as lazy and explicit as before — only the cheap schedule listing self-heals; a match whose
full record hasn't been generated yet still correctly 409s, since that's not a caching artifact, it's
genuinely "nobody's opened this match yet."

Added `lib/server/records.test.ts` (didn't exist before) with a regression test for this exact bug —
`getOrGenerateRecord` must recover when the schedule cache is empty rather than throwing — plus
`ensureSummaries` tests in `matchCache.test.ts` (cache hit, cache miss triggers one fetch, concurrent
callers share one in-flight fetch, `clearCache` forces a re-fetch, a genuine fetch failure still
propagates and caches nothing). 10 new tests, suite at 178.

### Update: fixed the reset toast getting stuck forever

Reported: click Reset, see "Run reset — server cache cleared," and it never disappears. Root cause
was the `useTimers()` hook introduced during the hook-extraction pass above: `useToast`'s 2200ms
dismiss timer and `useMatchRun`'s 250ms "generating" → "complete" phase-transition timer shared one
timer bag so that a fresh run/reset could cancel the *other* purpose's stale timer too — preserving
the pre-extraction code's incidental behavior on purpose at the time. That behavior turned out to be
a real bug: clicking **Load & generate** shortly after **Reset** (a completely natural next action,
well within the toast's 2200ms window) calls `run()`'s `clearAll()`, which cancels the still-pending
dismiss timer for the "Run reset…" toast — and since `run()` never itself calls `notify(...)` to
replace or clear that text, it stays on screen indefinitely. Reproduced directly: rendering the real
`Workspace`, clicking Reset, advancing a fake clock by 500ms, clicking Load & generate, then
advancing another 3000ms still showed the stale toast text.

Fixed by giving each hook its own private timer instead of sharing one: `useToast` now manages its
own `dismissTimer` ref internally (no `schedule` param), and `useMatchRun` manages its own
`completeTimer` ref for just the phase transition (no `schedule`/`clearAll` params). `useTimers()`
itself is now unused and deleted, along with its test file. Rewrote `use-toast.test.ts` and
`use-match-run.test.ts` for the new self-contained signatures, including a regression test proving a
second `run()`/a `reset()` still correctly cancels its *own* leftover phase-transition timer without
needing anything shared.

## Context

`components/workspace.tsx` is a fully built UI (loading/filtering/generating phases, filters, sort,
match inspector with Endpoint / Source data / Compare tabs, JSON export) but every match, score,
lineup and "generated endpoint" comes from a small hardcoded `matches` array — there is no real
data fetching yet. This document records the plan to replace that mock data layer with a real
pipeline that pulls every Paris 2024 football match from the official Olympic schedule
(stacy.olympics.com, backed by the Official Olympic Data Feed / ODF) and generates deterministic
reference records/endpoints for each one, while keeping the existing UI shell.

Research done against the real site established the following ground truth, which the plan below
is built on:

- **No CORS/proxy problem.** `access-control-allow-origin: *` is set on every ODF JSON response.
  The only reason plain `curl` got HTTP 403 was its default `User-Agent` string being blocked by a
  bot filter — a real browser's default UA passes with zero extra headers. So this can be a pure
  client-side fetch; **no Next.js API route / server proxy is needed.**
- **Best primary source: the daily schedule feed**, not the bulk "startlist" feed. Fetching
  `srm/data/oly/schedule/day/ENG/{date}.json` for all 19 competition days (dates come from
  `srm/data/oly/schedule/competitiondays/ENG.json`) and filtering `units[]` where
  `disciplineCode === "FBL"` gives **exactly 58 real matches** (32 men + 26 women), each already
  uniformly shaped (`eventUnitType: "HTEAM"`, `scheduleItemType: "H2H_NOC"`, exactly 2
  `competitors`) — no ceremony/placeholder entries to filter out. Each entry already carries:
  kickoff (`startDate`, full ISO incl. UTC offset), venue/city, human-readable round
  (`eventUnitName`/`phaseName`), status, both teams' names + NOC codes, and **final score**
  (`competitors[].results.mark` + `winnerLoserTie`) — everything needed for the match list/table
  with a single batch of 19 requests.
  - (The alternate bulk feed, `OG2024/data/SCH_StartList~comp=OG2024~disc=FBL~lang=ENG.json`, was
    also inspected: it returns all 60 "units" in one call but 2 of those are non-match
    `VICTMEDAL` (victory ceremony) placeholder rows, and it lacks the human-readable round name —
    the day-by-day feed is cleaner and is what the plan uses.)
- **Per-match detail** (halftime score, referee, attendance, coach, formation, full lineups with
  jersey numbers/positions/starter flag, and goal-by-goal scorers) lives in a separate feed:
  `OG2024/data/RES_ByRSC_H2H~comp=OG2024~disc=FBL~rscResult={unitId}~lang=ENG.json`, keyed by the
  match's own ODF id (e.g. `FBLMTEAM11------------GPB-000100--`). This is one extra request per
  match, confirmed to contain:
  - `results.periods[]` (`H1`/`H2`/`ET-H1`/`ET-H2`/`TOT` with home/away scores) → gives half-time
    score and lets us derive `status` (`FT` vs `AET`; a penalty-shootout period, if it appears for
    some tie-breaker match, would signal `PEN` — not observed in the two matches sampled, so this
    is a documented best-effort rule).
  - `results.officials[]` (referee via `function.functionCode === "RE"`), `results.extendedInfos[]`
    (`ei_code: "ATTENDANCE"`).
  - `results.items[]` (one per team): `teamCoaches` (head coach), `eventUnitEntries` (`FORMATION`),
    `teamAthletes[]` (name, `bib` = shirt number, position, `eventUnitEntries` `STARTER: "Y"/"N"`
    → starting XI vs bench).
  - `results.playByPlay[].actions[]`: goals are `pbpa_Action` of `SHOT`/`FRD`/`PEN` with
    `pbpa_Result === "GOAL"`, `pbpa_When` = minute (e.g. `"45' +2"`), athlete role `SCR` = scorer,
    `ASSIST` = assist. Only these three action codes were observed producing goals across the two
    sampled matches (a group match and the men's final, which went to extra time); anything else
    encountered at runtime is treated as unclassified rather than guessed.

## Decisions

- **Endpoint / match id scheme:** human-readable slug — `{date}-{home-slug}-vs-{away-slug}` (e.g.
  `2024-07-24-argentina-vs-morocco`). Unique within this tournament since no two matches share both
  the same date and the same team pair.
- **Detail fetch strategy:** lazy. The match list/table renders entirely from the cheap 19-request
  daily-schedule pass. Full per-match detail (lineups, scorers, referee, attendance, half-time) is
  fetched only when a match is opened in the inspector, and cached client-side per match id so
  re-opening or exporting doesn't refetch. Bulk export ("all"/"filtered") fetches-on-demand whatever
  isn't cached yet for the matches in scope, with its own progress state on the export button.
- **Scorer `type`:** best-effort map (`SHOT`→`open_play`, `FRD`→`free_kick`, `PEN`→`penalty`),
  fallback `"other"` for any action code not in the map — documented as a known gap vs.
  `example.json`'s illustrative `"header"` type, which the feed doesn't reliably expose.
- **Compare tab (bonus):** deferred. No real FootyScores API exists to test against right now, so
  instead of building real diff logic this pass, the hardcoded "always pass" rows are replaced with
  an honest "not implemented yet" state so the UI doesn't misrepresent the bonus as working.

## Implementation

### New data-layer files (`lib/odf/`)
- **`types.ts`** — raw ODF response shapes actually observed (day-schedule `unit`, `RES_ByRSC_H2H`
  `results` incl. `periods`/`officials`/`extendedInfos`/`items`/`playByPlay`), plus our own domain
  types: `MatchSummary` (from the daily feed) and `MatchDetail` (from the per-match feed).
- **`schedule.ts`** — `loadMatchSummaries(): Promise<MatchSummary[]>`: fetch `competitiondays.json`,
  then all day feeds in parallel, filter `disciplineCode === "FBL"` (defensively also check
  `competitors.length === 2` as a safety net), map to `MatchSummary`, sort by kickoff ascending
  (the documented default order).
- **`matchDetail.ts`** — `loadMatchDetail(unitId): Promise<MatchDetail>`: fetch and parse one
  `RES_ByRSC_H2H` response into halftime/status, referee, attendance, per-team coach/formation/
  lineup, and the scorers list (minute parsed from `pbpa_When`, stoppage-time suffix kept e.g.
  `"45+2"`).
- **`record.ts`** — `buildEndpoint(summary)` (the slug scheme above, plus a small `slugifyTeam`
  helper) and `buildRecord(summary, detail)` assembling the `example.json`-shaped object
  (`competition`, `venue`, `kickoff`, `status`, `teams`, `score` incl. `halfTime`, `scorers`,
  `lineups`), plus an additive `meta`/`attendance`/`referee` block for QA traceability — following
  the same pattern the existing mock (`recordFor` in `workspace.tsx`) already uses. Flagging this
  explicitly: `example.json` only has 8 top-level keys; if the generated record should contain
  **exactly** those keys and nothing else, this extra block should be dropped — easy to adjust.
- A small NOC (IOC 3-letter) → ISO alpha-2 lookup for flag rendering, built from the actual set of
  competing nations in the fetched data (replaces the current mock's team-name-keyed `FLAGS` table).

### `components/workspace.tsx` changes
- Remove `matches`, `squadNames`, `coaches`, `squadFor`, `endpointFor`, `recordFor`, `compareRows`
  and the fake `run()` `setTimeout` phase simulation.
- `run()` now calls `loadMatchSummaries()`, driving the existing `phase`/progress-bar state
  (`loading` → `filtering` → `complete`, or `error` on a real fetch failure — replacing the
  "Simulate source failure" checkbox with genuine error handling and the existing retry button).
- Selecting a match triggers `loadMatchDetail(unitId)` lazily, cached in a `Map` in state/ref keyed
  by match id; the "Endpoint" tab renders immediately from the summary alone (id/kickoff/teams are
  already known), while "Source data" shows its own small loading/error state until detail resolves.
- Export handlers become async: for `all`/`filtered` scope, ensure every in-scope match's detail is
  loaded (fetch whatever's missing, concurrency-capped, with a spinner/label change on the Export
  button) before assembling and downloading the JSON array; `selected` scope just needs the current
  match's already-cached detail.
- Compare tab: keep the base-URL input and button, replace the hardcoded pass-row table with an
  explicit "comparison not implemented yet" panel.
- Update the header subtitle / footer copy that currently says "mock data" to describe the real
  source, and keep the existing footer's `Deterministic order · {sort.field} {sort.dir}` line as the
  documented default-order indicator.

### Verification
- `npm run dev`, open the app, click **Load & generate** and confirm the list populates with real
  Paris 2024 matches (58 total, sorted by kickoff ascending) sourced live from stacy.olympics.com.
- Open a few matches (a group-stage one and a knockout one that went to extra time, e.g. the men's
  final) and confirm the Source data tab shows real scorers/lineups/halftime/referee/attendance, and
  the Endpoint tab shows the `{date}-{team}-vs-{team}` slug.
- Use Export JSON (all / filtered / selected) and confirm the downloaded file contains fully
  populated, `example.json`-shaped records for every match in scope, with no duplicates/omissions.
- Toggle filters/search/sort to confirm they still operate correctly against real data, and confirm
  loading/empty/error states all render sensibly (e.g. temporarily point a fetch at a bad URL to see
  the error state, then retry).
