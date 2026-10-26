# Testing

## Current state

| Package | Test runner | State |
| --- | --- | --- |
| `packages/backend` | pytest + pytest-asyncio (`asyncio_mode = "auto"`, `[tool.pytest.ini_options]`) | 31 tests, all `service`-layer unit tests (`tests/service/test_auth.py`, `test_resume.py`, `test_tracking_link.py`), backed by in-memory fake DAOs in `tests/fakes.py`. No `dao` or `routes` tests exist yet — see "What to add next". |
| `packages/frontend` | Vitest (`vitest.config.mts`, Node environment, no jsdom/Testing Library yet) | 16 tests, pure-function unit tests for `lib/links-analytics.ts` and `lib/links.api.ts`'s `linkStatus`. No component/hook tests yet. |
| `packages/landing` | — | No test runner configured. No `test` script in `package.json`. |

Verification leans on `lint` + `typecheck` + `build` across all three packages, plus manual exercise
of the running app, in addition to the test suites above — see "What to add next" for the real gaps
that remain.

## Running what exists

```bash
make test          # -> test-js (vitest, every JS workspace with a test script) + test-py (pytest)
make lint           # eslint (all JS workspaces) + ruff check (backend)
make typecheck      # tsc --noEmit (all JS workspaces) + mypy src (backend)
make build          # next build, every JS workspace
make fmt-check      # prettier --check + ruff format --check
```

Or scoped to one language or package:

```bash
npm run test / lint / typecheck / build           # JS workspaces, --workspaces --if-present
npm run test --workspace @milo/frontend           # frontend only
cd packages/backend && poetry run pytest -q       # backend only
cd packages/backend && poetry run ruff check .    # backend lint only
cd packages/backend && poetry run mypy src        # backend types only
```

A Stop hook in `.claude/settings.json` runs the full pipeline — `fmt-check`, `lint`, `typecheck`,
`build`, `test` — after every Claude Code turn in this repo and reports pass/fail, functioning as a
CI gate even though nothing is wired to an actual CI provider yet.

## Backend testing conventions

The layering in [backend-architecture.md](./backend-architecture.md) is specifically designed so
most logic can be tested without a database or a running app, and that's exactly what exists today:

- **`service` unit tests need no FastAPI app and no MongoDB.** Every service (`AuthService`,
  `ResumeService`, `LinkService`) takes its DAOs as constructor arguments; `tests/fakes.py` provides
  in-memory fakes implementing each real DAO's exact method signatures, so a test asserts on the
  business outcome (tokens issued, correct `AppException` raised, a link's expiry actually cleared)
  without touching Motor at all.
  - `LinkService.resolve`'s retry logic is tested by monkeypatching
    `milo_backend.service.tracking_link.fetch_document` to simulate a flaky host (two `503`s then a
    `200`) or a terminal `404` — this proves the retry-vs-fail-immediately split without a real
    network call.
  - `ResumeService`'s SSRF-guard call is monkeypatched out in `tests/service/test_resume.py`'s
    `fake_url_guard` fixture, so these tests don't depend on live DNS resolution (slow and
    network-flaky in CI) — the guard's own correctness was verified manually during development
    (blocking loopback/private/link-local addresses and non-http(s) schemes) rather than under an
    automated test; a dedicated `tests/core/test_url_guard.py` is still a gap (see below).
- **`dao` tests need a real (or `mongomock`-style) MongoDB** — not yet written. They're testing
  query correctness and index behavior (the unique-slug constraint, the TTL index), which a fake
  can't verify faithfully.
- **`routes` tests use `httpx.AsyncClient` against the FastAPI app** — not yet written, and
  deliberately deferred: they need a live MongoDB connection (the route-level dependency chain calls
  `get_database()`), which would make the suite flaky in an environment without Mongo running. Once
  added, they should check status codes, cookie-setting, and the exact error-response shape from
  [api-design.md](./api-design.md), not re-cover business rules the service tests already own.
- Test file layout: mirrors the source tree under `tests/service/`. `tests/dao/` and `tests/routes/`
  don't exist yet — add them following this same pattern when `dao`/`routes` tests are written.
- Never mock MongoDB in a test that's meant to catch a real query/index bug. Mock it freely in
  `service` tests, where the DAO itself isn't what's under test.

## Frontend testing conventions

Vitest runs in Node environment (`vitest.config.mts`), not jsdom — the two test files so far
(`lib/links-analytics.test.ts`, `lib/links.test.ts`) are pure-function tests with no DOM, no React
rendering, and no network calls. Adding component or hook tests (e.g. `link-form.tsx`,
`use-link-mutations.ts`) will need jsdom and `@testing-library/react` as new dependencies, plus a
decision on how to fake `axios`/TanStack Query in that context — not yet done.

## What to add next (in priority order)

1. **A dedicated `tests/core/test_url_guard.py`** for `ensure_public_url` itself — the SSRF guard is
   the one thing in this codebase where a bug has real security consequences, and today its
   correctness rests on manual verification during development, not an automated regression test.
   Needs a decision on how to avoid live DNS in CI (monkeypatch `getaddrinfo`, or accept the
   network dependency for just this one file).
2. **Backend `dao` tests** against a real MongoDB (or `mongomock`) — the unique-slug index on
   `tracking_links`, the TTL index on `email_verifications`, and `AnalyticsEventDAO`'s `$in` query
   shape are all behaviors a fake can't verify.
3. **Backend route-level integration tests** via `httpx.AsyncClient`, once a decision is made about
   how to provide MongoDB in the test environment (or whether to mock `get_database()` at the
   dependency-injection boundary instead, trading some fidelity for no external dependency).
4. **Frontend component/hook tests** — `jsdom` + `@testing-library/react`, starting with
   `components/app/link-form.tsx` (the most complex client-side validation in the app) and
   `hooks/use-link-mutations.ts` (verify the resume-then-link two-call orchestration and cache
   invalidation).
