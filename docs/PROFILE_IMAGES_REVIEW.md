# Custom profile images — reviewed rollout proposal

Branch: `feat/custom-profile-images`. Default and production feature flag: OFF until the hosted gate passes. Existing signup, email/Google, MFA, journal media, public snapshots and profiles are preserved.

## Exact changes

- Add only `20261109000200_profile_images.sql`: three forced-RLS registries for private profile assets, independently randomized public copies and owner settings/version; owner-only/private and restricted public RPCs; owner quotas; revocation and exact cleanup triggers. No existing user/journal/profile rows are rewritten. Existing profile response contracts stay unchanged.
- Reuse **existing PRIVATE** `deardaily-private` and `deardaily-story-media` buckets with a new `profile/` key namespace. No bucket creation/publicization, Storage-policy changes or direct client Storage grants. Journal image IDs/keys are never reused as profile assets.
- Update only `media-gateway` with additive `profile-upload/read/save/cleanup` and `?profile=<public-id>` routes. Existing journal routes stay intact. Every private request verifies a genuine user JWT and owner. Server-side decoding/re-encoding reuses the existing validator; SVG, forged headers, invalid containers, >5 MiB input/>8 MP processed input and >2 MiB output are rejected. Cropped avatars must be exactly 512×512; banners are processed at up to 1600px, with bounded saved positioning.
- Client JPEG/PNG/WebP limit 5 MiB/24 MP. Crop, zoom and two-axis positioning happen locally; originals/EXIF are not forwarded. Only processed WebP is uploaded. Preview does not save settings automatically. Each changed image starts **unshared**.
- A separate explicit checkbox per photo authorizes public copies. A visible public profile alone never publishes a private upload. Public reads disclose only new public IDs and an approved banner crop, never private IDs, emails, paths or ownership columns. Images remain independent of story anonymity; only existing opted-in bylines use them.
- Saves use an expected version; stale tabs cannot silently overwrite newer image choices. Public copy staging is unservable until the atomic consent commit. Failed/lost responses require reconciliation, not an automatic overwrite. Hiding/removing a public identity revokes copies and clears image consent; revealing it again does not republish them.
- New public requests are denied after hide/remove/replacement; already issued signed URLs can remain valid for **up to 60 seconds**. Previously downloaded/cached copies cannot be recalled. This matches the existing gateway boundary, not a claim of instant internet-wide erasure.
- Twelve original reservations/account, 16 MiB originals/account, 128 MiB project originals; twelve staged/current public copies/account, 128 MiB project public copies. Reservations serialize against concurrent quota bypass. Failed/replaced copies enter the existing exact-key cleanup queue. Unreferenced original/staged uploads have a one-hour grace period before owner-scoped pruning. No journal original is pruned by these operations. Background scheduling remains a separate operational gap.

## Hosted preflight (read-only first)

1. Verify project **deardaily-dev / tauqionxprutoahymjgu** and deployed main/gateway revision. Verify the migration is not already present by checking all proposed tables/RPCs, rather than replaying history. Hosted migration ledger was absent at the previous checkpoint; do not repair it or use hosted `db push/reset`.
2. Confirm no conflicting objects, both existing photo buckets still private, journal/profile RLS and grants unchanged. Record counts only (no journal text, keys, passwords or sessions). Inspect current cleanup triggers and profile visibility contract. Stop on unexpected differences.
3. Recovery assessment: the Free project had no managed backups at the last dashboard inspection. Verify current backup/export access and record that no restore rehearsal is established. Keep any private backup encrypted and outside Git. This additive change has no destructive down migration: deactivate only the profile image flag and restore the reviewed gateway/frontend revision while keeping new data. Hiding a profile must continue to revoke photos. Existing journals are not recovery test fixtures.
4. Record the exact migration SHA-256, original gateway source hash and deployment bundle hash. Apply the reviewed SQL in one transaction with a five-second lock timeout only after explicit hosted approval.
5. Deploy the reviewed gateway preserving its current self-authenticating wrapper setting and exact allowed origins. Enable the profile-image flag only on localhost first. No auth, signup, role or billing changes.

## Required release evidence

- Frontend/type/lint/build and full pgTAP; real isolated local Auth/Storage/SQL tests with two different sessions and anonymous requests, invalid files, private/direct-bucket denials, explicit sharing, replacement, hide/unhide, concurrency and exact cleanup.
- Real hosted ordinary A/B/anonymous tests before activation. Use existing approved test accounts only if their image settings are empty. Never replace a real existing public profile to construct a test fixture. Public hide/removal tests require an account without an existing public profile; stop if either precondition fails. Create a uniquely identified synthetic profile only for that otherwise empty identity.
- Record and clean only exact fixture assets/copies/object keys. Remove a synthetic public profile only if its full known fixture fields still match. No real profile, original journal image or role is cleanup material. Any final protected settings-row cleanup needs an exact identifier/state check.
- Actual browser crop/upload/save/reload, avatar fallback, banner preset restoration, byline/card/profile rendering, failed-upload retry and keyboard/mobile widths. Do not claim physical-device testing from viewport emulation.
- Only after passing: production profile flag, reviewed merge/deploy and exact live revision smoke check. No partial/unverified upload activation.

## Current evidence

Implementation and tests are in progress. No hosted schema/gateway/flag change or new permission has been performed by this feature branch. CI/local and browser results will be appended once observed.

Local frontend checkpoint: **284 tests / 61 files passed**, TypeScript, ESLint and production build passed. New focused coverage includes crop bounds across source aspect ratios/zoom/edges, private-by-default consent, hidden-profile sharing disabled, private remove/default fallback, banner positioning/preset restoration, failed-save reconciliation, private account-switch isolation and broken-image fallback. Database and real local API results are pending CI; workstation Docker cannot start noninteractively without the owner's system authentication. No credentials were requested or captured.

Hosted read-only preflight passed on November 9: dashboard target `deardaily-dev` confirmed; all proposed objects absent; both existing buckets private with WebP-only 5 MiB restrictions; journal/story/profile/media RLS enabled and forced. Counts: 13 journals, 5 stories, 1 public profile, 4 accounts. Existing `detach_identity` trigger matched the expected implementation. Hosted migration ledger remains absent and untouched. Read-only query receipt: `b53db6c9-1a7b-4a86-8ed7-586b459f11e8`.

CI `42620272446` passed at `0f1e279`: **456 pgTAP assertions**, **35 genuine local profile-image API/Auth/Storage checks**, exact synthetic cleanup, and all 284 frontend tests/type/lint/build. Additional bidirectional/replacement coverage and the DEV-only hosted harness are being finalized; their later CI receipt supersedes this checkpoint.

Actual browser canvas checks: JPEG file selection, 512×512 circular avatar export, keyboard zoom/position controls, 1600×640 banner export, bounded 360px dialog with no horizontal overflow and tablet processed-preview rendering passed. These are device-local crop tests, not hosted upload/save claims. Hosted rollout remains OFF.
