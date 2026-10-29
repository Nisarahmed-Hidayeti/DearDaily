# Renaissance beta review — 29 October 2026

Branch `feat/deardaily-2-editor-covers`, draft PR #6. This is an upgrade of the existing application. The owner approved the development-only schema/Storage changes and media-gateway deployment after local review. Both migrations are now applied to deardaily-dev and the gateway is deployed. Website deployment, production flags, account authentication settings and migration history remain unchanged. Signup remains closed.

## Implemented

- Independent block formatting, native history, searchable caret-positioned slash commands and contextual move/duplicate/delete/convert controls. Menu dismissal preserves writing; layout and focus mode retain the editor instance.
- Persistent, discoverable cover controls: three locally bundled licensed photographs, color studies, removal, focal position and mobile crop preview. Searchable curated page icons. Static photograph/crop metadata uses the existing versioned document envelope without rewriting legacy plaintext.
- Markdown loads separately from the writing bundle. Images export as labeled placeholders without private asset identifiers or access URLs. Unsupported document shapes retain the plaintext fallback rather than silently rewriting stored content.
- Private cover/inline uploads, clipboard/drop handling, image alt text, alignment and display widths are implemented behind `VITE_ENABLE_MEDIA` (enabled only in the ignored localhost environment). Client preparation is supplemented by a trusted server decoder, pixel/byte checks and WebP re-encoding that removes original metadata. JPEG, PNG and WebP inputs only; no SVG.
- Independent public image copies, explicit photo approval before publication, private buckets and a narrow gateway. Unpublish revokes new public requests immediately. Already issued access links last up to 60 seconds; downloaded/cached copies cannot be recalled.
- Advanced account appearance with validated colors, presets, fonts, sizes, spacing, texture and width; contrast-derived text/control colors, optimistic concurrency, stale-preview rejection and account isolation. Hosted synchronization and profile banners are gated by `VITE_ENABLE_RENAISSANCE_DATA` (enabled only on localhost after approval).
- Editorial redesign across Landing, Dashboard, Library, Editor, Explore, Published Story, Profile, Edit Profile, Settings and Account. Actual per-story covers, list/gallery library, author profile links, quiet motion and four existing themes preserved. Compact navigation and immersive focus retained.
- DEV-only synthetic full-screen design preview. It uses an in-memory SDK fixture and must never be cited as hosted security evidence. Synthetic code, test email and server image decoder are absent from the production build.

## Validation

- Frontend suite: **166 tests passed**. TypeScript, lint, production build and server function type checks passed. Regression coverage includes formatting/history, safe documents/links, authentication, account switching, delayed appearance responses, conflicting saves and media authorization.
- Local pgTAP: **264 checks passed**, including the additive appearance and media proposals, forced RLS, A/B ownership, anonymous access, direct unsanitized upload denial, public/private references, unpublish and bounded public staging.
- Real local Auth/REST/Storage/function requests: **21 checks passed** using two different synthetic authenticated user IDs. Checks cover closed signup, private journal/media isolation, trusted upload/actual WebP delivery, publication staging, anonymous public delivery, ownership spoofing, unsafe-image rejection, unpublish, exact object cleanup and retained private originals. Synthetic users/entries were removed by exact IDs; both sessions signed out. Credentials were never printed or persisted by the test script.
- Actual browser UI walkthrough with synthetic in-memory content: edit → autosave confirmation → deliberate publish preview/confirmation → Explore → story → unpublish → disappearance from Explore. Slash typing and keyboard conversion changed only the selected block. Cover/icon search and application worked. This proves UI behavior, not cloud security.
- **120 page/layout checks:** 10 screens × 4 themes × 360/768/1440px. No page overflow or alert state after a mobile excerpt shrink fix. Screenshots and measurements are external local artifacts, not committed journal content.
- Reduced-motion styles are retained; no animation is attached to text input. Physical mobile keyboard, screen-reader review and broad browser/device coverage remain manual release checks. Automated geometry checks are not a full accessibility certification.

## Exact hosted changes — approved and applied

1. `20261029000100_renaissance_settings.sql`: additive validated `user_settings.appearance`, safe `public_profiles.cover_id`, narrowly selected profile RPC output. Existing ownership policies and data remain.
2. `20261029000200_private_media.sql`: two **private** buckets (`deardaily-private`, `deardaily-story-media`), three forced-RLS media/cleanup tables, owner reservation/pruning RPCs, validation/revocation/cleanup triggers and restrictive client Storage policies. Private quota 100 MiB/account; public copies separately capped at 100 MiB/account and 30 staged/live images per entry; documents reference at most 10 images. New per-file cap 5 MiB, decoded server input cap 8 MP, output dimensions at most 1600px. Client preparation accepts up to 24 MP before downsampling.
3. Deploy only `media-gateway` Edge Function, including the pinned trusted decoder, with allowed origin `http://localhost:5173`. Supabase's service credential stays in server-provided environment variables. Function-level JWT verification is disabled to allow anonymous public-image reads; **every private operation independently validates the user token with Auth before privileged access**. Both buckets stay private.
4. After approved application, enable only the two localhost feature flags and run real hosted A/B/anonymous synthetic checks. No website deployment or production activation. Keep signup and anonymous login disabled, preserve the existing moderator role and all real data.

