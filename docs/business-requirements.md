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
| `packages/backend` | Auth vertical slice is implemented end-to-end: register, email verification (OTP), login, refresh, logout, `/me`. See [backend-architecture.md](./backend-architecture.md). No resume, tracking-link, or analytics-event features exist yet. |
| `packages/frontend` | App Router shell exists for marketing/auth/app route groups, including a `[id]` workspace-scoped segment. The auth *API client* (`lib/auth.api.ts`, `lib/axios.config.ts`) is wired to the backend, client-side session state/route guards are live (Zustand store + TanStack Query session check + `PrivateProvider`/`GuestOnlyProvider`), and `AuthForm` now calls `register`/`login` for real via `hooks/use-auth-mutations.ts` — see [frontend-architecture.md](./frontend-architecture.md). Login fully works end-to-end; register does not, since there's no OTP-entry page yet to complete the backend's required verification step. |

## Near-term product surface (not yet built)

Inferred from the repository layout and README, not yet implemented — treat as directional, confirm
with the user before building:

- **Resumes**: a candidate registers a resume by URL (the PDF stays hosted externally; Milo never
  stores the file itself — consistent with "resume stays where it already lives").
- **Tracking links**: a generated Milo link per resume that proxies/redirects to the external URL
  while recording an analytics event.
- **Analytics events**: view/download events scoped to a tracking link, restricted to the allowed
  signal list above. The `(app)/[id]/dashboard`, `/links`, `/logs` routes in the frontend scaffold
  are the planned surface for this (dashboard = aggregate view, links = manage tracking links, logs
  = raw event history).
- **Dashboard**: aggregated analytics per resume/link (view counts, referrer breakdown, dwell time),
  privacy rules applied at the query layer in `service`, not bolted on in the UI.

## Licensing

Source available under the **Elastic License 2.0** — not MIT, not OSI "open source." Third parties
may self-host but may not run Milo as a service for others. Any new dependency must be compatible
with redistribution under these terms (prefer MIT/Apache-2.0/BSD/ISC; raise GPL/AGPL dependencies
before adding them).
