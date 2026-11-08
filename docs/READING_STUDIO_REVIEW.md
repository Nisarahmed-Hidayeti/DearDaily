# Reading studio — hosted approval and release gate

Target: **deardaily-dev only**. No hosted changes have been made for this branch.

## Proposed hosted changes

1. `20261108000500_expanded_journal_metadata.sql`: expand the allowed private mood/category values. Preserve all existing values, rows, RLS and public metadata rules.
2. `20261108000600_voice_notes.sql`: add `voice_notes` JSONB columns with empty-array defaults to private entries and deliberate public snapshots; create hidden asset/copy/cleanup tables; create **two private audio buckets**; add a restrictive Storage policy denying all direct client operations on these new buckets; add owner-bound quota reservations, strict shape/ownership/publication checks, and cleanup functions. Existing photo buckets/policies are unchanged.
3. Deploy **only** `voice-gateway`. Private operations verify genuine Supabase identity, origin and asset ownership. Public reads require an exact audio ID present in a currently published story. Service credentials remain server-side.
4. Enable localhost voice and expanded-metadata flags for synthetic A/B/anonymous hosted tests. Production flags are enabled only after those tests and final CI/browser gates pass. The user has requested deployment of the completed release, not permission to skip these gates.

## Audio boundaries

- Recording requires an explicit microphone action; file uploads support browser-decodable MP3/WAV/WebM/Ogg/MP4, up to 20 MB and three minutes. The browser strips metadata and produces canonical mono PCM16 WAV at 16 kHz. The server independently validates every container/header/length field and accepts no compressed or arbitrary uploaded payload.
- At most three notes per entry, 30 reserved source assets per account; combined conservative audio allocation is capped at 20 MiB/account and 128 MiB/project. Allocation is serialized to prevent concurrent quota bypass. Public staging is also capped (nine per entry, 30 per account).
- Private notes default to **not shared**. Each note has a name and selected start/end. Publishing requires source approval, exact matching metadata and the current source version. Public copies physically contain **only the approved samples**, not the rest of a private recording. Public IDs reveal no owner/source ID.
- Private edits do not change public snapshots. Unpublish/moderation removes new public access and queues exact objects for deletion. Previously issued signed URLs last up to 60 seconds; downloaded/cached copies cannot be recalled.
- Unattached/staged files are pruned after a one-hour grace period on owner cleanup. Deletion failures remain queued for retry. There is no new scheduled retention service; this operational gap is explicit. Pruning never removes assets needed by published snapshots.

## Spotify boundary / unfinished request

The existing player can display a playlist and a selected track link, but **automatic playlist-to-track selection and guaranteed music excerpts are not complete**. An opaque-sandbox iFrame API experiment did not render reliably and was removed; journal pages never run Spotify scripts directly. Spotify's documented embed `seek` method targets podcast episodes, not guaranteed song excerpts: https://developer.spotify.com/documentation/embeds/references/iframe-api .

Full playback / account playlist integration requires Spotify developer setup and authorization; development mode currently requires the app owner's Premium account and supports five allowlisted users: https://developer.spotify.com/documentation/web-api/concepts/quota-modes . No paid service, Spotify account connection or audio downloading is approved or implemented. Do not advertise exact Spotify clips as working. Owned audio excerpts work through the new note pipeline, subject to the hosted release gate.

## Validation / deployment sequence

- Local pgTAP suite and real local A/B/anonymous API tests; synthetic fixtures cleaned by exact IDs.
- Frontend tests, TypeScript, ESLint, production build; responsive four-theme editor/browser checks.
- Hosted preflight: verify project name/reference, existing entry counts/compatibility, exact absence of proposed columns/buckets/functions, current auth protections and schema definitions. Stop on unexpected differences. Do not repair absent hosted migration history or reapply old migrations.
- Review compatibility/recovery: changes are additive and old clients omit the new columns. Existing private entries require no conversion or deletion. Roll back activation using flags; preserve stored audio/rows. No database reset or destructive down-migration. Managed backup/PITR availability is not assumed; verify current project recovery options before hosted application.
- Apply only the approved migrations/function, run real distinct A/B/anonymous hosted audio and publish/unpublish tests, then merge/deploy only if all release blockers are resolved or the user explicitly approves the documented Spotify fallback.

Signup, confirmation, CAPTCHA, existing Google/password login and owner MFA permissions must stay as currently configured. No real journals are test fixtures.

## Local checkpoint

- 386 pgTAP assertions / 11 files passed, including cleanup preserving independently published audio.
- 25 real local API checks passed with distinct A/B users, anonymous reads, invalid uploads, ownership spoofing, source approval, exact nine-second public bytes and revocation after unpublish. Exact synthetic entries, accounts and objects were cleaned.
- 257 frontend tests passed at the full checkpoint, including account-switch player removal, excerpt bounds and microphone-refusal recovery. TypeScript, ESLint and build passed.
- Editor rendered without horizontal overflow at 360px, 768px and 1440px in all four themes. Real browser synthetic file decoding and 10–19 second selection worked in the device-local workshop. Hardware microphone recording and an actual mobile OS keyboard are not claimed as tested.

The user approved development-only application/testing and the honest Spotify fallback after this review was prepared. No other hosted permissions are implied.
