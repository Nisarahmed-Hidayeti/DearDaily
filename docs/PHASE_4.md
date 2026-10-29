# Phase 4 — staged community implementation

Status: hosted database security gate PASSED; localhost community activation and synthetic core UI walkthrough completed October 29. Production activation/deployment remain unapproved.
Implementation branch: feat/deardaily-phase-4. The owner subsequently requested keeping main fresh; tested code may be merged with community disabled and Netlify deployment skipped, without claiming Phase 4 acceptance. Phase 3 PR #3 was merged; main was clean/current at 22eabd9. No leftover Phase 3 changes were found.

## Local implementation

- Opt-in public profiles at /u/:username, pseudonyms, validated unique usernames, 80-character display name, 300-character biography, four built-in icons (no uploads/tracking URLs), optional self-selected public-identity month. This month is not extracted from Auth. Names are not verified identities. Reserved administrative names are rejected.
- Public profiles use a separate table. Existing private profiles are unchanged. API grants omit ownership IDs even for authenticated visitors; the own-profile RPC returns a fixed safe JSON allowlist. Hiding or renaming a profile clears existing story bylines. Opting back in never automatically relinks them.
- Explore has title search, explicit category filters, newest/oldest order and 12-story server pagination. Published snapshots only. Fictional examples live under /explore/samples.
- Story detail includes reading time/date, optional byline/public tags and reporting. Both existing /explore/published/:id and /explore/:id work. Rendering is React text, never HTML injection.
- Publication review independently selects optional public author/category/tags. Private metadata is never copied automatically. An update replaces public metadata with the explicitly reviewed selection. Existing snapshots default to no byline/no tags/Uncategorized.
- My Published Stories, explicit update/unpublish/delete routes, account JSON export and a clearly labeled manual account-deletion request workflow.
- Reporting requires an authenticated closed-beta account. Anonymous readers are invited to sign in; unrestricted anonymous write access is deliberately unavailable without a trusted abuse-prevention service. Backend serializes per reporter; maximum five per rolling 24 hours, one per story. Report text is bounded. Account creation remains closed.
- Restricted moderation queue and decisions; moderator membership is provisioned only by a separately approved database-owner action. No API client may grant roles. Reporters/ordinary authors cannot read the queue or audit. Decisions remove public snapshots without deleting private source entries. Removed entry IDs are blocked from republication; copying content into a new entry is still possible and needs human moderation.

## SQL review / approval scope

20261028000200_public_community.sql is additive: adds public_profiles, a non-exposed private schema with moderator/report/audit/removal/deletion-request tables, three public snapshot metadata columns, indexes and narrowly scoped functions/triggers. It does not reset, drop or rewrite source journal entries or existing account tables. Existing stories receive privacy-safe empty metadata defaults.

All new tables enable and force RLS. Private schema has no API usage/table grants. Public columns are explicitly granted. Ownership changes are not granted. Security-definer functions have empty search_path, no dynamic SQL, fixed return fields and explicit auth/role checks. Trigger functions are not callable by API roles. They access hidden ownership/moderation rows; this is a deliberate privileged boundary, not an unchecked view bypass. Attribution validation locks the profile row to serialize against opt-out. A shared per-story transaction lock serializes moderation removal with publication. Concurrency tests remain required before a larger release.

No hosted migration, moderator assignment, migration-ledger repair, Auth setting change, Netlify deployment or paid feature is authorized by this document. Public registration stays disabled. VITE_ENABLE_COMMUNITY defaults false and must stay false against hosted deardaily-dev until its migration and real A/B/moderator/anonymous tests pass.

## Verification plan

Run TypeScript, lint, frontend tests, build, all pgTAP tests with anon/A/B/moderator roles and review unauthorized-operation final state. GitHub CI uses an isolated local Supabase, never hosted credentials. Local Docker was inactive and requires an interactive password to start; never request that password in chat.

After separately approved hosted migration: preflight exact project/schema/function conflicts and exact migration hash; apply only reviewed SQL transactionally, inspect warnings and grants; run real-session A/B isolation, anonymous safe-field reads, opt-in/out and spoof attempts, reporting/duplicate/limit tests, ordinary-role moderation denial and authorized moderation audit. Use synthetic fixtures, preserve unrelated content, cleanup only fixtures. Do not claim local pgTAP/mocks prove hosted security. Enable the flag only after this gate.

