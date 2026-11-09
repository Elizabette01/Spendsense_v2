# SpendSense B6 brief: landing page and authentication pages (for Claude Code)

Last updated: 9 Nov 2026 (landing page added to scope; B6-0 done; commit-per-change rule and end-of-task file guide)

## Your role

- You build the **frontend only**: the **landing page** and the **authentication pages**, plus their components, all from the Figma designs.
- **Elizabette owns all backend code.** Never create, edit or delete backend files (list below). If a page needs something the backend doesn't provide, **stop and say what's missing** instead of writing it.
- **Never delete any file without Elizabette's explicit approval.** Ask first, say which file and why, and wait for a yes.
- Read `CLAUDE.md` and `AGENTS.md` first. Read `claude/spendsense-handoff-step3.md` for context.
- Create a branch **before** your first commit (`feat/landing-and-auth-pages`). Run `npm run check` before every push; it must pass.
- The work has **two parts, in order**:
  1. **Build the pages:** shared UI components → authentication pages → landing page → testing.
  2. **Write the file guide** (see "Part 2" at the end).

## Commit every change

- **Commit after each change**, as you make it. Don't batch work into one large commit at the end.
- One commit = one logical change. For example: one shared UI component, one page, one landing-page section, one restyle, one fix. If you touch several files for a single purpose (a component plus the page that uses it), they can go in one commit.
- Use conventional commit messages, matching the repo's history:
  - `feat(ui): add button and input components from Figma`
  - `feat(auth-ui): build login page from Figma`
  - `style(auth-ui): restyle verify-email page`
  - `feat(landing): add hero section`
  - `feat(landing): add pricing section`
  - `fix(auth-ui): move searchParams read inside Suspense`
  - `docs(auth): add file guide entry for src/auth.ts`
- Before each commit, run at least `npm run lint` and `npx tsc --noEmit`. Run the full `npm run check` before every push and before handing back.
- Never commit `.env*` files, secrets, or temporary test pages.
- Never rewrite history (`--amend` on pushed commits, `rebase -i`, `push --force`). `main` is protected; all work goes through the PR.

## B6-0 status: done

