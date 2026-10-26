# Backend architecture

FastAPI service at `packages/backend`, package name `milo_backend`, managed with Poetry. MongoDB
via Motor (async driver). See root `CLAUDE.md` for the non-negotiable layering and privacy rules —
this doc describes how the current code actually implements them, as a reference, not a restatement.

## Layering

```
routes -> service -> dao -> MongoDB
```

| Package | Holds | Never |
| --- | --- | --- |
| `core` | settings, DB client, security primitives (JWT, password/OTP hashing), cookies, rate limiter, email, logging | business rules |
| `routes` | FastAPI routers, request wiring, status codes | queries, business rules |
| `service` | business rules, orchestration, the analytics maths (future) | FastAPI or Mongo types |
| `dao` | Mongo queries, indexes, projections | HTTP concerns, business rules |
| `schemas` | Pydantic request/response models, input validation and normalization | database shapes |
| `model` | domain/persistence models (what's actually stored) | FastAPI or HTTP |
| `exception` | domain exceptions (`AppException` subclasses) and their HTTP handlers | business rules |
| `dependencies` | FastAPI `Depends()` wiring that assembles a `service` from its `dao`s + `settings` | — |

A route never imports `dao` directly; it depends on a service via `dependencies`. A service never
imports `fastapi` or a Motor/Pydantic-Mongo type — it only knows `model` and plain Python. This is
what lets `service/auth.py`'s business logic be unit tested without a running app or a database.

## Request lifecycle (concrete example: `POST /auth/login`)

1. `routes/auth.py::login` — FastAPI parses `LoginRequest` (schema), rate-limits via `slowapi`
   (`@limiter.limit(...)`), and resolves `AuthServiceDep`.
2. `dependencies/service.py::get_auth_service` builds an `AuthService` from a fresh `UserDAO` /
   `EmailVerificationDAO` (constructed from `get_database()`) and the cached `Settings`.
3. `service/auth.py::AuthService.login` — business rules: look up user, verify password hash
   (`core._security.verify_password`), check `email_verified`, issue a `TokenPair` (JWT access +
   refresh). Raises a typed `AppException` (e.g. `InvalidCredentials`, `EmailNotVerified`) on
   failure — never an HTTP exception.
4. Back in the route, `_authenticate()` calls `core._cookies.set_auth_cookies` to attach the access
   and refresh tokens as httponly cookies on the `Response`.
5. `exception/handlers.py::app_exception_handler` catches any `AppException` raised anywhere in the
   chain and converts it to a `JSONResponse` with `{"code": ..., "msg": ..., "details"?: ...}` — see
   [api-design.md](./api-design.md) for the exact shape.

## `core`

- `_settings.py` — `Settings(BaseSettings)`, loaded from `.env`/`.env.development`/`.env.local`.
  Validates itself on construction (`@model_validator`): generates dev-only secrets
  (`jwt_secret_key`, `otp_hash_secret`, `ip_hash_salt`) when unset outside production, and *refuses
  to start* in production if required secrets, HTTPS-only CORS origins, `cookie_secure`, or
  real-SMTP email delivery aren't configured. `get_settings()` is `@lru_cache`d — one instance per
  process.
- `_database.py` — a single module-level `AsyncIOMotorClient`, connected in the FastAPI `lifespan`
  (`app.py`) and closed on shutdown. `get_database()` raises if called before the lifespan has run.
- `_cookies.py` — `set_auth_cookies` / `clear_auth_cookies`. Access token cookie path `/`, refresh
  token cookie path configurable (defaults to `/`) so it can later be scoped to just the refresh
  route. `secure`/`samesite`/`domain` all come from `Settings`, not hardcoded.
- `_security.py` — password hashing (argon2-cffi), OTP generation/hashing, JWT `create_token` /
  `decode_token`.
- `_email.py` — `send_email`, backed by `aiosmtplib`; swaps to console-log delivery outside
  production via `Settings.email_delivery`. Never called directly from `service` — see `_celery.py`.
- `_celery.py` — `celery_app` and `queue_email()`. Every outbound email goes through a Celery task
  (`milo.send_email`) instead of blocking the request on SMTP; `service/auth.py` calls
  `queue_email(...)`, never `send_email(...)` directly. `Settings.celery_task_always_eager` defaults
  to `true` outside production (the task runs inline, so a fresh checkout needs no Redis or worker
  process to see a verification email) and is rejected at startup if `true` in production — there,
  `CELERY_BROKER_URL` must point at a real Redis and `make worker-backend` must be running, or
  queued emails never get picked up. The task retries up to 3 times (5s delay) on any delivery
  exception, since a down SMTP server shouldn't lose the email outright.
- `_rate_limit.py` — the shared `slowapi` `Limiter` instance (`limiter`), keyed off caller IP by
  default; per-route limits are read from `Settings` at call time via a lambda, not hardcoded, so
  they're tunable per environment without a redeploy.
- `_url_guard.py` — `ensure_public_url()`, the SSRF guard. Rejects any non-`http(s)` scheme and
  resolves the host via `getaddrinfo`, rejecting it if any resolved address is private, loopback,
  link-local, multicast, reserved, or unspecified. Called once, in `ResumeService.create`, before a
  candidate-supplied URL is ever persisted. It does not re-validate a redirect target — fetching
  follows up to 3 redirects (`_http_client.py`), so a host that resolves safely today but redirects
  to an internal address later would not be caught. This is a known gap, not an oversight.
- `_http_client.py` — `fetch_document()`, a thin `httpx` wrapper that streams a GET response,
  capping the buffered body at `Settings.resume_fetch_max_bytes` and raising a plain `ValueError` if
  exceeded. It raises `httpx.HTTPStatusError` on a terminal 4xx/5xx and otherwise returns the raw
  bytes/content-type/status. It does not retry — retrying belongs to `service`, since "which errors
  are worth retrying" is a business decision, not an HTTP-client concern.

## `exception`

`AppException` (`exception/base.py`) is the single base: every domain error carries a `status_code`,
a machine-readable `code`, a human `msg`, and optional `details`. Concrete errors
(`exception/auth.py`) are just class-level overrides of those three attributes — adding a new error
is a 4-line class, not a new code path in every route that can raise it.

`exception/handlers.py` registers three handlers on the `FastAPI` app: `AppException` →
structured JSON, `RateLimitExceeded` → 429 with `Retry-After`, and a catch-all `Exception` handler
that logs the full traceback server-side but returns a generic `internal_error` body — internal
details never leak to the client.

## `model`

Plain Pydantic `BaseModel`s describing what's actually persisted, not request/response shapes
(those are `schemas`). Currently: `User`, `EmailVerification` (see
[database-schema.md](./database-schema.md) for field-level detail and indexes). `model` never
imports FastAPI or Motor types — a DAO converts a raw Mongo document into a `model` instance at the
boundary (`UserDAO._with_id`, `EmailVerificationDAO._as_verification`).

## `dao`

One class per collection, subclassing `BaseDAO` (`dao/_base.py`), which just holds the
`AsyncIOMotorDatabase` and exposes `self.collection`. Each DAO owns its own `create_indexes()` —
called once at startup from `dependencies/service.py::ensure_indexes`, not left to be created
ad hoc by whichever query happens to run first. DAOs return `model` instances or `None`, never raw
dicts, to anything above them.

## Currently implemented feature: auth

Register → email-verify (OTP) → login → refresh → logout → `/me`. Full endpoint contract is in
[api-design.md](./api-design.md). Key design choices worth knowing before touching this code:

- **JWT access + refresh tokens, both in httponly cookies** (not returned in the response body) —
  `_authenticate()` in `routes/auth.py` sets them as a side effect of every auth-success response.
  A frontend client never sees the raw token; it relies on the cookie being sent automatically.
- **Unverified accounts can re-register.** `AuthService.register` treats "existing unverified user
  with this email" as a resend-the-code case, not a conflict — `UserAlreadyExists` is only raised
  once `email_verified` is `True`. This avoids locking someone out of their own signup if they
  mistyped the code and came back.
- **OTP resend has a cooldown**, enforced in `_issue_challenge` by comparing `now` against
  `last_sent_at + otp_resend_cooldown`, raising `ResendTooSoon` with a `retry_after_seconds` detail
  — not just rate-limited at the HTTP layer, which would give a generic 429 with no resend hint.
- **`email_verifications` has a TTL index on `last_sent_at`** (seconds = `otp_expire_minutes * 60 +
  otp_record_grace_seconds`), so stale pending verifications are garbage-collected by MongoDB itself
  rather than needing a cleanup job.

## Currently implemented feature: resumes and tracking links

`routes/resume.py` + `routes/tracking_link.py` -> `service/resume.py` + `service/tracking_link.py`
-> `dao/resume.py` + `dao/tracking_link.py` + `dao/analytics_event.py`. Full endpoint contract is in
[api-design.md](./api-design.md); collection shapes are in
[database-schema.md](./database-schema.md).

- **The SSRF guard runs once, at write time, not at fetch time.** `ResumeService.create` calls
  `core._url_guard.ensure_public_url` before a candidate-supplied `source_url` is ever persisted —
  rejecting a non-`http(s)` scheme or a host that resolves to a private/loopback/link-local address.
  It does not re-check on every later fetch, and it does not re-validate a redirect target (see
  `core` section above) — a deliberate, documented gap, not an oversight.
- **Expiry and revocation are checked before any network call.** `LinkService.resolve` looks up the
  link by slug and raises `TrackingLinkExpired`/`TrackingLinkRevoked` immediately if either applies
  — an expired link never triggers an outbound fetch, a retry, or an analytics event. This is also
  why the check happens in `service`, not as a Mongo query filter in `dao`: "is this expired" is a
  business rule (compared against `datetime.now(UTC)` at request time), not a storage concern.
- **Fetching the resume document retries, with a linear backoff, only on transient failures.**
  `LinkService._fetch_with_retry` retries `resume_fetch_max_retries` times (default 2) on
  `httpx.TransportError` or a `5xx`, backing off `resume_fetch_retry_backoff_seconds * attempt`
  between tries. A `4xx` or a body over `resume_fetch_max_bytes` raises `ResumeFetchFailed`
  immediately instead of retrying — those outcomes won't change on retry, so retrying would only add
  latency for the same failure.
- **The analytics event is recorded, not required.** If writing the `view`/`download` event raises
  for any reason, `LinkService.resolve` logs a warning and still returns the fetched document — a
  viewer seeing the resume is the product; losing one analytics row is not worth failing the whole
  request over.
- **`GET /l/{slug}` streams the document back through Milo's own server** (not a redirect), so the
  `Content-Type`/`Content-Disposition` on the response are Milo's to control and the viewer never
  sees the raw external URL. The tradeoff is that Milo's process buffers the whole body (bounded by
  `resume_fetch_max_bytes`) before responding.

