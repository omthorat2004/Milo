---
name: responsiveness
description: Mobile/responsive layout conventions across Milo's Next.js apps (packages/frontend, packages/landing). Use when building or changing any page or component that must work at phone width, when choosing Tailwind breakpoints, when a layout cramps or overflows on narrow screens, or when deciding whether a nav/table/row should hide, stack, or wrap below a breakpoint.
---

# Responsiveness in Milo

No custom breakpoints, Tailwind v4 defaults only (`sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px).
Don't add a `screens` override or a custom breakpoint token; every existing layout composes from the
defaults.

## Core patterns already in use: follow these, don't invent new ones

**Sidebar → bottom nav.** `components/app/app-nav.tsx` renders a fixed `lg:flex` sidebar (hidden
below `lg`) and a separate fixed bottom tab bar (`lg:hidden`) for phone/tablet. `(app)/layout.tsx`
reserves the sidebar's width with `lg:pl-60` on the content wrapper, so the two must move together.
Changing the sidebar width means updating that padding too.

**Hide secondary table columns, don't shrink them.** `links-table.tsx`'s header row and body cells
use `hidden ... sm:block` / `sm:grid` for columns that aren't essential at phone width (Views,
Downloads, Created). The primary label/actions stay visible and become `col-span-5` (full width) so
they stack cleanly instead of squeezing every column into illegible slivers.

**Guard against text overflow on rows that mix a label with a trailing value.** Any flex row pairing
a (potentially long) name/label with a fixed-content element (a timestamp, a count, an icon button)
needs `min-w-0` + `truncate` on the label side and `shrink-0` on the fixed side, plus `flex-wrap` if
both sides must stay fully readable rather than truncate. See `account-dashboard.tsx`'s recent
activity list for the reference shape. This exact bug (an untruncated label pushing a timestamp off
screen) has been hit and fixed once already; don't reintroduce it in a new list/row component.

**Forms and detail panels: single column, `max-w-lg` or `max-w-5xl`.** No responsive grid is needed
for a form (`link-form.tsx`): stacked fields work at every width by default. Page-level content
wraps in `mx-auto w-full max-w-5xl` (`PageHeader` usages throughout `(app)`) so it never needs its
own breakpoint handling.

**Summary-card grids** (`account-dashboard.tsx`, `link-dashboard.tsx`): no columns at the base
(stacks to one per row), `sm:grid-cols-2`, `lg:grid-cols-4`. Reuse this exact triple rather than
picking new breakpoints for a new stat grid.

**Modals/dialogs** (`confirm-dialog.tsx`): `fixed inset-0 ... p-4` overlay with `w-full max-w-sm` on
the panel. The `p-4` on the overlay is what keeps the panel off the screen edge on a phone; don't
drop it.

## When adding a new page or component

1. Reach for the pattern above that matches the shape (table row, form, stat grid, nav item,
   overlay) before inventing a new responsive treatment.
2. If it's genuinely new, default mobile-first: unprefixed classes are the phone layout, add `sm:`/
   `lg:` to layer on more columns/visible content as the viewport grows, never the reverse.
3. Check it at phone width before calling it done. `make dev-frontend` + the `claude-in-chrome` or
   `run` skill's browser pattern, or `resize_window`/viewport emulation in dev tools, at ~375px.
   Reasoning about Tailwind classes is a reasonable fallback *only* when a live check genuinely isn't
   possible (e.g. the page is behind auth and no session is available), say so explicitly rather
   than silently skipping verification.

## Related skills

- `theming`, color/dark-light, not layout; check both before styling a new responsive surface.
- `three-js-scenes`, a Three.js canvas needs its own resize/DPR handling, not covered here.
- `nextjs-app`, route structure and the `(all)`/`[id]` page shapes these patterns apply to.
