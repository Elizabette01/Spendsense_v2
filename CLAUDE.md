@AGENTS.md

# CLAUDE.md: SpendSense

Instructions for Claude Code working in this repository. Read this fully before making changes.

## Project

SpendSense is an AI-powered personal finance web app. Users upload bank statements (CSV/PDF), transactions are parsed and categorised with AI, and users see a dashboard and can chat with an AI financial advisor.

It is a **solo portfolio and learning project**. The owner (Elizabette) is learning full-stack development. Quality and understanding matter more than speed or feature count.

## ⚠️ Ownership split: read first

**Elizabette writes all backend code herself, to learn it.** Claude Code handles frontend: pages, UI components and styling.

**Do NOT create or modify these (backend, owner-only):**

- `prisma/`: schema and migrations
- `docker-compose.yml`
- `src/lib/`: db client, auth config, AI client, env validation, utils
- `src/app/api/`: all route handlers
- `src/features/*/actions.ts`: server actions
- `src/features/*/queries.ts`: database reads
- `src/features/*/schemas.ts`: Zod schemas
- `src/features/*/parsers/`: CSV/PDF parsing
- `src/auth.ts` or any NextAuth configuration
- `.github/workflows/`, `.env*`, `package.json` engines

**Claude Code works in:**

- `src/components/`: shared UI (`ui/`) and layout (`layout/`)
- `src/features/*/components/`: feature UI
- `src/app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`: thin route files
- `src/app/globals.css`: only when asked

**If a component needs backend data or an action that doesn't exist yet:**

- Do not write it.
- Stop and describe exactly what is needed (function name, inputs, return type), so Elizabette can build it.
- Until then, build the UI against typed placeholder props or clearly marked mock data in the component file (`// MOCK: replace with <function> from features/<x>/queries.ts`).

## Working style

- **Explain as you go.** After each change, briefly say what you did and why, in plain language. Elizabette is learning.
- **Ask before:** adding any dependency, changing config files, or making architectural decisions.
- **Never delete files** without explicit approval.
- Prefer small, reviewable changes over large rewrites.

## Tech stack

- **Framework:** Next.js 16 (App Router) + TypeScript, `src/` directory
- **Styling:** Tailwind CSS v4, configured in `src/app/globals.css` via `@theme`. **There is no `tailwind.config` file. Do not create one.**
- **Font:** Inter via `next/font/google` (`--font-inter`), set as `--font-sans`
- **Database:** PostgreSQL via Prisma. Local dev runs Postgres in Docker; production uses Supabase.
- **Auth:** NextAuth v5 (Auth.js). **Never suggest or use Clerk.**
- **Validation:** Zod. All external input (forms, uploads, AI output, env vars) is validated with Zod.
- **Parsing:** PapaParse (CSV), pdf-parse (PDF)
- **AI:** Anthropic Claude API
- **Charts:** Recharts
- **Hosting:** Vercel. **CI:** GitHub Actions.
- **Node:** 24, pinned in `package.json` `engines` (read by CI and Vercel)

## Commands

```bash
npm run dev          # local dev server (http://localhost:3000)
npm run lint         # ESLint
npx next typegen     # generate Next.js route types (needed before tsc on a clean checkout)
npx tsc --noEmit     # type-check
npm run build        # production build
```

Run `lint`, `tsc --noEmit` and `build` before saying any task is done. CI runs the same checks.

## Folder structure (feature-based)

```
src/
├── app/            # ROUTING ONLY: thin pages that import from features/
│   ├── (marketing)/   # landing
│   ├── (auth)/        # login, signup, forgot-password
│   ├── onboarding/
│   ├── (app)/         # signed-in area with sidebar layout
│   └── api/
├── features/       # one folder per domain: auth, imports, transactions,
│                   # recurring, dashboard, advisor, insights, budgets
├── components/
│   ├── ui/         # shared primitives: button, card, input, badge
│   └── layout/     # sidebar, navbar
├── lib/            # shared backend plumbing (owner-only)
└── types/          # cross-feature types
```

Rules:

