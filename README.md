# DearDaily.

Every day has a story.

DearDaily combines a private daily journal with optional public storytelling. Phase 1 is a responsive frontend prototype: four coordinated themes, a quiet writing space, and clearly fictional stories and activity.

## Stack

React + strict TypeScript, Vite, Tailwind CSS v4, React Router, Lucide React, Vitest, React Testing Library, ESLint, and Prettier. Node.js 22.12+ (or a compatible current LTS) and npm are required. Dependencies are locked in package-lock.json; TypeScript 6 is selected for compatibility with typescript-eslint.

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
| `/`                | Public landing, features, sign-in/sign-up coming-soon dialog                         |
| `/app`             | Fictional dashboard, streak, statistics, writing heatmap, recent pages               |
| `/app/write`       | In-memory editor: title, body, mood, tags, category, visibility, word count, preview |
| `/app/entries/:id` | Read-only fictional journal entry (morning, progress, wins)                          |
| `/explore`         | Sample storytelling grid with local category filters                                 |
| `/explore/:id`     | Readable sample story (long-way, windows, night)                                     |
| `/app/settings`    | Four theme previews, accessible selection, browser preference persistence            |
| Any unmatched URL  | 404 with a route home                                                                |

## Privacy and prototype boundaries

No backend, authentication, database, durable drafts, live publishing, likes, comments, analytics, or AI is implemented. Entries default to Private. Selecting Public only changes a local preference; it does not publish anything. Save and Publish are disabled with explanations. Sign-in/sign-up explicitly announce the future phase rather than simulating authentication.

Editor text exists only in React state. Leaving the editor, refreshing, or closing the tab discards it. Only the selected theme ID is stored in localStorage under `deardaily.theme`. No journal text is placed in localStorage, cookies, URLs, or network requests. Do not rely on this prototype for keeping a journal. Dashboard counts, identity, dates, activity, and stories are fictional samples, not actual user data. Public/private badges on samples demonstrate the future interface and do not represent access control.

Fonts load from Google Fonts with system fallbacks; no journal text is sent with font requests. Decorative landscapes are lightweight CSS illustrations, not embedded reference screenshots. Tailwind is configured; reusable semantic CSS and tokens carry the design system.

## Architecture

`src/app` holds routing shell and integration tests; `src/components` shared primitives; `src/features` landing, dashboard, journal, explore, settings, and theme preferences; `src/data` typed fictional fixtures; `src/styles` design tokens and responsive styles. React renders all prose as text, without unsafe HTML.

## Themes, motion, and dates

Settings offers Midnight Purple, Forest Green, Paper White, and Obsidian Black. Semantic CSS variables in `src/styles/palettes.css` update every route, including decorative landscapes and the activity scale. Native radio controls support keyboard selection. Invalid or unavailable browser storage falls back safely; a failed preference write is reported without preventing theme changes.

`ThemeProvider` consumes the small `ThemePreferenceStore` interface. A future account synchronization layer can use this boundary; no Supabase client or account sync exists yet. Only a validated theme ID belongs in this store.

Page entrances, staggered theme previews, card hover feedback, and native view transitions add restrained motion. Browsers without view-transition support switch immediately. `prefers-reduced-motion` disables entrance/transition animation.

Editor dates use the visitor's local timezone and locale. Fictional heatmap calendar dates are parsed locally so UTC offsets do not move a day into the wrong weekday. The activity grid has seven rows, fixed 12px squares, 4px gaps, month/weekday labels, and a keyboard-focusable horizontal scrolling region.

## Netlify hosting

`netlify.toml` configures Node 22, `npm run build`, the `dist` publish directory, and a non-forced `/* → /index.html` status-200 rewrite. This supports direct links and refreshes on nested React Router routes while retaining real static assets. No deployment is performed by the application.

After deploying, smoke-test direct visits and refreshes on `/app/write`, `/app/settings`, and `/explore/long-way`. Configuration follows [Netlify redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/).

See [the design system](docs/DESIGN_SYSTEM.md), [validation results](docs/VALIDATION.md), and [roadmap](docs/ROADMAP.md).
