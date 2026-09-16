---
name: fastapi-backend
description: Conventions for writing FastAPI code in packages/backend (milo_backend). Use when adding or changing anything under routes, service, dao, schemas, model, core or exception, when touching Settings, Motor/MongoDB access, cookies, slowapi rate limits or exception handlers, when wiring a new endpoint or dependency, or when a request fails with a 500, a rate-limit surprise, or a cookie that will not clear.
---

# FastAPI backend in Milo

`packages/backend/src/milo_backend`. Layered, fully async, MongoDB via Motor. Read before writing
backend code, the layering here is enforced by convention rather than by a linter, so a wrong import
compiles fine and only shows up as an untestable service six files later.

## The one-directional rule

```
routes -> service -> dao -> MongoDB
```

A route must not import `dao`. A service must not import `fastapi` or Motor types. That is what lets
the analytics maths be unit tested with no database and no running app. Before finishing a change:

```bash
grep -rn "from milo_backend.dao" src/milo_backend/routes/     # must be empty
grep -rnE "^(from|import) fastapi" src/milo_backend/service/  # must be empty
```

`schemas` are wire shapes, `model` are persistence shapes. They are allowed to look identical and
must still be two files, because the day they diverge you do not want to be rewriting routes.

Input normalisation belongs in `schemas`, never halfway down a route or a service. `schemas/auth.py`
defines the annotated types `Name`, `NormalisedEmail` and `OtpCode`, so every endpoint taking an
email trims and lowercases it, a name arrives with control characters gone and runs of whitespace
collapsed, and a code pasted as `123 456` arrives as `123456`. Reuse those aliases rather than
re-declaring `EmailStr` on a new model, or two endpoints will disagree about what the same address
is. `Password` is deliberately **not** stripped: trimming a password silently changes the credential
someone typed. `_normalise()` stays in the service as the domain rule, since a service must be
correct when called from a test that never went through a schema.

## core is a private package with a public front door

Every module in `core` is underscore-prefixed and re-exported through `core/__init__.py` with an
explicit `__all__`. Import `from milo_backend.core import get_settings`, never
`from milo_backend.core._settings import get_settings`. Anything new in `core` gets added to both the
import block and `__all__`, keep that list alphabetical, ruff's isort rules will not do it for you.

## Settings

`get_settings()` is `@lru_cache`d. Never construct `Settings()` in application code, and never read
`os.environ` directly.


Also remember that all the variables we need need to add in settings and access from setting only. If any variable is not environment variable put that as a value in settings.

A function takes config one of two ways, never both. `settings: Settings | None = None` with a
`settings or get_settings()` fallback is banned: it advertises an optional argument that only tests
ever pass, and leaves two names for one value in every body.

1. **Required keyword argument**, `*, settings: Settings`, whenever our own code calls the function.
   `set_auth_cookies`, `clear_auth_cookies` and `connect` are the examples. The function stays pure,
   a test builds a `Settings(...)` and passes it, and nothing has to touch the `lru_cache`. Routes
   receive it through `Depends(get_settings)` rather than plumbing it by hand.
2. **No parameter at all**, calling `get_settings()` in the body, only when option 1 is impossible:
   the signature belongs to a framework (`client_key(request)` is invoked by slowapi), the call
   happens at import (`build_limiter()`), or the function is already a global accessor and purity is
   unreachable (`get_database()` reads the module-global client).

When in doubt, option 1.

Secrets are `SecretStr` and are read through the `jwt_secret` and `ip_salt` properties, which raise
when unset. Do not call `.get_secret_value()` at a call site.

The model validators encode real deploy failures. `cors_origins` may not contain `*` while
credentials are allowed, `samesite=none` requires `secure=true`, and production refuses to start
without a 32+ character `JWT_SECRET_KEY` or with an `http://` origin. When adding a setting that has
one safe value in production and a convenient one locally, follow the same shape: default to `None`,
resolve it in `_apply_environment_defaults`, and reject the unsafe combination in
`_reject_unsafe_combinations`. Never add a setting whose insecure default silently survives to prod.

In development a missing `JWT_SECRET_KEY` is generated per process, so **every reload invalidates
every issued token**. A "randomly logged out on save" report is this, not a bug.

Env files load `.env` -> `.env.development` -> `.env.local`, later wins. Machine-specific and secret
values go in `.env.local`, which is never committed. Any new setting is documented in `.env.example`.

## Database access

One module-global Motor client, opened and closed by the `lifespan` handler in `app.py`.
`get_database()` raises if the lifespan never ran, so it must not be called at import time.

A DAO receives its database in `__init__` and never calls `get_database()` itself:

```python
class SomethingDAO(BaseDAO):
    collection_name = "somethings"
```

Wiring lives in `dependencies/`, which is the only place allowed to call `get_database()` and hand a
DAO to a service. Routes get services through `Depends`, never DAOs.

Every DAO method is `async` and awaited. Motor returns cursors, not lists, `await cursor.to_list(n)`
with an explicit bound rather than an unbounded one. Indexes belong in `dao`, declared next to the
queries that need them.

`dao/_base.py` types `db` and `collection` as Motor's `AsyncIOMotorDatabase` and
`AsyncIOMotorCollection`, matching what `core.get_database()` hands it. `dao/auth.py` is the
reference pair: `UserDAO` owns the unique `email` index, `EmailVerificationDAO` owns a unique
`user_id` index plus a TTL index on `last_sent_at`, so a spent code deletes itself rather than
lingering as a guessable row. Indexes are created once at startup by `ensure_indexes(settings=...)`
in `dependencies/`, called from the lifespan handler.

