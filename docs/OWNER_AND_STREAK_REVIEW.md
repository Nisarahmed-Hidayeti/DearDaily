# Owner controls and optional public streak — review

Status: all three reviewed migrations are applied once to deardaily-dev, and the confirmed owner has the permanent protected backend role. Only localhost owner/streak UI is enabled. Real owner MFA and hosted security tests remain pending; production owner/streak flags remain OFF. Existing moderator access and open protected registration are unchanged.

## Proposed changes for deardaily-dev only

1. `20261108000100_owner_controls.sql` adds four protected, forced-RLS tables: owners, publishing restrictions, owner audit and recipient notices. No ordinary client has table access. Backend owner membership AND an MFA `aal2` session are required for every new privileged operation. This never grants private-journal/private-media access.
2. Owner actions list public stories (including anonymous stories), remove a chosen public story, restrict an author's future publishing while removing all their public snapshots, and restore future publishing. Removed entries stay blocked after restoration; nothing is republished automatically. Private journal CRUD and login remain available to restricted authors. Reasons and audit records are required; affected authors receive only their own notices. Existing moderator/report functions remain as before.
3. `20261108000200_optional_public_streak.sql` adds nullable `public_streak` to public profiles, default NULL for every existing account. Only the approved count is readable; direct writes are denied. An authenticated own-profile RPC calculates a snapshot of consecutive saved entry dates after explicit consent. The current day permits a ±1-day timezone boundary; no source date, title, mood, owner ID or journal text is returned. Private edits never refresh the public count. Hide immediately stores NULL; hidden profiles remain unreadable.
4. After a clean hosted preflight and specific approval, assign only the confirmed account `nisarahmedhidayeti@gmail.com` to the protected owner table using `supabase/manual/assign_verified_owner.sql`. Resolve its immutable ID from Auth first; stop on duplicate/unconfirmed identity or any unexpected existing owner. The assignment is permanent until explicitly revoked through trusted backend administration. No email/metadata-based frontend privilege checks, no service-role key in the frontend and no Supabase organization invitation.

## Preflight and application boundaries

- Verify dashboard project deardaily-dev / tauqionxprutoahymjgu, no conflicting new tables/columns/functions, unchanged existing profile RPC, current migration history and exact reviewed SQL hashes. Do not reapply old migrations or repair history.
- Additive only: no resets, real-row deletion, journal rewriting, bucket-policy changes, authentication-setting changes or automatic role inference.
- Existing provider backup/export access should be checked; operational backup retention and restore rehearsal remain incomplete. Do not claim this is a tested disaster-recovery plan. Rollback is disable new frontend flags and revoke the new owner assignment under separate approval; preserve tables/data rather than dropping them.
- First enable only localhost `VITE_ENABLE_OWNER_ADMIN` and `VITE_ENABLE_PUBLIC_STREAKS`. Their checked-in defaults are false, so production remains unchanged. Require GitHub checks plus clean hosted preflight before applying either migration or assigning the role.
- Owner must set up/verify their authenticator directly in DearDaily. Never ask for or inspect QR secrets, OTPs, passwords or recovery material. An `aal1` owner cannot perform these new actions. Manual recovery must use trusted project administration; there is no client-side bypass.
- Hosted tests require real owner MFA, User B and anonymous sessions; use synthetic stories only. Test ban/removal/unban, private CRUD under a ban, notices, direct API spoofing/denial, optional streak consent/hide and public-photo revocation. Clean exact synthetic IDs and any synthetic ban state. Never remove real owner membership or real stories as test cleanup.
- Do not deploy/enable owner or streak production flags until these hosted tests pass. Do not describe the owner as having active new controls before role assignment, real MFA and hosted verification are complete.

## Current evidence

