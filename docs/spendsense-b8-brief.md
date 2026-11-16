# SpendSense B8 brief: from imports to a working dashboard (for Claude Code)

Last updated: 16 Nov 2026

## Outcome

A signed-in user can upload a bank statement, confirm it, and see a working dashboard built from their own data, with built-in (rule-based) categories they can correct. A first-time user is taken through onboarding. This is the build Elizabette will demo to her product manager.

**AI categorisation is deliberately left out.** It will be added later this week. Build the categoriser so AI slots in without rework (see Phase 2, "Room for AI").

## Your role in this brief (different from B6 and B7)

- **For B8 only, Elizabette has lifted the ownership split in `CLAUDE.md`.** You write backend and frontend: migrations, server actions, queries, schemas, `src/lib/**`, tests, pages and components.
- Everything else in `CLAUDE.md` and `AGENTS.md` still applies. Read both first, then `docs/spendsense-b6-brief.md` and `docs/spendsense-b7-brief.md` (Suspense, forms, copy and accessibility rules carry over), then this brief.
- **Elizabette is learning the backend.** After each backend change, explain in plain language what you did and why. Each phase ends with file-guide entries she can study (see "File guide").
- **Never delete any file without Elizabette's explicit approval.** Ask, name the file, say why, and wait.
- **Never install, remove or upgrade packages without asking.** `recharts`, `zod`, `papaparse`, `pdf-parse`, `xlsx` and `pdf-lib` are already installed.
- **Don't refactor working code.** If you find a bug in an existing file, fix it in its own commit and report it in the phase summary.
- Never commit or push to `main`, never force-push, never merge a pull request.

## How the work is handed back

- Five phases, in order. **Stop after each phase.**
- At the end of a phase: run `npm run check` (it must pass), push the branch, open a pull request, write the phase summary, and wait for Elizabette's OK. She reviews and merges; you start the next phase on a new branch from the updated `main`.
- Branches: Phase 1 continues on the current branch `feat/step4-u7-import-actions`. Then `feat/categorisation`, `feat/imports-ui`, `feat/dashboard`, `feat/onboarding`.
- Commit after each logical change (one file or one behaviour), with Conventional Commit messages. Run `npm run lint` and `npx tsc --noEmit` before each commit.

## Design source: the `.UI` folder

- Use the PNGs in `.UI/` at the project root. Do not open Figma for this brief.
  - `imports.png`, `Imports — Step 2_ Map Columns.png`, `Imports — Step 3_ Processing.png`, `Imports — Step 4_ Done.png`
  - `dashboard.png`, `Dashboard — Empty State.png`
  - `onboarding 1.png` to `onboarding 5.png`
- Don't edit, move or delete anything in `.UI/`, and don't add it to a commit unless Elizabette says so.
- Match layout, spacing and hierarchy. Use the tokens in `src/app/globals.css` and the components in `src/components/ui/**`; never hard-code hex values.
- **Where the images and this brief disagree, this brief wins.** The known differences are listed in each phase.
- Where there is no image (transactions page, duplicate decisions, failure pop-ups, delete confirmation), build from existing components so it looks like one product, and list those screens in your summary.

## What already exists (read before you start)

All in `src/features/imports/`, with tests passing:

- `parsers/**`: CSV, Excel and PDF readers, column detection, bank profiles, normalising, fingerprints. Don't change behaviour here.
- `schemas.ts`: `columnMappingSchema`, `dateOrderSchema`, `duplicateDecisionsSchema` (default choice plus per-fingerprint overrides).
- `server/read-statement.ts`: `readStatement({ fileName, bytes, options })`, `MAX_FILE_BYTES` (4 MB), `cleanFileName`.
- `server/duplicates.ts`: `findExistingFingerprints`, `flagDuplicates`, `assignFreeFingerprints`.
- `server/build-preview.ts`: `buildPreview`, `isMappableFailure`, and the `StatementPreview` type (file, bank, columns, 20-row sample, flagged rows, issues, summary).
- `actions/preview-statement.ts`: `previewStatement(prevState, formData)` → `PreviewState` (`idle` | `error` with `reason` and `message` | `ready` with `preview`). FormData fields: `file`, optional `mapping` (JSON), optional `dateOrder`.
- `src/lib/rate-limit.ts`: `LIMITS.previewStatementUser` (30/hour) and `LIMITS.importStatementUser` (10/hour).
- `next.config.ts`: Server Actions body limit `4.5mb`; `serverExternalPackages` for `pdf-parse` and `@napi-rs/canvas`.
- Migration `add_statement_import_activity`: `ActivityType.STATEMENT_IMPORT`.