A verification row stores `user_id` and nothing that the `users` document already answers: no email
copy, and no `expires_at`, since expiry is `last_sent_at + OTP_EXPIRE_MINUTES`. The TTL window is
that same expiry plus `OTP_RECORD_GRACE_SECONDS`, so a code submitted a little late still returns
`verification_code_expired` rather than a confusing `verification_not_found`. `expireAfterSeconds`
is baked into the index, so `create_indexes` catches Mongo's `IndexOptionsConflict` (85) and rebuilds
the index when that setting changes.

## Errors

Services raise `AppException` subclasses from `exception/`. Never raise `HTTPException` outside
`routes`, and prefer not to raise it there either, a new subclass with a `status_code`, `code` and
`msg` keeps the wire contract in one place.

The response envelope is `{"code": ..., "msg": ...}` plus an optional `details` object. The frontend
renders `msg` and branches on `code`, so `code` is a stable API identifier: adding one is a feature,
renaming one is a breaking change.

`unhandled_exception_handler` returns a fixed payload and logs with `exc_info`. Never let an internal
message reach the client. Handlers are registered most-specific first in `register_exception_handlers`.

## Rate limiting

`limiter` is built once at import from `get_settings()`, so a test that changes rate-limit settings
must call `get_settings.cache_clear()` and rebuild via `build_limiter()`.

A route decorated with `@limiter.limit(...)` **must** take both `request: Request` and
`response: Response` in its signature. The first is how slowapi finds the client key, the second is
where it writes the `X-RateLimit-*` headers, and because `headers_enabled=True` a missing `response`
raises `parameter 'response' must be an instance of starlette.responses.Response` on the first call,
not at import. The limit string may be a callable, so
`@limiter.limit(lambda: get_settings().rate_limit_login)` keeps the number in `Settings` instead of
freezing it at import. `SlowAPIMiddleware` is only added when `rate_limit_enabled`, and the
`RateLimitExceeded` handler re-injects headers from `request.state.view_rate_limit`.

`client_key` hashes salted IP + current date and keeps 24 hex characters. That digest is a
throttling key held in memory only. It is never persisted, never logged, never returned, and never
joined to a user or an analytics event. Rotating daily is deliberate, do not "improve" it into a
stable identifier.

## Cookies

`set_auth_cookies` and `clear_auth_cookies` are a pair. A cookie only deletes when path, domain and
attributes match what set it, so if you pass a non-default `refresh_path` to one, pass the same value
to the other or logout will appear to work and leave the refresh token alive.

Cross-site cookies in production mean `SameSite=None`, which gives up the CSRF protection `lax`
provides for free. Any state-changing endpoint that authenticates by cookie needs its own CSRF
defence, this is written down in `.env.example` and is still unimplemented.

## Privacy applies hardest here

`dao` and `model` are where the temptation lives. There is no visitor-identity field and none may be
introduced: no IP, no geo or city or country, no fingerprint, no recruiter or email resolution.
Allowed event signals are only timestamp, anonymous session id, device category, browser, OS,
referrer domain, UTM params, page number, dwell time, opened, downloaded. Do not leave a TODO for a
forbidden field, do not add a nullable column "for later".

## Current state

Auth is implemented end to end and is the worked example for every layer: `routes/auth.py` ->
`service/auth.py` -> `dao/auth.py`, assembled in `dependencies/service.py`, mounted in `create_app()`.

```
POST /auth/register            201, creates the user unverified and emails a code
POST /auth/verify-email/start  202, resends, subject to the cooldown
POST /auth/verify-email/status 200, is a code still live, for how long, resend in how long
POST /auth/verify-otp          200, verifies, then sets both cookies
POST /auth/login               200, or 403 email_not_verified
POST /auth/refresh             200, from the refresh cookie
POST /auth/logout              204
GET  /auth/me                  200, through the CurrentUser dependency
```

Codes are six digits, HMAC-SHA256 hashed with `OTP_HASH_SECRET` before they reach Mongo, valid ten
minutes, five attempts, one send per minute. Passwords are argon2id. Tokens are PyJWT HS256 carrying
a `type` claim that `decode_token` checks, so a refresh token cannot be replayed as an access token,
and they only ever travel in httpOnly cookies.

The dependency set is fastapi, uvicorn, motor, pydantic-settings, slowapi, pyjwt, argon2-cffi,
aiosmtplib and email-validator, all permissive. Milo ships under Elastic License 2.0, so any new
dependency must be redistributable: prefer MIT, Apache 2.0, BSD, ISC, and raise GPL or AGPL before
adding it.

Still missing: `tests/` holds only `__init__.py`, there is no CSRF defence for the cross-site cookie
case, `/auth/verify-email/start` answers differently for known and unknown addresses so it leaks
membership, and nothing beyond auth exists yet, no resumes, tracking links or events.

`pyproject.toml` has no `[tool.ruff]`, `[tool.mypy]` or `[tool.pytest.ini_options]` section, so all
three run on defaults. `make typecheck` runs plain `mypy src`, which is not strict mode, do not
assume an untyped def would have been caught.

## Commands

Always through `make` from the repo root, never raw `pip` or a bare `python`:

```bash
make dev-backend   # uvicorn on :8000, reload
make lint-py       # ruff check + ruff format --check
make fmt-py        # ruff format + ruff check --fix
make typecheck     # tsc across workspaces, then mypy src
make test-py       # pytest, tolerates exit 5 while the suite is empty
```

Everything else is `cd packages/backend && poetry run ...`. `/docs` is served outside production
only. `make test-py` passing today means nothing, `tests/` contains only `__init__.py`.

## Style

`from __future__ import annotations` at the top of every module, matching the rest of the package.
Modern typing throughout: `X | None`, `list[str]`, `StrEnum`, `datetime.now(UTC)`. Module loggers are
named `logging.getLogger("milo.<area>")`. No hardcoded secrets, ever.
