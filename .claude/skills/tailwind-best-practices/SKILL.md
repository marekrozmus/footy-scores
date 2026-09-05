---
name: tailwind-best-practices
description: Tailwind CSS v4 conventions for this project — theme tokens over arbitrary values, the app/globals.css @theme setup, and variant/className patterns. Load before writing or editing any className in a .tsx file or touching app/globals.css.
---

# Tailwind best practices (Tailwind v4)

This project uses Tailwind v4 via `@import "tailwindcss"` and an `@theme inline`
block in `app/globals.css` (CSS-first config, no `tailwind.config.js`).

## Tokens over arbitrary values (project rule, see CLAUDE.md)

Prefer Tailwind's token utilities over arbitrary-value syntax
(`max-w-[1480px]`, `text-[13px]`):

- If an existing token already covers it, use it (`max-w-7xl` instead of
  `max-w-[1480px]`).
- If a value is genuinely reused and no token fits, add it to `@theme inline`
  in `app/globals.css` following the existing `--color-panel`,
  `--color-signal-*`, `--tracking-14` pattern, then use the generated
  utility class it produces — don't hardcode the bracket value at each call
  site.
- Arbitrary values are fine only for a truly one-off layout number that will
  never recur and doesn't belong in the design system.

## Colors

- Reference semantic color tokens (`bg-panel`, `text-muted-foreground`,
  `border-border`, `text-signal-gold`, etc.) rather than raw Tailwind palette
  classes (`bg-zinc-900`) or inline `oklch(...)`/hex values. New colors are
  defined once in `app/globals.css` under `:root` and mapped in `@theme
  inline`, in `oklch()` to match the existing palette.
- Don't introduce a second way to express a color that already has a token.

## Variants & composition

- For components with a small fixed set of visual variants, use a
  `Record<Variant, string>` class map plus `cn()` (see
  `components/button.tsx`: `variantClasses`, `sizeClasses`) rather than long
  conditional/ternary strings of classes inline in JSX.
- Always run consumer-supplied `className` through `cn(...)` last, so
  overrides win, matching the `cn(baseClasses, variantClasses[variant],
  sizeClasses[size], className)` order in `button.tsx`.

## General

- Don't fight Tailwind with custom CSS for something a utility already does;
  reserve `app/globals.css` for true global concerns (base element resets,
  scrollbar styling, the theme/token definitions).
- Group related utilities in a readable order (layout → spacing → typography
  → color → state variants) rather than random order, so diffs stay small
  when one property changes.
- Prefer Tailwind's responsive/state variants (`sm:`, `hover:`,
  `focus-visible:`, `disabled:`) over manual media queries or JS-driven class
  toggling.
