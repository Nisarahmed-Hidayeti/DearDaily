# Editor review — 2026-11-05

Implemented locally on the existing feature branch:
- Preserve legacy plaintext and current document content when changing page appearance.
- Insert uploaded photos after a selection rather than deleting the selected writing.
- Editable page icon control replaces the recurring cover/icon caption after customization. Original public-story icon moves to a centered box along the cover's lower-left edge; Explore cards show the selected icon even when a cover exists.
- Four-point brand symbol based on the supplied reference; neutral account icon and guest greeting without fictional names.
- Compact Aa text-tools control and wider desktop document, retaining publish/review/export/private-copy actions.
- SDK session storage persists across tab closure with migration of existing tab-scoped auth keys. Sign-out removes both stores; private writing is not placed in this storage.

Remaining acceptance work:
- Actual hosted upload, autosave and publication regression flow using synthetic fixtures; actual sign-in → close tab → reopen → sign-out check.
- Full responsive/theme screenshots after all tests pass.
- Audio/MP3 and recording uploads are not implemented. Existing image-only validation and private Storage policies must not be relaxed. Audio needs constrained media validation/quotas, owner-only storage, explicit public-copy approval and publish/unpublish tests before hosted approval.
- Optional public profile streak is not implemented. Private streak data must remain private by default; add a separate opt-in public snapshot/interface with RLS tests and reviewed hosted approval.
- Signup release gates in REGISTRATION_LAUNCH_GATE.md remain open. No hosted database/storage/auth settings, signup flags, merge or deployment were changed during this review.

## November 5 authenticated verification

- Existing confirmed owner session persisted in a new browser tab; private cloud saving and reload passed.
- Synthetic fixture `3e746629-6af6-4ec6-9588-edf821a6c890` was saved, published with byline disabled, viewed as “Anonymous writer”, then unpublished. Private fixture retained for traceability; no real entries modified.
- A separate unauthenticated Supabase client read the published snapshot with `public_username = null`, could not read the private journal, and received zero public rows after unpublishing. Wildcard public selection was denied by restricted column permissions.
- Frontend suite: 192 tests passed across 33 files. This is not a fresh two-user isolation audit or completed registration/recovery test.
- Anonymous publishing means an authenticated author with a hidden public byline, not anonymous Auth or operator-untraceable publishing.
- Publishing bans and broader owner administration remain unimplemented; existing moderation does not grant access to private journals. Hosted privilege changes need reviewed migrations and approval.

## Recovery usability follow-up

Owner confirmed that entering the recovery code and submitting a new password worked. Recovery requests now navigate directly to the code-entry reset page with the email prefilled in navigation state (never in the URL); the existing reset-page effect clears history state. Email verification remains required, and password fields remain locked until the SDK confirms recovery. Fresh password login after this owner-performed reset remains to be verified.

## Approved authentication rollout and editor follow-up

The owner approved the auth-only rollout on November 7. PR #8 was merged as `33d947a` and Netlify confirmed that production commit published. Netlify received the public Turnstile Site Key and Google frontend flag; signup values remain false. deardaily-dev Site URL is now the live Netlify origin with exactly two added production callback/reset URLs and both existing localhost URLs retained. Hosted CAPTCHA still awaits live verification and owner-entered secret; no journal/Storage migration was applied.

Local-only editor follow-up: chosen covers are now keyboard-accessible buttons opening the same replace/remove/reposition dialog. Cover and icon changes preserve latest writing, and icon badges overlap the lower-left cover corner only when a cover actually exists. The glyph remains centered within its badge. Eight focused appearance/editor regressions passed before the spacing-only follow-up. These design changes are not part of the deployed auth PR.

Audio uploads/recordings and optional public streaks remain unimplemented and private by default; no broadening of image Storage policies or private account metadata exposure is authorized by this editor request alone.

The complete frontend suite now passes 197 checks across 34 files. Actual browser cover→curated photo→emoji→Apply preserved the workshop writing and retained both accessible edit controls. A 360px viewport had no horizontal overflow, and the appearance dialog opened successfully. Desktop/mobile screenshots are in `/tmp/deardaily-editor-cover-verified.jpg` and `/tmp/deardaily-editor-mobile-verified.jpg`. This does not claim an actual mobile keyboard test or a fresh hosted image-upload cycle.

Owner reports successful sign-in on the deployed live website after the live Turnstile handoff. The agent prepared the deardaily-dev Turnstile provider/enable draft, left the secret empty, and opened the Cloudflare Edit Widget screen for the owner to copy the Secret Key directly. Saving hosted CAPTCHA remains a user handoff; do not treat the unsaved switch as proof of activation.
