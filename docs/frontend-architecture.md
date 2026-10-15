# Frontend architecture

Next.js 16 (App Router) product app at `packages/frontend`, package `@milo/frontend`, served on
`:3001`. This is the dashboard/product surface — distinct from `packages/landing` (marketing +
waitlist, `:3000`), which is a separate deployable with its own architecture and is not covered
here.

Stack: React 19 · TypeScript · Tailwind v4 · `@react-three/fiber`/`three` (for shared 3D components
via `components/three`, per root `CLAUDE.md`) · `axios` · `@tanstack/react-query` (server-state
fetching, incl. the session check — see Auth state) · `zustand` (client state, currently just auth)
· shared `@milo/ui` and `@milo/styles` workspace packages · `clsx` + `tailwind-merge` via the `cn()`
helper.

## Route groups

```
src/app/
├── (marketing)/        public: /, /about, /features     — own layout, no auth
├── (auth)/             /login, /register, /verify       — own layout, guest-only (see Auth state)
└── (app)/              authenticated product surface, guarded (see Auth state)
    ├── (all)/          cross-workspace views: /dashboard, /links, /logs
    └── [id]/           workspace/resume-scoped: /[id]/dashboard, /[id]/links, /[id]/logs
```

Route groups (`(marketing)`, `(auth)`, `(app)`) don't affect the URL, only which `layout.tsx`
wraps a page — each group gets its own layout tree without the URL implying it. `(app)/(all)` vs.
`(app)/[id]` is the real distinction: `(all)` is the aggregate/cross-resource view, `[id]` is a
single resource (a tracking link / resume, presumably — the backend doesn't have this resource yet,
see [backend-architecture.md](./backend-architecture.md)) scoped view. When adding a new
authenticated page, decide which of those two it belongs to before creating the route — don't add a
third pattern without checking with the user first.

`(app)/layout.tsx` wraps its children in `PrivateProvider` (see Auth state below) and is otherwise
still just the `min-h-dvh lg:pl-60` shell (room reserved for a left nav rail on desktop). `app-nav.tsx`
exists as a component but isn't wired into that layout yet — when wiring it in, confirm whether it
should live in the shared `(app)/layout.tsx` or be duplicated per sub-layout.

## Auth state

Client-side auth state is split across a few pieces, each with one job:

- **`stores/auth-store.ts`** — a Zustand store holding pure client state: `user`, `isAuthenticated`,
  `isLoading`, `error`, plus plain setters (`setUser`, `setLoading`, `setError`, `clearAuth`). No API
  calls live here — this is what `PrivateProvider`/`GuestOnlyProvider` read synchronously to decide
  whether to render or redirect.
- **`hooks/use-auth-session.ts`** — owns the actual session fetch, via TanStack Query
  (`useQuery({ queryKey: ["auth", "session"], queryFn: me, retry: false })`). `retry: false` because
  a 401 here already went through `axios.config.ts`'s own refresh-and-retry; a second layer of
  query retries would just delay knowing the visitor is logged out. An effect mirrors the query's
  result into `auth-store.ts` on every change.
- **`components/providers/auth-provider.tsx`** (`AuthProvider`) — mounted once in `app/provider.tsx`
  (wrapping the whole tree, inside `QueryClientProvider`). Calls `useAuthSession()` so the session
  check kicks off regardless of which route the visitor lands on first.
- **`components/providers/private-provider.tsx`** exports the two route guards:
  - `PrivateProvider` — wraps `(app)/layout.tsx`'s children. Redirects to `/login` once the initial
    check resolves (`isLoading` false) and there's no session; renders a loading gate until then, so
    a signed-out visitor never sees protected content, not even for a frame.
  - `GuestOnlyProvider` — wraps the `{children}` slot inside `(auth)/layout.tsx` (the form, not the
    marketing aside). Redirects an already-authenticated visitor to `/dashboard` instead of letting
    them see login/register again.

Both guards read `isAuthenticated`/`isLoading` from `auth-store.ts`, not from the query object
directly — components that need a loading/auth decision should keep reading the store, and only
`use-auth-session.ts` itself should touch the query result.

`axios.config.ts`'s 401-retry interceptor calls `useAuthStore.getState().clearAuth()` if
`POST /auth/refresh` itself fails (expired/invalid refresh token) — this is what makes `PrivateProvider`
redirect automatically on a dead session instead of leaving the UI stuck. It only clears local state;
cookie deletion is the backend's job (httpOnly, already dropped by that failed refresh response).

## Server vs. client components

Default to server components (the App Router default) for anything that doesn't need
interactivity, browser APIs, or React state — most of `(marketing)` is server-rendered. Mark a
component `"use client"` only once it actually needs `useState`/`useId`/event handlers, as
`auth-form.tsx` does. Don't blanket-mark a directory client; decide file by file.

## Talking to the backend

All backend I/O goes through `src/lib/`:

