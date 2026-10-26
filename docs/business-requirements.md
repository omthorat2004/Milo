# Business requirements

## Product

Milo is privacy-conscious resume analytics. A candidate hosts their resume PDF wherever it already
lives (Google Drive, Notion, personal site, etc.), gives Milo the public URL, and shares a Milo
tracking link instead of the raw URL. Milo answers _"how is my resume performing?"_ — views, unique
viewers, downloads, which pages held attention — and never _"who is looking at it?"_.

> Your resume stays where it already lives. Milo provides the analytics layer.

## Who it's for

Job seekers who want engagement signal on a resume they're actively sending out, without turning
their job search into a surveillance tool aimed at the people reviewing it. The explicit contrast is
with products that try to identify or de-anonymize recruiters/visitors — Milo refuses to build that,
on principle, not just as a current scope limit.

## Non-negotiable product rules

These apply to every feature, forever, not just the current scope. See root `CLAUDE.md` for the
canonical version; this section exists so a business/product conversation about a new feature can
be checked against it without opening the engineering doc.

**Never implement, suggest, or leave a TODO for:**
- IP display, IP-derived location, city/country, GPS
- recruiter/visitor identification, LinkedIn or email resolution
- device fingerprinting, cross-site tracking, camera/mic access, browser history

**Allowed signals only:** timestamp, anonymous session id, device category, browser, OS, referrer
domain, UTM params, page number, dwell time, document opened, document downloaded.

**Marketing copy must never claim Milo can identify a viewer.** This is a legal/trust line, not a
style note — overclaiming here is the kind of claim that makes the whole privacy premise look
dishonest.

If a feature request can only be satisfied by crossing one of the lines above, the answer is no,
not "add it behind a flag" or "make it opt-in." Flag it to the user instead of implementing it.

## Current state (what's actually built)

Treat this section as higher-trust than the top-level `README.md` "Status" section, which currently
undersells what exists — it still describes `frontend`/`backend` as empty scaffolds. As of this
writing:

| Area | State |
| --- | --- |
| `packages/landing` | Complete, deployed. Marketing site + waitlist signup (`POST /api/waitlist`), MongoDB-backed. |
| `packages/backend` | Auth vertical slice (register, email verification (OTP), login, refresh, logout, `/me`) plus resumes, shareable tracking links, link resolution (fetch-with-retry, expiry/revocation checks, anonymous view/download events), editing (`PATCH /resumes/{id}`, `PATCH /links/{id}` for expiry), and a dwell-time beacon (`POST /l/{slug}/dwell`) are implemented end-to-end. 31 service-layer unit tests exist (`packages/backend/tests/`). See [backend-architecture.md](./backend-architecture.md) and [testing.md](./testing.md). No dashboard/aggregation endpoint reads the analytics events yet — the frontend computes aggregates client-side from the raw event list. |
| `packages/frontend` | App Router shell exists for marketing/auth/app route groups, including a `[id]` (tracking-link-scoped) segment. Auth is fully live end-to-end: the API client (`lib/auth.api.ts`, `lib/axios.config.ts`), client-side session state/route guards (Zustand store + TanStack Query + `PrivateProvider`/`GuestOnlyProvider`), and the register/login/OTP-verify flow (`AuthForm` → `/verify?email=...` → `OtpForm`) all work through the real UI. Resumes and tracking links are also live end-to-end against the real backend (`lib/resumes.api.ts`, `lib/links.api.ts`, TanStack Query hooks in `hooks/use-resume-*`/`hooks/use-link-*`) — the earlier in-memory mock store is gone. See [frontend-architecture.md](./frontend-architecture.md). |

## Near-term product surface (not yet built)

- **A backend-computed dashboard/aggregation endpoint**: `(app)/[id]/dashboard`, `/links`, `/logs`
  are live, but they call `GET /events` / `GET /links/{id}/events` for the raw event list and
  compute summary numbers, traffic sources, and page engagement client-side
  (`lib/links-analytics.ts`). The backend collection and index this would eventually query already
  exist (`analytics_events`/`idx_event_link_occurred_at`, see
  [database-schema.md](./database-schema.md)) — only a server-side aggregation query and route are
  missing, which matters once the event volume for a popular link outgrows "fetch everything and
  reduce in the browser."
- **True per-PDF-page dwell tracking**: the dwell-time beacon exists (`POST /l/{slug}/dwell`, fed by
  `components/app/resume-viewer.tsx` via `navigator.sendBeacon`), but the frontend has no
  in-browser PDF renderer (no pdf.js) — it's whole-document dwell time, `page_number` always `1`,
  not real per-page attention.

Resumes, tracking links, and link resolution (including fetch-with-retry and expiry/revocation
checks) are now built — see the `packages/backend` row above and
[backend-architecture.md](./backend-architecture.md).

## Licensing

Source available under the **Elastic License 2.0** — not MIT, not OSI "open source." Third parties
may self-host but may not run Milo as a service for others. Any new dependency must be compatible
with redistribution under these terms (prefer MIT/Apache-2.0/BSD/ISC; raise GPL/AGPL dependencies
before adding them).
