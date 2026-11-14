# SpendSense B7 brief: cookie consent, analytics loading and account deletion UI (for Claude Code)

Last updated: 11 Nov 2026

## Your role

- You build the **frontend only**: the cookie banner and preferences, the analytics loader, the cookie policy page, the Danger zone with the delete-account dialog, the reactivate-account page, and new login banners.
- **Elizabette owns all backend code.** Never create, edit or delete backend files (list below). If something the UI needs is missing, **stop and say what's missing** instead of writing it.
- **Never delete any file without Elizabette's explicit approval.** Ask first, say which file and why, and wait for a yes.
- **Never install, remove or upgrade packages.** If you need one that isn't installed, stop and ask.
- Read first: `CLAUDE.md`, `AGENTS.md`, this brief, `docs/spendsense-privacy-handoff.md` (decisions and facts) and the B6 brief (your earlier rules still apply: Suspense, copy rules, accessibility, forms).
- Create a branch **before** your first commit: `feat/privacy-ui`. Run `npm run check` before every push; it must pass.
- The work has **two parts, in order**: (1) build and test the UI; (2) update the file guide (`docs/auth/file-guide.md`).

## Commit every change

- **Commit after each change**, as you make it. One commit = one logical change (one component, one page, one section, one fix).
- Conventional messages, for example: `feat(privacy-ui): add cookie banner`, `feat(privacy-ui): add analytics loader`, `feat(account-ui): add delete account dialog`, `style(auth-ui): restyle reactivate-account page`, `docs(auth): add file guide entry for consent.ts`.
- Before each commit: `npm run lint` and `npx tsc --noEmit`. Full `npm run check` before every push and before handing back.
- Never commit `.env*` files, secrets or temporary test pages. Never rewrite pushed history.

## B7-0: confirm these exist before you start (read only)

If any is missing, stop and tell Elizabette.

- Packages installed: `@vercel/analytics`, `@next/third-parties`.
- `.env.example` has `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_VERCEL_ANALYTICS`.
- `src/features/auth/queries.ts` exports `getDeletionProof(): Promise<"password" | "email" | null>`.
- `src/lib/consent.ts` (P7), `src/lib/session.ts` (`getSession`), `src/lib/account-deletion.ts` (`DELETION_GRACE_MS`).
- `src/features/auth/actions/delete-account.ts` (`requestAccountDeletion`), `src/features/auth/actions/reactivate-account.ts` (`reactivateAccount`, `resendReactivation`).
- `src/app/(auth)/reactivate-account/page.tsx` (minimal, unstyled).

## Design source: Figma

- Use the Figma file `mgf2GJR0QdxCas9EqRDXaK` (read-only via the Figma connector) for the settings page, any cookie banner, dialog and policy frames.
- **Where there's no frame** (likely: cookie banner, preferences dialog, cookie policy, delete dialog, reactivate page), build from the closest existing components and patterns you created in B6, so everything looks like one product. List these screens in your hand-back summary.
- Use the Tailwind tokens in `src/app/globals.css`; never hard-code hex values. Reuse `src/components/ui/**` and add to it where sensible.

## Files you may create or edit

- `src/features/privacy/components/**` (banner, preferences dialog, analytics loader, cookie settings link)
- `src/app/(marketing)/cookies/page.tsx` (cookie policy, served at `/cookies`)
- `src/features/auth/components/**` (delete-account dialog, Danger zone section, banners)
- `src/app/(app)/settings/**` (Danger zone placement, following Figma)
- `src/app/(auth)/reactivate-account/page.tsx` (restyle; keep behaviour exactly)
- `src/app/(auth)/login/**` (new banners only)
- The marketing footer and any app footer or settings navigation (to add the "Cookie settings" link)
- `src/components/ui/**`
- **`src/app/layout.tsx` (root layout): only to add the cookie banner and the analytics loader inside `<body>`.** Change nothing else there (fonts, metadata, classes).
- `docs/auth/file-guide.md` (Part 2)

## Files you must not touch

- Everything listed in the B6 brief, plus:
- `src/lib/consent.ts`, `src/lib/session.ts`, `src/lib/account-deletion.ts`, `src/lib/activity.ts`
- `src/features/auth/actions/delete-account.ts`, `reactivate-account.ts`, and all other action files
- `src/features/auth/queries.ts`, `src/features/auth/stale-session-guard.tsx`, `src/features/auth/activity-tracker.tsx`
- `src/app/api/session/**`, `src/app/api/cron/**`
- In `src/app/(app)/layout.tsx`, keep the `<Suspense fallback={null}><StaleSessionGuard /><ActivityTracker /></Suspense>` block exactly as it is.
- `package.json`, `package-lock.json`, `.env*`, `next.config.ts`, `prisma/**`, `.github/**`