Elizabette has completed these backend changes. Confirm they exist before you start (read only, don't edit):

- `src/auth.config.ts` has `pages: { signIn: "/login", error: "/login" }`.
- `src/features/auth/redirect.ts` exports `safeCallbackUrl()` (used by the actions; you never call it from the UI).
- `signInWithPassword` in `src/features/auth/actions/sign-in.ts` reads a `callbackUrl` form field.
- `signInWithGoogle(formData)` exists in the same file and reads `callbackUrl`.
- `signOutAction()` exists in `src/features/auth/actions/sign-out.ts`.
- `changePassword` redirects to `/login?status=password-changed` on success.

If anything here doesn't match, stop and tell Elizabette.

## Design source: Figma

- **Use the Figma designs for every page, including the landing page.** File key `mgf2GJR0QdxCas9EqRDXaK`, read-only via the Figma connector (View seat, so read with `get_design_context`, `get_screenshot`, `get_variable_defs`, `get_metadata`, `download_assets`; you cannot edit the file).
- Find the frames for: **landing page**, login (sign in), sign up, check your email, verify email, forgot password, reset password, and settings/change password. Match layout, spacing, typography and components for both **desktop and mobile** frames.
- **Where a screen has no Figma frame** (likely: verify email states, reset password states, link expired, too many attempts, account-not-linked message), build it from the **closest existing frame's** layout and components, so every screen feels like one family. List these in your hand-back summary so Elizabette can review them.
- **If the landing page has no Figma frame at all, stop and tell Elizabette** before designing one from scratch.
- **Colours, type and spacing come from the Tailwind v4 tokens in `src/app/globals.css`** (taken from Figma and adjusted to WCAG AA). Use the tokens; never hard-code hex values from Figma, because the tokens deliberately differ where contrast was fixed.
- Font: Inter via `next/font` (already set up in the root layout through `--font-inter`).
- Reuse or add shared UI pieces in `src/components/ui/` (input, button, field error, alert, card). Auth-specific components go in `src/features/auth/components/`; landing-page sections go in `src/features/marketing/components/`.
- Images and illustrations from Figma go in `public/images/` (export with `download_assets`, or ask Elizabette if export isn't allowed with her seat). Use `next/image` with meaningful `alt` text (or `alt=""` for decorative images).

## Files you may create or edit

### Landing page
- `src/app/(marketing)/page.tsx` (the landing page, served at `/`)
- `src/app/(marketing)/layout.tsx` (marketing header and footer, if the design has them)
- `src/features/marketing/components/**`
- `public/images/**` (Figma assets)

**The existing `src/app/page.tsx` also resolves to `/`.** Two pages for the same URL break the build. If `src/app/page.tsx` is still the default `create-next-app` page (or a placeholder), **ask Elizabette for approval to delete it** before creating `(marketing)/page.tsx`. Don't delete it without a yes. If it contains real work, stop and ask what to do.

### Authentication
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`
- `src/app/(auth)/verify-email/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx` (restyle the existing minimal pages, keeping their behaviour exactly)
- `src/app/(auth)/layout.tsx` (an auth shell for these pages, if the designs share one)
- `src/app/(app)/settings/password/page.tsx` (or wherever the Figma settings design places change password, under `/settings`)
- `src/features/auth/components/**`

### Shared
- `src/components/ui/**`
- In `src/app/(app)/layout.tsx`, you may later add the app shell around `{children}`, but **keep the existing `<Suspense fallback={null}><ActivityTracker /></Suspense>` block unchanged.**
- `docs/auth/file-guide.md` (Part 2 only)

## Files you must not touch

- `src/app/layout.tsx` (root layout) except to read it. If the landing page needs a change there (for example metadata), ask first.
- `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, `src/types/next-auth.d.ts`
- `src/lib/**` (db, password, password-rules, rate-limit, tokens, email, request, activity)
- `src/features/auth/actions/**`, `src/features/auth/credentials.ts`, `src/features/auth/schemas.ts`, `src/features/auth/redirect.ts`, `src/features/auth/activity-tracker.tsx`
- `src/app/api/**`, `prisma/**`, `next.config.ts`, `package.json` scripts, `.env*`, `.github/**`
- `src/app/admin/**` (separate future step)

You may **import** from `src/lib/password-rules.ts` (browser-safe constants) and the action files. Never import `src/lib/password.ts`, `db.ts`, `tokens.ts`, `email.ts` or anything marked `server-only` into a client component.

In Part 2 you **read** the backend files to document them. Reading is fine; editing is not.

## Critical technical rules

### 1. Cache Components: Suspense around anything request-specific
- Cache Components is enabled. Anything that reads the request (`searchParams`, `params`, `headers()`, `cookies()`, `auth()`) must be inside `<Suspense>`, or `next build` fails with "Error occurred prerendering page".
- Pattern used throughout:

```tsx
type SearchParams = Promise<{ status?: string }>;

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main>
      <Suspense fallback={<FormSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const { status } = await searchParams;
  // ...
}
```

- The page itself is **not** `async` and does not `await`. It passes the promise down. The static shell (heading, layout) can sit outside the Suspense boundary.
- `npm run dev` doesn't pre-render, so only `npm run check` (which runs `next build`) catches mistakes here.
- Every `page.tsx` and `layout.tsx` must export a default component. An empty file breaks the build.

### 2. Server actions and forms
- **State-returning actions** (`register`, `signInWithPassword`, `changePassword`) are used with React's `useActionState` in a **client component** (`"use client"`). The page (server component) renders that client component and passes it any values read from `searchParams` as props.
- **Redirecting actions** (`verifyEmail`, `resendVerification`, `requestPasswordReset`, `resetPassword`, `signInWithGoogle`, `signOutAction`) are passed straight to `<form action={...}>`. They redirect with `?status=` / `?error=`, and the page reads those.
- **Form field `name` attributes must match exactly** (tables below).
- Show a pending state while submitting (`useActionState`'s `isPending`, or `useFormStatus` in a submit button): disable the button and show progress.
- Forms must work without JavaScript where they already do (the redirecting ones). Don't replace `<form action>` with `onClick` + `fetch`.

### 3. Never do these
- Never log, store or persist form values (no `localStorage`, `sessionStorage`, analytics on fields).
- Never redirect on the client using `callbackUrl`. It only travels in a hidden input to the server actions, which validate it.
- Never add password composition rules ("must contain a symbol"), strength meters that imply rules, or block pasting. The rule is **12–128 characters**, nothing else.
- Never change wording in a way that reveals whether an email has an account (see copy rules).
- Never link to `/api/auth/signin`. Use `<Link href="/login">` from `next/link` for internal pages.
- Never add HTML `minLength`/`maxLength` on password inputs (the browser counts characters differently from the server).

## Landing page specification (`/`)

### Behaviour
- **Keep it static:** no `auth()`, `cookies()`, `headers()` or `searchParams` on the landing page. It pre-renders fully, loads fast and is good for search engines. (Signed-in users who click "Log in" are redirected to `/dashboard` by the proxy, so the page doesn't need to know who's signed in.)
- Calls to action: "Get started" → `<Link href="/signup">`; "Log in" → `<Link href="/login">`. Use the button labels from the Figma design if they differ.
- Page-specific `export const metadata` (title and description) in `(marketing)/page.tsx` is fine.
- Sections, content and order **follow the Figma frame**. Expected (confirm against the design): hero, how it works (upload a statement → automatic categories → dashboard and insights), features, **pricing**, FAQ (if designed), final call to action, footer.

### Pricing section
- Explain the plans **visually**, as the design shows (plan cards or a comparison table):
  - **Free:** statement upload (CSV and PDF), automatic categorisation, dashboard charts, recurring payment detection, budgets.
  - **Pro:** everything in Free, plus the **AI advisor chat**. **£4.99/month or £49.99/year**, with a **7-day free trial**.
- **Prices are placeholders.** Keep them in one constant (for example `src/features/marketing/pricing.ts`) so they're easy to change, and use them everywhere they appear.
- If the design has a monthly/annual toggle, it can be a small client component. Default to monthly.
- Plan buttons go to `/signup`. There's no checkout yet (Stripe is a later step).

### Copy rules for the landing page (FCA and honesty)
- **Never describe SpendSense as financial advice** or as a replacement for a regulated financial adviser. The AI advisor gives **budgeting and saving insights and general financial education**, not personal product recommendations. Prefer "money insights", "budgeting assistant" or "AI money coach" style wording over "financial advisor". If the Figma copy says "financial advisor" or "financial advice", use the safer wording and list the change in your hand-back summary.
- Include a short footer line, for example: "SpendSense provides general information and budgeting insights, not regulated financial advice. For free, impartial guidance, visit MoneyHelper." with a link to `https://www.moneyhelper.org.uk`.
- **No invented testimonials, user counts, ratings, press logos or statistics.** If the design has placeholders for these, leave the section out (or keep clearly labelled placeholder text) and list it in your summary.
- No claims you can't support (for example "bank-level security", "trusted by thousands"). Factual statements about what the app does are fine.
- Footer links to legal pages (Privacy, Terms) can point to `#` for now; list them in your summary as missing pages.

### Landing page quality
- Responsive at 320px, tablet and desktop, matching the Figma frames.
- One `<h1>` (the hero heading), then a logical heading order.
- Images through `next/image` with sizes set; the hero image (if any) uses `priority`.
- Keyboard navigable, visible focus, sufficient contrast (tokens already meet AA).

## Action contracts (authentication)

### `register(prevState, formData)` → `RegisterState`
File: `src/features/auth/actions/register.ts`

```ts
type RegisterState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<"name" | "email" | "password", string[]>> };
```

| Field | `name` | `type` | `autoComplete` |
|---|---|---|---|
| Name | `name` | text | `name` |
| Email | `email` | email | `email` |
| Password | `password` | password | `new-password` |

- On `success`, replace the form with a **"Check your email"** view (same page, no redirect).
- Show `message` in an alert and each `fieldErrors[field][0]` under its field.

### `signInWithPassword(prevState, formData)` → `SignInState`
File: `src/features/auth/actions/sign-in.ts`

```ts
type SignInState = { status: "idle" } | { status: "error"; message: string };
```

| Field | `name` | `type` | `autoComplete` |
|---|---|---|---|
| Email | `email` | email | `email` |
| Password | `password` | password | `current-password` |
| Return path | `callbackUrl` | hidden | n/a (value from `searchParams.callbackUrl`) |

- On success the action redirects (to a validated `callbackUrl`, default `/dashboard`). Show `message` on error. Messages already come from the server; don't rewrite them.

### `signInWithGoogle(formData)` (redirects)
File: `src/features/auth/actions/sign-in.ts`
- Hidden field `callbackUrl`. Renders as a "Continue with Google" button inside its own `<form>`. Follow Google's branding guidance and the Figma design.

### `changePassword(prevState, formData)` → `ChangePasswordState`
File: `src/features/auth/actions/change-password.ts`

```ts
type ChangePasswordState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<"currentPassword" | "newPassword", string[]>> };
```

| Field | `name` | `autoComplete` |
|---|---|---|
| Current password | `currentPassword` | `current-password` |
| New password | `newPassword` | `new-password` |

- On success the user is signed out everywhere and redirected to `/login?status=password-changed`. Say so in helper text before they submit ("You'll be signed out on all devices").
- The message for Google-only accounts comes from the server; show it as-is.

### `verifyEmail(formData)` and `resendVerification(formData)` (redirect)
File: `src/features/auth/actions/verify-email.ts`
- `verifyEmail` hidden field: `token`. `resendVerification` field: `email` (`autoComplete="email"`).

### `requestPasswordReset(formData)` and `resetPassword(formData)` (redirect)
File: `src/features/auth/actions/password-reset.ts`
- `requestPasswordReset` field: `email`.
- `resetPassword` fields: hidden `token`, and `password` (`autoComplete="new-password"`).

### `signOutAction()` (redirect)
File: `src/features/auth/actions/sign-out.ts`
- A sign-out button in a `<form action={signOutAction}>`. Redirects to `/`. Place it where the Figma app or settings design shows it.

## Authentication page specifications

### `/login`
`searchParams`: `callbackUrl?`, `error?`, `status?`

- Email and password form (`signInWithPassword`), "Continue with Google" (`signInWithGoogle`), links to `/forgot-password` and `/signup`.
- Pass `callbackUrl` (if present) into **both** forms as a hidden input.
- Banners from the URL:
  - `status=password-changed` → "Your password was changed. Sign in with your new password."
  - `error=OAuthAccountNotLinked` → "This email already has a SpendSense password. Sign in with your email and password instead."
  - `error=AccessDenied` → "We couldn't sign you in with Google. Please try another method."
  - any other `error` → "Something went wrong signing in. Please try again."
- Show banners with known values only; never print raw `searchParams` text.

### `/signup`
- Registration form (`register`), "Continue with Google", link to `/login`.
- Password helper text: "Use 12 to 128 characters. Longer passphrases are great." Use `PASSWORD_MIN_LENGTH` and `PASSWORD_MAX_LENGTH` from `@/lib/password-rules`, not hard-coded numbers.
- Success view: "Check your email. We've sent a link to finish setting up your account. It expires in 24 hours." Plus a note to check spam, and a link back to `/login`.

### `/verify-email` (restyle; keep behaviour)
`searchParams`: `token?`, `status?`

| State | When | Content |
|---|---|---|
| Confirm | `token` present, no `status` | "Verify your email" + **Confirm my email** button (`verifyEmail`, hidden `token`). Opening the link must not change anything; only the button does. |
| Verified | `status=verified` | "Email verified" + `<Link href="/login">` styled as a button (replaces the temporary `signIn()` form) |
| Sent | `status=sent` | "If that email has an account waiting to be verified, we've sent a new link. It expires in 24 hours." |
| Limited | `status=limited` | "Too many requests. Please wait a while before asking for another email." |
| Invalid (default) | anything else, including `invalid`, `invalid-email`, no token | "This link is invalid or has expired" + resend form (`resendVerification`, field `email`). For `invalid-email`, show "Enter a valid email address." |

### `/forgot-password` (restyle; keep behaviour)
`searchParams`: `status?`

| State | Content |
|---|---|
| Default | Email form (`requestPasswordReset`), link back to `/login` |
| `status=sent` | "If that email has a SpendSense account, we've sent a link to reset your password. It expires in 1 hour." |
| `status=limited` | "Too many requests. Please wait a while before asking for another reset email." |
| `status=invalid-email` | Default form + "Enter a valid email address." |

### `/reset-password` (restyle; keep behaviour)
`searchParams`: `token?`, `status?`, `error?`

| State | Content |
|---|---|
| Form | `token` present, no `status`: "Choose a new password", hidden `token`, `password` field, helper text with the 12–128 rule. Errors: `error=length` → "Use between 12 and 128 characters." (from the constants); `error=pwned` → "This password has appeared in a data breach. Choose a different one." |
| `status=done` | "Password updated. You've been signed out on all devices." + `<Link href="/login">` styled as a button (replaces the temporary `signIn()` form) |
| `status=limited` | "Too many attempts. Please wait a while, then open the link from your email again." |
| Invalid (default) | "This link is invalid or has expired. Reset links work once and expire after 1 hour." + `<Link href="/forgot-password">Request a new link</Link>` |

### `/settings/password` (inside `(app)`)
- Change-password form (`changePassword`). Helper text about being signed out on all devices.
- Follow the Figma settings design for placement (a section within `/settings` is fine if that's how the design shows it).

## Copy rules (anti-enumeration)

- Never say or imply "no account with this email", "this email is already registered" (on screen), or "we sent you an email" as a certainty. Use "If that email has an account…" wording exactly as above.
- Sign-in failures: show the server's message only ("Email or password is incorrect." covers both unknown email and wrong password).
- Keep the meaning of every message above. You may adjust tone to match the design system, but don't add detail.

## Accessibility (WCAG AA, all pages)

- Every input has a visible `<label>` (not placeholder-only).
- Field errors: linked with `aria-describedby`; inputs get `aria-invalid="true"` when they have an error.
- Form-level messages and banners: `role="alert"` (errors) or `role="status"` (neutral info).
- After a failed submit, move focus to the first field with an error, or to the alert.
- Password inputs get a show/hide toggle (`aria-pressed`, label "Show password").
- Colour is never the only signal for errors. Visible focus styles on all interactive elements.
- Pages must work at 320px wide and with 200% zoom.

## Suggested component structure

- **Shared UI (`src/components/ui/`):** button, input, form-field (label + input + error), form-alert, card.
- **Auth (`src/features/auth/components/`):**
  - `auth-card.tsx`: shared shell (logo, heading, content), from Figma.
  - `login-form.tsx`, `signup-form.tsx`, `change-password-form.tsx`: client components using `useActionState`.
  - `google-button.tsx`: form posting to `signInWithGoogle` with hidden `callbackUrl`.
  - `password-input.tsx`: input with show/hide toggle.
  - `submit-button.tsx`: uses `useFormStatus` for the pending state.
- **Landing (`src/features/marketing/components/`):** one component per section (`hero.tsx`, `how-it-works.tsx`, `features.tsx`, `pricing.tsx`, `faq.tsx`, `cta.tsx`, `site-header.tsx`, `site-footer.tsx`), plus `src/features/marketing/pricing.ts` for the price constants.

## Testing checklist (do these before Part 2)

1. `npm run check` passes (lint, typegen, typecheck, build).
2. Every page renders on desktop and at mobile width; matches Figma.
3. **Landing:** `/` loads with no console errors; "Get started" goes to `/signup`, "Log in" to `/login`; pricing shows the placeholder prices from the constants; the MoneyHelper link works; the page is static in the build output (shown as prerendered).
4. `/dashboard` while signed out → `/login?callbackUrl=%2Fdashboard` → sign in → lands on `/dashboard`.
5. `/login?callbackUrl=//evil.com` → sign in → lands on `/dashboard`, never off-site.
6. Register shows field errors for a short password and for `correct horse battery staple`; a valid sign-up shows the "Check your email" view.
7. Unverified sign-in shows the "verify your email first" message; wrong password shows the generic message.
8. Verify link shows the Confirm button; confirming shows the verified state with a link to `/login`.
9. Forgot → email → reset form; `length` and `pwned` errors keep the form usable; success shows the done state.
10. Change password: wrong current password shows a field error; success redirects to `/login?status=password-changed` with the banner.
11. Google sign-in on an email that has a password account shows the account-not-linked banner on `/login`.
12. Sign-out button signs out and lands on `/`.
13. Keyboard-only: every flow completes with Tab, Enter and Space; focus is always visible.

---

## Part 2: file guide and relationship diagram

**When:** only after Part 1 is finished, tested and committed.

**Output:** a new file, `docs/auth/file-guide.md`, committed in the same PR.

**Purpose:** Elizabette is building SpendSense to learn every layer. This guide is her map of the authentication system and the pages around it: what each file does, what it depends on, and how everything connects. Write for a developer who is learning: clear and plain, accurate, no padding.

### Scope: every file involved in authentication, plus the landing page
Document **all** of these, backend and frontend, including the files you built:

- **Config and entry points:** `src/auth.config.ts`, `src/auth.ts`, `src/proxy.ts`, `src/types/next-auth.d.ts`, `src/app/api/auth/[...nextauth]/route.ts`, the auth-related parts of `next.config.ts`
- **Library:** `src/lib/db.ts`, `password-rules.ts`, `password.ts`, `rate-limit.ts`, `tokens.ts`, `email.ts`, `request.ts`, `activity.ts`
- **Feature logic:** `src/features/auth/schemas.ts`, `credentials.ts`, `redirect.ts`, `activity-tracker.tsx`, and every file in `src/features/auth/actions/`
- **UI:** every page, layout and component you created or restyled (landing page and its sections, auth pages, `(app)/layout.tsx`, settings password page, `src/features/auth/components/**`, `src/features/marketing/**`, `src/components/ui/**`)
- **Database:** the auth-related models in `prisma/schema.prisma` (`User`, `Account`, `AuthToken`, `RateLimit`, `ActivityEvent`) as one entry

If you find another file that takes part in authentication, include it and say why.

### Method: one file at a time
- **Finish one file's entry completely before starting the next.** Read the file in full, write its entry, then move on. Don't skim everything first and write all entries together.
- **Commit after each entry** (or after each small group of closely related files, such as all the action files, or all the landing sections), using `docs(auth): ...` messages.
- Order: config and entry points → library → feature logic → UI → database. Within a group, go from most depended-on to least.
- **Describe what the code actually does**, from reading it. If something looks wrong, surprising or inconsistent, **don't fix it**. Note it in that entry under "Notes" and list it again in your hand-back summary.

### Entry template (use for every file)

```md
### `src/path/to/file.ts`

**What it does:** 2–4 sentences in plain English.

**Runs on:** server only / browser / both. Say if it's `server-only`, a server action file (`"use server"`), or a client component (`"use client"`).

**Exports:**
- `name`: one line on what it is and when it's used

**Depends on (imports):**
- Internal: `@/lib/db` (why it's needed), …
- Packages: `argon2` (why), …
- Environment variables read: `RESEND_API_KEY`, … (or "none")

**Used by (imported by):**
- `src/…` (what for)

**Security notes:** anything this file does to protect users (rate limiting, timing, enumeration, validation, token handling). Write "none" if it has no security role.

**Notes:** anything surprising, fragile or worth knowing later. Omit if empty.
```

Find "Used by" with a search of the codebase for imports of each file, not from memory.

### At the start of the guide
- A short introduction (3–5 sentences): what the guide covers and how to read it.
- A table of contents linking to each entry.

### At the end of the guide: pictorial view
Add a section **"How it all connects"** containing **Mermaid diagrams** (fenced with ```` ```mermaid ````, so they render on GitHub and in VS Code). Include:

1. **File dependency map** (`flowchart LR`): every documented file as a node, an arrow from each file to what it imports. Group nodes with `subgraph` blocks: Config, Library, Feature logic, UI (Landing, Auth pages, App), Database. Keep labels short (file names, not full paths).
2. **User journey** (`flowchart LR`): landing page → sign up → check email → verify → log in → dashboard, with the Google path and forgot/reset path branching off.
3. **Request flow: password sign-in** (`sequenceDiagram`): Browser → `/login` page → `signInWithPassword` → `signIn` → `authorizeCredentials` → rate limit → database → Argon2 → `jwt` callback → cookie → redirect via `safeCallbackUrl`.
4. **Request flow: visiting a protected page** (`sequenceDiagram`): Browser → `proxy.ts` (cookie check, redirect to `/login?callbackUrl=` if signed out) → page → `auth()` → `jwt` callback (`sessionVersion` and role check in the database) → `ActivityTracker` → `recordActivity` in `after()`.
5. **Request flow: password reset** (`sequenceDiagram`): forgot form → `requestPasswordReset` → `after()` → token plus email → reset page → `resetPassword` (validate, HIBP, hash **before** consuming the token) → transaction (new hash, `sessionVersion` + 1) → notice email.

After the diagrams, add a short **"Reading the diagrams"** paragraph explaining the arrows and groups.

Check that every diagram renders (preview the markdown in VS Code) before committing.

## Hand-back summary

When both parts are finished, list:
- Pages built and components created (landing and authentication)
- Any screen designed without a Figma frame
- Any landing-page copy you changed for FCA or honesty reasons, and any placeholder sections left out
- Missing pages linked from the landing page (Privacy, Terms, etc.)
- Any file you asked to delete, and Elizabette's answer
- Any backend gap you hit (without fixing it)
- Anything in the file guide's "Notes" that Elizabette should look at
- Anything you were unsure about
- The commit list (`git log --oneline main..HEAD`)
