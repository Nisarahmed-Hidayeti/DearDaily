# Compact public writing calendar

Removes the public identity-since label. Uses the existing home-page activity grid in a small unbordered profile-header layout, titled with the author's first public name, e.g. “Ahmed’s writing rhythm.” Mobile stacks beneath identity. Count-only sharing remains count-only.

## Necessary hosted change, pending approval

`20261110000200_optional_public_rhythm.sql` adds one nullable `public_rhythm` JSON snapshot to public_profiles, SELECT permission for existing visible-profile readers, and `set_public_rhythm(enabled,today)` for authenticated users. No existing rows are changed. No direct client insert/update permission is granted for the new column. Existing profile visibility RLS still applies. No journal/API permissions, Auth or Storage changes.

The function locks only the caller's own profile and snapshots distinct saved-entry dates across the latest 12 Monday–Sunday weeks. It excludes drafts and future dates, returns no text, mood, counts, IDs or ownership fields, and accepts no target-user argument. Dates remain null by default and change only after the separate “Share my writing dates” confirmation or explicit refresh. Hide sets the snapshot to null. Private writing never updates the public snapshot automatically.

This is new day-level disclosure: existing streak-count consent does NOT authorize it. Each author must opt in separately in Edit Profile. Enabling the feature does not opt anyone in, including the owner.

Preflight: confirm deardaily-dev; inspect column/function absence and existing visibility RLS/grants. Stop on unexpected differences; do not reapply or repair migration history. Recovery: disable VITE_ENABLE_PUBLIC_RHYTHM and preserve all data; callers can hide their snapshot using the existing new RPC. Managed backup/restore rehearsal remains a documented operational gap. No real profile/journal fixture writes without explicit consent.

Approval scope: apply only this migration after local/CI checks, enable localhost tests with synthetic fixtures, then activate/deploy only after permission and responsive tests pass. Owner must explicitly choose to share their actual dates; never enable consent on their behalf.

## Approved hosted verification — 2026-11-10

User approved the optional calendar rollout. Preflight confirmed the column/function were absent and profile visibility RLS was forced with visible-or-own filtering. Applied only the reviewed migration, SHA256 `49f6a3087f5f3683d08bc9e376140650ef888ad76c43e21a55490e4b7a0a7a65`, after CI passed 301 frontend tests, 499 pgTAP checks and 43 real local profile-image permission checks. No history repair or Auth/Storage changes.

Nineteen real hosted assertions passed with two distinct authenticated sessions and an anonymous reader. Test required the writer account to have no profile or journal entries before creating its synthetic profile and source entry. Verified default-null snapshot, explicit sharing, exact public projection, cross-user source isolation, denied anonymous source/RPC/owner-ID access, denied direct snapshot updates, hidden-profile denial and explicit hiding. The owner's real profile was never altered.

Exact cleanup confirmed both synthetic journal UUIDs and the test username were absent. Independent read-only postflight confirmed direct update and anonymous RPC permissions are denied, and no existing profile has been opted into sharing dates. Local full frontend suite: 303 passed before an additional confirmation-error regression; focused error tests: 3 passed. TypeScript, lint and production build passed. Responsive browser checks at 360/768/1440 found 84 cells, no dashboard card border and no horizontal overflow.

Production activation exposes the optional control only. Authors must open Edit Profile → Share writing calendar → Share my writing dates to display their calendar; no automatic opt-in. The obsolete joined-month display and editor toggle are removed without deleting stored profile data. Final revision CI and exact production smoke test remain release gates.
