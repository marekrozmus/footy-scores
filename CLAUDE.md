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
