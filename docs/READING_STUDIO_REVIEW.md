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

## Hosted application and verified receipt — November 8, 2026

- CI for source `498b4890e25662919d21199b96ae722d192dce26` passed frontend/type/lint/build and a fresh isolated database setup/security suite.
- Confirmed dashboard target **deardaily-dev**, reference `tauqionxprutoahymjgu`; no conflicting voice columns, tables, functions or buckets. Existing account/journal/public-story RLS remained forced. Hosted migration history is still absent; no repair was attempted. The Free-plan backup page explicitly reports **no project backups**. No plan was purchased.
- Applied exactly the two new migrations atomically through SQL Editor query `373ee872-b227-41cb-ab30-c0950632a08f`. SHA-256: metadata `7d1d44aa017a39a7d06edc5bbe48cc96cf6df430b765c9f27ec5f01dd5de24ce`; audio `c2e87a786ec12ce09eda6a2f18f74f03cbc4efb1166b58134a173ebb4442932f`. Both audio buckets private; all three hidden tables use forced RLS. Counts immediately before/after: **11 private entries, 5 public stories, 4 accounts**, unchanged.
- CLI deployment lacked an access token, so the existing Supabase dashboard session deployed a reproducible single-file voice gateway generated by `scripts/build-voice-gateway.mjs`. Deno type-check passed; deployed bundle SHA-256 `9f00f092227573cb4cc21f4d3933bc3d3a412ff0b7d754f8cc11d93109714464`. The user separately approved turning this new function’s legacy JWT wrapper off, matching its reviewed self-authenticating/public-snapshot gateway design. No other function/settings changed.
- **27 hosted audio checks passed**, using genuinely different authenticated IDs ending `cb18d80862df` and `87704d9a3745`, plus an independent anonymous client. Verified owner isolation, spoof rejection, source approval, exact public sample bounds, snapshot independence, unpublish revocation and exact cleanup. The first run incorrectly tried to filter DELETE by a deliberately hidden public ownership column; the test query was corrected without changing permissions. SQL confirmed that run’s exact fixture rows/assets/copies and cleanup queue were already empty; the corrected full run passed cleanup. Final passing gate marker: `Synthetic voice gate d01c4aba-5c90-439a-befe-aa86ad86f802`; exact entries `84375574-6268-4a69-888f-619efb696546`, `33ed3830-4e58-4e92-9271-de9ac57e5ad0`.
- Real cloud editor walkthrough with synthetic entry `5eebd9f9-003c-4944-9cd0-9675d86123d4`: computer cover + inline photo uploaded and retained text; Grateful/Creativity metadata saved/reloaded; Ctrl+S confirmed private saving; 10–19s audio range persisted; explicit audio/photo approval published anonymously; both public images loaded; public audio duration was exactly **9 seconds**; unpublish removed the story; exact synthetic source was deleted afterward.
- Public auth settings still report Google/email enabled, signup open, email auto-confirm off (confirmation required), anonymous-users provider off. No auth setting was modified.

Production activation and final merge/deploy receipt will be added only after final head checks and live verification.

### Final bidirectional gate

The extended gate passed **33 hosted checks**, proving both directions of isolation, including that the backend-recognized owner account cannot read B’s private recording/journal or attach B’s recording to A’s page. Different IDs and exact cleanup passed. Marker `Synthetic voice gate ddb673ec-0707-4ed3-8a85-7b8db555f092`; fixtures `509c753a-c1c6-4b91-961f-03678ad19ded`, `031c1ea8-4722-4474-970a-3c19fe226079`. Memory-only captures were cleared afterward; ordinary login remains intact.

The signed-in homepage visibly showed **Your account / My journal / Continue writing**, with no guest Sign in link. Mobile/desktop checks at 360/1440 additionally covered Landing, Dashboard, Library, Explore, Settings, Account, Profile Editing, Privacy and Terms without horizontal overflow. These checks do not claim a physical mobile keyboard or exhaustive screen-reader certification.

### Remaining operational findings

Security Advisor, refreshed after application: **0 errors, 16 warnings, 13 info suggestions**. Fifteen warnings concern deliberately authenticated SECURITY DEFINER RPCs (including the new owner-bound, quota-limited `reserve_voice_note`); the remaining warning is leaked-password protection being disabled. The service-only gateway-record RPC is not granted to ordinary clients. Existing owner MFA/moderation and private RLS boundaries are unchanged. These warnings are recorded, not claimed resolved. Managed backups remain unavailable on the current Free plan; migration history and scheduled orphan cleanup remain operational gaps.

Source reservations include a one-hour grace period for unattached uploads/concurrent edits; the per-page upload quota can temporarily limit replacements until cleanup. This release does not claim unlimited media, background retention automation, Spotify Premium playback, physical-microphone certification, or legal compliance.

### Final direct-Storage gate

**38 hosted checks passed** with the same two different identities and confirmed cleanup. This also tests that A/B clients cannot directly download or mint URLs from the private bucket, anonymous users cannot list its actual stored objects, and published copies remain inaccessible through direct bucket reads. The gateway is the only application access path. Passing marker `Synthetic voice gate c76a8f01-a092-4fd2-9352-8c5ef971f288`; exact fixture entries `04e66af3-e982-4ef6-b79a-9e515cbd8019`, `a137fcfb-2299-4b27-a0f2-70a4d3a801e8`. Captures were cleared after the receipt was saved.

Read-only SQL verification found no remaining earlier fixture IDs or voice assets/copies/cleanup jobs. The project had one additional private entry at a later count; it was outside all identified fixture IDs and was preserved untouched. No cleanup ever selects rows solely by a title prefix.

The final UI removes internal cover IDs from publication text, uses sharper artwork plus lightweight gallery thumbnails, and requests audio playback only after Listen is clicked (browser autoplay policies can still require the native Play control).
