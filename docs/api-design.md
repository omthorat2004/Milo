# API design

Two distinct API surfaces exist today. There is no unified API gateway — `packages/landing` and
`packages/backend` are deployed and versioned independently.

| Surface | Lives in | Purpose |
| --- | --- | --- |
| `POST /api/waitlist`, `GET /api/waitlist` | `packages/landing` (Next.js route handler) | Pre-launch waitlist signups. The *only* route handler this package should ever have — root `CLAUDE.md` is explicit that product logic belongs in FastAPI, not Next API routes. |
| `/auth/*` | `packages/backend` (FastAPI, mounted with no version prefix yet) | Product auth. Everything else the product app will need (resumes, tracking links, analytics) will be added here following the same conventions. |

## Conventions for every backend endpoint

- **Request/response shapes are Pydantic models in `schemas/`, never a route-local dict.** Add a
  new schema class before writing the route body.
- **Business-rule failures raise a typed `AppException` subclass** (`exception/<area>.py`), not an
  `HTTPException`. The route layer doesn't know HTTP status codes for domain errors — the exception
  class does (`status_code` class attribute). See [backend-architecture.md](./backend-architecture.md).
- **Every mutating/sensitive route is rate-limited** via `@limiter.limit(lambda: get_settings().rate_limit_<name>)` — a lambda, not a literal string, so the limit is configurable per environment without a code change. The one deliberate exception is `GET /auth/me` (read-heavy, no mutation, called on every app load — see "Rate limiting" below). Every route, including that one, still falls under the app-wide default via `SlowAPIMiddleware`.
- **Auth is cookie-based, not bearer-token.** A route that needs the current user depends on
  `CurrentUser` (`dependencies/service.py`), which reads the `milo_access_token` httponly cookie —
  it never accepts a token in a header or body.

## Error response shape

Every error from `packages/backend` — domain error, rate limit, or unhandled exception — is JSON
with this shape (set by `exception/handlers.py`):

```json
{ "code": "invalid_credentials", "msg": "That email and password do not match.", "details": {} }
```

- `code` — stable, machine-readable, snake_case. Safe to switch on in frontend code
  (`error.response.data.code === "email_not_verified"`) — more reliable than matching on `msg` or
  HTTP status alone, since several error codes can share a status (e.g. both
  `email_already_verified` and `user_already_exists` are 409).
- `msg` — human-readable, safe to show directly in UI.
- `details` — present only when the error carries structured extra data (e.g.
  `{"attempts_remaining": 2}` on `verification_code_invalid`, `{"retry_after_seconds": 45}` on
  `resend_too_soon`). Omitted entirely (not `{}`) when there's nothing to add.
- Unhandled server errors always return `{"code": "internal_error", "msg": "Something went wrong."}`
  with a 500 — the real exception is logged server-side, never leaked to the client.

## `/auth` endpoint reference

All request/response fields are defined in `schemas/auth.py`; this table is the contract summary.

| Method & path | Auth required | Request | Success | Notable errors |
| --- | --- | --- | --- | --- |
| `POST /auth/register` | no | `{name, email, password}` | 201 `VerificationPendingResponse` | `weak_password`, `user_already_exists` (only if the email is already *verified*), `resend_too_soon` |
| `POST /auth/verify-email/start` | no | `{email}` | 202 `VerificationPendingResponse` | `user_not_found`, `email_already_verified`, `resend_too_soon` |
| `POST /auth/verify-email/status` | no | `{email}` | 200 `VerificationStatusResponse` (`status: none\|pending\|verified`) | — (always 200; "no pending verification" is a normal state, not an error) |
| `POST /auth/verify-otp` | no | `{email, code}` | 200 `AuthResponse`, sets auth cookies | `verification_not_found`, `email_already_verified`, `verification_code_expired`, `verification_code_invalid` (`details.attempts_remaining`), `too_many_verification_attempts` |
| `POST /auth/login` | no | `{email, password}` | 200 `AuthResponse`, sets auth cookies | `invalid_credentials`, `email_not_verified` (`details.email`) |
| `POST /auth/refresh` | refresh cookie | — | 200 `AuthResponse`, rotates auth cookies | `invalid_token` (missing/expired/wrong-type cookie) |
| `POST /auth/logout` | no | — | 204, clears auth cookies | — |
| `GET /auth/me` | access cookie | — | 200 `AuthResponse` | `invalid_token` |

`AuthResponse` is always `{"user": {id, name, email, email_verified}}` — the password hash and any
internal fields never leave `model.User`.

