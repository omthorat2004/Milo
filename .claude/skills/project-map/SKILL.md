---
name: project-map
description: Where things actually live in the Milo repo — which package owns what, and a full file-by-file map of where auth is implemented across frontend and backend. Use when you need to find where a feature lives before editing it, when onboarding to an area of the codebase you haven't touched yet, or any time you're about to ask "where is X handled."
---

# Project map

Root `CLAUDE.md` has the one-paragraph version of this. This skill is the concrete, file-by-file
version — kept in sync with what's actually in the tree, not what's planned. If a path listed here
doesn't exist, trust the tree over this file and fix this file in the same change.

## Packages

| Package | What it is | Port |
| --- | --- | --- |
| `packages/landing` | Next.js marketing site + waitlist signup. Complete, deployed, separate from the product app. | `:3000` |
| `packages/frontend` | Next.js product app — the dashboard, auth, and (eventually) the resume/link/analytics surface. | `:3001` |
| `packages/backend` | FastAPI service, Poetry-managed. Currently just the `/auth/*` vertical slice. | `:8000` |
| `packages/ui` | Shared, buildless TypeScript source (`@milo/ui`) — theme engine, shipping-log, generic utils. Consumed by both `landing` and `frontend` via `transpilePackages`. | — |
| `packages/styles` | Shared Tailwind v4 design tokens (`@milo/styles`), imported by every app that renders UI. | — |

See `docs/frontend-architecture.md`, `docs/backend-architecture.md`, and `docs/api-design.md` for
how each package is layered internally — this file is about *where*, those are about *how*.

## Where auth lives

Auth is the one feature implemented end-to-end today, spanning both `frontend` and `backend`. This
is the full map of it, grouped by what each file actually does.

### Backend (`packages/backend/src/milo_backend`)

| File | Role |
| --- | --- |
| `routes/auth.py` | The `/auth/*` FastAPI router — `register`, `verify-email/start`, `verify-email/status`, `verify-otp`, `login`, `refresh`, `logout`, `me`. Wires cookies via `_authenticate()`, never touches the DAO directly. |
| `service/auth.py` | `AuthService` — all the actual business rules (password/OTP checks, token issuance, verification-attempt limits, resend cooldowns). Pure Python, no `fastapi` or Mongo imports — see `docs/backend-architecture.md`. |
| `dao/auth.py` | `UserDAO`, `EmailVerificationDAO` — the only code that touches Mongo for auth. |
| `model/user.py`, `model/email_verification.py` | The two persisted domain models. |
| `schemas/auth.py` | Every `/auth/*` request/response Pydantic model — the contract summarized in `docs/api-design.md`. |
| `exception/auth.py` | Typed auth failures (`InvalidCredentials`, `EmailNotVerified`, `TooManyVerificationAttempts`, ...), each owning its own HTTP status. |
| `core/_security.py` | Password hashing (Argon2), OTP generation/hashing (HMAC-SHA256), JWT create/decode. |
| `core/_cookies.py` | Sets/clears the two httpOnly auth cookies. |
| `core/_email.py` | Generic `send_email()` — SMTP or console delivery depending on environment. |
| `core/_email_templates.py` | The actual verification-code email copy/markup (text + branded HTML), used only by `service/auth.py`. |
| `core/_rate_limit.py` | `client_key()` (privacy-safe hashed+salted IP) and the shared `limiter` instance — see `docs/api-design.md`'s "Rate limiting" section for which routes use which limit. |
| `core/_settings.py` | Every auth-related setting: JWT/OTP secrets, token lifetimes, password bounds, rate limits, cookie flags, production-hardening validators. |
| `dependencies/service.py` | `CurrentUser`/`AuthServiceDep` — how a route gets an authenticated user or a constructed `AuthService` without building either itself. |

### Frontend (`packages/frontend/src`)

