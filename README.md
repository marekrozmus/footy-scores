# FootyScores Endpoint Builder

Paris 2024 football API endpoint reference tool for QA engineers — filter and sort match data, then generate and export the corresponding API endpoint references.

## Running it

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build      # production build
npm run start      # run the production build
npm run lint       # lint the codebase
npm test           # run the unit test suite once
npm run test:watch # run the unit test suite in watch mode
```

## How it works

### Data retrieval & parsing

Match data comes from the Official Olympic Data Feed (ODF), the same feed
`stacy.olympics.com`'s own public schedule page calls — there's no official
public FootyScores/Olympics API, so these endpoints were found by inspecting
that page's own network requests. Requests need a real browser-like
`User-Agent` (`lib/odf/http.ts`): the feed blocks non-browser user agents
(confirmed live — a bare `curl`/Node request gets HTTP 403, the identical
request with a browser UA gets 200), while CORS itself is wide open
(`Access-Control-Allow-Origin: *`).

Retrieval happens in two phases:

1. **Schedule listing** (`lib/odf/schedule.ts`) — fetch the 19 Paris 2024
   competition dates, then every day's cross-discipline schedule in
   parallel, and keep only entries that are real two-team football matches
   (see "Assumptions" below). Maps each into a `MatchSummary`: kickoff time,
   both teams (name, NOC, final score), venue/city, round name, and the
   official page's own match URL. This step alone is enough to render the
   match list/table, including the final score — no further requests needed.
2. **Per-match detail** (`lib/odf/matchDetail.ts`), fetched lazily — only
   when a match is opened, exported, or compared, not for all 58 matches
   up front. Parses one match's result feed into a `MatchDetail`: half-time
   and full-time score, match status (`FT`/`AET`/`PEN`, see "Assumptions"
   below for how that's derived), full lineups (formation, coach, starting
   XI vs bench, shirt number, position), and a goal-by-goal scorer list
   (minute, stoppage time, scorer, assist, goal type).

The same parsing functions back both the interactive UI (client-side fetch)
and the server-side routes under `app/api/**`/`app/v1/**` (schedule cache,
per-match detail cache, and the compare feature) — there's one
implementation of "what a match summary/detail looks like," not two.

### Endpoint ordering

The default order is **ascending by kickoff time** (ISO 8601 string
comparison — safe here since every kickoff uses the same UTC-offset
format), shown explicitly in the UI's footer as "Deterministic order ·
kickoff asc" and re-derivable by anyone re-running the pipeline, since the
underlying Olympic schedule is historical and doesn't change.

The endpoint path itself is a human-readable slug —
`/v1/football/matches/{date}-{home-team}-vs-{away-team}` (e.g.
`/v1/football/matches/2024-07-24-argentina-vs-morocco`) — built once per
match from its kickoff date and team names. It's collision-free for this
tournament: no two matches share both the same date and the same team
pairing (round-robin groups, single-elimination knockout).

### Assumptions made about missing or inconsistent schedule data

- **Only genuine two-team matches count.** An entry is treated as a real
  football match only if `disciplineCode === "FBL"`,
  `eventUnitType === "HTEAM"`, `scheduleItemType === "H2H_NOC"`, and it has
  exactly 2 competitors. Everything else — other disciplines mixed into the
  same daily feed, or (seen only in an alternate bulk feed that was
  evaluated and not used) non-match placeholder rows for victory ceremonies
  — is silently excluded rather than surfaced as an error, since it isn't
  match data to begin with.
- **Player position is limited to four broad categories** (GK/DF/MF/FW).
  Confirmed against the ODF's own canonical position glossary that no more
  specific taxonomy exists. A second, more granular-looking per-starter code
  is present in the feed, but it was investigated and found to be a pitch/
  formation-diagram grid slot (line + position-in-line), not a semantic
  role — deliberately not used to guess specific positions like RB/CB/LW,
  since that would mean inferring from formation shape rather than reading
  real data.
- **Goal type is best-effort.** Mapped from the feed's own action codes
  (`SHOT`→open_play, `FRD`→free_kick, `PEN`→penalty); any action code not in
  that map falls back to `"other"` rather than guessing a classification.
- **Match status is derived from which periods are present** — extra-time
  periods mean `AET`, a penalty-shootout period means `PEN`, anything else
  defaults to `FT`. A period-code scheme this app hasn't encountered would
  default to `FT` rather than crash.
- **A schedule/detail mismatch fails loudly, not silently.** If a match's
  schedule entry exists but its detail feed is missing a matching per-team
  result (an inconsistency between the two feeds), fetching that match's
  detail throws an explicit error rather than returning an incomplete or
  wrong record — surfaced in the UI as a per-match error state with a retry
  action.
- A couple of narrower field-level fallbacks exist defensively (e.g. an
  empty `sourceUrl` if the feed omits a match's detail-page link, or using
  the full venue string as the city if there's no comma to split on) —
  not observed to actually trigger for any of the 58 real matches, but kept
  rather than assuming the feed will always be complete.

See `docs/DATA_PIPELINE_PLAN.md` for the full decision log, including things
that were tried and reverted, and bugs found during verification against the
live feed.

## Running automated JSON comparison against the tested API

This tool doesn't just generate reference data — it can also check a real
FootyScores API deployment against that reference, match by match, so you
don't have to eyeball JSON responses by hand.

1. **Load the reference data first.** Click **Load & generate** and wait for
   it to finish — comparison always runs against whatever's currently
   generated.
2. **Point it at the API you're testing.** Open any match, go to its
   **Compare** tab, and fill in **Test API base URL** — the *root* URL of
   the FootyScores deployment you want to test (no path), e.g.
   `https://your-footyscores-deployment.example.com` or
   `http://localhost:4000` for a local instance. The tab shows a live
   preview of the exact URL it will request for that match, built as
   `{base URL}{this match's endpoint}` (e.g.
   `.../v1/football/matches/2024-07-24-argentina-vs-morocco`) — use that
   preview to confirm you've got the right shape before running anything.
3. **Run it**, one of two ways:
   - **One match**: click **Compare this match** in that same tab. Requires
     the match's own detail to have finished loading first (the button's
     disabled until then).
   - **Many at once**: use the **Compare** dropdown next to **Export JSON**
     (top of the match list) and pick **All**, **Filtered**, or **Selected
     match only**. This reuses the same base URL you entered in the Compare
     tab.
4. **Read the result.** A single-match compare pops open a modal with
   **pass**, **fail** (a field-by-field diff table showing exactly what
   differed), or **error** (e.g. the tested API was unreachable or returned
   a non-2xx status). A bulk compare instead shows a `{passed}/{total}
   compared` badge in the header — open any individual match's Compare tab
   afterwards to see that match's own result.

Comparison requests run **server-side**, not from your browser — so the
tested API needs to be reachable from wherever *this app's server* is
running (irrelevant if both are on the same machine in dev; matters if
either one is deployed remotely).

**No live API to test yet?** Use **Or paste a JSON response to compare
directly** in the same Compare tab instead — paste any JSON response body in
and it diffs against the reference immediately, entirely in the browser, no
base URL or live API required.

## Testing

Tests cover `lib/odf/*` and `lib/server/*` — the ODF parsing, endpoint/record
generation, diffing, and cache logic — plus the presentational components
under `components/workspace/*` (Testing Library + jsdom). Network-boundary
modules (`schedule.ts`, `matchDetail.ts`) are tested with `fetch` mocked to a
small realistic fixture rather than hitting the real Olympic API.
`components/workspace.tsx` (the stateful orchestrator, owns the real `fetch`
calls) and route handlers under `app/api/**`/`app/v1/**` aren't covered —
see `.claude/skills/vitest-best-practices/SKILL.md` for the reasoning and
conventions.
