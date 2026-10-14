# Milo

Privacy-conscious **resume analytics**. A candidate hosts their resume PDF wherever it already
lives, gives Milo the public URL, and shares a Milo tracking link instead. Milo answers
_"how is my resume performing?"_, never _"who is looking at it?"_

## Repository layout

```
milo/
├── Makefile            Task runner spanning both languages. Prefer it over raw commands.
├── .github/            CI: separate JavaScript and Python jobs
├── .claude/            Claude Code config (settings, subagents in agents/, skills)
├── docs/               Architecture, API, schema, testing, and business-requirement docs
├── package.json        npm workspaces manifest (JavaScript packages only)
└── packages/
    ├── landing/        Next.js marketing + waitlist site   (complete, deployed)
    ├── frontend/       Next.js product app                 (auth vertical slice built; see docs/frontend-architecture.md)
    └── backend/        FastAPI service, Poetry             (auth vertical slice built; see docs/backend-architecture.md)
```

The root is polyglot. `package.json` and `package-lock.json` belong to the JavaScript workspaces and
must stay at the root, since npm workspaces requires it. All Python configuration lives in
`packages/backend`. Never add Python tooling config to the root, and never let Prettier format
`packages/backend`.

## Docs

`docs/` is the deeper reference for how each part of the codebase actually works today. Read the
relevant one before building in that area rather than re-deriving conventions from scratch, and
update it in the same change if you alter a layering decision, an endpoint contract, or a schema —
not as a follow-up:

- `docs/business-requirements.md` — product scope, who it's for, what's actually built vs. planned.
- `docs/frontend-architecture.md` — route groups, server/client split, how the frontend talks to the backend.
- `docs/backend-architecture.md` — the `routes -> service -> dao -> MongoDB` layering, walked through a real request.
- `docs/api-design.md` — endpoint conventions, the error-response shape, the full `/auth/*` contract, and a checklist for adding a new endpoint.
- `docs/database-schema.md` — every collection, field, and index that exists, plus the privacy constraint on every future one.
- `docs/component-building.md` — component API conventions for `packages/frontend`.
- `docs/testing.md` — what test coverage exists (not much yet), what to add next, and why.
- `docs/rules.md` — the engineering rules in this file, restated as a flat, checkable list for day-to-day use.

Treat the root `README.md`'s "Status" section as stale until it is updated: it still describes
`frontend`/`backend` as empty scaffolds; `docs/business-requirements.md` has the current state.

## Stack

- **Landing**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Three.js via
  react-three-fiber · Zod
- **Backend**: **FastAPI + MongoDB**. Not Express, and not Next API routes for product logic. The
  landing package's only route handler is the waitlist endpoint. The auth vertical slice
  (`docs/backend-architecture.md`) is the reference implementation of the layering below — follow
  its pattern (route → service → dao → model/schemas/exception) for every new feature rather than
  improvising a new shape.
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

- No `any`. No hardcoded secrets. Validate every input with Zod (frontend/landing) or Pydantic
  (backend) at the boundary.
- Server-side fetching of user-supplied URLs must go through SSRF guards. No current feature fetches
  a user-supplied URL yet (the resume-url feature in `docs/business-requirements.md` will be the
  first); the landing package fetches nothing user-supplied today.
- Keep components small and colocated by section; 3D scene code lives in `components/three`. See
  `docs/component-building.md` for the frontend component conventions.
- Run `make lint && make typecheck && make test && make build` (or the npm/poetry equivalents in
  `docs/testing.md`) before declaring work done. A Stop hook in `.claude/settings.json` already runs
  lint/typecheck/test after every turn in this repo as a tripwire — treat a failure it reports as a
  blocker, not noise.
- See `docs/rules.md` for all of the above restated as one flat checklist.
