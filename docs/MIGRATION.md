# TanStack Start → Next.js migration

## What it is

A faithful port of the single-page TanStack Start app (`src/routes/index.tsx`
in the repo root) — the "FootyScores Paris 2024 QA Workspace" — to Next.js
App Router. Only that page and its root shell were actually reachable; the
other ~40 shadcn `components/ui/*` files in the original project were dead
code (unused by any route), so they were left behind rather than ported.

## Dependency reduction

Runtime deps went from 26 to 3 (`next`, `react`, `react-dom`). Everything
else was reimplemented directly instead of installed:

- **`Button`** (`components/button.tsx`) — no `class-variance-authority`,
  no `@radix-ui/react-slot`; just plain variant/size maps.
- **16 icons** (`components/icons.tsx`) — no `lucide-react`; inline SVGs
  using the exact path data lucide ships, sourced from a local install so
  they render identically.
- **`cn()`** (`lib/utils.ts`) — no `clsx`/`tailwind-merge`; a plain
  `.filter(Boolean).join(" ")` (safe here since no call site has
  conflicting Tailwind classes).
- **Fonts** via `next/font/google` instead of a Google Fonts `<link>` tag
  (fewer render-blocking requests, no extra package).
- Dropped `tw-animate-css` — unused; the app only relies on the custom
  `animate-rise` keyframe and Tailwind's built-in `animate-spin`.
- Dropped the dead `.dark` CSS block — never toggled anywhere in the app.
- No `@tanstack/react-query` — it was wired up in the old root but no
  query was ever actually run.

## Structure

- `app/layout.tsx` — fonts + global metadata
- `app/page.tsx` — page-specific metadata (server component)
- `components/workspace.tsx` — the actual UI (`"use client"`)
- `app/not-found.tsx` / `app/error.tsx` — mirror the old 404/error
  boundaries from `src/routes/__root.tsx`

## Verification

- `npm install` succeeds
- `tsc --noEmit` is clean
- `eslint` is clean
- Tailwind v4 compiles `app/globals.css` correctly (checked by running it
  directly through PostCSS)

`next build` / `next dev` could not be run to completion in the sandboxed
session that produced this port — its file-read policy blocks a specific
`caniuse-lite` data file bundled three levels deep in `node_modules`,
unrelated to any code here. That's a restriction of that sandbox, not the
app. Run `npm install && npm run dev` locally to see it live.
