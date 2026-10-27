# DearDaily design system

## Direction

Premium, quiet, editorial. Reference images provide mood and hierarchy, rather than literal layouts. Large serif typography, ample negative space, muted violet accents, and original CSS night landscapes balance private reflection with public storytelling.

## Tokens

Central color source: `src/styles/palettes.css`. Layout and typography live in `theme.css`; motion lives in `motion.css`. Feature styles consume semantic variables rather than fixed purple values.

| Preset          | Canvas (`--bg`) | Surface | Accent  | Text    | Muted   |
| --------------- | --------------- | ------- | ------- | ------- | ------- |
| Midnight Purple | #090A12         | #191827 | #B888F8 | #F6F3FF | #AAA5BD |
| Forest Green    | #09120F         | #192C22 | #8CCBA5 | #F0F7EE | #A6BCAE |
| Paper White     | #FAF8F3         | #EEEAE2 | #70532C | #29261F | #686155 |
| Obsidian Black  | #050505         | #1C1C1C | #C4C4C4 | #F5F5F5 | #ABABAB |

Shared roles include `--elevated`, `--sidebar`, `--emphasis`, `--border`, `--border-strong`, `--focus`, `--on-accent`, and button start/end/hover tokens. Five `--heat-*` colors form each activity scale. Sky, moon, ridge, and glow tokens recolor CSS illustrations; Paper White lowers their opacity to keep text readable. Derived color mixes are scoped to each `data-theme` so miniature previews render independently of the active theme.

Primary, muted, accent, and emphasis text exceed 4.5:1 against the four base surfaces in every preset. Focus tokens exceed 3:1. These are token-pair checks, not a claim of full WCAG certification. See validation for measured minima.

## Typography and spacing

Fraunces for editorial headings and the wordmark; Inter for UI and prose, with Georgia and Arial fallbacks. Heading scale adapts to viewport; desktop hero reaches 106px and mobile 72px. Body prose has 1.65–1.95 line height. Common spacing steps: 4, 8, 12, 16, 20, 24, 32, 48px. Page gutters fall from 48px to 22px. Content stops at 1220px, with a wider landing hero. Cards use a 14px radius, controls 8px.

## Components

Logo, PageHeading, Scene, DemoNotice, ArrowLink, and native modal are shared. Filled buttons indicate the main action; outlined buttons secondary actions; disabled save/publish controls carry adjacent explanations. Active navigation and selectable chips communicate state visually and through aria-current/aria-pressed. Inputs have associated labels. Demo labels remain prominent. Empty editor and missing-story states provide meaningful copy.

## Responsive behavior

Desktop has a 232px fixed sidebar and generous multi-column layouts. Below 1100px the sidebar contracts; at 800px it becomes an icon rail with accessible text names. Below 560px a fixed bottom navigation provides four reachable destinations (Overview, Write, Explore, Settings). Main content reserves space underneath. Story cards shift from three to two to one column; editor settings move below the writing surface. The writing surface remains full-width within mobile gutters. Target checks: 360, 768, 1440px.

## Accessibility and motion

Semantic navigation, main landmarks, buttons, labels, fieldset, native select, dialog, and textarea. Skip-to-content link and theme-specific focus outlines support keyboard use. Native dialog traps focus and supports Escape. Reduced motion removes transitions and animations. Decorative scenes are hidden from assistive technologies. Word count uses a polite output region. No text is rendered through raw HTML.

## Settings and persistence

The Settings page uses four native radio cards with independent miniature previews, checked-state icons, keyboard focus outlines, and a polite status message. Two columns become one below 560px. The preference is applied to the document root, not individual route wrappers, so all pages share it. Only the selected theme ID is persisted; private writing remains in memory. The preference-store interface leaves a clear future account synchronization boundary.

## Writing activity

The calendar renders chronological weeks left to right and Monday through Sunday top to bottom. Each day is exactly 12×12px with a 4px gap; cells never stretch. Weekday labels align with seven fixed rows, and month labels align with the week containing the first day of each month. The fictional 12-week range has 84 dated cells. Each cell exposes its complete localized date and sample writing duration; a focusable overflow region supports narrow screens.

## Motion language

Use short, one-shot movement rather than continuous ambient animation:

- Page and hero entrances: 500ms fade with 12px vertical movement.
- Settings previews: 500ms entrances staggered by 60ms.
- Theme changes: 450ms native view transition with a small 1.015-to-1 scale; immediate fallback.
- Story hover: 300ms, 5px lift and subtle arrow rotation.
- Theme-card hover and selected indicator: 250ms; button press scale 0.98.

Animate opacity and transforms where possible. Typing does not restart entrances. Reduced-motion preferences bypass native theme transitions and disable CSS animations/transitions, including view-transition pseudo-elements.
