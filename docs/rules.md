# Rules

A flat, checkable restatement of the rules in root `CLAUDE.md`, for quick reference while building.
`CLAUDE.md` is the source of truth — if this file and `CLAUDE.md` ever disagree, `CLAUDE.md` wins
and this file is out of date and should be fixed in the same change.

## Privacy (non-negotiable, applies to every feature forever)

- [ ] Never add, suggest, or TODO: IP display, IP-derived location, city/country, GPS.
- [ ] Never add, suggest, or TODO: recruiter/visitor identification, LinkedIn or email resolution.
- [ ] Never add, suggest, or TODO: device fingerprinting, cross-site tracking, camera/mic access,
      browser history.
- [ ] Any new field on any model/collection must be one of: timestamp, anonymous session id, device
      category, browser, OS, referrer domain, UTM params, page number, dwell time, document opened,
      document downloaded. If it isn't on this list, it doesn't go in.
- [ ] Marketing copy never claims Milo can identify a viewer.
- [ ] This applies hardest in `dao` and `model` — there is no visitor-identity column to add, and
      none may be introduced, no matter how the feature is framed.

## Licensing

- [ ] Never change the license, add an MIT/Apache header to a file, or call the project "open
      source" without the "source available" qualifier.
- [ ] Every new dependency must be redistributable under Elastic License 2.0 terms. Prefer MIT,
      Apache-2.0, BSD, ISC. Raise a GPL/AGPL dependency with the user before adding it — don't add
      it and ask forgiveness later.

## Repository boundaries

- [ ] `package.json`/`package-lock.json` stay at the root (npm workspaces requires it) and describe
      only the JS packages.
- [ ] All Python config lives in `packages/backend`. Never add Python tooling config to the root.
- [ ] Prettier never touches `packages/backend`.
- [ ] The landing package's only route handler is the waitlist endpoint — no other product logic in
      a Next.js API route, ever. Product logic is FastAPI.
- [ ] Don't add a new storage backend (beyond the Mongo/JSON-file waitlist adapters) without a
      reason raised to the user first.

## Backend layering (`packages/backend/src/milo_backend`)

- [ ] Dependencies point one direction only: `routes -> service -> dao -> MongoDB`.
- [ ] A route never imports from `dao` directly — it goes through a `service`, resolved via
      `dependencies`.
- [ ] A `service` never imports `fastapi` or a Motor/Mongo type — that's what makes it unit
      testable without a database or a running app.
- [ ] `core` holds settings/DB client/security primitives/logging — never business rules.
- [ ] `exception` holds domain exceptions and their HTTP handlers — never business rules.
- [ ] Every domain failure raises an `AppException` subclass, not an `HTTPException`, and not a
      bare `ValueError` the route has to interpret.
- [ ] Every new mutating/sensitive route gets a rate limit read from `Settings` (a lambda), not a
      hardcoded literal in the decorator — or an explicit decision that it doesn't need one.
- [ ] New index creation goes in that collection's DAO `create_indexes()`, called from
      `ensure_indexes()` at startup — never a one-off script or ad hoc query-time creation.
- [ ] Before writing a new `model` field, check it against the privacy allowed-signal list above.

## Frontend conventions (`packages/frontend`)

- [ ] No `any`. Validate every boundary input with Zod.
- [ ] Backend I/O goes through a typed `<resource>.api.ts` file in `src/lib/`, calling the shared
      `api` axios instance — never a raw `fetch`/`axios` call inline in a component.
- [ ] Default every component to a server component; add `"use client"` only once it actually needs
      state, effects, or browser APIs.
- [ ] Every component that accepts `className` merges it with `cn()` — never string-concatenates.
- [ ] 3D scene code lives in `components/three` and follows the `three-js-scenes` skill.
- [ ] Decide `(app)/(all)` vs. `(app)/[id]` deliberately for a new authenticated route — don't
      invent a third pattern without checking with the user.

## Verification

- [ ] Run `make lint && make typecheck && make test && make build` (or the per-language equivalents
      in `docs/testing.md`) before declaring work done.
- [ ] For UI/frontend changes, exercise the feature in a running browser (`make dev-frontend` /
      `make dev-landing`) — type-checking and lint are not a substitute for seeing it work.
- [ ] A failing Stop-hook report (`.claude/settings.json`) after a turn in this repo is a blocker,
      not noise — don't wave it off as unrelated without checking.

## Docs upkeep

- [ ] Changing a backend layering decision, an endpoint contract, a schema/index, or a component
      convention updates the matching file in `docs/` in the same change — not as a follow-up.
- [ ] `docs/business-requirements.md`, not the root `README.md`, is the current-state source of
      truth until `README.md`'s "Status" section is refreshed.
