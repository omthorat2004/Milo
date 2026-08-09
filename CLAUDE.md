# Milo

Privacy-conscious **resume analytics**. A candidate hosts their resume PDF wherever it already
lives, gives Milo the public URL, and shares a Milo tracking link instead. Milo answers
_"how is my resume performing?"_ — never _"who is looking at it?"_

## Repository layout

```
milo/
├── .github/            CI workflows          (global, outside packages)
├── .claude/            Claude Code config    (global, outside packages)
├── packages/
│   └── landing/        Next.js marketing + waitlist site  ← the only shipped package today
└── package.json        npm workspaces root
```

Future packages (`packages/web` — Next.js product app, `packages/api` — FastAPI backend) are **not
scaffolded yet**. Do not create empty package folders ahead of real code.

## Stack

- **Landing**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Three.js via
  react-three-fiber · Zod
- **Backend (later)**: **FastAPI + MongoDB**. Not Express, and not Next API routes for product
  logic. The landing package's only route handler is the waitlist endpoint, written behind a
  storage adapter so it can forward to FastAPI once that exists.
- **No database in the landing package.** Waitlist signups go to a local JSON file in development
  and to structured logs in production until the backend is ready.

## Non-negotiable product rules

Privacy is the product, not a feature. Never implement, suggest, or leave TODOs for:

- IP display, IP-derived location, city/country, GPS
- recruiter/visitor identification, LinkedIn or email resolution
- device fingerprinting, cross-site tracking, camera/mic, browser history

Allowed signals only: timestamp, anonymous session id, device category, browser, OS, referrer
domain, UTM params, page number, dwell time, document opened, document downloaded.

Marketing copy must never claim Milo can identify a viewer.

## Conventions

- No `any`. No hardcoded secrets. Validate every input with Zod at the boundary.
- Server-side fetching of user-supplied URLs must go through SSRF guards (blocked when the product
  app lands; the landing package fetches nothing user-supplied).
- Keep components small and colocated by section; 3D scene code lives in `components/three`.
- Run `npm run lint && npm run typecheck && npm run build` before declaring work done.
