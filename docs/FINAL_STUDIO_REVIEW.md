# Final writing studio review

## Scope and rollout

Branch `feat/final-writing-studio`, based on main `e41e8ee730cd1856819e4e609a14d7c127d4d2b4`.
The existing live beta registration, CAPTCHA, email confirmation, owner MFA and all journal/media RLS boundaries stay unchanged.

One new migration: `20261109000100_studio_polish.sql`. Do not reapply previous migrations or repair the absent hosted migration-history table.

- Extend existing strict music JSON checks with optional integral `excerpt.start/end` in seconds, 0 <= start < end <= 86400. The existing explicit source-sharing trigger still checks the entire public music selection, including this range.
- Extend the existing appearance font allowlist and theme constraint without changing saved values.
- Offer the same twelve supported journal categories as explicit public categories. Private metadata is never copied automatically.
- Add an optional public-profile JSON panel with a strict field allowlist, six bounded interests, an HTTPS personal link and a story-count toggle. Existing visible/owner forced RLS governs it. No private data is derived into the panel; existing joined-month and server-controlled streak consent remain independent.
- No row updates/deletes, private permission expansion, buckets, account changes or new service secrets.

`VITE_ENABLE_STUDIO_POLISH` stays off until CI database checks, clean hosted preflight, approved application and hosted synthetic checks pass. Independent presentation fixes can ship with this flag off.

## Preflight and recovery

Confirm `deardaily-dev` / `tauqionxprutoahymjgu`. Record row counts, RLS/forced flags, existing constraints and appearance validator definition. Confirm the new validator functions and `public_panel` column do not exist and the old definitions match reviewed source. Stop for unexpected differences. Do not reset or alter real rows.

Apply the exact reviewed file inside one transaction with a five-second lock timeout. PostgreSQL rolls back the transaction if any operation fails. Verify counts and private/public RLS flags afterward. Preserve an audit of the exact SQL hash and deployment revision.

Recovery: disable only the new UI flag and redeploy the previous reviewed revision. Retain additive columns and broadened constraints so newer saved values are not destroyed. There is no destructive down migration. The free project does not provide managed backups; do not promise point-in-time recovery.

## Spotify limitations and privacy

The application embeds Spotify across an origin boundary only after a user gesture; it does not execute Spotify scripts inside the private editor. Unrelated editing/sharing updates must retain the same iframe. Selecting a different entry cannot inherit another entry's loaded player.

Spotify controls preview/full playback, account availability and playlist behavior. One specific song can be chosen with its official track link; playlist listing/account integration is not claimed. Start/end values are explicitly labeled intended moments, not actual Spotify clipping. Owned/licensed voice/audio already supports precisely prepared public excerpts through the existing voice gateway.

Official references:

- https://developer.spotify.com/documentation/embeds/references/iframe-api
- https://developer.spotify.com/documentation/embeds/reference/oembed

The documented seek operation targets podcast episodes; no reliable end-boundary music clipping is guaranteed. No audio is ripped, proxied or substituted. Provider UI displays its own legitimate title/artist/artwork. No custom fake playback control or autoplay is added.

## Verification record

Verified on 2026-11-09:

- Full enabled-rollout frontend suite: 271 tests across 56 files. TypeScript, ESLint and production build pass. The long publishing integration test retains all assertions and has a 15-second total timeout to accommodate lazy editor setup on slower machines.
- Isolated GitHub database suite: 415 pgTAP assertions across 12 files, passing run 42553055941. Workstation Docker requires a system password; no hosted reset was used as a substitute.
- Applied only the new migration after the clean preflight. SHA-256: `4f55a307da3d8e47c62ad0099fe60d2bb7b69fc166edbefee433fb20133ccdce`. Existing appearance-validator body matched MD5 `50d134d643697bc6de129c660f46d3ce` before application. Journal/story/profile/settings forced RLS stayed enabled.
- 61 hosted SDK checks passed with two distinct confirmed identities (suffixes `cb18d80862df` and `87704d9a3745`), including the protected owner, ordinary user and anonymous visitor. Private journals, images and audio remain isolated. Explicit music moment approval, public/private snapshot independence, public categories, opt-in profile details, hidden ownership, public media reads and unpublish revocation passed. Synthetic cleanup passed.
- Actual browser flow passed: writing, Ctrl+S, private cover upload, inline photo insertion, caption/width editing, cover/icon changes without losing text, reload, persisted soundtrack/share preference/moment, one-confirmation anonymous publication with explicit photo approval, Explore card, public reading, unpublish and exact source deletion.
- Walkthrough fixture `93ff7a2c-aa59-437b-9e7f-abf29638c251` is gone. Counts remain 13 private journals, 5 public stories, 1 public profile and 4 accounts. All four image/audio buckets remain private.
- Mouse block drag and undo passed in the actual browser. A regression covers reordered JSONB attributes retaining image-control focus without resetting document content. Opening details now preserves focus mode and its saved preference.
- Six themes at 360/768/1440 pixels: 18 editor checks without horizontal overflow. Thirteen routes at those three widths: 39 layout checks without horizontal overflow. Five writing-font stacks respond correctly. Mobile gallery, icon search and dialog bounds were inspected; physical mobile software-keyboard behavior still needs a device check.
- No authentication setting, account role, Storage policy, existing migration or real journal was changed by the redesign. Existing protected beta registration remains as previously configured.

Final revision CI and the exact published Netlify revision must still be verified before declaring deployment complete. The delivery receipt is maintained on PR #13.

## Deliberate limits

Spotify remains the real provider player: preview/full-track availability and provider login are not controlled by DearDaily. Track-link selection is the supported one-song fallback. Intended moment metadata is not playable Spotify clipping; owned/licensed audio uses the existing safe excerpt pipeline. No third-party provider script is injected into the private editor.

Profiles keep their existing emoji avatar and curated-banner controls. A general profile-photo upload flow is not implemented by borrowing journal-owned private media. Longest private-writing streak is not exposed. Only the existing consented current-streak snapshot is offered.

Existing operational gaps remain documented: free-plan backup limitations, leaked-password protection warning, guarded privileged-function advisor notices, absent hosted migration history and media retention scheduling. This release does not claim perfect security, legal compliance or physical-device microphone/keyboard verification.
