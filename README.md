# DearDaily.

Every day has a story.

DearDaily combines a private daily journal with optional public storytelling. The UI is a responsive prototype with a Phase 2 account foundation: four coordinated themes, a quiet writing space, and clearly fictional stories and activity.

## Current development status

The Phase 2 account foundation is implemented, and its private account migration has been applied to `deardaily-dev` (Paris, Free plan). The local environment connects successfully; hosted signup is disabled and email confirmation is required. All 71 local database security checks passed; hosted RLS/grants and anonymous read denial were verified. Real two-account authentication/isolation, email recovery, Google OAuth, and cloud theme synchronization remain unverified. Phase 2 is not complete, and persistent journals remain blocked on those checks. The sample experience works without credentials.

Start with [the Supabase setup guide](docs/SUPABASE_SETUP.md) and [security model](docs/SECURITY_MODEL.md). They cover the exact environment variables, local database commands, migrations, RLS, Google/SMTP configuration, Netlify settings, and remaining verification.

## Stack

React + strict TypeScript, Vite, Tailwind CSS v4, React Router, Lucide React, Vitest, React Testing Library, ESLint, Prettier, Supabase JS, and a pinned Supabase CLI. Node.js 22.12+ (or a compatible current LTS) and npm are required. Dependencies are locked in package-lock.json; TypeScript 6 is selected for compatibility with typescript-eslint.

## Local setup

```bash
npm ci
npm run dev
```

Open the Local URL printed by Vite (normally http://localhost:5173).

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npm run format
```

## Prototype routes

| Route              | Experience                                                                           |
| ------------------ | ------------------------------------------------------------------------------------ |
| `/`                | Public landing, features, sign-in/sign-up navigation                                 |
| `/app`             | Fictional dashboard, streak, statistics, writing heatmap, recent pages               |
| `/app/write`       | In-memory editor: title, body, mood, tags, category, visibility, word count, preview |
| `/app/entries/:id` | Read-only fictional journal entry (morning, progress, wins)                          |
| `/explore`         | Sample storytelling grid with local category filters                                 |
| `/explore/:id`     | Readable sample story (long-way, windows, night)                                     |
| `/app/settings`    | Four theme previews, accessible selection, browser preference persistence            |
| Any unmatched URL  | 404 with a route home                                                                |

Account routes: `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password`, and `/auth/callback`. `/account` is guarded and contains private profile editing and sign-out when configured. Sample routes stay public and clearly fictional.

Local database commands (Docker required): `npm run db:start`, `npm run db:reset`, `npm run db:test`, `npm run db:stop`. Reset is for disposable local development data only.

## Privacy and prototype boundaries

The account integration uses Supabase Auth and private profile/settings tables when explicitly configured. There are no durable drafts, live journals, publishing, likes, comments, analytics, or AI. Entries default to Private. Selecting Public only changes temporary editor state. Save and Publish remain disabled with explanations. Auth controls are disabled with clear feedback when the project is unconfigured.

Editor text exists only in React state. Leaving the editor, refreshing, or closing the tab discards it. Only the guest theme ID is stored in localStorage under `deardaily.theme`. Supabase manages tab-scoped authentication/PKCE state in sessionStorage; account themes live in the private cloud settings table when configured. No journal text is placed in localStorage, cookies, URLs, or network requests. Do not rely on this prototype for keeping a journal. Dashboard counts, identity, dates, activity, and stories are fictional samples, not actual user data. Public/private badges on samples demonstrate the future interface and do not represent access control.

Fonts load from Google Fonts with system fallbacks; no journal text is sent with font requests. Decorative landscapes are lightweight CSS illustrations, not embedded reference screenshots. Tailwind is configured; reusable semantic CSS and tokens carry the design system.

## Architecture

`src/app` holds routing shell and integration tests; `src/components` shared primitives; `src/features` landing, dashboard, journal, explore, settings, and theme preferences; `src/data` typed fictional fixtures; `src/styles` design tokens and responsive styles. React renders all prose as text, without unsafe HTML.

## Themes, motion, and dates

Settings offers Midnight Purple, Forest Green, Paper White, and Obsidian Black. Semantic CSS variables in `src/styles/palettes.css` update every route, including decorative landscapes and the activity scale. Native radio controls support keyboard selection. Invalid or unavailable browser storage falls back safely; a failed preference write is reported without preventing theme changes.

`ThemeProvider` consumes the small `ThemePreferenceStore` interface. The local adapter stores only validated guest theme IDs. Signed-in users use the cloud boundary: load first, initialize only if absent, confirm writes, and reread on focus or every 30 seconds while visible. Existing cloud values are never overwritten by guest defaults. Hosted synchronization still needs integration verification.

Page entrances, staggered theme previews, card hover feedback, and native view transitions add restrained motion. Browsers without view-transition support switch immediately. `prefers-reduced-motion` disables entrance/transition animation.

Editor dates use the visitor's local timezone and locale. Fictional heatmap calendar dates are parsed locally so UTC offsets do not move a day into the wrong weekday. The activity grid has seven rows, fixed 12px squares, 4px gaps, month/weekday labels, and a keyboard-focusable horizontal scrolling region.

## Netlify hosting

`netlify.toml` configures Node 22, `npm run build`, the `dist` publish directory, and a non-forced `/* → /index.html` status-200 rewrite. This supports direct links and refreshes on nested React Router routes while retaining real static assets. No deployment is performed by the application.

After deploying, smoke-test direct visits and refreshes on `/app/write`, `/app/settings`, and `/explore/long-way`. Configuration follows [Netlify redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/).

See [the design system](docs/DESIGN_SYSTEM.md), [validation results](docs/VALIDATION.md), and [roadmap](docs/ROADMAP.md).

## Phase 3 security gate

Phase 3 work starts on `feat/deardaily-phase-3` from merged PR #2. Complete the [security gate](docs/PHASE_3_SECURITY_GATE.md) before storing journal content. Approved hosted callbacks now target localhost:5173; tester provisioning, real authentication, two-account isolation and migration-history reconciliation remain pending.

## Small journaling/publishing MVP

The Phase 3 branch includes a locally tested private editor/library, autosave with version checks, and explicitly published public snapshots. Cloud journal functionality stays disabled until genuine account isolation, hosted migration approval and end-to-end verification pass. `VITE_ENABLE_JOURNALS=false` is the safe default. Private Markdown export and a reviewed public-only HTML export are usable immediately. See [MVP_MILESTONE.md](docs/MVP_MILESTONE.md) for actual tests, remaining gates and the manual static-story fallback. SMTP, Google and recovery are deferred by the owner's revised scope.

## Verified development milestone (October 28, 2026)

The exact journal/public-snapshot migration is applied to deardaily-dev. Distinct real user IDs, 54 hosted journal/privacy checks and the real write/save/publish/anonymous-view/unpublish/autosave/delete flow passed. Cloud mode is enabled in the owner's local ignored environment. Signup stays closed; optional Google/SMTP/recovery are deferred. See docs/MVP_MILESTONE.md for actual evidence, two advisor findings and operational limitations. Other environments must enable VITE_ENABLE_JOURNALS only after reviewed configuration; no Netlify deployment was performed.

## Phase 4 (staged)

Public profiles and community tools are behind `VITE_ENABLE_COMMUNITY=false`. They require a separately approved migration and hosted security gate before enabling. See [Phase 4 review](docs/PHASE_4.md). Existing Phase 3 journaling remains available.
