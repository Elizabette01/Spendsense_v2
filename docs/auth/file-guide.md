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

### `src/lib/password-rules.ts`

**What it does:** The single source of truth for the password length rule (12 to 128 characters) and the helpers that apply it. Passwords are first normalised with Unicode NFKC (so visually identical characters typed different ways count the same), then counted in code points (`[...value].length`), not UTF-16 units, so an emoji counts as one character.

**Runs on:** both. It has no server-only imports, so client components can use the constants for helper text.

**Exports:**
- `PASSWORD_MIN_LENGTH` (12), `PASSWORD_MAX_LENGTH` (128): the limits.
- `normalizePassword(password)`: NFKC normalisation.
- `countCharacters(value)`: code-point count.
- `isValidPasswordLength(password)`: normalise, count, check both limits.

**Depends on (imports):**
- Internal: none. Packages: none. Environment variables read: none.

**Used by (imported by):**
- `src/features/auth/schemas.ts` (`newPasswordSchema`, `existingPasswordSchema`)
- `src/features/auth/credentials.ts` (rejects over-long passwords before hashing)
- `src/lib/password.ts` (normalises before hashing and verifying)
- UI helper text and error copy: `src/features/auth/components/signup-form.tsx`, `change-password-form.tsx`, `src/app/(auth)/reset-password/page.tsx`

**Security notes:** the 128 maximum stops very long inputs being used to make Argon2 do expensive work. Normalising before hashing means a password typed on a different keyboard or OS still verifies. There are deliberately no composition rules (following current NIST guidance).

**Notes:** this is why the UI never puts `minLength`/`maxLength` on password inputs: the browser counts UTF-16 units and doesn't normalise, so it could disagree with the server.

### `src/lib/password.ts`

**What it does:** Everything that touches a real password on the server. It hashes and verifies with Argon2id (19 MiB memory, 2 iterations, 1 thread: the OWASP minimum), tells you when an old hash should be upgraded to the current settings, runs a "dummy" verification so unknown emails take as long as real ones, and checks Have I Been Pwned to see whether a password has appeared in a data breach.

**Runs on:** server only (`import "server-only"`).

**Exports:**
- `hashPassword(password)`: normalise, then Argon2id hash.
- `verifyPassword(hash, password)`: normalise, then verify; returns `false` (never throws) on a malformed hash.
- `needsRehash(hash)`: `true` if the hash was made with different Argon2 settings.
- `verifyAgainstDummy(password)`: verifies against a fixed dummy hash (created once, then cached) and always returns `false`.
- `isPwnedPassword(password)`: HIBP range check.

**Depends on (imports):**
- Internal: `@/lib/password-rules` (`normalizePassword`).
- Packages: `server-only`, `argon2` (native hashing), `node:crypto` (SHA-1 for the HIBP lookup).
- Environment variables read: none.

**Used by (imported by):**
- `src/features/auth/credentials.ts` (verify, dummy verify, rehash)
- `src/features/auth/actions/register.ts`, `password-reset.ts`, `change-password.ts` (hash, HIBP check; change-password also verifies)

**Security notes:**
- **k-anonymity:** only the first 5 characters of the password's SHA-1 are sent to HIBP; the matching happens locally. `Add-Padding: true` makes every response a similar size, so network observers can't guess which prefix was asked about. Padding lines have a count of 0, which the `> 0` check ignores.
- **Fails open:** if HIBP is slow (3-second timeout) or down, the check returns `false` and the password is accepted, so an outside service can't block sign-ups. It logs a warning without the password.
- **Timing:** `verifyAgainstDummy` makes "no such user" cost the same Argon2 work as "wrong password", so response time doesn't reveal which emails have accounts.

**Notes:** the dummy hash is made lazily on first use, so the very first unknown-email sign-in after a server start is slower (two Argon2 operations).

### `src/lib/rate-limit.ts`

**What it does:** A database-backed rate limiter. Each limit is a row in the `rate_limits` table keyed by a string like `forgot:email:<hash>`. One SQL statement inserts the row, or adds 1 to it, or restarts the window if it has expired, and returns the new count. If the count is above the limit, the caller refuses the request. This is a "fixed window" limiter: the count resets when the window ends.

**Runs on:** server only (`import "server-only"`).

