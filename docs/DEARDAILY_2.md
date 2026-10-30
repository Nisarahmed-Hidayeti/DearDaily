# DearDaily 2 — implementation and release checkpoint

## October 28, 2026 verified baseline

PR #5 was reviewed, passed 98 frontend tests and 190 isolated database checks, and merged normally as a7a60c4. The owner separately approved production deployment of that exact baseline. Netlify deploy 6ae2329a3680c1e5b4115c80 published it successfully. Signup frontend flag was corrected from true to false; community remains false and journals true. Supabase signup remains disabled with email confirmation enabled. No database migration/settings change was made.

Fresh owner-operated login followed by synthetic save/reload/autosave/edit/publish/Explore/unpublish passed on the live baseline before deployment. Anonymous ordinary-key API requests confirmed snapshot independence, private source denial, hidden owner-column denial, and hosted signup closure. The exact synthetic fixture was deleted only after owner approval. Existing journals were not edited. After deployment session restoration and the disabled registration UI were verified. Earlier distinct-account security checks remain recorded in PHASE_4.md; they were not rerun with a second account in this session.

All tracked branches/history passed Gitleaks; a filename/PII review found only synthetic test addresses and configured example addresses. .env.local, dependencies and builds are ignored. npm audit reported no known vulnerabilities. Scanners do not certify the absence of every possible secret.

Read-only catalog checks confirmed the five public and five deardaily_private tables force RLS, the own-profile RPC exists, and CLI migration history is absent. The first three migration hashes match prior approval records. Do not replay these migrations or run db push against hosted deardaily-dev. Known advisor/operational issues recorded in PHASE_4.md remain: leaked-password protection, moderation-audit FK indexes, privileged-RPC review, migration ledger reconciliation, retention/deletion operations and backup recovery. No new zero-warning claim.

## Current feature branch — not a deployment approval

feat/deardaily-2-editor-covers starts at the verified merged baseline. Current local work:

- Personal writing rhythm scales the visible 12-week saved-entry counts to the writer's busiest day. A maximum of one saved entry gets the brightest shade. Zeros stay empty; ties share the brightest shade. Actual counts remain in accessible labels.
- Open-source Tiptap editor: headings 1–3, paragraphs, bold/italic/underline/strike, lists/checklists, quotes, dividers, inline/fenced code, safe links, undo/redo, Markdown shortcuts, slash/block menu, selection toolbar, word count, Markdown append/import and export.
- Preset cover palettes, allowlisted emoji page icons, preview/focus mode, local writing font and width. Font/width account sync belongs to advanced appearance, not this checkpoint.
- Version 1 structured document, constrained client validation and safe React rendering with preserved text fallback. No arbitrary HTML renderer, CSS or tracking embeds. Documents are bounded by text size, JSON size, node count and depth. Unsupported import blocks are rejected or lose formatting with a warning; original imports are never deleted. Markdown support is a beta upstream extension; unsupported tables/HTML/images and underline round trips are not promised.
- Production cloud integration is gated by VITE_ENABLE_RICH_EDITOR=false; the owner approved localhost testing separately. Existing plaintext paths remain active without a new schema. Development-only /dev/editor-workshop uses synthetic in-memory writing, no hosted writes. Export before leaving.
- Public copies include only deliberately confirmed structured content/icon/preset cover. No original_body, private tags, dates or mood enter the public snapshot. Chosen public covers replace repeated default artwork.

## Rich-writing hosted change — applied with owner approval

20261028000300_writing_documents.sql adds nullable writing_document, page_icon and cover_preset columns to sources and public snapshots, and a source-only original_body backup. It adds envelope/size/allowlist constraints and narrow column grants; no RLS policy is weakened. Original text is preserved on first legacy conversion; old clients cannot silently overwrite a rich source. Old-client plain publication updates clear stale structured public content. Existing version checks remain in place. There is no Storage bucket, public media access, user creation, deletion or migration-history repair.

Database validation currently bounds the envelope; the stricter node/mark/URL schema is enforced on client writes and before rendering. Malformed direct API document writes cannot execute HTML but must be included in the independent API security review before activation. The proposal is not a claim that every document rule is enforced by SQL.

Approval requires: passing all isolated pgTAP tests, independent review of this migration and recovery assumptions, exact target/hash comparison, owner approval, transactional application of only this additive migration (not db push), and real A/B/anonymous persistence/snapshot tests. Keep the rich-editor flag false until those pass. Existing hosted user content must not be used as fixtures. Do not apply the proposal as part of signup work.

## Remaining stages and fastest signup path

