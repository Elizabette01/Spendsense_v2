# SpendSense authentication: file guide

This guide is a map of every file that takes part in signing users up, signing them in, keeping them signed in and signing them out, plus the landing page that leads into it. Each file has one entry, written from reading the code as it is on the `feat/landing-and-auth-pages` branch. Entries are grouped from the bottom up: configuration first, then the shared library, the auth feature logic, the pages and components, and finally the database tables. "Used by" lists come from searching the codebase for imports, so they show real connections. If you want the big picture first, jump to [How it all connects](#how-it-all-connects) at the end, then come back to the files.

## Contents

**Config and entry points**
- [`src/auth.config.ts`](#srcauthconfigts)
- [`src/auth.ts`](#srcauthts)
- [`src/proxy.ts`](#srcproxyts)
- [`src/types/next-auth.d.ts`](#srctypesnext-authdts)
- [`src/app/api/auth/[...nextauth]/route.ts`](#srcappapiauthnextauthroutets)
- [`next.config.ts` (auth-related parts)](#nextconfigts-auth-related-parts)

**Library (`src/lib/`)**
- [`src/lib/db.ts`](#srclibdbts)
- [`src/lib/password-rules.ts`](#srclibpassword-rulests)
- [`src/lib/password.ts`](#srclibpasswordts)
- [`src/lib/rate-limit.ts`](#srclibrate-limitts)
- [`src/lib/tokens.ts`](#srclibtokensts)
- [`src/lib/email.ts`](#srclibemailts)
- [`src/lib/request.ts`](#srclibrequestts)
- [`src/lib/activity.ts`](#srclibactivityts)

**Feature logic (`src/features/auth/`)**
- [`src/features/auth/schemas.ts`](#srcfeaturesauthschemasts)
- [`src/features/auth/redirect.ts`](#srcfeaturesauthredirectts)
- [`src/features/auth/credentials.ts`](#srcfeaturesauthcredentialsts)
- [`src/features/auth/activity-tracker.tsx`](#srcfeaturesauthactivity-trackertsx)
- [Server actions (`src/features/auth/actions/`)](#server-actions-srcfeaturesauthactions)

**UI**
- [Shared UI primitives (`src/components/ui/`)](#shared-ui-primitives-srccomponentsui)
- [Shared layout (`src/components/layout/`)](#shared-layout-srccomponentslayout)
- [Auth components (`src/features/auth/components/`)](#auth-components-srcfeaturesauthcomponents)
- [Auth pages (`src/app/(auth)/`)](#auth-pages-srcappauth)
- [App area (`src/app/(app)/`)](#app-area-srcappapp)
- [Landing page (`src/app/(marketing)/` and `src/features/marketing/`)](#landing-page-srcappmarketing-and-srcfeaturesmarketing)
- [Images (`public/images/auth/`)](#images-publicimagesauth)

**Database**
- [Auth models in `prisma/schema.prisma`](#auth-models-in-prismaschemaprisma)

**Pictures**
- [How it all connects](#how-it-all-connects)

---

## Config and entry points

### `src/auth.config.ts`

**What it does:** The "light" half of the Auth.js configuration: the settings that don't need the database. It turns on Google sign-in, says sessions are JWTs that last 7 days, points Auth.js's own sign-in and error pages at `/login`, and copies the user's id and role from the token into the session object the app reads. It's kept separate so the proxy can use it without pulling in Prisma.

**Runs on:** server only (imported by the proxy and by `auth.ts`). Not marked `server-only`, but nothing in it would work in a browser.

**Exports:**
- `authConfig`: the shared settings object (`trustHost`, `pages`, `providers`, `session`, `callbacks.session`), spread into both Auth.js instances.

**Depends on (imports):**
- Internal: none.
- Packages: `next-auth` (the `NextAuthConfig` type), `next-auth/providers/google` (Google sign-in).
- Environment variables read: `AUTH_TRUST_HOST` directly. Auth.js itself also reads `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` behind the scenes.

**Used by (imported by):**
- `src/auth.ts` (spreads it into the full configuration)
- `src/proxy.ts` (creates a database-free Auth.js instance for redirects)

**Security notes:** `session.maxAge` caps a stolen cookie's lifetime at 7 days. `pages.error: "/login"` means OAuth errors land on the login page with an `?error=` code, which the page maps to fixed messages (never printing the raw value). `trustHost` is only set to `true` when the env var says so, and never to `false` (see the handoff gotcha about `UntrustedHost`).

**Notes:** The `session` callback copies `token.sub` into `session.user.id`. The `jwt` callback that decides whether a token is still valid lives in `auth.ts`, not here, because it needs the database.

### `src/auth.ts`

**What it does:** The full Auth.js setup, built on top of `authConfig`. It connects Auth.js to the database through the Prisma adapter, adds email-and-password sign-in (the Credentials provider, which hands the work to `authorizeCredentials`), and adds the callbacks that need the database. It produces the four functions the rest of the app uses: `auth`, `signIn`, `signOut` and the route `handlers`.

**Runs on:** server only. Not marked `server-only`, but it imports Prisma and Argon2 indirectly, so it can't be bundled for the browser.

**Exports:**
- `auth`: reads and validates the current session. Called in server components, actions and route handlers.
- `signIn`: starts a sign-in (`"credentials"` or `"google"`). Throws a redirect on success.
- `signOut`: clears the session cookie and redirects.
- `handlers`: the `GET`/`POST` functions behind `/api/auth/*` (OAuth callbacks, session endpoint).

**Depends on (imports):**
- Internal: `./auth.config` (shared settings), `@/lib/db` (the adapter and the `jwt`/`events` database calls), `@/features/auth/credentials` (`authorizeCredentials`, the password check).
- Packages: `next-auth`, `next-auth/providers/credentials`, `@auth/prisma-adapter`.
- Environment variables read: none directly (Auth.js reads `AUTH_SECRET` and the Google variables).

**Used by (imported by):**
- `src/app/api/auth/[...nextauth]/route.ts` (`handlers`)
- `src/features/auth/actions/sign-in.ts` (`signIn`), `sign-out.ts` (`signOut`), `change-password.ts` (`auth`, `signOut`)
- `src/features/auth/activity-tracker.tsx`, `src/features/auth/components/header-auth-actions.tsx`, `src/features/auth/components/sidebar-user.tsx` (`auth`)

**Security notes:**
- `callbacks.signIn`: a Google sign-in is refused unless Google says the email is verified (`email_verified === true`), so nobody can claim an address they don't own.
- `callbacks.jwt`: on sign-in it copies `role` and `sessionVersion` into the token. On every later `auth()` call it re-reads the user's `sessionVersion` and `role` from the database and returns `null` (signed out) if the user is gone or the version changed. This is how a password reset or change kills every other session.
- `events.createUser` (runs when the adapter creates a user, i.e. a first Google sign-in): sets `emailVerified` and records a `SIGN_UP` activity event in one transaction.
- No automatic account linking is configured, so a Google sign-in for an email that already has a password account fails with `OAuthAccountNotLinked` (shown as a banner on `/login`).

**Notes:**
- Because the `jwt` callback queries the database on every `auth()` call, each page view that reads the session costs one small query. That's the price of instant session revocation.
- Credentials sign-ins don't go through `events.createUser`; `register` creates those users and their `SIGN_UP` event itself.

### `src/proxy.ts`

**What it does:** Next.js 16's "proxy" (the file that used to be called middleware). It runs before every page request and does redirects only: admin URLs return a plain 404 unless the token's role is `ADMIN`; signed-out visitors to protected app URLs go to `/login?callbackUrl=<where they were going>`; signed-in visitors to `/login` or `/signup` go to `/dashboard`. It uses its own Auth.js instance built from `authConfig` alone, so it never touches the database.

**Runs on:** server, before routing (Next.js picks it up by file name; nothing imports it).

**Exports:**
- `proxy`: the request handler, wrapped in Auth.js's `auth()` so `req.auth` holds the decoded session token.
- `config`: the `matcher`, which skips `/api`, `_next/static`, `_next/image`, the favicon and image files.

**Depends on (imports):**
- Internal: `@/auth.config` (the database-free settings).
- Packages: `next-auth`, `next/server` (`NextResponse`).
- Environment variables read: none directly (Auth.js reads `AUTH_SECRET` to decode the cookie).

**Used by (imported by):** nobody imports it; Next.js runs it automatically.

**Security notes:**
- The admin check answers 404, not 403, so the admin area's existence isn't confirmed to outsiders.
- The `callbackUrl` it adds is only a suggestion: the sign-in actions run it through `safeCallbackUrl()` before redirecting.
- It does **not** check `sessionVersion` (that needs the database). A revoked token still gets past the proxy; the page's own `auth()` call then rejects it. That's why every page and action that touches user data must call `auth()` itself.

**Notes:**
- `PROTECTED_PREFIXES` is `["/dashboard", "/onboarding", "/settings"]`. The handoff says it covers "the seven app sections plus `/onboarding`", but `/transactions`, `/budgets`, `/imports`, `/insights` and `/recurring` aren't in the list. Those pages don't exist yet, so nothing is exposed today, but they'll need adding (or each page must handle signed-out visitors) before they're built.
- `matches()` matches the exact path or `prefix/…`, so `/settingsx` isn't treated as `/settings`.

### `src/types/next-auth.d.ts`

**What it does:** A TypeScript "module augmentation" file: it adds SpendSense's own fields to Auth.js's built-in types. `Session.user` gains `id` and `role`; `User` gains optional `role` and `sessionVersion`; the `JWT` type (which lives in `@auth/core/jwt`, not `next-auth`) gains `role` and `sessionVersion`. It contains no runtime code at all.

**Runs on:** neither: types only, erased at build time.

**Exports:** nothing directly; it changes the types exported by `next-auth` and `@auth/core/jwt`.

**Depends on (imports):**
- Internal: `@/generated/prisma/client` (the `Role` enum type).
- Packages: `next-auth` (`DefaultSession`).
- Environment variables read: none.

**Used by (imported by):** nobody imports it; TypeScript loads it because it sits under `src/` (covered by `tsconfig.json`'s `include`). Its types are used in `src/auth.config.ts` (`token.role` → `session.user.role`), `src/auth.ts` (`user.role`, `user.sessionVersion`, `token.sessionVersion`) and `src/features/auth/credentials.ts` (returns `sessionVersion`).

**Security notes:** none at runtime, but it keeps `role` and `sessionVersion` type-checked, which makes it harder to forget the `sessionVersion` comparison or to misspell a role.

### `src/app/api/auth/[...nextauth]/route.ts`

**What it does:** The route handler that serves every URL under `/api/auth/` (the `[...nextauth]` folder name is a "catch-all" segment). It simply re-exports Auth.js's `GET` and `POST` handlers. Google redirects back here after sign-in (`/api/auth/callback/google`), and Auth.js's built-in endpoints such as `/api/auth/session` live here too.

**Runs on:** server only (a route handler).

**Exports:**
- `GET`, `POST`: Auth.js's request handlers.

**Depends on (imports):**
- Internal: `@/auth` (`handlers`).
- Packages: none directly.
- Environment variables read: none directly.

**Used by (imported by):** nobody imports it; Next.js routes `/api/auth/*` requests to it. The proxy's matcher skips `/api`, so these requests never go through `proxy.ts`.

**Security notes:** this is where the OAuth `state`/PKCE checks and CSRF checks built into Auth.js happen. The UI never links here directly (no links to `/api/auth/signin`); it uses the `signIn` server actions instead.

**Notes:** the folder name contains square brackets, so in PowerShell use `-LiteralPath` with it.

### `next.config.ts` (auth-related parts)

**What it does:** Next.js's configuration. Two parts matter for auth: `cacheComponents: true`, which is why every component that reads the request (`searchParams`, `cookies()`, `auth()`) must sit inside `<Suspense>`; and `headers()`, which sends `Referrer-Policy: no-referrer` on `/verify-email` and `/reset-password`.

**Runs on:** build and server start-up (read once; changes need a server restart).

**Exports:**
- default `nextConfig`.

**Depends on (imports):**
- Internal: none.
- Packages: `next` (the `NextConfig` type).
- Environment variables read: none.

**Used by (imported by):** Next.js itself.

**Security notes:** the verify and reset links carry a secret token in the URL (`?token=…`). `no-referrer` stops the browser from sending that full URL to any other site the page loads something from or links to.

**Notes:** `partialPrefetching: true` is also on; it doesn't affect auth behaviour.

---

## Library (`src/lib/`)

### `src/lib/db.ts`

**What it does:** Creates the single Prisma client the whole app uses to talk to PostgreSQL, using the `pg` driver adapter. In development it stores the client on `globalThis`, so hot reloads reuse one client instead of opening a new connection pool on every file save. During `next build` it tolerates a missing `DATABASE_URL`, so the build can run without a database.

**Runs on:** server only (`import "server-only"` makes a browser import fail the build).

**Exports:**
- `db`: the `PrismaClient` instance.

**Depends on (imports):**
- Internal: `@/generated/prisma/client` (the generated client).
- Packages: `server-only`, `@prisma/adapter-pg` (Postgres driver adapter), `next/constants` (`PHASE_PRODUCTION_BUILD`).
- Environment variables read: `DATABASE_URL`, `NEXT_PHASE`, `NODE_ENV`.

**Used by (imported by):**
- `src/auth.ts` (adapter, `jwt` check, `createUser` event)
- `src/features/auth/credentials.ts` (user lookup, rehash)
- `src/features/auth/actions/register.ts`, `verify-email.ts`, `password-reset.ts`, `change-password.ts`
- `src/lib/rate-limit.ts`, `src/lib/tokens.ts`, `src/lib/activity.ts`

**Security notes:** `server-only` guarantees database credentials and queries can never end up in browser JavaScript.

**Notes:** during a build with no `DATABASE_URL`, the client is created with `connectionString: undefined`; any query at build time would then fail. That's fine today because nothing queries during prerendering (all `auth()` calls sit behind `<Suspense>` and `connection()`).
