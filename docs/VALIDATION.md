# Phase 1 polish validation

Verified October 27, 2026, with Node.js 22.23.2.

## Automated checks

| Command             | Result                            |
| ------------------- | --------------------------------- |
| `npm run typecheck` | Passed                            |
| `npm run lint`      | Passed, no warnings               |
| `npm test`          | 25 tests passed in 4 files        |
| `npm run build`     | Passed; 1,961 modules transformed |
| `git diff --check`  | Passed                            |

Production output: HTML 0.70 kB (0.41 kB gzip), CSS 39.62 kB (9.50 kB gzip), JavaScript 293.98 kB (93.01 kB gzip). No new dependencies were added during this polish pass.

Existing integration coverage includes landing/CTA navigation, fictional dashboard data, empty journal state, title/body input and word count, private default, mood/tag interactions, blocked save/publish, Explore filtering/details, temporary-draft clearing after navigation, 404, and honest authentication messages.

New coverage checks all four theme selections and restoration, global theme retention across routes, native keyboard radio selection, invalid/blocked storage, theme-only persistence while writing private text, view transitions with reduced motion on/off, dated heatmap ordering and descriptions, and local date formatting.

The four date/heatmap tests also passed separately under both `TZ=America/Los_Angeles` and `TZ=Pacific/Auckland`, confirming day alignment on opposite UTC offsets.

## Responsive browser checks

Measured 72 combinations in the in-app browser:

- Themes: Midnight Purple, Forest Green, Paper White, Obsidian Black.
- Routes: `/`, `/app`, `/app/write`, `/app/settings`, `/explore`, `/explore/long-way`.
- Actual CSS viewport widths: 360px, 768px, 1440px.

Every combination stayed within the document viewport width. In all 12 dashboard combinations, the heatmap measured exactly 12 columns × 7 rows, 84 cells at 12×12px, and 4px horizontal/vertical gaps. Cells retain chronological ordering; the scroll region is keyboard focusable.

Visually reviewed desktop Settings, Paper White dashboard, Forest Green story detail, Obsidian mobile editor, Midnight mobile dashboard, and the tablet landing page. Reviewed theme selection feedback and mobile/tablet/desktop navigation. Browser console checks returned no warnings or errors.

Production-preview direct visits followed by reloads passed on `/app/write`, `/app/settings`, and `/explore/long-way`. Netlify configuration contains the build/publish settings and non-forced status-200 SPA rewrite. Actual Netlify infrastructure has not been deployed or tested; verify these same routes on the deployed URL.

## Palette contrast

WCAG relative-luminance calculations on the source palette tokens gave these minimum ratios. Text includes primary, muted, accent, and emphasis against canvas, elevated, surface, and sidebar. Button checks cover gradient endpoints, hover, and accent; focus checks cover the four base surfaces.

| Theme           | Text minimum | Button label minimum | Focus minimum |
| --------------- | ------------ | -------------------- | ------------- |
| Midnight Purple | 6.59:1       | 5.68:1               | 10.36:1       |
| Forest Green    | 7.32:1       | 7.22:1               | 11.21:1       |
| Paper White     | 5.10:1       | 6.76:1               | 5.89:1        |
| Obsidian Black  | 7.42:1       | 8.74:1               | 14.69:1       |

All text pairs exceed 4.5:1; all focus pairs exceed 3:1. Decorative heatmap colors also carry textual date/activity descriptions rather than relying on color alone.

## Scope and limits

No backend authentication, persistent journals, live publishing, or Supabase integration exists. Only the selected theme preference is stored locally. Theme animation uses progressive enhancement; unsupported browsers switch immediately. Reduced-motion behavior is covered by provider tests and CSS overrides, but this review is not a full assistive-technology or cross-browser certification. Fonts use Google Fonts with system fallbacks.