Patterns to copy: `src/features/auth/actions/delete-account.ts` (action shape, numbered steps, rate limit, `after()` with `try/catch`), `src/features/imports/server/duplicates.test.ts` (faking `db` with `vi.hoisted` and `vi.mock`).

## Rules that apply to every phase

**Security and ownership**
- `userId` always comes from the session (`auth()` in actions, `getSession()` in server components). Never from the form or the URL.
- Every query and update is filtered by `userId`. Check ownership before changing or deleting anything.
- Treat every server action as a public API: validate all input with Zod, rate-limit anything that writes.

**Privacy**
- Uploaded files are never stored. Only parsed transactions are kept.
- Never log file contents, descriptions, amounts or error messages from parsers. Log an error's `name` only.
- Never store, log or show sort codes or account numbers.
- Tests and fixtures use invented data only. Never commit a real statement.

**Money and dates**
- Money is integer pence (`amountMinor`; negative means money out). Format for display only at the edge, as GBP.
- Dates are `@db.Date`. Group by month in UTC.

**Locked import rules**
- Nothing with a cost is ever dropped. Only amount-exactly-0 rows are skipped, and they are counted.
- Duplicates are never removed silently. Rows matching an earlier upload are flagged and the user decides.
- The server holds nothing between preview and import. The browser sends the same file again with the final choices.
- GBP only. No AI in parsing.

**Next.js 16**
- Read the relevant guide in `node_modules/next/dist/docs/` before using an API you're unsure of.
- Cache Components is on. Anything that reads the request or the session goes inside `<Suspense>` with a skeleton fallback. Don't add `"use cache"` to user-specific data.
- After a write, refresh what the user sees using the invalidation API the Next.js 16 docs recommend for this setup. Say which one you used in the summary.
- State-returning actions use `useActionState` in a client component.

**Code organisation**
- Features must not import from other features. Code needed by more than one feature goes in `src/lib/`.
- Keep calculation logic in pure functions (rows in, result out) with unit tests; keep database access in thin query functions.

**Copy**
- The app gives general information, not regulated financial advice. No "you should", no promises about savings. Plain, factual wording.

**Accessibility**
- WCAG AA throughout: labels, keyboard use, visible focus, `role="alert"` and `role="status"` where needed, dialogs that trap and return focus, 320px width and 200% zoom.
- Charts need a text alternative (a visually hidden table or summary).

---

## Phase 1: finish the imports backend

Branch: `feat/step4-u7-import-actions` (current).

**1.0 Start**
- Run `git status`. Commit any uncommitted work already on the branch (for example `build-preview.ts`, `preview-statement.ts`) in logical commits after `npm run check` passes. Don't rewrite it.

**1.1 Shared form helpers**
- Move `jsonField` and `textField` from `preview-statement.ts` into `src/features/imports/server/form-fields.ts`; both actions import them.

**1.2 `actions/import-statement.ts`: `importStatement(prevState, formData)`**

FormData: `file`, optional `mapping` (JSON), optional `dateOrder`, `decisions` (JSON, `duplicateDecisionsSchema`).

```ts
type ImportState =
  | { status: "idle" }
  | { status: "error"; reason: ImportFailureReason; message: string }
  | { status: "done"; result: ImportResult };

type ImportResult = {
  statementId: string;
  importedCount: number;
  duplicateCount: number;   // flagged rows the user chose to skip
  skippedCount: number;     // zero-amount rows
  issueCount: number;       // rows that couldn't be read
  categorisedCount: number; // filled in Phase 2 (0 until then)
  needsReviewCount: number; // filled in Phase 2 (= importedCount until then)
  periodStart: string | null; // ISO date
  periodEnd: string | null;
};
```

