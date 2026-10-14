# Testing

## Current state

| Package | Test runner | State |
| --- | --- | --- |
| `packages/backend` | pytest + pytest-asyncio + httpx (dev dependency group in `pyproject.toml`) | Dev dependencies are declared; **no test files exist yet**. `make test-py` runs `poetry run pytest -q` and treats exit code 5 ("no tests collected") as a pass, not a failure, specifically so this is non-blocking until tests are added. |
| `packages/frontend` | — | No test runner configured. No `test` script in `package.json`. |
| `packages/landing` | — | No test runner configured. No `test` script in `package.json`. |

Verification today leans entirely on `lint` + `typecheck` + `build` across all three packages, plus
manual exercise of the running app. That's a real gap as the product surface grows past auth — see
"What to add next" below.

## Running what exists

```bash
make test          # -> make test-py -> poetry run pytest -q (skips cleanly if backend not installed)
make lint           # eslint (all JS workspaces) + ruff check (backend)
make typecheck      # tsc --noEmit (all JS workspaces) + mypy src (backend)
make build          # next build, every JS workspace
make fmt-check      # prettier --check + ruff format --check
```

Or scoped to one language:

```bash
npm run lint / typecheck / build                 # JS workspaces, --workspaces --if-present
cd packages/backend && poetry run pytest -q       # backend only
cd packages/backend && poetry run ruff check .    # backend lint only
cd packages/backend && poetry run mypy src        # backend types only
```

A Stop hook is registered in `.claude/settings.json` that runs `make lint && make typecheck &&
make test` after every Claude Code turn in this repo and reports pass/fail — useful as a
regression tripwire, but it is not a substitute for writing real tests as features land.

## Backend testing conventions (once tests exist)

The layering in [backend-architecture.md](./backend-architecture.md) is specifically designed so
most logic can be tested without a database or a running app:

- **`service` unit tests need no FastAPI app and no MongoDB.** `AuthService` takes its DAOs as
  constructor arguments — in a test, pass fakes/mocks implementing the same methods
  (`get_by_email`, `create`, etc.) and assert on the business outcome (tokens issued, correct
  `AppException` raised) without touching Motor at all. This is the layer that should have the
  most tests, since it's where the actual rules live (resend cooldowns, verification-attempt
  limits, password-strength checks).
- **`dao` tests need a real (or `mongomock`-style) MongoDB** — they're testing query correctness
  and index behavior (e.g. the unique-email constraint, the TTL index), which a fake can't verify
  faithfully. Keep these separate from `service` tests so a missing local MongoDB doesn't block the
  larger, faster unit-test suite.
- **`routes` tests use `httpx.AsyncClient` against the FastAPI app** (already a dev dependency) to
  check status codes, cookie-setting, and the exact error-response shape from
  [api-design.md](./api-design.md) — these are integration tests, not where business-rule edge
  cases should be exhaustively covered.
- Test file layout convention (not yet established in code, propose to the user before diverging):
  mirror the source tree, e.g. `tests/service/test_auth.py`, `tests/dao/test_auth.py`,
  `tests/routes/test_auth.py`.
- Never mock MongoDB in a test that's meant to catch a real query/index bug — that's exactly the
  kind of mock/prod divergence that defeats the purpose of a DAO test. Mock it freely in `service`
  tests, where the DAO itself isn't what's under test.

## What to add next (in priority order)

1. **Backend `service` unit tests for `AuthService`** — this is the only non-trivial business logic
   in the codebase today, and it currently has zero coverage. Start here before adding tests for any
   new feature.
2. **A JS test runner** (Vitest is the natural fit for Next.js/React 19, but confirm with the user
   before adding the dependency) for `packages/frontend` — there is no test tooling at all yet, and
   once `auth-form.tsx` is wired to `auth.api.ts` (see
   [frontend-architecture.md](./frontend-architecture.md)), that's the first thing worth testing.
3. **Backend route-level integration tests** via `httpx.AsyncClient`, once service-level coverage
   exists — covering the cookie-setting and error-shape contract, not re-testing business rules
   already covered at the service layer.
4. Add a `test` / `test-js` target to the root `Makefile` and `package.json` scripts once a JS
   runner exists, so `make test` covers both languages again (today it's Python-only because
   there's nothing else to run).
