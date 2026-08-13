# Milo

Privacy-conscious **resume analytics**.

You host your resume PDF wherever it already lives. Milo gives you a tracking link to share
instead, and tells you how that document performed — views, unique viewers, downloads, which pages
held attention. It never tells you _who_ read it, because it never collects that.

> Your resume stays where it already lives. Milo provides the analytics layer.

## Status

**Only the landing page is built.** It is production-ready and deployable today, with waitlist
signups persisted to MongoDB. `frontend` and `backend` are scaffolds: their toolchains, CI and task
runner all work, but no product code has been written in them yet.

## Repository layout

```
milo/
├── Makefile               Task runner across both languages. Start here.
├── .github/workflows/     CI: a JavaScript job and a Python job
├── .claude/               Claude Code settings
├── CLAUDE.md              Product rules and conventions for AI-assisted work
├── package.json           npm workspaces manifest for the JavaScript packages
├── .prettierrc .editorconfig .gitignore .nvmrc
└── packages/
    ├── landing/           Next.js marketing site + waitlist   (built, deployable)
    ├── frontend/          Next.js product app                 (scaffold)
    └── backend/           FastAPI service                     (scaffold)
```

| Package | Purpose | Stack | State |
| --- | --- | --- | --- |
| `packages/landing` | Marketing site, waitlist | Next.js, Three.js, MongoDB | Complete |
| `packages/frontend` | Dashboard, PDF viewer, tracking links | Next.js, TypeScript | Scaffold |
| `packages/backend` | Auth, events, analytics API | FastAPI, Poetry, MongoDB | Scaffold |

### Why the root looks the way it does

The repository is polyglot, so the root is deliberately split by owner:

- **`Makefile` is the language-neutral entry point.** `make lint` runs ESLint *and* Ruff. Use make
  when you want "everything", npm or poetry when you want one language.
- **`package.json` and `package-lock.json` are the JavaScript workspace manifest.** npm workspaces
  requires them at the root; that is what hoists a single `node_modules` and lets `landing` and
  `frontend` share dependencies. They describe the JS packages, not the repository.
- **Python tooling lives entirely in `packages/backend`** (`pyproject.toml`, `poetry.lock`,
  `.python-version`). Nothing Python-related sits at the root.
- **Prettier never touches `packages/backend`.** It cannot parse `.py`, and left unignored it would
  still rewrite that package's JSON and YAML to JavaScript conventions. Ruff formats it instead.

## Landing package

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Three.js via react-three-fiber ·
Zod.

The centrepiece is a scroll-driven WebGL story in five acts: the resume where it lives → sent and
lost → shared through one Milo link → opened inside the viewer, pulsing one signal per open and one
per download → the pattern the candidate finally sees. It falls back to a static composition when
the visitor prefers reduced motion or has no WebGL.

### Develop

```bash
make install         # npm ci + poetry install
make dev-landing     # marketing site   http://localhost:3000
make dev-frontend    # product app      http://localhost:3001
make dev-backend     # FastAPI          http://localhost:8000
```

`make help` lists every target.

### Verify

```bash
make fmt-check       # prettier + ruff format --check
make lint            # eslint + ruff check
make typecheck       # tsc + mypy
make test            # pytest
make build           # next build, every JS workspace
```

The JavaScript half is also reachable directly, which is what CI and Vercel use:

```bash
npm run lint         # all workspaces
npm run build        # all workspaces
npm run build:landing
```

## Waitlist

`POST /api/waitlist` — Zod-validated, rate limited, honeypot-protected. Storage is behind an
adapter in `lib/waitlist/store.ts`, chosen at runtime:

| Condition | Adapter | Behaviour |
| --- | --- | --- |
| `MONGODB_URI` set | `mongodb` | Inserts into the `waitlist` collection |
| development, no URI | `file` | Appends to `.data/waitlist.json` (gitignored) |
| production, no URI | `log` | Logs an error and writes one line per signup — a misconfiguration, not a supported mode |

MongoDB is the store, and it is the same database the FastAPI backend will use, so nothing has to
be migrated when `packages/api` lands. Duplicate signups are prevented by a unique index on
`email`, created on first use — a database-level guarantee rather than a read-then-write check that
would race between concurrent requests.

Emails are lowercased and trimmed by the Zod schema before they reach the store, so
`Foo@Example.com` and `foo@example.com` are one person.

`GET /api/waitlist` returns the signup count and requires `WAITLIST_ADMIN_TOKEN` as a bearer token.
It 404s otherwise. The count is deliberately not shown on the page: early numbers are weak social
proof. Flip `featureFlags.showWaitlistCount` in `lib/site.ts` when that changes.

Emails are never returned over HTTP by any endpoint.

## Deploying to Vercel

1. Import the repository.
2. Set **Root Directory** to `packages/landing`.
3. Framework preset: Next.js. Build and install commands are detected.
4. Environment variables (Production):
   - `MONGODB_URI` — the Atlas connection string. **Required**, or signups are not persisted.
   - `MONGODB_DB` — defaults to `milo`.
   - `NEXT_PUBLIC_SITE_URL` — the deployment origin, e.g. `https://milo-xxxx.vercel.app`. Drives
     canonical URLs, `sitemap.xml`, and Open Graph tags, so a wrong value breaks link previews.
   - `WAITLIST_ADMIN_TOKEN` — any long random string, to read the signup count.
   - `IP_HASH_SALT` — optional salt for the rate-limit hash.

In MongoDB Atlas, under **Network Access**, allow `0.0.0.0/0`. Vercel functions do not have stable
egress IPs on the Hobby plan, so an IP allowlist will silently reject connections.

Check signups landed:

```bash
curl https://<deployment-url>/api/waitlist -H "Authorization: Bearer $WAITLIST_ADMIN_TOKEN"
```

### Branding on the deployment

The tab icon comes from `app/icon.svg`, the home-screen icon from `app/apple-icon.tsx`, and the
link preview card — the image LinkedIn renders when you post the URL — from
`app/opengraph-image.tsx`. All three are Milo's own mark; nothing falls back to a platform default.
After deploying, re-scrape the URL with LinkedIn's Post Inspector so it picks up the card.

## Privacy rules

These are product constraints, not preferences. Milo does not implement, and will not accept
contributions implementing: IP display or IP-derived location, GPS, visitor identification,
LinkedIn or email resolution, device fingerprinting, cross-site tracking, camera/microphone access,
or browser-history collection.

Collected: timestamp, anonymous per-resume session ID, device category, browser, OS, referrer
domain, UTM parameters, page number, dwell time, opened, downloaded. That is the complete list, and
`/privacy` renders it from the same source as the landing page so the two cannot drift.

## License

Milo is **source available** under the [Elastic License 2.0](LICENSE), not open source in the OSI
sense. The code is public so that the privacy claims above can be audited by anyone: a product
whose entire pitch is "we do not collect that" should be inspectable.

In plain English, and the [LICENSE](LICENSE) file governs, not this summary:

**You may** read the code, fork it, modify it, and run it yourself, including inside a company for
internal use.

**You may not** provide Milo to third parties as a hosted or managed service, where that service
gives users a substantial set of Milo's features. In other words, deploying your own copy for
yourself is fine. Launching it as a product for other people is not.

**You may not** remove or obscure the copyright and license notices, and if you distribute a
modified copy you must say prominently that you changed it.

Contributions are welcome under these same terms. If you want a different arrangement, ask.

Milo is built on third-party open source software whose licenses require their notices to be
retained. Those are reproduced in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Milo's own
license does not apply to those components.
