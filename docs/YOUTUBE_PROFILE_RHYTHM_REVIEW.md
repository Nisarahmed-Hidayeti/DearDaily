# YouTube music and public profile rhythm

## Scope and hosted approval

The existing hosted music constraints accept Spotify only. Persisting YouTube requires `20261110000100_youtube_music.sql`: a transactional replacement of two shape checks to additionally accept a canonical YouTube video ID. No row updates, grants, RLS, triggers, functions, Storage or authentication changes. Existing Spotify IDs/excerpts and explicit source-sharing publication trigger are preserved. Video URLs, provider metadata, iframe HTML and playlist IDs are not stored.

Before applying: confirm deardaily-dev, compare both current constraint definitions and migration history, check existing non-null music conforms to the preserved Spotify format, and confirm the source consent trigger still exists. Stop on unexpected differences. No migration-history repair. Applying the migration requires approval; production selection remains gated by VITE_ENABLE_YOUTUBE_MUSIC until approval and real hosted permission tests pass.

Recovery: disable the frontend YouTube selection flag while retaining widened constraints and all saved data. Do not narrow constraints after people save YouTube selections. Existing managed backup/restore rehearsal remains an operational gap. This migration changes no existing data.

## Playback and privacy

Canonical HTTPS individual-video URLs from YouTube/YouTube Music/youtu.be are accepted. Playlist and tracking parameters are discarded. Official oEmbed supplies optional title/channel only; returned HTML is never used. Requests contain video ID only, omit credentials/referrer, and are canceled when selection changes. Thumbnail URLs are constructed from the validated ID. Metadata failure falls back to YouTube branding and direct provider link.

A compact card reveals an official visible player after a button gesture. No autoplay, extraction, hidden audio playback or fabricated controls. The player stays mounted through unrelated edits/sharing changes. At least 200px high, responsive 16:9; provider controls remain visible. Video availability and regional/embed restrictions remain controlled by YouTube. Existing Spotify behavior and native uploaded-audio controls remain separate and unchanged.

Official reference: https://developers.google.com/youtube/player_parameters and https://developers.google.com/youtube/iframe_api_reference

## Public rhythm

Move the existing approved count snapshot into the profile header's right-hand space and remove its old sidebar repetition. Mobile stacks beneath identity. Existing sharing/hiding control and backend consent remain unchanged. No calendar or month labels are invented: the current API exposes only an opted-in count, not daily activity. A genuine public day calendar needs separate explicit day-level consent and an independently reviewed restricted backend projection. That is deliberately not inferred from private journals.

## Gates

Focused/full frontend checks, TypeScript, lint, build; database YouTube acceptance/malformed input/source consent/cross-user/anonymous/unpublish tests in isolated CI; responsive browser checks. Hosted A/B/anonymous save/reload/publish/unpublish checks must pass after approved migration and before enabling YouTube selection in production. No real journal fixtures.

## Browser evidence

Actual YouTube oEmbed returned the official demonstration video's title/channel. Its official iframe played after its own Play control was clicked and continued through an unrelated title edit. No player existed before interaction. 360/768/1440px checks found no horizontal overflow; player stayed at least 200px high. Profile rhythm is alongside identity at desktop/tablet widths and below it on mobile. Only synthetic in-memory preview entries were used; no hosted mutation has been performed for this rollout.
