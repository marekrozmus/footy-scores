---
name: nextjs-best-practices
description: Next.js 16 App Router conventions for this project — Server vs Client Components, data fetching, caching, routing, metadata, fonts/images, and Turbopack defaults. Load before creating or editing anything under app/, or any component that could be a Server Component.
---

# Next.js best practices (App Router, Next 16)

This project uses Next.js 16 (`next.config.ts`, App Router under `app/`). Turbopack
is the default bundler for both `next dev` and `next build` in this version —
don't add `--webpack` or suggest it as the default.

## Server vs Client Components

- Default to Server Components. Only add `"use client"` when the file actually
  needs interactivity, state, refs, effects, or browser-only APIs.
- Push `"use client"` as far down the tree as possible — wrap just the
  interactive leaf, not the whole page. `app/page.tsx` should stay a thin
  Server Component that renders a client component like `components/workspace.tsx`,
  not become a client component itself.
- Don't import server-only code (secrets, filesystem, DB clients) into a file
  marked `"use client"`.

## Data fetching

- Fetch data in Server Components with plain `async`/`await`, not `useEffect`
  + `useState` in a client component, unless the data genuinely depends on
  client-side state/interaction.
- Use Next's extended `fetch` caching options (`cache`, `next: { revalidate,
  tags }`) instead of hand-rolled caching layers.
- Don't fetch the same data in a parent and child — pass it down as props, or
  rely on React's automatic fetch memoization within a single render.

## Routing & layouts

- Colocate route-specific UI, loading, and error states using `loading.tsx`,
  `error.tsx`, `not-found.tsx` (this project already has root-level
  `app/error.tsx` and `app/not-found.tsx` — follow that pattern for any new
  route segments rather than handling errors ad hoc inside a page).
- Keep `app/layout.tsx` minimal: fonts, global CSS, `<html>`/`<body>`, and
  metadata. Don't put page-specific logic there.

## Metadata

- Export a `metadata` object (or `generateMetadata`) from the page/layout
  instead of manually writing `<title>`/`<meta>` tags.

## Fonts & images

- Load fonts via `next/font/google` (or `next/font/local`) as this project
  does in `app/layout.tsx` — never a `<link>` to Google Fonts or an `@import`
  in CSS.
- Use `next/image` for any raster image so it gets automatic sizing/lazy
  loading; only fall back to a plain `<img>` for something `next/image` can't
  handle (e.g. an SVG icon component).

## Config & build

- Don't add config to `next.config.ts` speculatively — this project intentionally
  keeps it empty (`{}`). Only add an option when it fixes a concrete, current
  problem.
- `next build` lints by default; a change that introduces a lint error will
  fail the build, not just `npm run lint`.
