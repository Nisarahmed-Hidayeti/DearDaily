# Phase 4 — staged community implementation

Status: INCOMPLETE; hosted approval and real-session security verification required.
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
