# Project rules

## Tailwind: use theme tokens, not arbitrary values

Prefer Tailwind's design-token utilities (spacing/sizing scale, `--color-*`
tokens from `app/globals.css`, etc.) over arbitrary-value syntax like
`max-w-[1480px]` or `text-[13px]`.

- If an existing token is close enough, use it (e.g. `max-w-7xl` instead of
  `max-w-[1480px]`).
- If a value is genuinely needed repeatedly and no token fits, add it to
  `@theme inline` in `app/globals.css` (following the existing
  `--color-panel`, `--color-signal-*` pattern) and reference it via the
  generated utility class, not an inline bracket value.
- Arbitrary values are acceptable only for one-off, truly one-time layout
  numbers that don't belong in the design system.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