## Warnings and operational limits

The migration adds a source-owner foreign-key index to address the Phase 3 index advisory; hosted resolution is unverified until approved application/advisor review. Leaked-password protection is unchanged and disabled as last observed. CLI migration history remains absent; never db push or replay already applied CREATE scripts. Ledger reconciliation requires separate approval and exact catalog/hash comparison.

No public profile or community tool is enabled on the live website. Main pushes can trigger Netlify continuous deployment. Use [skip netlify] on commit messages and PR title to suppress branch/preview deploys; require explicit deployment approval before any unsuppressed main push. See https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#skip-a-deploy .

## Retention / privacy operations

Private entry deletion cascades its public snapshot. Unpublish deletes only the snapshot; downloaded copies cannot be recalled. Public readers recheck story availability on focus/every 15 seconds. Hiding a profile removes attribution, not story text. No journal/report text is logged by application error handling. Account export is generated in memory as a local download; it contains sensitive journal text, no tokens/passwords. Export failure does not download a partial account file.

Deletion requests do not delete Auth accounts or publish removal immediately, have no automatic email and no promised response time. Project owner must review pending requests via the private schema, explicitly authorize operational deletion, remove Auth user (cascades owned entries/profiles), and confirm completion. Reporter/moderator IDs use ON DELETE SET NULL where audit retention is necessary. Reports/audit retain reason/context/story ID after unpublishing but never a private source snapshot. Human review must redact personal details. Proposed retention: purge report text after 90 days and retain minimal decision audit 12 months; these are proposed policies, not automated jobs or compliance claims. Before beta expansion establish a reviewed scheduled purge, deletion fulfillment process, backups/restore and backup expiry, moderator coverage/appeal/contact channel, incident response, privacy policy, terms, age/consent requirements and legal review. No legal-compliance or production-readiness claim.

## Next milestone

Finish hosted security gate and real end-to-end tests, verify 360/768/1440 layouts in all four themes, resolve critical findings, then enable the community flag only after verified acceptance. No Phase 5 implementation now. Recommend Phase 5 focus on deletion/retention operations, moderation policies and access review, accessibility/device testing, backups/restore and controlled release; Google/email recovery remain deferred.

## Completed verification checkpoint

TypeScript, lint, production build and 94 frontend tests passed. The initial full GitHub isolated-Supabase run passed 186 database checks; subsequent hardening adds ownership/helper tests and re-runs the entire suite before merge. Development-only verifier/visual fixtures are excluded from production output. The hosted read-only preflight confirmed exactly journal_entries/profiles/public_stories/user_settings, no public_profiles/private-schema conflict and no CLI ledger. No hosted writes were performed.

A separate, explicitly labeled synthetic visual preview passed real browser overflow checks at actual 360/768/1440 widths in each of four themes (12 combinations). A 360px modal fit the viewport, received focus and closed with Escape. These are layout/interaction checks of synthetic components, not hosted functional or security evidence. The complete real-profile/publish/report/moderate walkthrough remains pending approval and login. No private journal text was read during the preview.

## Hosted verification — October 28, 2026

The owner approved the exact reviewed migration (SHA256 9ccc64f6155eaea3305a5ed54117bfa20aceb62a71990b27bb9ba7db1c3f0994) for deardaily-dev only. Final isolated CI/main database tests had passed before application. A fresh preflight found no conflicts; the exact SQL editor payload was compared to the file and executed in BEGIN/COMMIT. The owner later explicitly changed temporary moderator authorization to **permanent User A moderator membership**. This membership affects only the checked public-content/report RPCs; it grants no private-journal access or user/role/deployment management. User B stays ordinary. No authentication settings were changed.

