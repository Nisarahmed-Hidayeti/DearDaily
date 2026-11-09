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

Pending final CI, responsive/browser walkthrough, hosted preflight and synthetic checks. Do not mark all acceptance criteria complete until these results are recorded.
