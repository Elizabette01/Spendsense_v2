# SpendSense: privacy features handoff (cookie consent and account deletion)

Last updated: 11 Nov 2026 (backend P1–P7 done; next B7-0 prerequisites, then B7 UI by Claude Code)

Built after Step 3 (authentication) and before Step 4 (data parsing). Same working rules: study first, then build; **Elizabette writes all backend code; Claude Code does frontend only**, from a brief (`claude/spendsense-b7-brief.md`).

## Progress

- Decisions locked, study done (10 Nov).
- **P1–P7 backend: done and tested** (11 Nov), on branch `feat/privacy-cookies-and-deletion`.
- **Next: B7-0** (packages, env placeholders, `getDeletionProof()`), then **B7** by Claude Code.

## Decisions (locked)

### Cookie consent
- **Strictly necessary cookies are never gated**: `authjs.session-token`, `authjs.csrf-token`, `authjs.callback-url`, Google sign-in state and PKCE cookies, and `ss_consent` itself.
- **Categories:** Strictly necessary (always on) and **Analytics** (opt-in, off by default). Preferences dropped for now.
- **Analytics tools:** Vercel Web Analytics, Google Analytics 4, Plausible, **all behind the one Analytics opt-in** (stricter than required). Each loads only if its env variable is set.
- **Banner:** Accept all and Reject all equally prominent, plus Manage preferences. Nothing non-essential loads before a choice.
- **Withdrawal:** "Cookie settings" link in footers; withdrawing clears GA cookies and reloads.
- **Consent cookie** `ss_consent`: version + `analytics` + `decidedAt`, **6 months**, re-asked on version bump.
- **Cookie policy page** at `/cookies`.

### Account deletion
- **Danger zone** in Settings: change password + delete account.
- **Proof, chosen by the server from the database:** password users enter their password; Google-only users type their account email.
- **48-hour grace period.** Request → `deletionScheduledFor = now + 48h`, `sessionVersion` + 1, reactivation token (48h), email immediately, sign out, cookies cleared.
- **During the grace period** the account can't be used (sessions, password sign-in and Google sign-in all blocked). **Only the emailed link reactivates**; a password reset does not.
- **Resend reactivation link** (anti-enumeration pattern); a resent link expires at the **original** deletion time.
- **Daily purge** deletes accounts past their deadline (actual deletion 48–72h after the request; UI says "after 2 days") and sends a final email.

## Backend as built (P1–P7)

### Database (P1)
- Migration `add_account_deletion_schedule`: `users.deletion_scheduled_for` (nullable, indexed), `AuthTokenType.ACCOUNT_REACTIVATION`.

### Library
- **`src/lib/account-deletion.ts`:** `DELETION_GRACE_MS` (48h), the single source for the grace period.
- **`src/lib/tokens.ts`:** `ACCOUNT_REACTIVATION` TTL uses `DELETION_GRACE_MS`; `createAuthToken(userId, type, { expiresAt? })` accepts a custom expiry.
- **`src/lib/rate-limit.ts`:** new limits `deleteAccountUser` (5/15m), `resendReactivationEmail` (3/h), `resendReactivationIp` (10/h).
- **`src/lib/email.ts`:** `sendDeletionScheduledEmail(to, token, deletionDate)` (UK time, reactivation link), `sendAccountDeletedEmail(to)`.
- **`src/lib/session.ts`:** `getSession = cache(() => auth())`, one session lookup per request. **Server components use `getSession()`; server actions may keep `auth()`.**
- **`src/lib/consent.ts`** (browser-safe, no `server-only`, no Zod): `CONSENT_COOKIE`, `CONSENT_VERSION`, `CONSENT_MAX_AGE_SECONDS`, `CONSENT_CHANGED_EVENT`, `createConsent`, `serializeConsent`, `parseConsent` (rejects bad shape, wrong version, older than 6 months), `hasConsent`, `readConsentFromDocument`, `writeConsentToDocument` (Path=/, Max-Age, SameSite=Lax, Secure on HTTPS, not HttpOnly; fires the event), `clearAnalyticsCookies` (`_ga`, `_ga_*`, `_gid` across domain levels).

### Auth changes (P3)
- `jwt` callback: also returns `null` when `deletionScheduledFor` is set.
- `authorizeCredentials`: `AccountPendingDeletion` (code `account_pending_deletion`) thrown **after** the password check, before the email-verified check. Message added to `sign-in.ts`.
- Google `signIn` callback: guard clauses; looks up the linked `Account` by `provider_providerAccountId` and returns `"/login?error=AccountPendingDeletion"` if the user is scheduled.

