# Database schema

Milo uses MongoDB throughout, `packages/backend` (product data, via Motor) and
`packages/landing` (waitlist, via the Node `mongodb` driver) connect to **the same cluster**, by
design (see root `CLAUDE.md`): "the same cluster the FastAPI backend will use, so there is nothing
to migrate later." They are separate logical databases/collections, not shared tables, but there is
intentionally only one cluster to operate.

There is no ORM and no migration framework. Indexes are created idempotently at process startup
(`ensure_indexes()` in the backend, called from the FastAPI `lifespan`), a schema change means
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

**Indexes:** unique on `email` (`uniq_user_email`), this is the only uniqueness constraint
enforced at the DB layer; `AuthService.register` additionally special-cases an *unverified*
existing row as "resend the code," not a conflict (see
[backend-architecture.md](./backend-architecture.md)).

### `email_verifications`

Backed by `model.EmailVerification` (`dao/auth.py::EmailVerificationDAO`). One document per user,
upserted, not appended, so there is never more than one pending/verified record per `user_id`.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `user_id` | ObjectId | stored as ObjectId, surfaced to the app as `str` |
| `code_hash` | string | hashed OTP (`core._security.hash_otp`), the plaintext code is never persisted |
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
  recreates the index with the new value, this is why the TTL is read from `Settings` at startup
  rather than baked into a migration.

### `resumes`

Backed by `model.Resume` (`dao/resume.py::ResumeDAO`).

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `owner_id` | ObjectId | the `users._id` this resume belongs to |
| `title` | string | |
| `source_url` | string | the candidate's externally-hosted PDF URL; validated against the SSRF guard (`core._url_guard.ensure_public_url`) before being persisted, never fetched or re-validated at write time |
| `created_at` | datetime (UTC) | |
| `updated_at` | datetime (UTC) | |

**Indexes:** non-unique on `owner_id` (`idx_resume_owner`), a candidate can have many resumes.

### `tracking_links`

Backed by `model.TrackingLink` (`dao/tracking_link.py::TrackingLinkDAO`). One document per shareable
link; a resume can have several (e.g. one per job application).

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `resume_id` | ObjectId | |
| `owner_id` | ObjectId | denormalized from the resume, so ownership checks on a link don't need a join |
| `slug` | string | the public path segment, `/l/{slug}`; URL-safe, generated with `secrets.token_urlsafe` |
| `created_at` | datetime (UTC) | |
| `expires_at` | datetime (UTC) \| null | `null` means no expiry; checked in `LinkService.resolve` *before* any document fetch |
| `revoked_at` | datetime (UTC) \| null | set by `DELETE /links/{id}`; a revoked link fails the same way as an expired one from the viewer's perspective, but with a distinct `code` |

**Indexes:**
- Unique on `slug` (`uniq_tracking_link_slug`).
- Non-unique on `resume_id` (`idx_tracking_link_resume`).

### `analytics_events`

Backed by `model.AnalyticsEvent` (`dao/analytics_event.py::AnalyticsEventDAO`). Appended, never
updated, one document per link open. This is the collection the privacy rule below bites hardest
on.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `link_id` | ObjectId | |
| `resume_id` | ObjectId | denormalized from the link, so a dashboard query doesn't need a join to group by resume |
| `event_type` | `"view" \| "download"` | |
| `occurred_at` | datetime (UTC) | |
| `session_id` | string \| null | anonymous, client-supplied; not tied to any account |
| `device_category`, `browser`, `os` | string \| null | |
| `referrer_domain` | string \| null | hostname only, parsed server-side from the `Referer` header, the full URL (which can carry query-string identity) is never stored |
| `utm_source`, `utm_medium`, `utm_campaign` | string \| null | |
| `page_number` | int \| null | |
| `dwell_time_seconds` | float \| null | not yet populated by any route, reserved for a future "viewer left the tab open" beacon |

**Indexes:** compound on `(link_id, occurred_at desc)` (`idx_event_link_occurred_at`), for the
eventual per-link dashboard query.

**No IP, geo, or visitor-identity field exists on this model and none may be added**, this is the
collection root `CLAUDE.md` calls out by name as the one with "no visitor-identity column to add."

## Landing collections (`packages/landing`)

### `waitlist`

Backed by `lib/waitlist/mongo.ts` + `lib/waitlist/store.ts`. Fields: `email`, `source`
(`"hero" | "closing" | "story" | "unknown"`, attribution for which CTA converted, not a user
identifier), `createdAt`. Storage adapter is chosen at runtime: the `mongodb` adapter when
`MONGODB_URI` is set, a gitignored local `.data/waitlist.json` file adapter in development with no
URI configured. Do not add a third storage backend without a reason, see root `CLAUDE.md`.

## Privacy constraint on every future collection

Before adding any field to any collection, not just `users`/analytics, check it against the
allowed-signal list in root `CLAUDE.md`: timestamp, anonymous session id, device category,
browser, OS, referrer domain, UTM params, page number, dwell time, document opened/downloaded.
**No IP address, IP-derived location, visitor/recruiter identity, or fingerprinting field is ever
acceptable**, in `model`, in a DAO projection, or in a raw Mongo document shape, this is the
layer the root doc calls out specifically: "there is no visitor-identity column to add, and none
may be introduced." When the analytics-event collection is designed, this is the first thing to
check the schema against, before indexes or query shape.
