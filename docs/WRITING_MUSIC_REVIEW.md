# Writing music and upload reliability — review

## Implemented

Spotify track/album/playlist selector directly below the cover, a link to actual Spotify Charts, opt-in player loading and accessible Space playback on the focused Play / pause button. No global Space listener interferes with writing. Ctrl/Cmd+S uses the existing concurrency-protected cloud save, backend-confirmed status and error handling. Spotify's real preview played/paused in the browser; full-track availability remains Spotify-controlled. This is not a Spotify account connection or an in-app live trending catalogue.

The new-page upload transition preserves the editor and cover dialog when the first save adopts its canonical URL. Uploads now await an existing initial save instead of interpreting a busy save as failure. Cover failures show the actual validation reason, and selecting the same file again retries correctly. Real cover and inline uploads, original synthetic writing, save/reload, and 360px no-horizontal-overflow were verified. Exact synthetic entries `49a2e86a-e365-4efc-a808-842b25a5deb2` and `97216287-4fe7-49e9-86e1-1989626d5000` were deleted after verification; real entries were untouched.

Evidence: `/tmp/deardaily-live-upload-regression.jpg`, `/tmp/deardaily-upload-mobile-verified.jpg`, `/tmp/deardaily-music-and-upload-verified.jpg`.

## Proposed hosted change — NOT applied

Apply only `supabase/migrations/20261108000400_writing_music.sql` to **deardaily-dev**, after CI and a clean preflight:

- Add one nullable JSONB `music` column to `journal_entries` and one to `public_stories`. Existing rows remain NULL; no backfill, reset, deletion or rewriting of writing documents.
- Private music stores only `provider: spotify`, `kind: track|album|playlist`, a 22-character alphanumeric ID and an explicit boolean `share` choice.
- Public music stores only provider/kind/ID. No raw URL, HTML, private sharing preferences, account identifiers or credentials are permitted.
- Add strict shape constraints and column-level grants matching existing ownership/public-read boundaries. Existing forced RLS and Storage policies stay unchanged.
- Add one restricted trigger function in `deardaily_private`. A public music insert/update must match the authenticated owner's exact source selection and explicit sharing approval. Ordinary clients cannot execute the function.
- Private edits never update published music automatically. Unpublishing removes the public row and its music reference; it cannot remove Spotify's own public track.

Enable `VITE_ENABLE_WRITING_MUSIC=true` on localhost only after the migration, then run synthetic authenticated A/B/anonymous hosted tests. Production stays false/absent. The flag defaults false and `.env.example` documents the dependency. With it false, the already-implemented player is explicitly session-only and does not write new columns.

## Safety and release boundaries

No Spotify client secret, OAuth scope, paid plan or service-role frontend key is needed. The provider is contacted only after Load. No journal text/metadata is submitted; Spotify still receives ordinary network/browser information. Public readers must independently choose to load the approved player. Unknown or malicious music objects do not crash the surrounding journal.

Local validation: 236 frontend tests, TypeScript, ESLint, production build, 18 real local authenticated API checks using two distinct synthetic users plus anonymous, and 355 pgTAP checks, including 23 music checks for shape enforcement, source approval, cross-user isolation, anonymous restrictions, snapshot independence and unpublish. The additive migration was applied to the retained **local** database once, without reset; only its exact local migration-history version was marked applied afterward. No hosted history was changed. No hosted migration or Storage permission change was made.

Remaining release gates: CI on the final commit; approved hosted migration and A/B/anonymous verification; existing real owner-MFA gate before enabling owner/streak features. MP3 uploads/recordings remain separate future work requiring trusted server validation, private Storage and explicit publication tests. No production activation or deployment in this increment.

Provider reference: https://developer.spotify.com/documentation/embeds/references/iframe-api
