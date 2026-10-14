---
name: theming
description: Light/dark theming across Milo (shared @milo/ui theme module, @milo/styles semantic tokens, and every app that renders chrome). Use when adding or styling any component in packages/frontend or packages/landing, when a surface looks wrong in one theme but not the other, when wiring ThemeToggle or themeInitScript into a layout, or when deciding whether to reach for ink-*/sand-*/signal-*/clay-* vs background/foreground/surface.
---

# Light/dark theming

Milo has two colour systems layered on top of each other in `packages/styles/globals.css`, and
mixing them up is what produces a light page with dark, low-contrast chrome stuck to it.

## The two layers

1. **Raw palette** — `ink-*`, `sand-*`, `signal-*`, `clay-400`, declared under `@theme`. These are
   fixed values. `bg-ink-900` is the same dark colour whether `<html>` has `.dark` or not.
2. **Semantic tokens** — `background`, `background-elevated`, `foreground`, `foreground-muted`,
   `surface`, `surface-border`, `surface-hover`. Declared once under `:root` (light values) and
   re-declared under `.dark` (dark values), then re-exposed under `@theme inline` so Tailwind
   utilities like `bg-background`, `text-foreground`, `bg-surface`, `border-surface-border`,
   `hover:bg-surface-hover` resolve the live CSS variable at paint time.

   `surface` vs `surface-hover`: `surface` is an opaque panel background (a card, a sidebar, a
   sticky header) — use it for the resting state of something that sits on top of the page.
   `surface-hover` is a translucent tint (`color-mix` against the raw palette, never a flat color)
   meant to be layered on top of whatever is already there — use it for `hover:`/interactive states
   on a nav link or icon button, including ones that sit directly on `background` rather than on a
   `surface`. Don't use `surface` for a hover state: in light mode `surface` and
   `background-elevated` are both `#ffffff`, so a hover state built from `surface` can end up the
   same color as the panel around it and disappear.

**Only semantic tokens respond to the theme toggle.** A component styled with `bg-ink-900` or
`text-sand-200` renders identically in light and dark, which in practice means it looks like a dark
card/nav/header sitting on an otherwise light page — the exact bug to avoid.

## Which one to reach for

- Anything that is part of the page's visual surface and should flip with the theme — page
  background, card/panel backgrounds, body text, muted text, dividers/borders — use the semantic
  token (`bg-background`, `bg-surface`, `text-foreground`, `text-foreground-muted`,
  `border-surface-border`), never the raw colour it happens to resolve to today.
- Reach for a raw palette colour only when the design genuinely wants a fixed colour regardless of
  theme: the `signal-*` family for a recorded-signal accent (see root `CLAUDE.md`/`nextjs-app`
  skill — reserved for measured events, never decoration), `clay-400` as the brand accent, or a
  one-off like `::selection`'s `signal-400`/`ink-950` pair in `globals.css`. If you're unsure,
  default to the semantic token.
- Don't invent a new raw colour or a new semantic token casually. A new semantic token needs a
  light value under `:root` *and* a dark value under `.dark` added together, plus the matching line
  under `@theme inline` so the utility class generates at all — three edits, not one, in
  `packages/styles/globals.css`.

## Current migration state — check before copying an existing component

Most existing chrome (`AppNav`, `MarketingHeader`, the landing `Header`, `Button` in both apps,
`EmptyState`, the marketing/landing section components) still styles itself directly with
`ink-*`/`sand-*` from before the toggle existed, and has not been migrated to semantic tokens yet.
**Do not copy those classes into new components as if they were the current convention** — copying
`bg-ink-900/60 text-sand-200` into something new just propagates the bug into a new file. When you
touch a file that already mixes both systems, prefer migrating the touched lines to semantic tokens
over adding more raw-palette classes next to them.

## Wiring the toggle into a layout

`@milo/ui/theme` (`packages/ui/src/theme/`) is the whole system; apps only ever import from it, they
don't reimplement any of it:

- `themeInitScript()` — inline script string, injected via `dangerouslySetInnerHTML` as the first
  child of `<body>` (see `app/layout.tsx` in both `frontend` and `landing`). Runs before paint, reads
  `localStorage["milo-theme"]` or `prefers-color-scheme`, and toggles the `.dark` class before React
  hydrates. It cannot run from `<head>` under the App Router's metadata API.
- `<html>` ships a hardcoded `dark` class in the server-rendered markup (the pre-toggle default) —
  the init script corrects it client-side before paint, so there's no flash. Don't remove the
  hardcoded class thinking it's redundant.
- `useTheme()` — client hook, reads the class the init script already applied and exposes
  `{ theme, setTheme }`. It is a `"use client"` module; only call it from a client component.
- `<ThemeToggle className="..." />` — the button. It takes no variant/size props, only `className`,
  so every call site styles it itself (compare `app-nav.tsx`'s desktop/mobile instances). Style it
  with semantic tokens (`text-foreground-muted`, `hover:bg-surface`) for the same reason as any other
  chrome — a toggle button hardcoded to the dark palette is the same bug in miniature.
- `viewport.colorScheme` in each `app/layout.tsx` must be `"light dark"`, and `viewport.themeColor`
  must be a `media`-keyed array (light hex + dark hex), not a single colour — see both layouts for
  the pattern. A single `colorScheme: "dark"` here re-breaks the browser-native light affordances
  (scrollbars, form controls) even if every component is migrated correctly.

## Verifying a change

Toggle the button in the running app (`make dev-frontend`, and separately the landing dev server)
and look at the surface you touched in both states, not just the one you were styling in. Check
`prefers-reduced-motion` too — `ThemeToggle` falls back to an instant class swap when
`document.startViewTransition` is unavailable or reduced motion is requested; both paths must leave
the page in a consistent, correctly-themed state, not just the animated one.
