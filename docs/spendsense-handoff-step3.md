# SpendSense: handoff to Step 3 (authentication)
 
Last updated: 8 Nov 2026 (backend B1–B5 done; next B6-0 prerequisites, then B6 pages by Claude Code)
 
## Step 3 goal
 
- Users can **register with email and password**, or **sign in with Google**. Apple was dropped.
- Sessions use **JWT**, not database sessions.
- Study first, then build. **Elizabette writes all backend code; Claude Code does frontend only** (the auth pages, from the Figma designs).
## Progress
 
- Decisions locked and study S1–S4 done (2 Nov).
- **B1** Google Cloud, secrets, Resend: done (4 Nov).
- **B2** Auth.js config, Google sign-in, `sessionVersion` check: done (4 Nov).
- **B3** rate limits, password utilities, tokens and email, registration, verify email, password sign-in: done and merged (7 Nov).
- **B4** forgot, reset and change password: done and merged (7 Nov). Tested: weak or breached passwords don't burn the reset token; reset and change both increase `sessionVersion` and kill other sessions; password-changed email sent; unverified accounts rescued by reset; same-as-current rejected; per-user rate limit.
- **B5** `proxy.ts`, Google `SIGN_UP` event, last-active tracking: done (8 Nov). Admin placeholders added.
- **Next: B6-0** (small backend prerequisites, written by Elizabette), **then B6** (pages by Claude Code, brief in `claude/spendsense-b6-brief.md`), then the end-of-step test.
## Package status
 
- **`next-auth` 5.0.0-beta.32** (pinned exactly; maintained by the Better Auth team, security fixes only), **`@auth/prisma-adapter` 2.11.3**, **`argon2` 0.44.x**, **`resend`**, **`zod` 4.6.x** (v4 API: `z.email()`, `z.flattenError()`).
## Step 3 decisions (locked)
 
- **Sessions:** JWT, `maxAge` 7 days, `sessionVersion` checked on every `auth()` call (also refreshes `role`).
- **Passwords:** Argon2id (m=19456 KiB, t=2, p=1). **12–128** characters (code points after NFKC), no composition rules. The minimum applies when a password is set, not at sign-in.
- **Breached-password check:** HIBP range API with padding; fails open.
- **Unverified users:** cannot sign in.
- **Account linking:** no automatic linking. Link Google from Settings later.
- **Rate limiting:** Postgres table, atomic upsert, per IP, per email or per user; keys hashed.
- **Email:** Resend test sender (delivers only to the Resend account email). Domain before launch.
- **Change password signs out every device, including the current one** (simpler than re-issuing the token with `unstable_update`; possible later improvement).
- **Last active:** at most once per user per UTC day (`lastActiveAt` = first visit that day).
## Still open
 
- Whether the trial needs a card, final prices, the hosting provider.
## Routes
 
- **Auth pages (`src/app/(auth)/`):** `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`. (Folders are `login` and `signup`, not `sign-in`.)
- **App pages (`src/app/(app)/`):** `/dashboard`, `/budgets`, `/imports`, `/insights`, `/recurring`, `/settings`, `/transactions`. `(app)/layout.tsx` holds the activity tracker (and later the app shell).
- **Onboarding:** `src/app/onboarding/` → `/onboarding`.
- **Admin:** `src/app/admin/` → `/admin`, **outside `(app)`** (own shell, not counted as user activity). Currently minimal placeholders (`layout.tsx` returns children; `page.tsx` and `users/page.tsx` are headings). **When building it:** the layout must check `auth()` role first (inside `<Suspense>`, `notFound()` unless `ADMIN`), and every admin data function and server action checks the role itself.
- **Root layout** `src/app/layout.tsx`: `<html>`, `<body>`, Inter font, `globals.css`, metadata. Nested layouts never repeat `<html>` or `<body>`.
## Auth setup as built
 