## Editing a resume or a link

`PATCH /resumes/{id}` (`ResumeService.update`) and `PATCH /links/{id}`
(`LinkService.update_expiry`) are the only two mutation endpoints beyond create/revoke:

- A resume's `title`/`source_url` are both independently optional in the request; `source_url` is
  re-validated through the same SSRF guard as creation. `UpdateResumeRequest` rejects an empty
  request (no `title` and no `source_url`) at the schema layer, before the service is even called.
- A link's **only** editable field is `expires_at`, via `expires_in_days` (an integer sets it,
  `null` clears it — the request body always requires this field explicitly, there's no "omit to
  leave unchanged" case since it's the sole field). `TrackingLinkDAO.update_expiry` filters on
  `revoked_at: None`, so a revoked link can't be "un-revoked" by editing its expiry back to the
  future — revoking stays permanent, enforced at the query level, not just by convention in
  `service`.

## The dwell-time beacon

`POST /l/{slug}/dwell` (`LinkService.record_dwell`) closes the gap `AnalyticsEvent.dwell_time_seconds`
left open: `packages/frontend`'s public `/l/[slug]` viewer (`components/app/resume-viewer.tsx`) sends
one via `navigator.sendBeacon` when the tab hides or unloads. It's deliberately lenient — an unknown
slug silently no-ops, and an expired/revoked link still records the event, because by the time the
beacon fires the viewer was already reading the resume; there's no response for the client to act on
regardless. The frontend has no in-browser PDF renderer, so `page_number` is always `1` — this is
whole-document dwell time, not true per-PDF-page attention; a real pdf.js integration would be
required for the latter and doesn't exist.

## What's not implemented yet

A dashboard endpoint that aggregates `analytics_events` per resume/link (view counts, referrer
breakdown, average dwell time) does not exist yet — the collection, its index
(`idx_event_link_occurred_at`), and the raw per-link/per-owner listing endpoints
(`GET /links/{id}/events`, `GET /events`) are in place, and the frontend currently computes these
aggregates client-side from the raw event list rather than the backend pre-computing them.
