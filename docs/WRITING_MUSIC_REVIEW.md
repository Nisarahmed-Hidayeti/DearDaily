# Writing soundtrack — local implementation

The editor offers an optional Spotify track/album/playlist below its cover. Spotify is contacted only after Load Spotify player. Strict canonical URL parsing excludes arbitrary iframe HTML, credentials, non-HTTPS URLs and other hosts. Journal text and metadata are not submitted to Spotify. Spotify controls playback availability and may require login; full-song playback is not guaranteed. Browse Spotify charts opens the provider’s actual charts rather than presenting invented trend data.

The native Play / pause button supports Space while focused. No global Space handler intercepts typing, selection or editor shortcuts. Ctrl/Cmd+S prevents browser Save Page and calls the existing concurrency-protected cloud save using the latest draft. Existing backend-confirmed status/error handling remains authoritative.

Music is explicitly session-only, never saved to account records or public snapshots. Persistent per-entry music, explicit public music snapshots and MP3/recording uploads remain incomplete and need reviewed additive schema/storage changes and isolation tests. No hosted settings, schema, Storage permissions or deployment changed in this increment. Owner/streak release still requires the outstanding real authenticated MFA security gate.

Provider documentation: https://developer.spotify.com/documentation/embeds/references/iframe-api