### Actions and routes
- **`src/features/auth/actions/delete-account.ts`:** `requestAccountDeletion(prevState, formData)` → `DeleteAccountState`. `auth()` → per-user limit → proof by database (`password` or `confirmEmail`) → schedule + `sessionVersion` + 1 → token → email in `after()` → `signOut({ redirectTo: "/api/session/clear?reason=deletion-scheduled" })`.
- **`src/features/auth/actions/reactivate-account.ts`:** `reactivateAccount(formData)` (consume token, `updateMany` only if deadline still in future, → `/login?status=reactivated`); `resendReactivation(formData)` (limits, `after()`, new token capped at the deadline, always `status=sent`).
- **`src/app/(auth)/reactivate-account/page.tsx`:** minimal, Suspense, Confirm button (scanner-safe), sent, limited and invalid states.
- **`src/app/api/session/clear/route.ts`:** GET; allowlisted destinations by `reason` (`deletion-scheduled`, `expired`); sets `Clear-Site-Data: "cookies"` and expires any `authjs.session-token` cookies (Secure flag matched for `__Secure-` names).
- **`src/app/api/cron/purge-deleted-accounts/route.ts`:** GET; `Authorization: Bearer ${CRON_SECRET}` checked with `timingSafeEqual`, fails closed if unset; batches of 100; `deleteMany` re-checks the deadline (race with reactivation); final email in its own try/catch; returns counts only. Stripe cancellation comment for later.
- **`src/features/auth/stale-session-guard.tsx`:** if no session but an `authjs.session-token` cookie exists, redirect to `/api/session/clear?reason=expired`. In `(app)/layout.tsx` inside the same `<Suspense>` as the tracker.
- **`src/features/auth/activity-tracker.tsx`:** now uses `getSession()`.
- **`next.config.ts`:** `Referrer-Policy: no-referrer` also on `/reactivate-account`.

### Env
- `.env.local` / `.env.example`: `CRON_SECRET` (64 hex characters).

## B7-0: prerequisites before Claude Code (Elizabette)
- `npm install @vercel/analytics @next/third-parties`
- `.env.example` (and `.env.local` when accounts exist): `NEXT_PUBLIC_VERCEL_ANALYTICS`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- `src/features/auth/queries.ts`: `getDeletionProof()` returning `"password" | "email" | null`

## Step 9 checklist additions
- Add `CRON_SECRET` to Vercel and a daily cron in `vercel.json` for `/api/cron/purge-deleted-accounts` (confirm Vercel sends `Authorization: Bearer <CRON_SECRET>`). Don't add the cron before production has a database.
- Before Stripe goes live: cancel subscriptions in the purge job before deleting users.
- Set analytics env variables in Vercel; enable Web Analytics in the Vercel dashboard.

## Gotchas found in this phase
- **`P1001: Can't reach database server`:** start Docker Desktop and `docker compose up -d` at the start of every session. If the container is `healthy` but Prisma still can't connect, test with `Test-NetConnection 127.0.0.1 -Port 5432` and `localhost`; fix by using `127.0.0.1` in `DATABASE_URL` (IPv6 `localhost`) or `docker compose restart db` / fully quitting Docker Desktop (stuck port forwarding).
- **"healthy" only proves Postgres works inside the container**, not that Windows can reach it.
- **Server actions can't set custom response headers** (like `Clear-Site-Data`); route handlers can. Server components can read cookies but not change them.
- **A 404 from a route handler means the path or file name is wrong** (a 405 means the file exists but lacks that method). Folder names must match the URL letter for letter.
- **Guard clauses:** when a callback needs several checks, turn `return check === true` into `if (check !== true) return false;` and continue.
- **Prisma compound unique keys** are named by joining fields with `_` (`provider_providerAccountId`).
- **Conditional writes for races:** put the condition inside the write (`updateMany` / `deleteMany` with the check in `where`) and act on `count`.

## Facts from the study (checked 10 Nov 2026)
- PECR consent applies only to non-essential storage; login session cookies are strictly necessary.
- Data (Use and Access) Act 2025 exemptions in force since 5 Feb 2026; ICO final guidance 29 Apr 2026. First-party analytics solely for improvement can skip consent with clear information and a simple, free opt-out.
- GA4 still needs consent in the UK.
- Vercel Web Analytics: no cookies; request hash that resets daily. Plausible: no cookies, nothing stored on the device.
- Banner rules: Reject all as prominent as Accept all, no pre-ticked boxes, choices by purpose, record consent, withdrawal as easy as giving it.