You may **import** from `src/lib/consent.ts`, `src/lib/account-deletion.ts`, `src/lib/password-rules.ts`, `src/lib/session.ts` (server components only), `src/features/auth/queries.ts` (server components only) and the action files.

## Technical rules

### Carried over from B6
- Cache Components is on: anything reading the request (`searchParams`, `cookies()`, `headers()`, `getSession()`, `getDeletionProof()`) goes inside `<Suspense>`. Every `page.tsx` and `layout.tsx` exports a default component.
- State-returning actions use `useActionState` in a client component. Redirecting actions go straight into `<form action>`.
- Accessibility (labels, `aria-describedby`, `aria-invalid`, `role="alert"`/`"status"`, focus management, visible focus, 320px and 200% zoom) applies to everything here.

### New
- **Server components read the session with `getSession()` from `@/lib/session`, never `auth()` directly.** It's cached per request, so the layout and page share one database lookup.
- **The landing page must stay static.** The banner and loader are client components that read the consent cookie in the browser (`readConsentFromDocument()`), never on the server. Don't call `cookies()` in the root layout or any marketing page.
- **No hydration mismatch:** the banner and loader render nothing on the server and on the first client render. Read consent in `useEffect` after mount, then decide.

## 1. Cookie consent

### How the pieces fit
- `src/lib/consent.ts` provides: `CONSENT_COOKIE`, `CONSENT_VERSION`, `CONSENT_CHANGED_EVENT` (`"ss:consent-changed"`), `createConsent({ analytics })`, `readConsentFromDocument()`, `writeConsentToDocument(consent)` (also fires the event), `hasConsent(consent, "analytics")`, `clearAnalyticsCookies()`.
- **No decision** (`readConsentFromDocument()` returns `null`, including expired, old-version or tampered cookies) → show the banner; load no analytics.

### Banner (`cookie-banner.tsx`, client component, rendered in the root layout)
- Appears after mount when there's no valid decision. Doesn't block using the site (no full-page overlay that prevents reading or rejecting).
- Short text, for example: "We use essential cookies to keep you signed in and secure. With your permission, we'd also like to use analytics to understand how SpendSense is used and improve it." Link: "Cookie policy" → `/cookies`.
- Three buttons:
  - **Accept all** → `writeConsentToDocument(createConsent({ analytics: true }))`
  - **Reject all** → `writeConsentToDocument(createConsent({ analytics: false }))`
  - **Manage preferences** → opens the preferences dialog
- **Accept all and Reject all must have equal visual prominence** (same size, same style weight, side by side). No "dark patterns": no pre-selection, no guilt wording, no hiding Reject behind Manage.
- Hides once a decision is saved (listen for `CONSENT_CHANGED_EVENT`).
- Accessible: `role="region"` with an `aria-label` (for example "Cookie consent"), reachable by keyboard, doesn't steal focus on page load.

### Preferences dialog (`cookie-preferences-dialog.tsx`, client component)
- Opened from the banner's "Manage preferences" and from every "Cookie settings" link.
- Two rows:
  - **Strictly necessary** (always on): explain they keep you signed in, protect forms and remember your cookie choice. Toggle shown on and disabled, with text "Always on".
  - **Analytics** (optional): explain Google Analytics, Vercel Web Analytics and Plausible are used only to understand how SpendSense is used and improve it. Toggle **off by default**, or reflecting the current saved choice.
- Buttons: **Save preferences**, plus **Accept all** and **Reject all** (equal prominence).
- **Withdrawal:** if analytics goes from allowed to not allowed, after saving call `clearAnalyticsCookies()` and then `window.location.reload()`, so already-loaded analytics scripts are fully stopped.
- Proper modal behaviour: focus moves into the dialog on open, is trapped while open, Escape closes, focus returns to the element that opened it. A native `<dialog>` with `showModal()` is fine.

### "Cookie settings" links
- Add a "Cookie settings" link or button in the **marketing footer**, any **app footer**, and on the **cookie policy page**. It opens the preferences dialog.
- Opening from anywhere: use a small shared mechanism (for example a custom event `ss:open-cookie-settings` that the dialog listens for, or a context provider in the root layout). Keep it simple and document it in the file guide.

### Analytics loader (`analytics-loader.tsx`, client component, rendered in the root layout)
- Renders **nothing** until `hasConsent(consent, "analytics")` is `true`. Re-checks when `CONSENT_CHANGED_EVENT` fires, so accepting starts analytics without a reload.
- When allowed, renders each tool **only if its env variable is set**:
  - **Vercel Web Analytics:** `<Analytics />` from `@vercel/analytics/next` when `process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true"`.
  - **Google Analytics 4:** `<GoogleAnalytics gaId={...} />` from `@next/third-parties/google` when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set.
  - **Plausible:** `next/script` loading `https://plausible.io/js/script.js` with `data-domain={NEXT_PUBLIC_PLAUSIBLE_DOMAIN}` and `strategy="afterInteractive"`, when that variable is set.
