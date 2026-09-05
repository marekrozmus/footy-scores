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
