# Milo

Privacy-conscious **resume analytics**. A candidate hosts their resume PDF wherever it already
lives, gives Milo the public URL, and shares a Milo tracking link instead. Milo answers
_"how is my resume performing?"_, never _"who is looking at it?"_

## Repository layout

```
milo/
├── Makefile            Task runner spanning both languages. Prefer it over raw commands.
├── .github/            CI: separate JavaScript and Python jobs
├── .claude/            Claude Code config
├── package.json        npm workspaces manifest (JavaScript packages only)
└── packages/
    ├── landing/        Next.js marketing + waitlist site   (complete, deployed)
    ├── frontend/       Next.js product app                 (scaffold, no product code yet)
    └── backend/        FastAPI service, Poetry             (scaffold, no product code yet)
```

The root is polyglot. `package.json` and `package-lock.json` belong to the JavaScript workspaces and
must stay at the root, since npm workspaces requires it. All Python configuration lives in
`packages/backend`. Never add Python tooling config to the root, and never let Prettier format
`packages/backend`.

## Stack

- **Landing**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Three.js via
  react-three-fiber · Zod
- **Backend (later)**: **FastAPI + MongoDB**. Not Express, and not Next API routes for product
  logic. The landing package's only route handler is the waitlist endpoint.
- **Waitlist storage is MongoDB**, via the adapter in `lib/waitlist/store.ts`. The same cluster the
  FastAPI backend will use, so there is nothing to migrate later. The JSON-file and log adapters
  exist only as development convenience and misconfiguration alarms respectively, do not add new
  storage backends without a reason.

## Non-negotiable product rules

Privacy is the product, not a feature. Never implement, suggest, or leave TODOs for:

- IP display, IP-derived location, city/country, GPS
- recruiter/visitor identification, LinkedIn or email resolution
- device fingerprinting, cross-site tracking, camera/mic, browser history

Allowed signals only: timestamp, anonymous session id, device category, browser, OS, referrer
domain, UTM params, page number, dwell time, document opened, document downloaded.

Marketing copy must never claim Milo can identify a viewer.

## Licensing

Milo is source available under the **Elastic License 2.0**, not MIT and not open source in the OSI
sense. Do not change the license, add an MIT/Apache header to any file, or describe the project as
"open source" without the "source available" qualifier. Third parties may self host but may not run
Milo as a service for others.

Any dependency added must be compatible with redistribution under these terms. Prefer MIT, Apache
2.0, BSD and ISC dependencies. Do not add GPL or AGPL dependencies without raising it first.

## Backend layering

`packages/backend/src/milo_backend` is layered. Dependencies point one direction only:

```
routes -> service -> dao -> MongoDB
```

| Package | Holds | Never |
| --- | --- | --- |
| `core` | settings, database client, security primitives, logging | business rules |
| `routes` | FastAPI routers, request wiring, status codes | queries, business rules |
| `service` | business rules, orchestration, the analytics maths | FastAPI or Mongo types |
| `dao` | Mongo queries, indexes, projections | HTTP concerns, business rules |
| `schemas` | Pydantic request and response models | database shapes |
| `model` | domain and persistence models | FastAPI or HTTP |
| `exception` | domain exceptions and their HTTP handlers | business rules |

A route must not import from `dao`, and a service must not import `fastapi`. Keeping the analytics
maths in `service` is what lets it be unit tested without a database or a running app.

The privacy rules above apply hardest in `dao` and `model`: there is no visitor-identity column to
add, and none may be introduced.

## Conventions

- No `any`. No hardcoded secrets. Validate every input with Zod at the boundary.
- Server-side fetching of user-supplied URLs must go through SSRF guards (blocked when the product
  app lands; the landing package fetches nothing user-supplied).
- Keep components small and colocated by section; 3D scene code lives in `components/three`.
- Run `npm run lint && npm run typecheck && npm run build` before declaring work done.
