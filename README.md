# Milo

Privacy-conscious **resume analytics**.

You host your resume PDF wherever it already lives. Milo gives you a tracking link to share
instead, and tells you how that document performed — views, unique viewers, downloads, which pages
held attention. It never tells you _who_ read it, because it never collects that.

> Your resume stays where it already lives. Milo provides the analytics layer.

## Status

**Only the landing page is built.** It is production-ready and deployable today. The product app
and backend are not started — no placeholder packages are committed for them.

## Repository layout

```
milo/
├── .github/workflows/     CI: format, lint, typecheck, build
├── .claude/               Claude Code settings
├── CLAUDE.md              Product rules and conventions for AI-assisted work
├── .gitignore .prettierrc .editorconfig .nvmrc
└── packages/
    └── landing/           Next.js marketing site + waitlist   ← the only package today
```

Planned, not yet created:

| Package | Purpose | Stack |
| --- | --- | --- |
| `packages/web` | Product app — dashboard, PDF viewer, tracking links | Next.js, TypeScript |
| `packages/api` | Backend — auth, events, analytics | **FastAPI + MongoDB** |

## Landing package

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Three.js via react-three-fiber ·
Zod.

The centrepiece is a scroll-driven WebGL story in five acts: the resume where it lives → sent and
lost → shared through one Milo link → opened inside the viewer, pulsing one signal per open and one
per download → the pattern the candidate finally sees. It falls back to a static composition when
the visitor prefers reduced motion or has no WebGL.

### Develop

```bash
npm install
npm run dev          # http://localhost:3000
```

### Verify

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

## Waitlist

`POST /api/waitlist` — Zod-validated, rate limited, honeypot-protected. Storage is behind an
adapter in `lib/waitlist/store.ts`, chosen at runtime:

| Condition | Adapter | Behaviour |
| --- | --- | --- |
| `WAITLIST_FORWARD_URL` set | `forward` | POSTs `{ email, source, createdAt }` to that URL |
| development, otherwise | `file` | Appends to `.data/waitlist.json` (gitignored) |
| production, otherwise | `log` | One structured line per signup, retained in host logs |

There is no database yet by design. When `packages/api` exists, point `WAITLIST_FORWARD_URL` at its
waitlist endpoint — the frontend does not change.

`GET /api/waitlist` returns the signup count and requires `WAITLIST_ADMIN_TOKEN` as a bearer token.
It 404s otherwise. The count is deliberately not shown on the page: early numbers are weak social
proof. Flip `featureFlags.showWaitlistCount` in `lib/site.ts` when that changes.

Emails are never returned over HTTP by any endpoint.

## Deploying to Vercel

1. Import the repository.
2. Set **Root Directory** to `packages/landing`.
3. Framework preset: Next.js. Build and install commands are detected.
4. Environment variables (Production):
   - `NEXT_PUBLIC_SITE_URL` — the real origin, e.g. `https://milo.app`. Used for canonical URLs,
     `sitemap.xml`, and Open Graph tags.
   - `WAITLIST_ADMIN_TOKEN` — any long random string, to read the signup count.
   - `WAITLIST_FORWARD_URL` / `WAITLIST_FORWARD_SECRET` — optional, once a backend exists.

Signups land in the runtime logs until a backend is wired up. Grep them with:

```bash
vercel logs <deployment-url> | grep milo.waitlist
```

### Branding on the deployment

The tab icon comes from `app/icon.svg`, the home-screen icon from `app/apple-icon.tsx`, and the
link preview card — the image LinkedIn renders when you post the URL — from
`app/opengraph-image.tsx`. All three are Milo's own mark; nothing falls back to a platform default.
After deploying, re-scrape the URL with LinkedIn's Post Inspector so it picks up the card.

## Privacy rules

These are product constraints, not preferences. Milo does not implement, and will not accept
contributions implementing: IP display or IP-derived location, GPS, visitor identification,
LinkedIn or email resolution, device fingerprinting, cross-site tracking, camera/microphone access,
or browser-history collection.

Collected: timestamp, anonymous per-resume session ID, device category, browser, OS, referrer
domain, UTM parameters, page number, dwell time, opened, downloaded. That is the complete list, and
`/privacy` renders it from the same source as the landing page so the two cannot drift.
# Milo