1. Complete real rich-editor persistence, concurrency, account-switch, offline and device acceptance after the approved schema change. Images remain disabled with an explanation.
2. Design and test private media storage/upload sanitation and deliberate public copies; review exact additive Storage/RLS changes before approval. No upload feature is claimed complete.
3. Finish actual public-profile/community enabled-page walkthrough and media-aware story/profile design; community stays off meanwhile.
4. Implement validated account-synchronized appearance tokens; preserve all four existing themes.
5. Complete motion and reduced-motion checks across every new surface.
6. Signup is now prioritized by the owner: configure approved SMTP/verified sender and bot protection, verify real confirmation/recovery delivery, redirects and rate limits, new-account privacy and quotas, operational moderation/reporting and privacy/terms/age/account-deletion review. Only then prepare final activation approval for frontend and hosted signup flags. Do not disable verification or add ordinary testers to the Supabase organization to bypass delivery limits. No service purchase/account terms or credentials are authorized by this document.
7. Complete local/CI/hosted security, reliability, accessible keyboard and 360/768/1440 checks in each theme; report actual results, never inferred passes.
8. Review the feature PR and separately approve any production deployment. Skip-Netlify commit/PR markers suppress automated previews; they are not protection against later manual deploys or unsuppressed commits.

## Latest local verification

Docker was started by the owner. Database-only local Supabase applied the pending local community and writing-document migrations without a reset. All 220 pgTAP checks passed; hosted schema was unchanged. All 119 frontend tests passed with one worker, TypeScript/lint/build passed. The parallel run timed out under local startup load. Signup tests now provide an explicitly mocked bot-check token; this is not real bot-protection verification. Account UI shows private email/confirmation/member information and honest recovery readiness. The editor bundle currently exceeds Vite’s 500 kB warning threshold; optimization remains pending.

## October 29 verification and writing refinements

The exact writing migration above (SHA256 f259a96641bebd65ade66e5471da4834993de3e419f9ffc419c1317bde9da8d7) passed all 220 local database checks and was applied transactionally to deardaily-dev after owner approval and conflict guards. No reset, authentication setting, Storage bucket or migration-history change occurred. 33 real hosted rich-writing checks passed with distinct server-validated A/B IDs: private isolation in both directions, anonymous source denial, legacy original-text preservation, stale-write rejection, explicit snapshot fields, private/public independence and unpublish revocation. Their exact fixtures were cleaned.

The writing surface now uses a quiet document canvas, large title, selection toolbar, collapsed formatting/options and a separate details/publishing drawer. Preset covers and emoji remain available; uploads remain unavailable. Autosave fixes avoid untouched empty-page creation and canonicalize JSON fingerprints to prevent repeated saves caused by PostgreSQL JSON key ordering. Editor hydration suppresses update events so loading cannot autosave an empty document. A StrictMode teardown guard prevents accessing destroyed editor commands. Regression coverage includes hydration, teardown and fingerprints.

Latest full validation before the teardown guard: 130 frontend tests, ESLint, TypeScript and build passed. Both hydration/StrictMode regression tests subsequently passed; final complete rerun passed 134 tests, TypeScript, lint and build. Build retains a 519.5 kB rich-editor chunk warning. Client image-signature validation is preparation only, not a secure upload implementation.

Owner approved localhost-only community activation for final Phase 4 UI acceptance on October 29. Production/community signup flags remain disabled. Core real UI acceptance and exact synthetic cleanup completed; details are recorded in PHASE_4.md. Larger DearDaily 2 media, advanced appearance and signup stages remain incomplete.

## Popup and loading polish

Dialogs explicitly center with automatic margins, bounded viewport height and internal scrolling. Headers/close buttons align on narrow screens; surfaces use restrained borders and shadows. Modal/backdrop, block menus and details panels have short opacity/transform entrances. Shared loading states and save/load indicators use a small orbit; all new motion is limited to no-preference media queries and the existing reduced-motion override. Writing content itself is not animated. Dialog cleanup restores focus to its original control, and titles use unique accessible IDs.

Browser checks passed for centered, in-viewport, focus-contained synthetic dialogs at 360/768/1440 in every theme (12 combinations); Escape closed the popup and restored the trigger’s focus. No hosted data/settings change or deployment was required.

The editor’s Share & details panel is also centered and viewport-bounded (verified at all three widths). Page entrance animations no longer retain a final transform, which had incorrectly anchored fixed panels to the document instead of the viewport. Final validation: 134 tests, ESLint, TypeScript and build passed; no SQL changes.
