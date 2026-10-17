---
name: seo
description: Technical SEO for packages/landing (the public marketing site) — metadata API usage, sitemap.ts/robots.ts, Open Graph/Twitter cards, canonical URLs, and discoverability. Use when adding or changing any page under packages/landing/app, touching lib/site.ts, or when asked to improve how a page shows up in search results or link previews. For writing style and on-page copy quality, see the content-writing skill instead — this skill is about structure and metadata, not prose.
---

# SEO in Milo

Scoped to `packages/landing` (`:3000`). `packages/frontend`'s `(app)` routes are authenticated
product surface and must never be made indexable, there is deliberately no sitemap/robots file for
that package, see `nextjs-app`/`project-map` for why.

## Single source of truth: `lib/site.ts`

`siteConfig` holds the name, tagline, description, and `url` every metadata field derives from.
Never hardcode the site name, a description string, or the domain anywhere else, a page's own
`metadata` export composes from `siteConfig`, it doesn't restate it. `siteConfig.url` reads
`NEXT_PUBLIC_SITE_URL`, falling back to `localhost:3000` in dev, it drives canonical links,
`sitemap.xml`, and Open Graph tags, a wrong value here breaks every link preview at once.

## Every page needs its own `metadata`

Use the App Router `Metadata` export (`generateMetadata` for anything dynamic), never a manual
`<title>`/`<meta>` in the page body:

```tsx
export const metadata: Metadata = {
  title: "Privacy", // becomes "Privacy, Milo" via the root template
  description: "...", // this page's own 150-160 character description, not siteConfig's
};
```

The root `layout.tsx` sets `title.template` (`"%s, Milo"`) and `title.default`, a page's own `title`
only needs the page-specific part. Every page should also set its own `description`, don't let it
silently inherit the root one, a privacy page and the homepage should not share search-result copy.

Root `layout.tsx` also sets `metadataBase`, `openGraph`, and `twitter` (`summary_large_image`) from
`siteConfig` once, a new page doesn't need to repeat these unless it has a genuinely different
title/description for social previews than its own `metadata.title`/`description`.

## `sitemap.ts` and `robots.ts`

`packages/landing/app/sitemap.ts` and `robots.ts` are hand-maintained, not auto-generated from the
route tree. **Adding or removing a page under `packages/landing/app/(marketing)` means updating
`sitemap.ts` in the same change**, a new marketing page silently won't appear in search results
until its entry is added. Give each entry a sensible `changeFrequency` and `priority` relative to the
existing ones (the homepage is `1`, most inner pages are lower), don't mark everything `1`.
`robots.ts` only needs touching when adding a path that should be disallowed, its `disallow` list is
intentionally short, don't add broad blanket rules.

## Headings and structure

- Exactly one `<h1>` per page, matching what the page is actually about.
- `h2`/`h3` form a real hierarchy describing the page's structure, don't skip a level or pick a
  heading level for its visual size instead of its semantic depth.
- Work the page's real subject into the first paragraph naturally, don't force a keyword that reads
  awkwardly.

## Images and links

- Every meaningful image gets descriptive `alt` text (what it shows), decorative images get
  `alt=""`. The Three.js scene canvases are decorative, don't give them `alt`/`aria-label` text that
  implies they convey information a screen reader user needs.
- Internal links use descriptive anchor text ("see the pricing page"), never "click here" or a bare
  URL.
- Don't duplicate the same block of copy verbatim across multiple pages, write it once and link to
  it or write a distinct version per page.

## Before calling a landing page done

- Confirm `metadata.title` and `metadata.description` are set and page-specific, not inherited from
  the root unexamined.
- If the page is new or its URL changed, confirm `sitemap.ts` reflects it.
- Check the rendered `<title>` and meta description in a browser (view source or dev tools), not
  just that the TypeScript compiles, a correct-looking `Metadata` object can still render wrong if a
  template or override is misapplied.

## Related skills

- `content-writing` — prose quality, SEO-relevant copy guidance (heading/description length, no
  keyword stuffing), and the no-em-dash/no-AI-filler rules that apply to every string this skill's
  metadata fields hold.
- `project-map` — confirms what actually exists under `packages/landing/app/(marketing)` before you
  add a page or a sitemap entry for one that doesn't exist yet.
- `frontend-milo` — the general frontend entry point; this skill is one of its routed destinations.