### External services
- **Google Cloud project `SpendSense`** (dev): External, Testing mode, own Gmail as test user. Web client `spendsense-local`, redirect URI `http://localhost:3000/api/auth/callback/google`.
- **Resend:** API key `spendsense-dev`, sending access only.
### Env variables
- `.env.local`: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_TRUST_HOST=true`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL="http://localhost:3000"`. Placeholders in `.env.example`.
### Config
- **`src/auth.config.ts`** (light, shared with the proxy): `trustHost` from env (moved here in B5 so the proxy instance gets it), Google provider, JWT session 7 days, `session` callback exposing `id` and `role`.
- **`src/auth.ts`** (full): spreads `authConfig`; `PrismaAdapter(db)`; providers `[...authConfig.providers, Credentials({ authorize: authorizeCredentials })]`; callbacks `signIn` (Google requires `email_verified`) and `jwt` (copy on sign-in, then database check of `sessionVersion` and `role`, `null` on mismatch); `events.createUser` sets `emailVerified` and records `SIGN_UP` in one transaction.
- **`src/proxy.ts`**: own `NextAuth(authConfig)` (no database). `ADMIN_PREFIXES ["/admin"]` → plain 404 unless token role is `ADMIN`. `PROTECTED_PREFIXES` (the seven app sections plus `/onboarding`) → redirect signed-out visitors to `/login?callbackUrl=<path+query>`. `SIGNED_OUT_ONLY ["/login", "/signup"]` → signed-in users go to `/dashboard`. `matches()` uses exact path or `prefix/`. Matcher skips `api`, `_next/static`, `_next/image`, favicon and image files. Doesn't check `sessionVersion` (pages do).
- **`src/types/next-auth.d.ts`**: augments `next-auth` (`Session`, `User`) and `@auth/core/jwt` (`JWT`).
- **`src/app/api/auth/[...nextauth]/route.ts`**: `GET` and `POST` from `handlers`.
- **`next.config.ts`**: `Referrer-Policy: no-referrer` on `/verify-email` and `/reset-password`.
- **`package.json`**: `"check": "npm run lint && next typegen && tsc --noEmit && next build"`. **Run before every push.**
### Library files (`src/lib/`)
- **`db.ts`**: Prisma client; skips the `DATABASE_URL` check during `next build`.
- **`rate-limit.ts`**: `LIMITS` (signInEmail 5/15m, signInIp 20/15m, registerIp 5/h, forgotPasswordEmail 3/h, forgotPasswordIp 10/h, resendVerificationEmail 3/h, resendVerificationIp 10/h, resetPasswordIp 10/h, changePasswordUser 5/15m), `hashIdentifier()`, `rateLimit()`, `deleteExpiredRateLimits()` (not yet scheduled).
- **`password-rules.ts`** (browser-safe): min/max constants, `normalizePassword`, `countCharacters`, `isValidPasswordLength`.
- **`password.ts`** (`server-only`): `hashPassword`, `verifyPassword(hash, password)`, `needsRehash`, `verifyAgainstDummy`, `isPwnedPassword`.
- **`tokens.ts`**: `createAuthToken`, `consumeAuthToken` (single use, race-safe). TTLs: verification 24h, reset 1h.
- **`email.ts`**: `sendVerificationEmail`, `sendPasswordResetEmail`, `sendAccountExistsEmail` (links to `/login` and `/forgot-password`), `sendPasswordChangedEmail`. Links from `APP_URL`.
- **`request.ts`**: `getClientIp()`.
- **`activity.ts`**: `recordActivity(userId)`: conditional `updateMany` on `lastActiveAt` (null or before today UTC) plus `ACTIVE_DAY` event only when `count === 1`, in one transaction.
### Feature files (`src/features/auth/`)
- **`schemas.ts`**: `emailSchema`, `newPasswordSchema` (12–128), `existingPasswordSchema` (max only), `tokenSchema`, `registerSchema`.
- **`credentials.ts`**: `authorizeCredentials` (validate → rate limit → lookup → dummy verify → verify → `EmailNotVerified` → rehash → safe user). Codes `email_not_verified`, `rate_limited`.
- **`activity-tracker.tsx`**: server component; `auth()` then `after(() => recordActivity(userId))`; renders `null`. Used inside `<Suspense>` in `(app)/layout.tsx`.
- **`actions/register.ts`**: `register(prevState, formData)` → `RegisterState`.
- **`actions/sign-in.ts`**: `signInWithPassword(prevState, formData)` → `SignInState` (currently `redirectTo: "/"`; B6-0 adds `callbackUrl`).
- **`actions/verify-email.ts`**: `verifyEmail(formData)`, `resendVerification(formData)` (redirect with `?status=`).
- **`actions/password-reset.ts`**: `requestPasswordReset(formData)`, `resetPassword(formData)` (validate and hash before consuming the token; one transaction sets the hash, increments `sessionVersion`, verifies the email if needed, deletes all the user's tokens; notice email in `after()`).
- **`actions/change-password.ts`**: `changePassword(prevState, formData)` → `ChangePasswordState` (`auth()` → per-user limit → validate → Google-only message → verify current → not the same → HIBP → update with `sessionVersion` increment → notice email in `after()` → `signOut({ redirectTo: "/" })`; B6-0 changes the redirect).
### Pages (minimal, unstyled until B6)
- `/verify-email`, `/forgot-password`, `/reset-password`: server component with `<main>` plus `<Suspense>`; inner async component awaits `searchParams`. Temporary sign-in buttons use an inline server action calling `signIn(undefined, { redirectTo: "/" })`.
- `(app)/dashboard/page.tsx`: placeholder heading.
## Step 2 (database) summary
 
- Postgres 17 in Docker (`spendsense-db`), Prisma 7, `prisma.config.ts` loads `.env.local`, generated client in `src/generated/prisma`, `postinstall: prisma generate`.
- **Migrations:** `init`, `add_transfer_category_type`, `switch_to_jwt_auth`, `add_rate_limits`.
- Seed: 25 system categories. Health route `GET /api/health`.
## Current schema
 
- **Auth:** `User` (`role`, `lastActiveAt`, `passwordHash?`, `sessionVersion`, `emailVerified?`), `Account`, `AuthToken`, `RateLimit` (Timestamptz `reset_at`).
- **Finance:** `Category`, `Statement`, `Transaction`. **Billing:** `Subscription`, `StripeEvent`. **Admin:** `ActivityEvent` (`SIGN_UP`, `ACTIVE_DAY`, …), `DailyMetric`, `AuditLog`.
## Remaining Step 3 plan
 
### B6-0: backend prerequisites (Elizabette, before Claude Code starts)
1. `auth.config.ts`: `pages: { signIn: "/login", error: "/login" }`.
2. `signInWithPassword`: accept a `callbackUrl` form field, allow only safe relative paths, default `/dashboard`.
3. New `signInWithGoogle(formData)` action (with the same `callbackUrl` handling).
4. New `signOutAction()` for the app's sign-out button.
5. `changePassword`: `signOut({ redirectTo: "/login?status=password-changed" })`.
6. Replace the temporary `signIn()` buttons' `redirectTo: "/"` defaults with `/dashboard` (or leave them for Claude Code to swap to `<Link href="/login">`, as the brief says).
### B6: pages (Claude Code)
- Brief: `claude/spendsense-b6-brief.md`. Figma designs, Tailwind tokens, the action contracts, Suspense rule, copy rules, accessibility, files it must not touch.
### End-of-step test
- Every flow end to end on the real pages; old JWT dies after reset and change; rate limits; no auto-linking; proxy redirects with `callbackUrl` round trip; `npm run check` and Vercel green.
## Rules to carry into later steps
 
- **Ownership:** `userId` always from the session; check ownership of statements and categories.
- **Every page, server action and route handler that touches user data calls `auth()` itself.** The proxy only handles redirects.
- **Treat every server action as a public API.**
- **Enumeration:** identical responses and similar timing; use `after()` where the work differs per path.
- **Forms with field errors return state (`useActionState`); link-based flows redirect with `?status=`.**
- **Account deletion:** cancel Stripe first. **Trial reminder:** own job plus `trialReminderSentAt`. **Stripe webhooks:** insert `StripeEvent` first.
- **Create rows through Prisma Client.**
- **Before launch (Step 9):** sending domain in Resend; production Google client and publish the app; all env variables in Vercel with a new `AUTH_SECRET` and real `APP_URL`; check `x-forwarded-for`; schedule `deleteExpiredRateLimits()`; Google sign-in won't work on preview URLs.
## Drafted, migrate later
 
- `OnboardingProfile`, `RecurringPayment`, `Budget`, `ChatConversation` → `ChatMessage`; category `icon` and `colour`; hiding system categories; link Google from Settings.
## Useful commands
 
- **`npm run check` before every push.**
- `docker compose up -d` / `npx prisma studio` / `npx prisma migrate dev --name <name> --create-only` → read SQL → `npx prisma migrate dev` → `npx prisma generate`
- `npm ls next-auth @auth/prisma-adapter @auth/core argon2 zod`
- Auth.js test pages: `/api/auth/signin`, `/api/auth/session`, `/api/auth/signout`
- Temporary test routes and pages go under `src/app/api/dev/` or `src/app/dev/`, guarded by `NODE_ENV === "development"`, deleted before committing.
## Gotchas
 
### Next.js 16 and builds
- **Cache Components is on.** Anything reading the request (`searchParams`, `params`, `headers()`, `cookies()`, `auth()`) must be inside `<Suspense>`. Only `next build` catches this.
- **Every `page.tsx` and `layout.tsx` must export a default component.** An empty file fails the build and `tsc` with `TS2306 ... is not a module` from `.next/types/validator.ts`.
- **`db.ts` must not throw at import during `next build`.** Read other env variables lazily.
- **`"use server"` files may only export async functions** (types are fine).
- **`redirect()`, `signIn()` and `signOut()` throw.** Never swallow them in `try/catch`; re-throw non-Auth.js errors.
- **Inside `after()` in a server component, cookies and headers aren't available.** Read them first, pass values in.
- **Trust terminal lint over editor lint.** Use `signIn()` from `@/auth`, not links to `/api/auth/signin`. Use `<Link>` for real pages.
- **New files sometimes show "Cannot find module" in VS Code** while `tsc` is fine. Reload the window or restart the TS server.
- **New route folders may need a dev-server restart.** A Next.js 404 page means the route path or file name is wrong.
- **`as const` on option objects** for typed libraries.
### Auth.js
- **`UntrustedHost` even with `AUTH_TRUST_HOST=true`:** set `trustHost` in `auth.config.ts` (shared by both instances). Never `trustHost: false`.
- **JWT augmentation targets `@auth/core/jwt`.**
- **`emailVerified` is null for OAuth sign-ups** unless set in `events.createUser`.
- **`/api/auth/session` returning `null`** means no valid session (also on configuration errors since beta.32).
- **The "Server error / Configuration" page** hides the cause; read `[auth][error] <Type>` in the terminal.
- **The proxy's token role can be stale** (server components can't rewrite the cookie). Pages re-check with `auth()`.
- **Env files and `next.config.ts` are read at startup only.**
### Earlier
- `prisma.config.ts` (not `prisma7.config.ts`); `dotenv/config` loads `.env` not `.env.local`; import the client from `@/generated/prisma/client`; Studio writes directly (supply `id`); standalone scripts can't import `db.ts`; index foreign keys yourself.
- After a squash merge, `git branch -D`; `git rebase main` if a fix landed after branching. Always branch **before** committing.
- PowerShell: quote paths with `( )`; `-LiteralPath` for `[ ]`.
- Designs: Figma file `mgf2GJR0QdxCas9EqRDXaK` (read-only via the connector), plus the Claude canvas "SpendSense Admin & Subscriptions".
## Prompt to resume in a new chat
 
> Let's continue Step 3 of SpendSense: authentication. Read `claude/spendsense-handoff-step3.md` first. The backend (B1–B5) is done; pick up at B6-0 in the Progress section. I write all backend code and you explain line by line.
 