**Exports:**
- `LIMITS`: every limit in one place (sign-in 5 per email and 20 per IP per 15 min; register 5 per IP per hour; forgot password and resend verification 3 per email and 10 per IP per hour; reset password 10 per IP per hour; change password 5 per user per 15 min).
- `hashIdentifier(value)`: SHA-256 of an email or IP, so the table never stores them in plain text.
- `rateLimit(key, { limit, windowSeconds })`: counts this attempt, returns `{ allowed, remaining, resetAt }`.
- `deleteExpiredRateLimits()`: removes finished windows.

**Depends on (imports):**
- Internal: `@/lib/db`.
- Packages: `server-only`, `node:crypto`.
- Environment variables read: none.

**Used by (imported by):**
- `src/features/auth/credentials.ts` (sign-in, per email and per IP)
- `src/features/auth/actions/register.ts`, `verify-email.ts` (resend), `password-reset.ts`, `change-password.ts`

**Security notes:**
- The upsert is a single atomic statement, so two requests at the same moment can't both slip under the limit.
- Limiting per email stops guessing one person's password; limiting per IP stops one attacker trying many emails.
- Emails and IPs are hashed before they become keys.

**Notes:**
- `deleteExpiredRateLimits()` isn't called anywhere yet (as the handoff says, it still needs scheduling), so expired rows stay in the table until then. They're harmless, because an expired row is reset on its next use.
- The change-password key uses the raw user id (`changepw:user:<id>`) rather than a hash. User ids aren't personal data, so that's fine, but it differs slightly from the handoff's "keys hashed".
- Every attempt counts, including successful ones. For example, five successful sign-ins in 15 minutes block the sixth.

### `src/lib/tokens.ts`

**What it does:** Creates and redeems the one-time tokens inside email links (verify email: 24 hours; reset password: 1 hour). A token is 32 random bytes in URL-safe base64. Only its SHA-256 hash is stored in `auth_tokens`, and creating a new token deletes the user's older tokens of the same type. Redeeming looks the hash up, deletes the row, and only then checks expiry.

**Runs on:** server only (`import "server-only"`).

**Exports:**
- `createAuthToken(userId, type)`: returns the plain token (to put in the email link).
- `consumeAuthToken(token, type)`: returns the `userId` if the token was valid, otherwise `null`. Single use.

**Depends on (imports):**
- Internal: `@/lib/db`, `@/generated/prisma/client` (the `AuthTokenType` type).
- Packages: `server-only`, `node:crypto` (`randomBytes`, SHA-256).
- Environment variables read: none.

**Used by (imported by):**
- `src/features/auth/actions/register.ts` (creates verification tokens)
- `src/features/auth/actions/verify-email.ts` (consumes verification tokens; creates new ones on resend)
- `src/features/auth/actions/password-reset.ts` (creates and consumes reset tokens)

**Security notes:**
- Storing only the hash means a database leak doesn't give anyone working links.
- **Race-safe single use:** the token counts only if *this* request's `deleteMany` actually removed the row (`count === 1`), so two clicks at the same moment can't both succeed.
- The type is checked, so a verification token can't be used as a reset token.
- Old tokens of the same type are deleted when a new one is made, so only the newest email link works.

