# Component building

Conventions for `packages/frontend` (the product app) and, where noted, the shared `@milo/ui` /
`@milo/styles` workspace packages. `packages/landing` has its own component tree
(`components/sections`, `components/three`) that follows the same spirit but is a separate,
already-complete package — don't restructure it to match this doc without a reason.

## Where a component lives

- **`components/ui/`** — generic, product-agnostic primitives with no knowledge of Milo's domain
  (a button, eventually an input/select/dialog). If a component would make sense in a completely
  different app, it belongs here or, if genuinely reusable across `frontend` and `landing`, in
  `@milo/ui` instead.
- **`components/app/`** — product-surface components that know about Milo's domain (nav, auth
  form, page header, empty state) but aren't tied to one route.
- **`components/marketing/`** — this package's own marketing components (separate from
  `packages/landing`'s marketing site).
- **`components/three/`** — any Three.js/`@react-three/fiber` scene code, per root `CLAUDE.md`.
  Follow the `three-js-scenes` skill's conventions, not this doc, for anything in here.
- A component used by exactly one page can live colocated in that route's folder instead of
  `components/` — don't promote something to a shared directory before it's shared.

## Component API conventions

Follow the existing primitives (`ui/button.tsx`, `app/auth-form.tsx`) as the reference shape:

- **Always accept and merge `className`.** Use `cn(...)` (`clsx` + `tailwind-merge`, from
  `@/lib/utils`) so a caller's override wins over the component's own defaults without a
  specificity fight. Never string-concatenate classnames.
- **Model variants as a typed union + a lookup object**, not a chain of conditionals:
  ```ts
  type Variant = "primary" | "secondary" | "ghost";
  const variants: Record<Variant, string> = { primary: "...", secondary: "...", ghost: "..." };
  ```
  This keeps every variant's full class list grep-able in one place and makes an invalid variant a
  type error instead of a silent no-op.
- **Polymorphic rendering via a discriminated prop, not a `as`/`asChild` prop.** `Button` takes
  `href?: string` and renders a `next/link` when present, a `<button>` otherwise — the prop types
  are unioned (`{href: string} | {href?: undefined} & ButtonHTMLAttributes<...>`) so passing `href`
  together with button-only attributes is a type error, not a runtime surprise.
- **Generate stable ids with `useId()`**, not a hand-rolled counter or `Math.random()`, for
  anything that needs to pair a `<label htmlFor>` with an input or wire up `aria-describedby`
  (`auth-form.tsx`'s `emailId`/`passwordId`/`noticeId` pattern).
- **No `any`.** This is a repo-wide rule (root `CLAUDE.md`), not specific to components, but it
  bites hardest in component prop types — spell out the union instead of reaching for `any`.

## Server vs. client

Default every component to a server component. Add `"use client"` only when the component
genuinely needs one of: React state/effects, browser-only APIs, or event handlers. `auth-form.tsx`
is `"use client"` because it holds `useState`; `button.tsx` has no `"use client"` directive because
rendering a styled `<button>`/`<Link>` needs none — don't copy the directive onto a component just
because a sibling has it.

## Accessibility baseline

Match what's already in `auth-form.tsx` when building a form or interactive component:
- Every input has an associated `<label htmlFor>`.
- Status/validation messages get `role="status"` (or `role="alert"` for errors) and are wired to
  the control via `aria-describedby`, not just placed nearby visually.
- Interactive elements are real `<button>`/`<a>`/`<input>` elements — don't build a clickable
  `<div>`.

## Styling

Tailwind v4 utility classes only — no CSS modules, no styled-components, no inline `style=` except
for values that can't be expressed as a utility (e.g. a computed transform). Reference design
tokens from `@milo/styles` by name, never a raw hex/color value, and never a stock Tailwind palette
(`text-gray-500`).

Prefer the semantic tokens (`bg-background`, `bg-surface`, `text-foreground`,
`text-foreground-muted`, `border-surface-border`) over the raw palette (`signal-400`, `ink-950`,
`sand-300`, `clay-400`) for anything that's part of the page surface — only the semantic tokens
flip with the `@milo/ui/theme` light/dark toggle, so a component styled with the raw palette stays
visually dark regardless of theme. See the `theming` skill before styling any new component; a lot
of existing chrome still uses the raw palette from before the toggle existed and is mid-migration,
so don't treat it as the reference. If a new token is genuinely needed, add it to `@milo/styles`
(light and dark value, plus the `@theme inline` line) rather than hardcoding a value in a
component.

## Before calling a component done

- `npm run lint` / `npm run typecheck` (or `make lint` / `make typecheck` from the root) clean.
- If it's interactive or touches auth/data, exercise it in the running app (`make dev-frontend`),
  not just a type-check — see root `CLAUDE.md`'s instruction to test the golden path and edge cases
  in a browser before declaring UI work complete.
