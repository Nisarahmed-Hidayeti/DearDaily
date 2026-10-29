# Renaissance — document-first navigation checkpoint

## Direction

A quiet writing studio and personal library: DearDaily’s book mark and editorial type remain; navigation recedes into a slim rail, while documents stay centered. Four familiar themes are preserved. Avoid repeated decorative artwork, stacked dashboard cards, oversized metadata and animation during typing.

The public reference pages were reviewed, not their authenticated applications: [Notion](https://www.notion.com), [Linear](https://linear.app), [Craft](https://www.craft.do), [Bear](https://bear.app), [Medium](https://medium.com), [Cosmos](https://www.cosmos.so). Adapt contextual document controls, clear navigation hierarchy, comfortable reading and deliberate image collections as design goals; no proprietary artwork or pixel layouts are copied. Existing constrained rich text, deliberate public snapshots, theme tokens and privacy boundaries are retained.

## Implemented in PR #6

- 212px expanded sidebar / 60px icon rail, four primary destinations: Home, My Journal, Write, Explore. Home and the journal library have separate routes; the library reuses the existing owner-scoped data loader and filters without overview widgets.
- Settings, Edit Profile, account information, published-story management and sign out live in the bottom account disclosure. No standalone public-profile sidebar link or duplicate account strip. Collapsed links retain accessible names and hover/keyboard tooltips.
- Writing defaults to the rail only if the user has not explicitly selected a layout. Only a non-sensitive layout choice is remembered locally. A reset to automatic writing layout is available; browser storage failure does not prevent navigation.
- Navigation rows keep their vertical positions while widths transition for 200ms. No focus is moved by collapse controls. On mobile, the desktop sidebar disappears; a compact header opens an accessible, dismissible navigation dialog. There is no permanent bottom bar over the editor.
- Focus mode hides the sidebar, mobile header, top controls, metadata, file controls and persistent formatting. Only the document, save/error status and Exit Focus Mode remain. Escape exits after inner writing menus/dialogs are dismissed. Editor instances, selection and autosave are retained.
- Standard text width is 760px; covers can span a wider document area. Title/cover/control gaps are smaller and synthetic previews use the same borderless document styling.
- Formatting buttons preserve pointer selection. Checklist styles now match the installed Tiptap markup. Native-editor regression coverage verifies independent paragraphs, mixed lists, checklists, selected bold, undo/redo and structured reload; a real browser walkthrough confirmed independent bullet/numbered/checklist blocks and rapid text entry.

## Validation and limits

Synthetic browser checks covered all four themes at 360/768/1440: mobile plus focus at 360; expanded/collapsed/focus at 768/1440 (32 combinations). All measured document centers aligned; no horizontal overflow; sidebar sizes matched 212/60/0px. Focus hid both desktop and mobile navigation. A 360×420 shortened viewport verified that navigation dialogs fit and writing remains focusable without an overlay. This approximates keyboard-induced viewport shrink; a physical phone keyboard/IME still needs device testing.

Automated checks cover explicit preference persistence, automatic defaults, unavailable storage, active destinations, mobile dismissal, account-menu Escape, retained selection/editor identity and continuing autosave through focus changes. Reduced motion disables the new transitions through the existing system preference guards. Browser checks use only synthetic preview content; no real journal was edited, no hosted migration/settings changed, no deployment or merge performed.

The broader Renaissance brief remains open: caret-positioned searchable slash menus, block drag/reorder, secure custom media uploads, curated licensed photographic covers/repositioning, synchronized advanced appearance, full application art direction and production release gates are not claimed complete by this navigation checkpoint. Existing security/operations findings remain in PHASE_4.md and DEARDAILY_2.md.

Final local gate: 144 frontend tests, TypeScript, ESLint and production build passed. Additional browser checks confirmed all four primary destinations, explicit expansion after reload, and preserved live editor focus/selection when toggling the rail. The account sign-out shortcut now confirms before discarding unconfirmed writing; direct navigation retains the existing unsaved-change guard. All original account/journal regression tests still pass. The existing approximately 520 kB rich-editor chunk warning remains; no new database test claim is made for unchanged SQL.
