# DearDaily.

Every day has a story.

DearDaily combines a private daily journal with optional public storytelling. Phase 1 is a responsive frontend prototype: an editorial midnight palette, quiet writing space, and clearly fictional stories and activity.

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
| Any unmatched URL  | 404 with a route home                                                                |

## Privacy and prototype boundaries

No backend, authentication, database, durable drafts, live publishing, likes, comments, analytics, or AI is implemented. Entries default to Private. Selecting Public only changes a local preference; it does not publish anything. Save and Publish are disabled with explanations. Sign-in/sign-up explicitly announce the future phase rather than simulating authentication.

Editor text exists only in React state. Leaving the editor, refreshing, or closing the tab discards it. No journal text is placed in localStorage, cookies, URLs, or network requests. Do not rely on this prototype for keeping a journal. Dashboard counts, identity, dates, activity, and stories are fictional samples, not actual user data. Public/private badges on samples demonstrate the future interface and do not represent access control.

Fonts load from Google Fonts with system fallbacks; no journal text is sent with font requests. Decorative landscapes are lightweight CSS illustrations, not embedded reference screenshots. Tailwind is configured; reusable semantic CSS and tokens carry the design system.

## Architecture

`src/app` holds routing shell and integration tests; `src/components` shared primitives; `src/features` landing, dashboard, journal, and explore; `src/data` typed fictional fixtures; `src/styles` design tokens and responsive styles. React renders all prose as text, without unsafe HTML.

Static hosting must fall back to index.html for client routes. No deployment is included in Phase 1. See docs/DESIGN_SYSTEM.md and docs/ROADMAP.md.
