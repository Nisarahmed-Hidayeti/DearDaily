# DearDaily design system

## Direction

Premium, quiet, editorial. Reference images provide mood and hierarchy, rather than literal layouts. Large serif typography, ample negative space, muted violet accents, and original CSS night landscapes balance private reflection with public storytelling.

## Tokens

Central source: src/styles/theme.css.

| Token      | Color   | Use                 |
| ---------- | ------- | ------------------- |
| --bg       | #090A12 | Page canvas         |
| --elevated | #111321 | Elevated background |
| --surface  | #191827 | Card surface        |
| --accent   | #B888F8 | Interactive accents |
| --lavender | #CDA8FF | Emphasis and links  |
| --text     | #F6F3FF | Primary copy        |
| --muted    | #A9A4BC | Supporting copy     |
| --border   | #302A42 | Subtle boundaries   |

Heatmap colors have five reusable tokens. Decorative landscape colors are limited to the Scene component styles. Primary controls use dark text on lavender; muted copy remains readable against midnight surfaces.

## Typography and spacing

Fraunces for editorial headings and the wordmark; Inter for UI and prose, with Georgia and Arial fallbacks. Heading scale adapts to viewport; desktop hero reaches 106px and mobile 72px. Body prose has 1.65–1.95 line height. Common spacing steps: 4, 8, 12, 16, 20, 24, 32, 48px. Page gutters fall from 48px to 22px. Content stops at 1220px, with a wider landing hero. Cards use a 14px radius, controls 8px.

## Components

Logo, PageHeading, Scene, DemoNotice, ArrowLink, and native modal are shared. Filled buttons indicate the main action; outlined buttons secondary actions; disabled save/publish controls carry adjacent explanations. Active navigation and selectable chips communicate state visually and through aria-current/aria-pressed. Inputs have associated labels. Demo labels remain prominent. Empty editor and missing-story states provide meaningful copy.

## Responsive behavior

Desktop has a 232px fixed sidebar and generous multi-column layouts. Below 1100px the sidebar contracts; at 800px it becomes an icon rail with accessible text names. Below 560px a fixed bottom navigation provides three reachable destinations. Main content reserves space underneath. Story cards shift from three to two to one column; editor settings move below the writing surface. The writing surface remains full-width within mobile gutters. Target checks: 360, 768, 1440px.

## Accessibility and motion

Semantic navigation, main landmarks, buttons, labels, fieldset, native select, dialog, and textarea. Skip-to-content link and lavender focus outlines support keyboard use. Native dialog traps focus and supports Escape. Reduced motion removes transitions. Decorative scenes are hidden from assistive technologies. Word count uses a polite output region. No text is rendered through raw HTML.
