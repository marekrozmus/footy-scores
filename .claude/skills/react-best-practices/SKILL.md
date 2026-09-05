---
name: react-best-practices
description: React 19 conventions for this project — component structure, hooks rules, state, and effects. Load before writing or editing any .tsx component, especially client components with state/hooks.
---

# React best practices (React 19)

This project runs `eslint-plugin-react-hooks@7` via `eslint-config-next`, which
enforces several of these rules as lint errors, not just style preferences.

## Component identity

- Never define a component inside another component's render body (e.g. a
  `const Foo = () => ...` declared inside a function component). It gets
  recreated — and remounted, losing state — on every render. Declare it at
  module scope instead, passing in whatever it previously closed over
  (state, setters, callbacks) as explicit props. `components/workspace.tsx`
  already follows this pattern (`FilterSelect`, `SortHeader` are both
  top-level functions that take `field`/`value`/`onChange`-style props rather
  than closing over the parent's state) — match it for any new subcomponent.
- This is enforced by `react-hooks/static-components` and will fail
  `npm run lint` / `next build`.

## Hooks

- Only call hooks at the top level of a component or another hook — never
  inside conditionals, loops, or after an early return.
- Keep `useEffect` for synchronizing with an external system (subscriptions,
  DOM APIs, non-React widgets). Don't use it to derive state from props/state
  you already have — compute that value directly during render instead.
- Prefer deriving values during render over mirroring them into `useState`
  and syncing with an effect.

## State

- Keep state as low in the tree as it needs to be; lift it only when two
  siblings actually need to share it.
- Model mutually-exclusive fields as one state object/discriminated union
  (as `sort: { field, dir }` does in `workspace.tsx`) instead of several
  independent `useState` calls that must be kept in sync by hand.

## Props & types

- Give every component prop an explicit TypeScript type (inline object type
  or a named `type Props = ...`), matching the existing style in
  `components/workspace.tsx` and `components/button.tsx`.
- Avoid `any`; prefer `unknown` plus a narrowing check if a type genuinely
  can't be known.

## Rendering lists

- Always pass a stable, unique `key` (a real id or discriminant value — not
  array index) when mapping over data to JSX, as this project does with
  `key={field}` / `key={option}` in `workspace.tsx`.

## Don't over-memoize

- Don't reach for `useMemo`/`useCallback`/`React.memo` by default. Add them
  only when you've identified an actual re-render cost — premature
  memoization adds noise without measurable benefit in most of this app's
  UI.
