---
name: resume-links-backend
description: Conventions for Milo's resumes/tracking-link vertical slice (packages/backend) and the reusable pattern behind it — validating a user-supplied external URL (SSRF guard), fetching it with bounded retry, and resolving a public share link that must check expiry/revocation before doing any network work. Use when touching routes/resume.py, routes/tracking_link.py, service/resume.py, service/tracking_link.py, core/_url_guard.py, core/_http_client.py, or when building any *other* feature that needs to fetch a user-supplied URL, add a retry-on-transient-failure loop, or add an expiring/revocable shareable link.
---

# Resumes, tracking links, and the fetch/retry/expiry pattern

`packages/backend/src/milo_backend`. This is the first (and, as of writing, only) feature that
fetches a user-supplied URL — read `core/_url_guard.py` and `core/_http_client.py` before adding a
second one; don't write a new SSRF guard or retry loop from scratch.

## The three reusable pieces

1. **SSRF guard at write time, not fetch time** (`core/_url_guard.py::ensure_public_url`). Called
   once, in `ResumeService.create`, before a candidate-supplied `source_url` is ever persisted.
   Rejects a non-`http(s)` scheme and resolves the host via `getaddrinfo`, rejecting any address
   that's private/loopback/link-local/multicast/reserved/unspecified. **Known gap:** it does not
   re-validate a redirect target, and `fetch_document` follows up to 3 redirects — a host that's
   public today could redirect somewhere internal later. If you reuse this guard for a feature that
   fetches more sensitively, either disable `follow_redirects` or revalidate each hop.
2. **A bare fetch primitive with a size cap, no retry** (`core/_http_client.py::fetch_document`).
   Streams the body, raises `ValueError` past `max_bytes`, raises `httpx.HTTPStatusError` on a
   terminal 4xx/5xx. Deliberately dumb — it doesn't decide what's retryable, because that's a
   business decision that belongs one layer up.
3. **Retry-with-backoff lives in `service`, as a private method** (e.g.
   `LinkService._fetch_with_retry`). Retry on `httpx.TransportError` or a `5xx`; fail immediately
   (no retry) on a `4xx` or an oversized body, since those won't change on a retry. Backoff is
   linear (`retry_backoff_seconds * attempt`), both knobs in `Settings`
   (`resume_fetch_max_retries`, `resume_fetch_retry_backoff_seconds`), never hardcoded.

## The expiring-share-link pattern

`LinkService.resolve` (`service/tracking_link.py`) is the template for any future "public link that
can expire or be revoked":

1. Look the link up by its public slug.
2. **Check revoked/expired *before* touching the network.** An expired or revoked link raises
   immediately — no fetch, no retry, no analytics event. This is the point: a dead link fails in
   microseconds, not after three retried timeouts.
3. Only then do the expensive thing (fetch the resume, in this case).
4. Record the side effect (the analytics event) best-effort — log a warning and still return the
   result if that write fails. The thing the viewer came for (seeing the resume) is the product; a
   lost analytics row is not worth failing the request.

If you add a second kind of shareable/expiring link, follow this order, not the reverse — fetching
first and checking expiry after would mean every expired link still pays for a full retry cycle.

## Layering specifics for this feature

- `ResumeService` and `LinkService` each take their DAOs + `Settings` via `__init__`, assembled in
  `dependencies/service.py::get_resume_service` / `get_link_service` — never construct a DAO in a
  route.
- `owner_id`/`resume_id`/`link_id` are stored as `ObjectId` in Mongo, surfaced as `str` everywhere
  above `dao`, matching the existing `dao/auth.py::EmailVerificationDAO` convention for `user_id`.
- `GET /l/{slug}` is unauthenticated and rate-limited (`rate_limit_resolve_link`) — it's the one
  route in this slice a stranger hits directly, and each hit costs Milo's server an outbound fetch.
- `TrackingLinkDAO.create` returns `None` on a slug collision (`DuplicateKeyError`) rather than
  raising; `LinkService.create_link` retries slug generation up to `MAX_SLUG_ATTEMPTS` times. Follow
  this "DAO returns None, service retries" shape for any other unique-slug/code generation, rather
  than checking existence first (a check-then-insert race).

## Analytics fields: the allowed-signal list is enforced here

`model/analytics_event.py::AnalyticsEvent` is the concrete worked example of root CLAUDE.md's
allowed-signal list — every field on it maps to one allowed signal, nothing else. `referrer_domain`
is parsed server-side from the `Referer` header (hostname only, via `urlsplit(...).hostname`) in
`routes/tracking_link.py`, never trusted as a client-supplied query param carrying the full URL. If
you add a new signal, check it against root CLAUDE.md's list before adding the field — that doc
calls `dao`/`model` out by name as where a visitor-identity field is most tempting to sneak in.

## Editing: resume title/URL and link expiry only

`ResumeService.update` and `LinkService.update_expiry` are the only mutations beyond create/revoke.
A resume's `title`/`source_url` are independently optional (schema rejects an empty request); a
changed `source_url` is re-validated through the same SSRF guard as creation. A link has exactly one
editable field — `expires_at` — and `TrackingLinkDAO.update_expiry` filters on `revoked_at: None`, so
revoking stays permanent even against a direct PATCH; there is no un-revoke anywhere in this slice.

## The dwell-time beacon

`POST /l/{slug}/dwell` (`LinkService.record_dwell`) is fed by `navigator.sendBeacon` from the
frontend's public `/l/[slug]` viewer, not by an authenticated caller — it's deliberately lenient
(unknown/expired/revoked slug silently no-ops) since there's no response for a beacon to act on.
Frontend has no pdf.js, so `page_number` is always `1` here — whole-document dwell time, not true
per-page attention.

## What's still missing (don't assume it exists)

No dashboard endpoint aggregates `analytics_events` yet (index `idx_event_link_occurred_at` is in
place for when one is built) — the frontend computes summaries/traffic-sources/page-engagement
client-side from the raw `GET /events` list instead. No `dao`- or `routes`-level automated tests
exist yet either — see `docs/testing.md`.