- Local database: 331 passing pgTAP checks, including 49 owner/MFA/ban/privacy checks and 18 streak/privacy checks. Tests use rollback-only fixtures.
- Focused frontend: 37 checks passed across owner, streak, account and community suites. Complete suite: 220 frontend tests across 39 files passed; TypeScript, ESLint and production build passed. Hosted owner-MFA and streak tests remain pending approval and setup.
- Existing signup/media release evidence: 213 frontend checks, 264 earlier pgTAP checks, 54 hosted journal and 47 hosted media checks; real live upload→reload→explicit anonymous photo publish→view→unpublish passed after adding exactly the approved live origin. Anonymous private reads were denied and the synthetic live entry was deleted.
- Audio/MP3/recording support is still unfinished. It needs a separate constrained audio format, trusted server-side validation, private storage and explicit public-copy tests. Existing image bucket restrictions were not weakened. No claim that all requested features are complete.

## Reviewed local SQL receipts

23631c013af65c5a71eb2d122af6463196cecb08426ed35105501ae18af8cb36 supabase/migrations/20261108000100_owner_controls.sql
99bad1b6047730be613ab9f019a5e0d44fc82884de9be429b426918fba4e90bb supabase/migrations/20261108000200_optional_public_streak.sql

## Hosted application and compatibility correction

The approved preflight found no conflicts, five original tables with forced RLS, one confirmed owner identity (receipt ending cb18d80862df), and the original expected profile RPC. The existing migration-history table is absent; no history repair or new history table was performed.

The two approved migration transactions and owner assignment committed. Reviewed SQL was copied back from the editor and compared exactly before execution. SQL editor receipts:

- Owner migration: 9ce42d7e-cb5a-4590-a4d3-0268a1f206b8
- Streak migration: bc93f31b-5888-4581-a0e1-d91fd2ded317
- Confirmed owner assignment: eaa695fb-2e8b-46b3-aec4-41e2ef63f545

Postflight: exactly one matching owner, four new forced-RLS tables, zero ordinary-client table privileges, zero anonymous function-execution grants, and zero shared streaks. Only localhost owner/streak flags were enabled. Production owner/streak flags remain off. Google requested an owner identity check during localhost login; user handoff is pending. No MFA secret or code is handled by the assistant.

An older-client compatibility case was caught before feature deployment: the newly extended my_public_profile RPC includes read-only public_streak, while the deployed profile editor submits the returned object as its update payload. This can reject current profile saves. The correction `20261108000300_profile_response_compatibility.sql` restores the exact original writable RPC response and existing grants, with no row updates or privacy changes. New streak-enabled code reads the approved count separately through existing SELECT permissions; it never writes the server-owned field. The original two migration files and their receipts remain unchanged. This third hosted correction was separately approved and applied; its verification receipt is recorded below.

Regression coverage checks that every legacy own-profile RPC field remains writable, and checks separate count reads when the new flag is enabled. Local database coverage now totals 332 checks. The dev-only owner harness additionally verifies actual low/raised-MFA sessions for the same immutable owner ID and a distinct confirmed approved writer. It refuses any nonempty writer account, creates only exact synthetic fixtures, tests public-photo revocation on a publishing ban, and retains cleanup receipts for protected synthetic audits/notices. It never serializes sessions, grants roles, changes MFA or uses real journals as fixtures.
e1dbdd06ac0f18cc73fb33fb4914e88336079491625ca27999b48a9c856bebf8 supabase/migrations/20261108000300_profile_response_compatibility.sql

Latest local verification: 223 frontend tests across 40 files, 332 pgTAP checks, TypeScript, ESLint and build passed. Owner verification code is DEV-only and excluded from the production bundle. Both optional production feature flags stay disabled. No claim of completed hosted owner-MFA verification is made.

## Profile compatibility correction applied

Owner separately approved 20261108000300. CI passed; the hosted preflight matched the expected new RPC source and found the single expected owner. Editor copy-back matched the reviewed transaction exactly. The transaction committed under SQL receipt 260a1455-283c-4131-b406-231e9e79a6a1. Postflight verified original_response_restored=true, authenticated_allowed=true, anonymous_allowed=false, owner_count=1. No rows or other permissions changed. Do not reapply this migration.

The expired owner OAuth callback was restarted using the newly verified Google identity without requesting another password. The localhost owner account is confirmed, and its real pre-MFA session and the distinct approved writer session are retained only in the verification tab's memory. The owner setup page is open; TOTP enrollment/verification is a user-only handoff. Never inspect or capture the QR or code. Actual AAL2 capture, hosted tests and exact protected-audit cleanup remain pending.