## Rate limiting

Backed by `slowapi` (`core/_rate_limit.py`), wired in two layers:

1. **App-wide default** — `SlowAPIMiddleware` applies `rate_limit_default` (`200/minute`) to
   *every* route automatically, including ones with no decorator. This is the floor, not the
   whole story.
2. **Per-route override** — `@limiter.limit(lambda: get_settings().rate_limit_<name>)` on routes
   where the default is too loose for what the route can be used for (credential stuffing,
   OTP brute-forcing, signup spam, etc.).

| Route | Setting | Default | Why this route |
| --- | --- | --- | --- |
| `POST /auth/register` | `rate_limit_register` | `5/hour` | Prevents signup/email-spam abuse — also gates the first email send. |
| `POST /auth/verify-email/start` | `rate_limit_resend_otp` | `5/hour` | Resending the OTP sends another email; same abuse shape as register. |
| `POST /auth/verify-email/status` | `rate_limit_verification_status` | `30/minute` | Polled by the frontend while a visitor waits for their code — looser than the others since it's read-only. |
| `POST /auth/verify-otp` | `rate_limit_verify_otp` | `10/minute` | Caps brute-forcing a short numeric code; `AuthService` also tracks `otp_max_attempts` independently (see [backend-architecture.md](./backend-architecture.md)) — two separate defenses, not one. |
| `POST /auth/login` | `rate_limit_login` | `10/minute` | Caps credential stuffing / password guessing. |
| `POST /auth/refresh` | `rate_limit_refresh` | `30/minute` | Not credential-guessable (requires a valid refresh cookie already), but still capped so a compromised/buggy client can't hammer token rotation. |
| `POST /auth/logout` | `rate_limit_logout` | `20/minute` | Low-risk, but still capped rather than left purely on the app-wide default — consistent with "every mutating route decides its limit on purpose" rather than by omission. |
| `GET /auth/me` | — (app-wide default only) | `200/minute` | Deliberately not given a tighter override: it's read-only, called on every app mount/tab, and the one route where an aggressive limit would most likely lock out a legitimate visitor rather than an attacker. |

All limits live in `Settings` (`core/_settings.py`), never as a literal string in a decorator, so
they're configurable per environment without a code change — see the checklist below.

**Rate-limit keying is privacy-safe by construction.** `client_key()` (`core/_rate_limit.py`) never
stores or logs a raw IP: it takes the request IP (or the first `X-Forwarded-For` hop), hashes it
with `HMAC`-style salting (`ip_hash_salt`) plus the current UTC date, and truncates the digest. The
salt rotates per day, so the key an IP maps to today can't be correlated with the key it mapped to
yesterday — enough to rate-limit a given IP *within a day* without keeping anything that could be
used to track a visitor across days, which would violate the no-IP-identity rule in root
`CLAUDE.md`.

A 429 from any limiter is always `{"code": "rate_limited", "msg": "Too many requests. Try again
shortly."}` with `Retry-After`/`X-RateLimit-*` headers (`exception/handlers.py`'s
`rate_limit_handler`) — the same error shape as every other error, not a special case the frontend
has to branch on separately.

## Security design and rules

These are the backend's actual security properties today, as implemented — not aspirational. Keep
this section in sync with `core/_settings.py`'s validators and `core/_security.py` when either
changes; those two files are the source of truth, this is the summary.

### Transport & session

- **Cookie-based auth, never bearer tokens** (see "Conventions" above). Both cookies are
  `httponly` always, `secure` in production (`cookie_secure` defaults to `is_production` and a
  validator refuses to start in production with it disabled), and `samesite="none"` in production /
  `"lax"` in development — a validator rejects `samesite="none"` without `secure=true`, since
  browsers reject that combination anyway.
- **Access tokens are short-lived (15 min default), refresh tokens long-lived (30 days default)**
  and rotate on every use (`POST /auth/refresh` issues a fresh pair, it doesn't just extend the
  old one). Both are JWTs (`core/_security.py`) with `iss`/`aud`/`exp`/`iat`/`jti` claims, signed
  with `jwt_secret_key` (HS256 by default); `decode_token` requires `exp`/`iat`/`sub` and checks
  `aud`/`iss`, so a token minted for a different audience or issuer is rejected outright.
- **CORS is explicit, not wildcarded.** `cors_origins` is a literal allow-list (comma-separated or
  JSON list via env), and a validator refuses to start if `*` is combined with
  `cors_allow_credentials=true` — that combination is meaningless anyway since browsers reject it,
  but failing fast here catches a misconfiguration before it reaches a browser.
