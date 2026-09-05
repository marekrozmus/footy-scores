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

Tests cover `lib/odf/*` and `lib/server/*` — the ODF parsing, endpoint/record
generation, diffing, and cache logic. Network-boundary modules
(`schedule.ts`, `matchDetail.ts`) are tested with `fetch` mocked to a small
realistic fixture rather than hitting the real Olympic API. Route handlers
under `app/api/**`/`app/v1/**` and the React components aren't covered yet —
see `.claude/skills/vitest-best-practices/SKILL.md` for the reasoning and
conventions.