- Pages in `app/` stay thin. Logic and UI live in `features/` and `components/`.
- **Features must not import from other features.** Shared code goes in `components/` or `lib/`.
- A component used by only one feature lives in that feature's `components/` folder. Move it to `src/components/ui/` only once a second feature needs it.
- Route groups `(name)` organise routes without changing URLs.
- Use the `@/` import alias (`@/components/ui/button`), not long relative paths.
- Default to **Server Components**. Add `"use client"` only when a component needs state, effects or browser events.

## Design system

The source of truth is the Figma file `mgf2GJR0QdxCas9EqRDXaK` (pages: Design System, Web App, Mobile App). Use the Figma MCP to check designs before building a screen.

**Use tokens. Never hardcode hex values or use arbitrary colour classes like `bg-[#1a7a4c]`.**

Semantic colours (switch automatically in dark mode):

| Class | Use for |
| --- | --- |
| `bg-background` | page background |
| `bg-card`, `bg-sidebar` | cards, sidebar |
| `text-foreground` | body text |
| `text-heading` | headings and money amounts |
| `text-foreground-secondary` | nav links, legends, subtitles |
| `text-foreground-muted` | labels, dates, small grey text |
| `text-foreground-subtle` | **non-text or large text only** (icons, dots, dividers) |
| `border-border`, `bg-divider` | borders, divider lines |
| `bg-primary` / `text-primary-foreground` | primary buttons, active nav |
| `bg-accent` / `text-accent-foreground` | soft green icon tiles and badges |
| `text-positive` | positive changes ("↑ 12.4%") |
| `text-destructive` | negative changes, errors |

Fixed palette: `brand-50` to `brand-800` (primary is `brand-600`), `coral`, `coral-light`, `coral-strong`.

- Coral text on `bg-coral-light` must use `text-coral-strong`.
- Plain `coral` is for charts and graphics only.

Type scale: `text-hero`, `text-page-title`, `text-stat`, `text-card-title`, `text-nav`, `text-body`, `text-label`, `text-caption`, `text-overline`. These include font weights.

Shape: `rounded-card` (12px), `rounded-control` (8px, buttons and inputs), `rounded-icon` (6px), `shadow-card`.

Dark mode is class-based (`.dark` on `<html>`) via `@custom-variant dark`. Use `dark:` variants only when a semantic token can't express the difference.

### Accessibility (required)

- All text must meet **WCAG AA**: 4.5:1 for normal text, 3:1 for large text and UI graphics. The tokens above are already compliant. Don't introduce colours that aren't.
- Brand tiles with white text (e.g. Netflix red, coral, Spotify green) must be checked for contrast.
- Use semantic HTML (`button`, `nav`, `main`, headings in order), label every form input, and make sure everything works with the keyboard and has visible focus states.
- Icons that carry meaning need accessible labels. Decorative icons get `aria-hidden="true"`.

## Git workflow

- **Never commit or push directly to `main`.** It is protected, and changes go through PRs that must pass CI.
- Branch names: `feat/…`, `fix/…`, `chore/…`, `docs/…`, `ci/…`
- Commits follow **Conventional Commits**: `type(scope): description`, imperative mood, lowercase, no full stop.
  - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `style` (formatting only), `test`, `ci`, `build`, `perf`
  - Scopes: `ui`, `auth`, `db`, `imports`, `transactions`, `dashboard`, `advisor`, `ci`
- One logical change per commit.
- **Never force-push. Never merge PRs.** Elizabette reviews and merges.

## Security and privacy

- Never commit secrets. Real values live in `.env.local` (git-ignored). `.env.example` holds the empty template.
- Never print, log or echo the contents of `.env.local`.
- Never commit real bank statements or personal financial data. Test data must be fake.
- Validate all input on the server, even if it was validated in the browser.
- The app gives general information, not regulated financial advice. UI copy must not claim otherwise.

## Environment notes

- Development machine: **Windows, PowerShell, VS Code**.
- In PowerShell, quote paths containing parentheses: `"src/app/(app)/dashboard"`.
- Use `-LiteralPath` for paths containing square brackets: `[...nextauth]`.
- The project lives outside OneDrive, and must stay that way to avoid file locks.