Before application: compare hosted history/schema/buckets and function version with this proposal, stop on any unexpected conflict; verify backup/export access and recovery assumptions; record exact SQL hashes. Do not replay old migrations, repair history, reset data or overwrite a pre-existing bucket. Additive rollback means disable the flags/function first; preserve columns/buckets/data for reviewed recovery rather than dropping user content.

## Remaining release gates

The two migrations and media-gateway were applied once, only to deardaily-dev after GitHub passed and the clean preflight confirmed no conflicting columns, tables, buckets or functions. Staged SQL and function source were copied back from their editors and compared byte-for-byte with reviewed local files. The dashboard deployment is the same function implementation, with only pinned imports expanded for its single-file editor. The gateway boot and anonymous unavailable-response checks passed. Only localhost media/appearance flags are enabled; production remains gated.

**45 real hosted checks passed** using distinct authenticated A/B identities (different authenticated ID endings), plus anonymous clients. Tests cover direct Storage denials, trusted decoding and image delivery, owner isolation, ownership spoofing, private asset reference rejection, publication staging, independent public snapshots, unpublish, private-original survival and exact cleanup. User B logout passed; User A was transferred to the normal writer session without retaining a password. The first test run exposed a missing ownership field in the test fixture; it was corrected, its fixtures were cleaned and the complete suite rerun successfully. No policies were relaxed.

The real hosted browser flow also passed: create synthetic entry → autosave → upload/reposition cover → upload inline image and alt text/width → save/reload with both images loaded → explicit photo approval → publish → Explore search → public story with actual images → unpublish → public story unavailable → delete exact synthetic entry and clean its objects. This walkthrough caught and fixed a frontend validator omission that rejected inline blocks; regression coverage now preserves private/public image blocks through native-editor reload.

Final SQL counts match preflight: **2 accounts, 3 private entries, 1 public story**. All exact test IDs are absent; private/public media registries, object count and cleanup queue are zero. Both buckets remain private. Existing and new RLS remains enabled/forced. The pre-existing absent migration-history table was not created or repaired. No real journal/profile/preference values were changed by tests.

Dashboard verification confirms signup and anonymous sign-in OFF, email confirmation ON and email provider ON; no auth account settings were changed. Security Advisor: **0 errors, 8 warnings** (seven deliberately privileged signed-in RPCs, including the new owner-scoped reserve/prune functions, plus leaked-password protection disabled), and six informational deny-by-default notices. Performance Advisor: no errors/warnings, four unindexed-FK informational findings: two on moderation_audit and one each on the new private_media/story_media composite references. Existing owner-first indexes exist; additional reference-order indexes require a separate reviewed migration/approval. These findings are recorded, not suppressed. Free Plan has **no automatic project backups**, confirmed in the dashboard; manual export/restore rehearsal and operational retention remain open release gates.

Existing documented warnings are not claimed resolved: leaked-password protection, reviewed privileged RPC notices, private deny-by-default no-policy notices, moderation audit indexes, migration history and operational retention/backup/restore gaps. Current advisor counts are recorded above. No warning-free claim or migration-history repair.

Email verification/recovery delivery, signup abuse controls, operational moderation/deletion procedures, legal policies, restore rehearsal and explicit public-release approval remain required before opening registration. No paid service, merge or website deployment is authorized by this report. Hosted media acceptance is complete. PR stays draft for the remaining physical-device/accessibility, cross-device appearance review and operational release gates; no merge or website deployment is approved.

## Applied artifact receipts

- Settings migration SHA-256: `899a152aaff30bbbb05f19af3b1aba6cb0952ba2ef6c4ccc8750c8d7587ffa02`.
- Media migration SHA-256: `04f796c4d881a45e1f78ed9a8e92105790044dde9e9f4ecd74faf8425f121419`.
- Transaction wrapper SHA-256: `570e55bc47e783697e28d271a5996e85ff0a625e6ec99d040e38bf323a2c074d`.
- Expanded dashboard function SHA-256: `5508d87ddb1c8d546e5740988e9dd543083a19a72d35f2cff67ea7f8af5d8de9`.
- The SQL bodies match the locally tested migration files; no old migration was replayed and no hosted history repair was attempted.