| File | Role |
| --- | --- |
| `lib/auth.api.ts` | Typed wrapper functions over every `/auth/*` endpoint (`register`, `login`, `logout`, `me`, `startVerification`, `verificationStatus`, `verifyOtp`), plus `getAuthErrorMessage()` for rendering the backend's `{code, msg}` shape. The only file that should ever call `/auth/*` directly. |
| `lib/axios.config.ts` | The one `api` axios instance. 401 → refresh-and-retry interceptor (coalesced, `ignoreRefresh`-aware — see its own comments), and clears the Zustand auth store if the refresh itself fails. |
| `stores/auth-store.ts` | Zustand store: `user`, `isAuthenticated`, `isLoading`, `error`, plus plain setters. Pure client state, no API calls. |
| `hooks/use-auth-session.ts` | TanStack Query session check (`GET /auth/me`) that mirrors its result into `auth-store.ts`. |
| `hooks/use-auth-mutations.ts` | TanStack Query mutations for `register`/`login`/`verifyOtp`/resend-OTP, wired to `auth.api.ts`; login and verify-otp also adopt the session into `auth-store.ts` on success. `useResolveVerificationMutation` is what `/verify` resolves against — checks `verificationStatus` first, only calls `startVerification` when there's genuinely no code pending. |
| `components/providers/auth-provider.tsx` | `AuthProvider` — mounted once at the root, kicks off `useAuthSession()`. |
| `components/providers/private-provider.tsx` | `PrivateProvider` (guards `(app)`, redirects signed-out visitors to `/login`) and `GuestOnlyProvider` (guards `(auth)`, redirects signed-in visitors to `/dashboard`) — both client-side only, no `middleware.ts` yet. |
| `components/app/auth-form.tsx` | The login/register form. On register success, register failing with `resend_too_soon`, or login failing with `email_not_verified`, it just navigates to `/verify?email=...` — it holds no OTP state itself. |
| `components/app/verify-status.tsx` | The `/verify` page's client child. Resolves live via `useResolveVerificationMutation` on every mount (including a refresh, so the resend cooldown is always current) and renders the right thing for pending/verified/unknown. |
| `components/app/otp-form.tsx` | The actual code-entry UI — code input, verify, resend-with-cooldown. Dumb: just takes an email + cooldown and renders, doesn't know how it got there. |
| `app/provider.tsx` | Composition root for client providers — wraps the tree in `QueryClientProvider` then `AuthProvider`. |
| `app/(app)/layout.tsx` | Wraps its children in `PrivateProvider`. |
| `app/(auth)/layout.tsx` | Wraps the login/register/verify slot in `GuestOnlyProvider`. |
| `app/(auth)/verify/page.tsx` | The `/verify` route — server component, reads `?email=` via the generated `PageProps<"/verify">`, renders static copy + `verify-status.tsx`. |

Full narrative of how these pieces fit together (not just the file list) is in
`docs/frontend-architecture.md`'s "Auth state" section — read that before changing how session
state flows, this file only tells you where to look.

## Public pages: sitemap & robots

`packages/landing/app/sitemap.ts` and `packages/landing/app/robots.ts` are the only sitemap/robots
files in the repo — `packages/frontend` has none, and shouldn't: everything under `(app)` is
authenticated product surface, not something search engines should index. See the `seo` skill for
how to maintain these and the rest of `packages/landing`'s metadata/discoverability surface.

## Everything else (non-auth)

Resumes and tracking links are implemented end-to-end, frontend and backend. Backend:
`routes/resume.py` + `routes/tracking_link.py` -> `service/resume.py` + `service/tracking_link.py`
(the `LinkOverview` DTO denormalizes resume title/URL onto a link listing) -> `dao/resume.py` +
`dao/tracking_link.py` + `dao/analytics_event.py` -> MongoDB (`resumes`, `tracking_links`,
`analytics_events` collections). `core/_url_guard.py` (SSRF guard) and `core/_http_client.py`
(bounded streaming fetch) back the resume-URL validation and `GET /l/{slug}` resolution — see
[backend-architecture.md](../../../docs/backend-architecture.md). Frontend: `lib/resumes.api.ts` +
`lib/links.api.ts` (typed wrappers, mirroring `lib/auth.api.ts`'s pattern), `hooks/use-resume-queries.ts`
+ `hooks/use-link-queries.ts` + `hooks/use-link-mutations.ts` + `hooks/use-resume-mutations.ts`
(TanStack Query, mirroring `hooks/use-auth-mutations.ts`), consumed by `(app)/(all)/dashboard|links|logs`
and the `[id]`-scoped equivalents plus `(all)/links/new`. The old in-memory mock
(`stores/links-store.ts`) is gone — don't look for it. Editing exists (`PATCH /resumes/{id}`,
`PATCH /links/{id}` for expiry only — wired in `components/app/link-settings.tsx`), and the
dwell-time beacon is live end-to-end: `app/l/[slug]/page.tsx` + `components/app/resume-viewer.tsx`
is the public, unauthenticated page a tracking link actually resolves to, sending
`POST /l/{slug}/dwell` via `navigator.sendBeacon` on tab-hide/unload. Not yet built: a
dashboard/aggregation route beyond the raw `GET /events`/`GET /links/{id}/events` listing (the
frontend computes aggregates client-side from the raw list today), and true per-PDF-page dwell
tracking (no pdf.js — `page_number` is always `1`, this is whole-document dwell time).

`packages/ui/src/shipping-log/` is the public "build in the open" changelog data (`/path` on both
`landing` and `frontend`) — see the `shipping-log-writer` subagent for how/when to update it.
`packages/ui/src/theme/` is the light/dark theme engine — see the `theming` skill.