Steps:
1. Auth.
2. Rate limit: key `import:user:${userId}`, `LIMITS.importStatementUser`. Message: "Too many attempts. Please try again in an hour."
3. Validate input, as in preview, plus `decisions`.
4. `readStatement`.
5. Any remaining statement failure stops the import (the two mappable failures get no pass here; a correct mapping clears them).
6. Fingerprint, look up existing, flag. Always on fresh data.
7. Apply decisions to each flagged row: `overrides[fingerprint]`, else `defaultChoice`. No decision → `reason: "needs_decision"` ("Something changed since the preview. Please check the file again."). `skip` → counted. `import` → `assignFreeFingerprints` with every fingerprint in the file as `reserved`; if it returns `{ ok: false }`, stop with an error.
8. No rows left to save → `reason: "nothing_to_import"`; save nothing.
9. Save in one `db.$transaction` with a longer timeout (20,000 rows is the cap):
   - `Statement`: `COMPLETED`, cleaned file name, file type, bank name, `periodStart` and `periodEnd` (earliest and latest row date, via `isoDateToUtcDate`), `importedCount`, `duplicateCount`, `skippedCount`.
   - `Transaction` rows with `createMany` in chunks of 1,000: `userId`, `statementId`, `date`, `description`, `amountMinor`, `fingerprint`.
   - All or nothing.
10. Prisma `P2002` (two imports racing) → "Please try again." Any other error → log the error name, return `reason: "unexpected"`.
11. In `after()`, with `try/catch`: create an `ActivityEvent` of type `STATEMENT_IMPORT`.
12. Refresh the imports, transactions and dashboard views; return `done`.

**1.3 Statements list and delete**
- `src/features/imports/queries.ts` (`server-only`): `getStatements()` → the signed-in user's statements, newest first: `id`, `fileName`, `fileType`, `bankName`, `createdAt`, `importedCount`, `status`, `periodStart`, `periodEnd`.
- `actions/delete-statement.ts`: `deleteStatement(prevState, formData)` with `statementId`. Auth, rate limit (add `deleteStatementUser: 20/hour` to `LIMITS`), ownership check, delete (transactions cascade), refresh views. Returns `idle | error | done`.

**1.4 Tests**
- `build-preview.test.ts`: totals, date range, sample cap, flagged rows, sort-code sample hidden, PDF has no columns.
- `preview-statement.test.ts` and `import-statement.test.ts`, with `auth`, `rateLimit` and `db` faked: signed out, rate limited, bad input, wrong file type, not a statement, mappable failure still previews, happy path, all-skipped, missing decision, import-anyway gets a new fingerprint, `P2002`.
- `delete-statement.test.ts`: another user's statement can't be deleted.

**1.5 Manual check**
- Add a temporary page under `src/app/dev/` (already used for dev-only pages) to upload a file and print the action result. Don't link it anywhere; remove it in Phase 3 with Elizabette's approval.
- Create `docs/demo/synthetic-statement.csv`: about six months and 300 rows of clearly invented UK transactions (salary, rent, supermarkets, transport, subscriptions, a few one-offs), day-first dates, signed amounts. This is the demo and test file from here on.
- **PDF risk:** `pdf-parse` 2.4.5 has a reported worker-loading error with Next.js 16 Turbopack on Windows. Upload a small synthetic PDF through the dev page. If it fails, don't work around it by changing packages; report the exact error.

---

## Phase 2: built-in categorisation and recategorising

Branch: `feat/categorisation`.

**2.1 Migrations** (one each, named clearly; show Elizabette the SQL in the summary)
- Add `RULE` to the `CategorisedBy` enum.
- New model `MerchantRule` (table `merchant_rules`): `id`, `userId`, `merchantKey`, `categoryId`, timestamps; `@@unique([userId, merchantKey])`; cascade on user and category delete; snake_case via `@map`, like the other models.