- **Permissions-Policy** is set on the frontend (`next.config.ts`:
  `camera=(), microphone=(), geolocation=(), interest-cohort=()`) — product policy, not boilerplate,
  see the `nextjs-app` skill. Mentioned here because it's part of the same "no identity signal,
  ever" posture this file's rate-limit-keying section also serves.

### Credentials

- **Passwords are hashed with Argon2** (`argon2-cffi`'s `PasswordHasher`, not bcrypt/sha256) via
  `hash_password`/`verify_password`; `password_needs_rehash` exists so a login can transparently
  upgrade an old hash's parameters without a forced reset. Password length is bounded
  (`password_min_length`/`password_max_length`, 12–128 by default) — checked in `AuthService`, not
  left to the schema alone, so the message (`weak_password`, with the actual bound in `details`) is
  domain-controlled.
- **OTP codes are generated with `secrets.randbelow`** (CSPRNG, not `random`), stored only as an
  `HMAC-SHA256` digest keyed by `otp_hash_secret` (never the raw code), and compared with
  `hmac.compare_digest` — constant-time, so verifying a code can't leak timing information about
  how much of it was correct. `AuthService.verify_otp` also enforces `otp_max_attempts`
  independently of the route-level rate limit (two separate defenses on the same attack, see
  "Rate limiting" above).
- **Secrets have no insecure default in production.** `jwt_secret_key`, `otp_hash_secret`, and
  `ip_hash_salt` all get a random value generated at startup in development (so there's zero
  config needed locally), but a validator raises in production if `jwt_secret_key` or
  `otp_hash_secret` is unset, or shorter than 32 characters — an accidentally-unset secret fails
  startup, not silently falls back to something guessable.

### Error handling & information disclosure

- **Every error — domain, rate-limit, or unhandled — has the same `{code, msg, details?}` shape**
  (see "Error response shape" above); an unhandled exception is logged with its real traceback
  server-side but the client only ever sees `{"code": "internal_error", "msg": "Something went
  wrong."}` — a 500 never leaks a stack trace, a query, or an internal type name to the client.
- **`UserAlreadyExists` only fires once an email is verified** (see the checklist's privacy note
  and `backend-architecture.md`) — registering again with a pending-but-unverified email is treated
  as "resend the code," not as an enumeration-friendly "that email is taken." This is a deliberate
  account-enumeration mitigation, not an oversight.
- **`AuthResponse` never carries `password_hash` or any internal field** — `_public()` in
  `routes/auth.py` is the one place a `User` model becomes an API response, and it's an explicit
  allow-list of fields, not `model.model_dump()`.

### Production hardening (fails fast, not silently)

`Settings._reject_unsafe_combinations` and `_apply_environment_defaults`
(`core/_settings.py`) refuse to start the app in production with: a missing/short JWT or OTP
secret, `cookie_secure=false`, a non-HTTPS CORS origin, `EMAIL_DELIVERY=console` (which would
silently strand every signup since the OTP would only reach a log line, never an inbox), an SMTP
host from the local-mail-catcher list, or SMTP configured without TLS or credentials. Treat any new
production-only requirement the same way — a startup-time `ValueError`, not a runtime surprise.

## Designing a new endpoint (checklist)

When adding a route beyond auth (e.g. the eventual tracking-link or analytics-event routes):

1. Add/extend a `model` for what's actually persisted.
2. Add a `dao` method; add any new index to that DAO's `create_indexes()`, not as a one-off script.
3. Add the business rule to `service` — it must not import `fastapi` or a Mongo type.
4. Add request/response `schemas`.
5. Add any new failure mode as an `AppException` subclass in `exception/`.
6. Wire the route in `routes/`, resolving the service via a `dependencies` factory — never
   construct a DAO or open a DB connection directly in a route.
7. Decide the rate limit (or explicitly decide the route doesn't need one, as `GET /auth/me` does —
   see "Rate limiting" above) and add the setting to `Settings` rather than hardcoding a literal in
   the decorator.
8. Check every new field against the allowed-signal list in root `CLAUDE.md` /
   [business-requirements.md](./business-requirements.md) *before* writing the `model` — this is
   the step most likely to silently reintroduce a privacy violation (an IP field, a visitor id that
   isn't session-scoped, etc.).
9. Add the endpoint to this file's reference table.