- **`axios.config.ts`** — the single `api` axios instance. `withCredentials: true` (cookies, not
  bearer tokens, carry auth — see [backend-architecture.md](./backend-architecture.md)).
  `baseURL`/`timeout` come from `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_TIMEOUT_MS`, never
  hardcoded. A response interceptor auto-retries exactly once on a 401 by calling
  `POST /auth/refresh` first (coalesced via a shared in-flight `refreshing` promise, so concurrent
  401s don't trigger N refresh calls). A module-augmented `ignoreRefresh?: boolean` field on
  `AxiosRequestConfig` opts a call out of this entirely — the refresh call itself sets it on its own
  request (replacing a more brittle `config.url !== "/auth/refresh"` check), and every
  session-independent `auth.api.ts` call (`register`, `login`, `startVerification`,
  `verificationStatus`, `verifyOtp`, `logout`) sets it too, since a 401 from any of them is a real
  domain error, never a stale access token. `me()` is the one call that doesn't set it, so it's the
  one that benefits from the refresh-and-retry. If the refresh call fails, the interceptor clears
  the Zustand auth store (see Auth state below) so the UI reacts immediately instead of staying in a
  stale "logged in" state until the next guarded navigation.
- **`auth.api.ts`** — typed wrapper functions (`register`, `login`, `logout`, `me`,
  `startVerification`, `verificationStatus`, `verifyOtp`) over the `/auth/*` endpoints in
  [api-design.md](./api-design.md), plus `getAuthErrorMessage()` for rendering the backend's
  `{ code, msg }` shape. This is the pattern for any new backend resource: one `<resource>.api.ts`
  file exporting typed functions that call `api`, never a raw `fetch`/`axios` call scattered in a
  component.

`auth-form.tsx` calls `register`/`login` through `hooks/use-auth-mutations.ts`
(`useLoginMutation`/`useRegisterMutation`, thin `useMutation` wrappers over `auth.api.ts`).
`useLoginMutation` writes the returned user straight into `auth-store.ts` on success (and seeds the
`useAuthSession` query cache so it doesn't immediately re-fetch `/auth/me`) — it does not redirect
itself, `GuestOnlyProvider`'s own effect picks up the new `isAuthenticated` and navigates to
`/dashboard`. `useRegisterMutation` doesn't touch the store, since registering doesn't establish a
session; the backend requires OTP verification first.

**The OTP step lives at `/verify?email=...`** (`app/(auth)/verify/page.tsx`), not as inline state in
`auth-form.tsx`. `auth-form.tsx` only ever does one thing on a path that needs verification:
`router.push`\`/verify?email=\${email}\`. Three cases route there: register succeeding, register
failing with `resend_too_soon` (a code is already pending — e.g. a previous attempt), and login
failing with `email_not_verified`. The `/verify` page's client child, `verify-status.tsx`, is the
one place that actually resolves what to show: `useResolveVerificationMutation`
(`use-auth-mutations.ts`) calls `verificationStatus` first — cheap, side-effect-free, and the thing
that gives the OTP step a *live* resend cooldown on every mount, including a hard refresh, instead
of a client-only countdown a refresh would reset — and only falls through to `startVerification`
(which sends another email) when there's genuinely no code pending yet. An already-verified email is
reported as such and redirects to `/login` rather than hitting `EmailAlreadyVerified`. The actual
code-entry UI (`otp-form.tsx`) is unchanged by any of this — it only ever renders once a pending
challenge (email + resend cooldown) is known, regardless of whether that came from registering or
from `verify-status.tsx`'s own resolution.

## Components

See [component-building.md](./component-building.md) for the conventions. Current inventory:

- `components/ui/` — generic, app-agnostic primitives. Currently just `button.tsx` (variant/size
  maps, polymorphic `href` → renders a `next/link` instead of a `<button>`).
- `components/app/` — product-surface components: `app-nav.tsx`, `auth-form.tsx`, `otp-form.tsx`
  (the code-entry UI), `verify-status.tsx` (the `/verify` page's client child — resolves and
  branches on verification status, see Auth state above), `empty-state.tsx`, `page-header.tsx`,
  `milo-mark.tsx` (the wordmark/logo).
- `components/providers/` — `auth-provider.tsx`, `private-provider.tsx` (see Auth state above).
- `components/marketing/` — this package also has its own marketing component tree (separate from
  `packages/landing`'s), including `raw-story.tsx`/`raw-story-scene.tsx` (a 3D scene — belongs under
  the `three-js-scenes` skill's conventions when touched).
- `hooks/use-media-query.ts`, `hooks/use-auth-session.ts`, `hooks/use-auth-mutations.ts` — shared
  hooks.
- `stores/auth-store.ts` — the one Zustand store so far; see Auth state above before adding a
  second one, most new client state should live here or in a component, not in a new store.

## Styling

Tailwind v4 utility classes, composed through `cn()` (`clsx` + `tailwind-merge`) so a consumer's
`className` prop can override a component's defaults without specificity fights — every component
that accepts `className` should merge it this way, not append it. Design tokens referenced in
classnames (`signal-400`, `ink-950`, `sand-300`, `clay-400`, etc.) come from `@milo/styles`; don't
invent new token names inline — add them to `@milo/styles` if a new one is genuinely needed.

## AGENTS.md note

`packages/frontend/CLAUDE.md` is just `@AGENTS.md`, and `AGENTS.md` is Next.js 16's own
auto-generated breaking-changes notice (regenerated by `next dev`) — read it, and read
`node_modules/next/dist/docs/` before writing App Router code that assumes an older Next.js API.
It is not product documentation and isn't maintained by this team.
