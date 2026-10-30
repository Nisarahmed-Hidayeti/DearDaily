# Editor details and publication checkpoint

PR #6 continues on its existing branch. Merge and website deployment remain on hold for review.

- Desktop details use a collapsible side panel. Mobile/tablet details use a native modal bottom sheet, sized to the visual viewport, with a reachable save action and Escape dismissal. Summary chips keep private mood, category, tags, visibility and save access near the document. Focus mode hides these controls without recreating the editor.
- Explicit public-copy preferences are saved in the existing owner-only versioned document envelope as a distinct `publication` object. Private category/tags/mood are never used as implicit public choices. Existing published choices are reused when a legacy draft has no saved plan.
- The final Cancel / Publish now receipt has no repeated metadata form. It shows identity, selected public metadata, title, writing preview/full-copy disclosure and photos. Private uploaded photos still require explicit approval. Errors preserve the confirmation rather than claiming success.
- The publisher strips `publication` preferences from the public document for both media and text-only snapshots. No hosted migration or Storage permission change is needed.
- Authenticated users never fall back to the sample editor/dashboard, including while restoring a session or when a build disables cloud writing. Guest samples clearly say writing is not saved.
- Expanded curated Unicode icon selection supports keyword search, categories and keyboard movement. New icons live in the document envelope; the old constrained `page_icon` column retains only its existing supported values. Existing icons, plain text, covers and public snapshots remain compatible.

Physical mobile keyboards cannot be exercised by the desktop browser runner. Actual mobile-size layouts and a reduced visual viewport can be tested here; a real-device keyboard pass remains a manual release check. Profile editing currently offers the existing public profile symbols; custom profile-photo uploads require separate owner-approved media/API work and are not claimed complete.

The next administration/registration phase is planned separately in NEXT_ADMIN_PHASE.md. No unfinished owner controls, bans, notifications or signup activation are added to this editor release.