**2.2 `src/lib/categorisation/`** (shared by imports, transactions and dashboard)
- `merchant.ts`: `deriveMerchant(description)` → a clean display name (for example "TESCO STORES 4521 LONDON GB" → "Tesco Stores") and `merchantKey(merchant)` → lowercase key. Strip card suffixes, reference numbers, dates, city and country codes, payment-processor prefixes. Pure, tested.
- `rules.ts`: built-in keyword rules mapping to the seeded system category ids in `prisma/seed.ts` (`sys_groceries`, `sys_transport`, …). Cover common UK merchants across every system category. Sign-aware: income categories only for money in; money in from an expense merchant → `sys_refunds`; Monzo pot transfers and own-account transfers → `sys_savings` or `sys_transfers`.
- `categorise.ts`: `categoriseRows(rows, userRules)` → for each row `{ merchant, categoryId: string | null, categorisedBy: "USER" | "RULE" | null }`.
  - Order: the user's `MerchantRule` (→ `USER`), then built-in rules (→ `RULE`), else `null`.
  - **`null` means "needs review".** Don't guess, and don't fall back to `sys_general`.

**Room for AI (do not build now)**
- Keep `categoriseRows` as the single entry point. Leave one clearly commented place where rows still `null` after the rules would be sent to an AI categoriser, which will set `categorisedBy: "AI"`.
- Final order will be: user rule → built-in rule → AI → needs review. AI must never override `USER` or `RULE`.
- Don't call the Anthropic API, add env variables or add AI code in this brief.

**2.3 Wire into the import action**
- Load the user's merchant rules once, run `categoriseRows`, and save `merchant`, `categoryId` and `categorisedBy` with each transaction. Fill `categorisedCount` and `needsReviewCount`.

**2.4 Transactions backend** (`src/features/transactions/`)
- `queries.ts`: `getTransactions({ page, review })` → 50 per page, newest first, with category name; `review: true` returns only rows with no category. `getCategories()` → system categories plus the user's own. `getNeedsReviewCount()`.
- `actions/recategorise.ts`: `recategoriseTransaction(prevState, formData)` with `transactionId`, `categoryId`, `applyToMerchant` (boolean).
  - Auth; rate limit (add `recategoriseUser: 120/hour`); the transaction must belong to the user; the category must be a system category or the user's own.
  - Always: update that transaction, `categorisedBy: USER`.
  - When `applyToMerchant` is true: update every transaction of this user with the same merchant, and upsert the `MerchantRule` so future imports use it.
  - Returns `idle | error | done` with `updatedCount`.

**2.5 Tests**
- `deriveMerchant`, the rules (a table of description → expected category, including sign cases), `categoriseRows` precedence, `recategoriseTransaction` (ownership, foreign category rejected, merchant-wide update, rule upsert).

---

## Phase 3: imports UI and transactions page

Branch: `feat/imports-ui`.

**3.1 `/imports`** (replace the placeholder; follow the four `.UI` import images)

Stepper: Upload → Map columns → Processing → Done. The whole flow is one client component holding the chosen `File` in memory.

*Step 1, upload*
- Drag and drop plus "Browse files"; one file.
- **Differs from the image:** text reads "CSV, Excel or PDF" and "Max 4 MB". Accept `.csv`, `.xlsx`, `.xls`, `.pdf`.
- Check size and extension in the browser before calling `previewStatement`; an over-limit request never reaches the action, so the browser must explain it.
- "Previous imports" list from `getStatements()`: file name, import date, transaction count, status badge, and a "…" menu with **Delete**. Delete opens a confirm dialog ("This removes the statement and its N transactions.") with focus on Cancel.

