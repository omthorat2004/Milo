# Database schema

Milo uses MongoDB throughout — `packages/backend` (product data, via Motor) and
`packages/landing` (waitlist, via the Node `mongodb` driver) connect to **the same cluster**, by
design (see root `CLAUDE.md`): "the same cluster the FastAPI backend will use, so there is nothing
to migrate later." They are separate logical databases/collections, not shared tables, but there is
intentionally only one cluster to operate.

There is no ORM and no migration framework. Indexes are created idempotently at process startup
(`ensure_indexes()` in the backend, called from the FastAPI `lifespan`) — a schema change means
changing the DAO's `create_indexes()` and the `model`, then restarting the process; there is no
separate migration step to run first.

## Backend collections (`packages/backend`, DB name = `Settings.mongodb_db`, default `milo`)

### `users`

Backed by `model.User` (`dao/auth.py::UserDAO`).

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Mongo default; exposed to the app as `id: str` |
| `name` | string | |
| `email` | string | lowercased + trimmed before storage (`schemas.auth.NormalisedEmail`) |
| `password_hash` | string | argon2 (`core._security.hash_password`); never serialized in any API response |
| `email_verified` | bool | default `false` |
| `created_at` | datetime (UTC) | |
| `updated_at` | datetime (UTC) | bumped on verify and on login |
| `last_login_at` | datetime (UTC) \| null | |

**Indexes:** unique on `email` (`uniq_user_email`) — this is the only uniqueness constraint
enforced at the DB layer; `AuthService.register` additionally special-cases an *unverified*
existing row as "resend the code," not a conflict (see
[backend-architecture.md](./backend-architecture.md)).

### `email_verifications`

Backed by `model.EmailVerification` (`dao/auth.py::EmailVerificationDAO`). One document per user —
upserted, not appended, so there is never more than one pending/verified record per `user_id`.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `user_id` | ObjectId | stored as ObjectId, surfaced to the app as `str` |
| `code_hash` | string | hashed OTP (`core._security.hash_otp`) — the plaintext code is never persisted |
| `status` | `"pending" \| "verified"` | |
| `attempts` | int | incremented on each failed `verify-otp` call; checked against `Settings.otp_max_attempts` |
| `created_at` | datetime (UTC) | set once, via `$setOnInsert` |
| `last_sent_at` | datetime (UTC) | updated every resend; basis for both the expiry and the resend-cooldown calculations |
| `verified_at` | datetime (UTC) \| null | |

**Indexes:**
- Unique on `user_id` (`uniq_verification_user`).
- TTL index on `last_sent_at` (`ttl_verification_last_sent_at`), `expireAfterSeconds =
  otp_expire_minutes * 60 + otp_record_grace_seconds` (derived in `Settings.otp_record_ttl_seconds`).
  MongoDB deletes expired documents itself; there is no cleanup cron. If the TTL value changes
  across a deploy, `create_indexes()` detects the option conflict (Mongo error code 85), drops, and
  recreates the index with the new value — this is why the TTL is read from `Settings` at startup
  rather than baked into a migration.

No analytics, collection for resumes, or tracking-link collection exists yet.

## Landing collections (`packages/landing`)

### `waitlist`

Backed by `lib/waitlist/mongo.ts` + `lib/waitlist/store.ts`. Fields: `email`, `source`
(`"hero" | "closing" | "story" | "unknown"` — attribution for which CTA converted, not a user
identifier), `createdAt`. Storage adapter is chosen at runtime: the `mongodb` adapter when
`MONGODB_URI` is set, a gitignored local `.data/waitlist.json` file adapter in development with no
URI configured. Do not add a third storage backend without a reason — see root `CLAUDE.md`.

## Privacy constraint on every future collection

Before adding any field to any collection — not just `users`/analytics — check it against the
allowed-signal list in root `CLAUDE.md`: timestamp, anonymous session id, device category,
browser, OS, referrer domain, UTM params, page number, dwell time, document opened/downloaded.
**No IP address, IP-derived location, visitor/recruiter identity, or fingerprinting field is ever
acceptable**, in `model`, in a DAO projection, or in a raw Mongo document shape — this is the
layer the root doc calls out specifically: "there is no visitor-identity column to add, and none
may be introduced." When the analytics-event collection is designed, this is the first thing to
check the schema against, before indexes or query shape.
