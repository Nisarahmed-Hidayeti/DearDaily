# Reading studio release status

Branch: `feat/deardaily-reading-studio`, PR #11.

Implemented: authenticated landing navigation; 15 curated covers including six public-domain Met artworks; compact gallery with small thumbnails; wider document/overlapping icon; uniform private writing checkmarks; 16 moods and 12 private categories; voice recording/upload and visible excerpts at the document end; exact approved public audio copies; deliberate sharing and unpublishing. Existing rich editing, photos, themes, Focus Mode and autosave are preserved.

Approved development migrations and voice-gateway are applied once to deardaily-dev. **38 hosted A/B/owner/anonymous/direct-Storage checks passed**, plus 386 pgTAP assertions and 25 local real-API checks. The full frontend checkpoint was 257 tests; final CI and website deployment receipts are in READING_STUDIO_REVIEW.md.

Agreed Spotify fallback: normal track/playlist player below the cover. Automatic Spotify account/playlist extraction and guaranteed Spotify song excerpts are unfinished and not advertised. Exact excerpts work for owned uploaded audio/recordings. Smithsonian/USDA artwork collections and physical-phone/microphone hardware QA remain future work. Current audio beta limits and operational gaps are explicit in the review.