- Never send personal data to analytics: no user IDs, emails or names, no custom events containing them.
- Check each package's current docs for the exact import paths and props for the installed versions; if they differ from the above, follow the docs and note it in your summary.

### Cookie policy page (`/cookies`)
- Plain-English page in the marketing layout. Sections: what cookies are; strictly necessary cookies; analytics (optional); how to change your choice (with a "Cookie settings" button); how long choices last (6 months, then we ask again); contact.
- A table of cookies:

| Cookie | Set by | Purpose | Type | Lasts |
|---|---|---|---|---|
| `authjs.session-token` (`__Secure-` prefix on HTTPS) | SpendSense | Keeps you signed in | Strictly necessary | Up to 7 days |
| `authjs.csrf-token` | SpendSense | Protects sign-in forms from cross-site attacks | Strictly necessary | Browser session |
| `authjs.callback-url` | SpendSense | Remembers where to return after sign-in | Strictly necessary | Browser session |
| Google sign-in state and PKCE cookies | SpendSense | Secure Google sign-in | Strictly necessary | About 15 minutes |
| `ss_consent` | SpendSense | Remembers your cookie choice | Strictly necessary | 6 months |
| `_ga`, `_ga_<ID>` | Google Analytics | Distinguishes visitors to count usage | Analytics (only with consent) | Set by Google (check Google's current documentation and state it) |

- Add a line: "Vercel Web Analytics and Plausible don't use cookies. We only load them if you allow analytics."
- Verify every cookie name and lifetime against the actual browser (DevTools → Application → Cookies) and against Google's documentation for GA. If anything differs, use the real values and note it in your summary.
- Never describe SpendSense as giving financial advice (B6 copy rules still apply).

## 2. Account deletion UI

### Data for the dialog
- In the settings page (server component, inside `<Suspense>`), call `getDeletionProof()` from `@/features/auth/queries`. It returns `"password"`, `"email"`, or `null` (not signed in). Pass it as a prop to the client dialog component.
- **The server re-checks this itself.** The prop only decides which field to show.

### Danger zone section (in `/settings`, following Figma placement)
- A clearly separated "Danger zone" section (visual separation and a heading; use the token for destructive or error colour, not raw red).
- Contains:
  - **Change password** (the existing B6 form or a link to it, whichever matches the design).
  - **Delete account:** short explanation and a **Delete account** button that opens the dialog.
- If `getDeletionProof()` returns `"email"` (Google-only account), the change-password part should say this account signs in with Google and has no password yet, with a link to `/forgot-password` to set one.

### Delete-account dialog (`delete-account-dialog.tsx`, client component)
- Uses `useActionState(requestAccountDeletion, { status: "idle" })` from `@/features/auth/actions/delete-account`.

```ts
type DeleteAccountState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<"password" | "confirmEmail", string[]>> };
```

- Content:
  - Heading: "Delete your account?"
  - Text: "Your account will be **permanently deleted after 2 days**, along with all your data. You'll be signed out on all devices straight away. We'll email you a link to reactivate your account if you change your mind within that time." Derive "2 days" from `DELETION_GRACE_MS` (`@/lib/account-deletion`), don't hard-code it.
  - **If proof is `"password"`:** field `name="password"`, `type="password"`, `autoComplete="current-password"`, label "Enter your password to confirm", with a show/hide toggle (reuse your password input).
  - **If proof is `"email"`:** field `name="confirmEmail"`, `type="email"`, `autoComplete="off"`, label "Type your account email to confirm". Don't pre-fill it.
  - Buttons: **Cancel** (closes, the default focus) and **Delete my account** (destructive style, disabled while pending).
- Show `message` in an alert and `fieldErrors` under the field. Messages come from the server; don't rewrite them.
- On success the action signs the user out and redirects through `/api/session/clear?reason=deletion-scheduled` to `/login?status=deletion-scheduled`. Don't add any client-side redirect.
- Modal behaviour as for the preferences dialog (focus in, trapped, Escape closes, focus returns). Initial focus on **Cancel**, never on the destructive button.

### Reactivate-account page (`/reactivate-account`, restyle; keep behaviour)
`searchParams`: `token?`, `status?`

| State | When | Content |
|---|---|---|
| Confirm | `token` present, no `status` | "Reactivate your account" + "Your account is scheduled for deletion. Confirm below to keep it." + **Keep my account** button (`reactivateAccount`, hidden `token`). Opening the link must not change anything. |
| Sent | `status=sent` | "If that email belongs to an account scheduled for deletion, we've sent a new reactivation link. It works until the scheduled deletion time." |
| Limited | `status=limited` | "Too many requests. Please wait a while before asking for another link." |
| Invalid (default) | anything else, including `invalid`, `invalid-email`, no token | "This link is invalid or has expired" + "If your account is still scheduled for deletion, enter your email and we'll send a new reactivation link." + form (`resendReactivation`, field `email`, `autoComplete="email"`). For `invalid-email`, show "Enter a valid email address." |

### New login banners (`/login`)
Add to the existing known-values banner logic:
- `status=deletion-scheduled` → "Your account is scheduled for deletion. We've emailed you a link to reactivate it within 2 days." (derive the days from `DELETION_GRACE_MS`)
- `status=reactivated` → "Your account has been reactivated. Sign in to continue."
- `error=AccountPendingDeletion` → "This account is scheduled for deletion. Use the link in your email to reactivate it." plus a `<Link href="/reactivate-account">Send a new link</Link>`.
- The password form's `account_pending_deletion` message already comes from the server. If you can, show a "Send a new link" link to `/reactivate-account` next to it when that message appears (match on the exact server message text, or ask Elizabette to expose a code if matching text feels fragile).

## Testing checklist

1. `npm run check` passes; the landing page is still prerendered (static) in the build output.
2. **Fresh browser (no cookies):** banner shows on every page; DevTools shows no `_ga` cookies and no requests to Google Analytics, Plausible or Vercel analytics endpoints.
3. **Reject all:** banner disappears; still no analytics requests or cookies after reload.
4. **Accept all:** analytics loads without reload (with the env variables set); reload keeps it.
5. **Manage preferences:** toggling analytics on and saving behaves like Accept all; off like Reject all.
6. **Withdraw from Cookie settings:** `_ga` cookies are removed, page reloads, no further analytics requests.
7. **Equal prominence:** Accept all and Reject all look equally prominent in the banner and dialog.
8. **Expired or tampered consent:** edit `ss_consent` to nonsense in DevTools, reload → banner shows again.
9. **Cookie policy:** every listed cookie matches what DevTools shows; "Cookie settings" on the page opens the dialog.
10. **Danger zone, password account:** wrong password shows a field error; correct password ends at `/login?status=deletion-scheduled` with the banner; cookies cleared (including `ss_consent`, so the cookie banner appears again).
11. **Danger zone, Google-only account:** the email field shows instead of password; wrong email shows a field error; correct email schedules deletion.
12. **Reactivate:** email link → Confirm page (nothing changes until clicked) → `/login?status=reactivated` banner; resend form shows the sent state.
13. **Google sign-in on a scheduled account** → `/login?error=AccountPendingDeletion` banner with the link.
14. Keyboard only: banner, dialogs and Danger zone all usable with Tab, Enter, Space and Escape; focus always visible.

## Part 2: update the file guide

- In `docs/auth/file-guide.md`, add entries (same template as before, one file at a time, commit after each) for every new file, backend included (read only):
  - `src/lib/consent.ts`, `src/lib/session.ts`, `src/lib/account-deletion.ts`
  - `src/features/auth/queries.ts`, `stale-session-guard.tsx`, `actions/delete-account.ts`, `actions/reactivate-account.ts`
  - `src/app/api/session/clear/route.ts`, `src/app/api/cron/purge-deleted-accounts/route.ts`
  - Every component and page you created or changed in B7
- Update existing entries that changed (`tokens.ts`, `email.ts`, `rate-limit.ts`, `credentials.ts`, `auth.ts`, `activity-tracker.tsx`, `(app)/layout.tsx`, `next.config.ts`, the schema entry).
- Add to "How it all connects":
  - the new files in the dependency map
  - **Account deletion lifecycle** (`stateDiagram-v2`): Active → Scheduled (request) → Active (reactivate) / Deleted (purge after deadline)
  - **Request flow: deleting an account** (`sequenceDiagram`): dialog → `requestAccountDeletion` → proof check → schedule + `sessionVersion` + 1 → token → email in `after()` → `signOut` → `/api/session/clear` (`Clear-Site-Data`) → `/login?status=deletion-scheduled`
  - **Cookie consent flow** (`flowchart`): first visit → banner → Accept / Reject / Manage → `ss_consent` cookie → `CONSENT_CHANGED_EVENT` → analytics loader → tools load only with consent; withdrawal → clear `_ga` → reload
- Note anything surprising under "Notes", without fixing backend code.

## Hand-back summary

- Components and pages built or changed
- Screens designed without a Figma frame
- Any package API that differed from this brief
- Cookie names or lifetimes that differed from the table
- Any backend gap you hit (without fixing it)
- Anything in the file guide's "Notes" for Elizabette
- The commit list (`git log --oneline main..HEAD`)