*Step 2, map columns*
- From `preview.columns.items`: column header, a "Maps to" select, sample value, status.
- **Differs from the image:**
  - Select options are Date, Description, Amount, Money in, Money out, Balance, Transaction ID, Skip. (The image's "Merchant" is Description, and its Credit Amount must map to Money in, not Skip.)
  - Show "Hidden for privacy" where `sampleHidden` is true.
  - Highlight roles marked `uncertain`. Show the date order when `dateOrderCertain` is false, with a day-first / month-first choice.
  - Changing a select calls `previewStatement` again with the new `mapping`.
  - If `needsMapping` is set, show a warning asking the user to pick the date or amount column.
  - Above the table: detected bank, row count, date range, money in and money out totals, zero rows skipped; the 20-row sample; issue rows with their reasons.
- **Flagged duplicates** (no image): a section listing `preview.flagged` with a choice for all ("Skip all" / "Import all") and a per-row override.
  - Rows with `matchedBy: "id"` start as **skip**.
  - Rows with `matchedBy: "content"` start with **nothing selected**, and "Confirm mapping" stays disabled until every flagged row has a choice.
- **PDFs** have no columns (`preview.columns` is `null`): show the summary, sample, issues and flagged rows only.
- "Confirm mapping" calls `importStatement` with the same file, the final mapping and the decisions.

*Failure pop-up* (no image)
- For `status: "error"`, show a dialog with wording chosen from `reason` (fall back to `message`): wrong file type, too large, empty, password-protected PDF, scanned PDF with no text, not a bank statement, not GBP, rate limited, something went wrong. Offer "Choose another file".

*Step 3, processing*
- Shown while `importStatement` is pending. Keep the four-row list from the image.
- **Differs from the image:** no invented percentages or counts. Tick rows as real stages finish (parsing and normalising are done once the preview returned); use an indeterminate bar while waiting.

*Step 4, done*
- Three figures: Transactions (`importedCount`), Categorised, Need review.
- When above zero, also say how many duplicates and zero-amount rows were skipped and how many rows couldn't be read.
- The "need review" banner only when `needsReviewCount > 0`.
- Buttons: "Go to dashboard" → `/dashboard`; "Review transactions" → `/transactions?review=1`.

**3.2 `/transactions`** (replace the placeholder; no image)
- Table: date, merchant (description beneath in muted text), category, amount (money in uses `text-positive`).
- A "Needs review" filter (`?review=1`) and pagination.
- Each row has a category control that opens a small dialog: category select, and a checkbox, ticked by default, "Also apply to other transactions from {merchant} and remember for future imports". Submits `recategoriseTransaction`.
- Uncategorised rows show a "Needs review" badge.

**3.3 Tidy up**
- Landing page text that lists formats should say "CSV, Excel and PDF".
- Ask before removing the Phase 1 dev page.

---

## Phase 4: dashboard

Branch: `feat/dashboard`.

**4.1 Definitions** (pure functions in `src/lib/` or `src/features/dashboard/`, all tested)
- **Current month:** the most recent month that has transactions, not today's calendar month (statements are historical).
- **Income / expenses:** money in / money out for the month, **excluding** transactions whose category type is `TRANSFER`.
- **Savings:** income minus expenses.
- **Change vs last month:** percentage against the previous month; `null` (render nothing) when there's no previous month of data.
- **Net balance:** all money in minus all money out across everything imported.

**4.2 Recurring detection** (`src/lib/recurring/detect.ts`, pure, simple on purpose; Step 8 will refine it)
- A merchant is recurring when it has money-out transactions in at least two different months with amounts within 10% of each other.
- For each: typical amount, usual day of month, last paid date, next due (one month after the last), monthly cost.
- No new table; computed when read.

**4.3 `src/features/dashboard/queries.ts`** → one `getDashboardData()` returning:
- `hasData`
- cards: net balance, income, expenses, savings, each with its change
- `incomeVsExpenses`: the six months ending at the current month
- `spendingBreakdown`: current-month expenses by category, top four plus "Other"; uncategorised spending as its own "Needs review" entry
- `recurring`: next three due, and the three most expensive
- `topMerchants`: top five by spend in the current month

**4.4 `/dashboard`** (follow `dashboard.png` and `Dashboard — Empty State.png`)
- `hasData` false → the empty state, with "Upload your first statement" → `/imports`.
- **Differs from the image:**
  - The first card is labelled **"Net balance"**, not "Total balance".
  - The AI advisor bar is shown but disabled, marked "Coming soon".
  - Month labels and "This month" refer to the current month as defined above; show its name.
- Charts with Recharts as client components fed by server data: grouped bars for income vs expenses, a donut for the breakdown with the month's total in the centre.
- If there is uncategorised spending, link "Needs review" to `/transactions?review=1`.
- Each section has a skeleton fallback and a sensible "not enough data yet" state (for example recurring with one month of data).
- Greeting uses the user's first name from the session.

---

## Phase 5: onboarding

Branch: `feat/onboarding`.

**5.1 Migration**
- New enum `FinancialGoal`: `SAVE_MORE`, `GET_OUT_OF_DEBT`, `UNDERSTAND_SPENDING`, `BUILD_WEALTH`.
- New model `Onboarding` (table `onboarding`): `userId` (unique), `monthlyIncomeMinor Int?`, `goal FinancialGoal?`, `completedAt DateTime?`, `skippedAt DateTime?`, timestamps; cascade on user delete.
- If you find an earlier drafted onboarding table in `docs/`, stop and ask which to use.

**5.2 Backend** (`src/features/onboarding/`)
- `queries.ts`: `getOnboardingState()` → `"needed" | "done"`. "Needed" means no `completedAt`, no `skippedAt`, and no statements.
- Actions (auth, Zod, rate limit): `saveIncome` (whole pounds in, stored as pence, sensible upper bound), `saveGoal`, `skipOnboarding`, `completeOnboarding`.
- `getOnboardingSummary()` for the last screen: top spending category and amount in the current month, recurring count and monthly total, saving rate.

**5.3 Routing**
- `/dashboard` sends a user whose state is "needed" to `/onboarding`. Do this in the page (inside `<Suspense>`), not in `src/proxy.ts`.
- `/onboarding` sends a user whose state is "done" to `/dashboard`.

**5.4 `/onboarding`** (follow `onboarding 1.png` to `onboarding 5.png`)
- **Differs from the images:** the user is signed in, so the header shows the logo and a sign-out control, not "Log in" and "Get started".
- Step 1, monthly income. Step 2, main goal. Step 3, upload.
- "Skip for now" on steps 1 and 2 moves to the next step without saving. On step 3 it calls `skipOnboarding` and goes to `/dashboard` (empty state).
- Step 3 text: "CSV, Excel or PDF", "Max 4 MB". "Analyse my finances" calls `previewStatement`:
  - **Clean result** (no error, no `needsMapping`, no issues, no flagged rows) → call `importStatement` straight away, showing the "Analysing your finances" screen (`onboarding 4.png`) while it runs.
  - **Anything that needs a choice** → show the same column and duplicate UI as `/imports` (share the components through `src/components/`), then import.
  - Errors use the same failure pop-up.
- Final screen (`onboarding 5.png`) from `getOnboardingSummary()`:
  - The first tile is labelled "Top category" (the image's "Parsing transactions" label is a mistake).
  - Show the "SpendSense noticed" line only when it can be computed from two months of data, and keep it factual; otherwise leave it out.
  - "Ask the AI advisor" is disabled and marked "Coming soon". "Go to my dashboard" calls `completeOnboarding` and goes to `/dashboard`.

---

## File guide (end of every phase)

- Add or update `docs/imports/file-guide.md` (Phases 1 to 3), `docs/dashboard/file-guide.md` (Phase 4) and `docs/onboarding/file-guide.md` (Phase 5), using the entry template in `docs/auth/file-guide.md`.
- One entry per new or changed file, backend included, written for someone learning: what the file is for, what each function takes and returns, why it's built this way, and what it must never do.
- Add a request-flow diagram per phase (upload → preview → import; recategorise; dashboard load; onboarding).

## Phase summary (every time you stop)

- What was built, file by file, in plain language
- Migrations added, with their SQL
- Screens built without an image, and every place you departed from an image
- Any Next.js or package API that differed from this brief, and what you used
- Bugs found in existing code, and the fix
- Anything you couldn't do or weren't sure about (ask; don't guess)
- Test count and `npm run check` result
- `git log --oneline main..HEAD`

## Final checklist (after Phase 5)

1. `npm run check` passes; the landing page is still static in the build output.
2. New user: sign up → onboarding → upload `docs/demo/synthetic-statement.csv` → analysing → results → dashboard with real figures.
3. New user who skips: lands on the dashboard empty state; "Upload your first statement" works.
4. `/imports`: upload, change a column, confirm, see Done; the statement appears under Previous imports.
5. Same file again: every row is flagged; nothing saves until a choice is made; "Skip all" saves nothing new; "Import all" saves a second copy.
6. Wrong file type, 5 MB file, empty file and a non-statement CSV each show a clear message.
7. `/transactions?review=1`: recategorise one transaction with the box ticked; others from that merchant update; re-importing a file with that merchant uses the remembered category.
8. Delete a statement: its transactions disappear and the dashboard updates.
9. A second account never sees the first account's statements, transactions or categories.
10. Keyboard only, 320px width and dark mode all work on every new screen.
11. No sort code, account number, description or amount appears in the server logs.
