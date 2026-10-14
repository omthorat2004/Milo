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
  production via `Settings.email_delivery`.
- `_rate_limit.py` — the shared `slowapi` `Limiter` instance (`limiter`), keyed off caller IP by
  default; per-route limits are read from `Settings` at call time via a lambda, not hardcoded, so
  they're tunable per environment without a redeploy.

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

## What's not implemented yet

No resume, tracking-link, or analytics-event routes/services/DAOs exist. When building those, the
privacy rules bite hardest in `dao`/`model` for analytics events — there is intentionally no
visitor-identity field to add there (see root `CLAUDE.md` and
[business-requirements.md](./business-requirements.md)).