The first hosted run exposed a genuine profile-client integration failure: INSERT with return=representation received 42501 while hidden ownership remained protected. A rolled-back SQL role diagnostic passed. Real ordinary-client probes confirmed minimal INSERT plus the fixed-field my_public_profile RPC succeeds; the probe was cleaned up. The application and verifier now write minimally and verify the safe own-profile fields. No ownership SELECT grant or RLS policy was weakened. Four frontend regression tests cover minimal create/update, mismatched confirmation and write failure.

After that fix, **50 real hosted community checks passed**, including full distinct server-validated user IDs, hidden/opted-in profile visibility, owner-ID/wildcard denial, profile-edit denial with unchanged server state, both directions of private journal read/update/delete isolation while A was a moderator, public source separation, identity spoof denial, hidden ownership/private-join denial, opt-out detachment, report creation/duplicate prevention, anonymous reporting denial, ordinary B moderator queue/action denial, authorized A removal, republish rejection, private-source preservation, owner unpublish and anonymous subsequent-read revocation. User B signed out. The backend removal audit was verified independently before exact-ID synthetic report/audit deletion. Synthetic entries, snapshots and public profiles were removed; original account-profile/settings fingerprints and original entry count were unchanged. No Auth users were deleted.

The rolling five-report limit, malformed reasons/explanation lengths and deletion-request semantics are covered by the 190 isolated pgTAP checks; no additional claim of a real hosted rate-limit run or account deletion is made. Tests used ordinary user sessions and anonymous clients, never a service-role key. The development checker now preserves sessions on failure and offers a B-only reconnect to reduce repeated password handoffs.

Post-migration advisors show the disabled leaked-password warning; five expected authenticated SECURITY DEFINER warnings for the deliberately privileged, internally checked RPCs; five no-policy RLS notices for the private deny-by-default tables; two missing foreign-key indexes on moderation_audit; and four unused-index notices on new/empty tables. The previous public-story FK index warning is absent. These findings were reviewed, not suppressed; indexes/settings/history were not changed beyond the approved SQL. Additional index migrations need approval. No zero-warning or production-readiness claim.

VITE_ENABLE_COMMUNITY stays false, public signup stays disabled, and no deployment or migration-history repair was performed. The full enabled-page UI acceptance flow requires separate activation approval; the database security pass does not override that instruction.

## October 29 localhost acceptance

The owner explicitly approved localhost-only community activation. Real User A login was restored through the owner’s existing login form; passwords were not inspected or stored by the agent. The existing 50 hosted A/B/anonymous/moderator checks remain the distinct-account security evidence; this additional UI walkthrough used User A.

Synthetic real UI checks passed: private save/autosave/reload, rich public story rendering, explicit unpublish with source preservation, source deletion, hidden profile save, explicit profile opt-in, public profile rendering, confirmed public-profile removal, report submission, moderator queue, confirmed removal and audited decision. A catalog read verified private source=1, public copy=0 and removal audit=1 after moderation. No private journal was used as a fixture.

Exact synthetic journal IDs 79f8ae68-a46b-42cb-bc91-d7792a7bfd90 and 0925f1bd-46e1-4e3a-a3b1-eff78326f7c6 were removed; profile synthetic_ui_1029 was removed through the ordinary owner API with safe own-profile confirmation. The moderation report/audit were cleaned transactionally by exact fixture ID and explanation after verifying the synthetic source title/body. Final catalog counts for both sources/snapshots, profile and report were all zero. No real entries/accounts or moderator membership were changed. Anonymous checks again denied private journals and hidden profile ownership, returned no removed snapshots, and confirmed hosted signup remains disabled.

A new confirmed public-profile removal control deletes only the owner’s public identity, detaches story bylines through existing triggers, preserves story text/private journals, and verifies the server result before reporting success. Tests cover exact-row deletion, unsuccessful confirmation and the actual confirmation UI. No database migration was required.

The revised writing canvas passed overflow checks at actual 360/768/1440 widths in all four themes using synthetic preview content; these layout checks do not certify every device or accessibility requirement. All 134 frontend tests, TypeScript, ESLint and production build passed. The previously passed 220 local database checks cover the unchanged SQL. Production remains at its approved baseline; new rich/community functionality is local-only. Known operational warnings/retention, backup recovery, email delivery and release-readiness tasks above remain open. No claim of perfect security or deployment readiness.
