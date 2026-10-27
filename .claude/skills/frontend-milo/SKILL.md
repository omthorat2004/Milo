---
name: frontend-milo
description: Entry point for any frontend work in Milo, packages/frontend (the product app) and packages/landing (the marketing site). Use this first whenever building, changing, or reviewing UI, routes, components, styling, 3D scenes, or responsive layout in either app; it routes to the specific skill that actually owns each concern instead of duplicating their content. Also use when unsure which of Milo's several frontend-related skills applies.
---

# Frontend work in Milo, start here

Milo has two Next.js apps (`packages/frontend` on `:3001`, the product app; `packages/landing` on
`:3000`, the marketing site) sharing `@milo/ui` and `@milo/styles`. Frontend conventions are split
across several skills so each stays focused. This skill is the index, not a duplicate. Read the
routed skill, don't just skim this page and guess.

## Route to the right skill

| You're doing this | Load this skill |
| --- | --- |
| Routing, route groups (`(marketing)`/`(auth)`/`(app)`), server vs. client components, the `[id]` segment, talking to the FastAPI backend, Next 16 specifics | `nextjs-app` |
| Finding where a feature/file actually lives, onboarding to an unfamiliar area, checking what's built vs. mock vs. not-started | `project-map` |
| Light/dark theming, `@milo/ui/theme`, semantic tokens (`bg-background`, `text-foreground`, ...) vs. the raw palette (`ink-*`/`sand-*`/`signal-*`/`clay-*`), `ThemeToggle` | `theming` |
| Three.js / `@react-three/fiber` scene code, anything under `components/three/` or a `*-scene.tsx` file, scroll-driven animation, React Compiler lint issues in a scene | `three-js-scenes` |
| Mobile/responsive layout, Tailwind breakpoints, a layout that cramps or overflows at phone width, nav/table/row stacking decisions | `responsiveness` |
| Component API shape (variants, polymorphic props, `useId`, accessibility baseline), where a new component file should live | `docs/component-building.md` (not a skill, read directly) |
| Metadata, `sitemap.ts`/`robots.ts`, Open Graph/Twitter cards, heading structure, anything about how a `packages/landing` page shows up in search or link previews | `seo` |
| Writing or revising any user-facing copy, marketing text, UI labels, the shipping log, for voice, plain language, or the no-em-dash/no-filler rules | `content-writing` |

Several of these compose on a single task. Building a new responsive, themed, animated marketing
section means reading `nextjs-app` (where the file goes, server/client split), `theming` (colors),
`responsiveness` (breakpoints), and `three-js-scenes` (if it has a scene), in that order, before
writing code.

## What this skill owns directly (not covered elsewhere)

**Typography is sans-serif only, system-wide.** Both apps use Sora (headline/display) + Inter
(body), wired once per app in `app/layout.tsx` via `next/font/google`, surfaced as the
`font-display`/`font-sans` Tailwind utilities from `packages/styles/globals.css`. This was a
deliberate move away from an earlier serif display face (too thin to read crisply at a glance); do
not reintroduce a serif headline font without the user explicitly asking to revisit it. If both
apps' fonts ever need to change again, change them together. They're intentionally kept identical
for brand consistency, not just coincidentally similar.

**Licensing banner.** Milo is Elastic License 2.0, never add an MIT/Apache header to a frontend
file or describe the project as "open source" without the "source available" qualifier (root
`CLAUDE.md`).

**Privacy banner.** Neither app's UI may imply Milo can identify a viewer, show IP/location, or
expose any signal beyond the allowed set (timestamp, anonymous session id, device category,
browser, OS, referrer domain, UTM params, page number, dwell time, document opened/downloaded).
This applies to `packages/landing`'s marketing copy as much as `packages/frontend`'s dashboard.

## Before declaring frontend work done

```bash
npm run lint --workspace @milo/frontend      # or @milo/landing
npm run typecheck --workspace @milo/frontend
npm run build --workspace @milo/frontend
```

or `make lint && make typecheck && make build` for every workspace at once. If the change is
interactive or visual, exercise it in the running app (`make dev-frontend` / `make dev-landing`).
A passing typecheck is not proof a UI works, per root `CLAUDE.md`.