**Notes:** an expired token is deleted when someone tries it (it's consumed first and then rejected), which is fine because it was useless anyway.

### `src/lib/email.ts`

**What it does:** Sends the four auth emails through Resend: verify your email, reset your password, "you already have an account", and "your password was changed". Each has a plain-text and an HTML version. Links are built from `APP_URL`. The Resend client is created on first use, not when the file loads.

**Runs on:** server only (`import "server-only"`).

**Exports:**
- `sendVerificationEmail(to, token)`: link to `/verify-email?token=…` (24 hours).
- `sendPasswordResetEmail(to, token)`: link to `/reset-password?token=…` (1 hour).
- `sendAccountExistsEmail(to)`: links to `/login` and `/forgot-password`.
- `sendPasswordChangedEmail(to)`: notice with a link to `/forgot-password` in case it wasn't them.

**Depends on (imports):**
- Internal: none.
- Packages: `server-only`, `resend`.
- Environment variables read: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` (each read lazily, so a missing value only fails when an email is actually sent, not during `next build`).

**Used by (imported by):**
- `src/features/auth/actions/register.ts` (verification, account exists)
- `src/features/auth/actions/verify-email.ts` (verification resend)
- `src/features/auth/actions/password-reset.ts` (reset link, changed notice)
- `src/features/auth/actions/change-password.ts` (changed notice)

**Security notes:**
- `sendAccountExistsEmail` is the anti-enumeration piece of sign-up: the form says the same thing whether or not the email is taken, and only the inbox owner learns an account exists.
- Links are built from the server's `APP_URL`, never from the request's `Host` header, so an attacker can't make reset links point to their own domain.
- Failures are logged by error name and message only, never with the token or link.

**Notes:** with the Resend test sender, only the Resend account's own address actually receives mail. Sending to any other address makes `send()` throw. (For automated testing, Resend's `delivered@resend.dev` inbox, with a `+label`, works.)

### `src/lib/request.ts`

**What it does:** Works out the visitor's IP address for per-IP rate limits. It takes the first address in the `x-forwarded-for` header, falls back to `x-real-ip`, and uses `"unknown"` if neither is present.

**Runs on:** server only (`import "server-only"`; reads request headers, so it only works during a request).

**Exports:**
- `getClientIp()`: the IP as a string.

**Depends on (imports):**
- Internal: none.
- Packages: `server-only`, `next/headers` (`headers()`).
- Environment variables read: none.

**Used by (imported by):**
- `src/features/auth/credentials.ts`, `src/features/auth/actions/register.ts`, `verify-email.ts`, `password-reset.ts` (all for per-IP rate-limit keys)

**Security notes:** the IP is hashed by the callers before it's stored.

**Notes:**
- `x-forwarded-for` can be set by the client unless a trusted proxy overwrites it. On Vercel the platform sets it, so it's reliable there. On a host that passes the client's header through, an attacker could change it on each request and dodge the per-IP limits (the per-email limits still apply). The handoff's Step 9 list already has "check `x-forwarded-for`".
- Every request without either header shares the single `"unknown"` bucket.

### `src/lib/activity.ts`

**What it does:** Records that a user was active today, at most once per UTC day. A conditional update sets `lastActiveAt` only if it's empty or from before today, and only when that update actually changed a row does it add an `ACTIVE_DAY` event. Both happen in one transaction.

**Runs on:** server only (`import "server-only"`).

**Exports:**
- `recordActivity(userId)`.

**Depends on (imports):**
- Internal: `@/lib/db`.
- Packages: `server-only`.
- Environment variables read: none.

**Used by (imported by):**
- `src/features/auth/activity-tracker.tsx` (called in `after()` on every signed-in app page view)

**Security notes:** none (analytics only), but it always takes the `userId` from the session, never from the request.

**Notes:** `lastActiveAt` holds the time of the *first* visit each day, not the latest. Two requests at the same moment can't both create an event, because only one `updateMany` gets `count === 1`.

---

## Feature logic (`src/features/auth/`)

### `src/features/auth/schemas.ts`

**What it does:** The Zod schemas that check and clean auth input on the server. Emails are trimmed, lower-cased, NFKC-normalised, checked as an email and capped at 254 characters. New passwords must pass the 12–128 rule. Existing passwords (for sign-in and "current password") only check the maximum, because old accounts may have shorter passwords. The registration schema checks first name, last name, email and password together.

**Runs on:** server in practice (only server actions and `credentials.ts` import it). It has no server-only imports, so it could run in the browser too.

**Exports:**
- `tokenSchema`: 1–100 character string (a token from a link).
- `emailSchema`: the cleaned, validated email.
- `newPasswordSchema`: the 12–128 rule, with the message "Use between 12 and 128 characters".
- `registerSchema`: `{ firstName, lastName, email, password }`; names are trimmed, 1–50 characters each.
- `existingPasswordSchema`: required, at most 128 characters.

**Depends on (imports):**
- Internal: `@/lib/password-rules`.
- Packages: `zod` (v4 API: `z.email()`).
- Environment variables read: none.

**Used by (imported by):**
- `src/features/auth/credentials.ts` (`emailSchema`)
- `src/features/auth/actions/register.ts` (`registerSchema`)
- `src/features/auth/actions/verify-email.ts` (`emailSchema`, `tokenSchema`)
- `src/features/auth/actions/password-reset.ts` (`emailSchema`, `newPasswordSchema`, `tokenSchema`)
- `src/features/auth/actions/change-password.ts` (`existingPasswordSchema`, `newPasswordSchema`)

**Security notes:** this is the server-side validation every form relies on; the browser's `required` and `type="email"` are only conveniences. Normalising emails means `Me@X.com` and `me@x.com` are the same account.

**Notes:**
- `registerSchema` was changed in B6 from one `name` field to `firstName` and `lastName` (with Elizabette's approval). `register` joins them as `"First Last"` in the existing `name` column.
- `newPasswordSchema`'s message has no full stop, but the reset page's own `length` message does ("Use between 12 and 128 characters."). This is only cosmetic.
