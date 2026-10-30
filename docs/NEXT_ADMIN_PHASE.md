# Separate owner, moderation and registration phase

This is a plan for a separate reviewed PR after the editor release. No new administration privileges, publishing bans, notifications or registration settings are enabled by PR #6.

## Current boundary

The existing approved account has a permanent public-content moderator role, not unrestricted database administration. Existing moderation/reporting remains. Private journals, settings and unpublished media remain owner-only, including against moderators. Public registration and anonymous sign-in stay disabled; email confirmation stays enabled.

## Owner identity and MFA

- Verify the owner through their authenticated account and a separately reviewed backend role assignment. Never infer administration from a displayed email, username, frontend flag or editable user metadata.
- Keep role assignments in a protected backend schema with no ordinary-client writes. Require a verified MFA session for privileged actions, with backend enforcement and tests for low-assurance sessions.
- Owner enrolls MFA and handles recovery codes directly. Do not send/store passwords, MFA secrets or recovery codes in chat, logs or repository files.
- Define owner recovery and auditable role changes before enabling owner controls. Public moderation privileges must not confer private-journal access.

## Moderation and publishing bans

- Reuse the current moderation dashboard and restricted reporting RPCs.
- Introduce narrowly scoped publishing restrictions tied to immutable authenticated ownership, not public usernames. A publishing ban removes/restricts public snapshots and their public media access; private writing, private media and account access remain intact.
- Reject publish/update requests in the backend, including direct API calls, while allowing private CRUD and unpublishing.
- Moderate anonymous stories through protected ownership resolution. Do not reveal hidden authors or account details through the public API or notification payloads.
- Record action, reason, actor and time in protected audit records; define review/appeal and retention procedures.

## In-app removal notices

- Create backend-owned notifications routed to the affected owner with a clear reason and safe story reference.
- Enforce recipient-only reads and acknowledgement. Ordinary users cannot forge moderation notices or edit reasons. Notices must not reveal reporter identities, another account's details or private journal text.
- Test deletion, unpublishing, appeal/reversal and retry behavior independently from private-journal deletion.

## Secure registration gate

Keep signup closed until real verification and recovery delivery, Google OAuth, bot protection, rate limits and account-security tests pass. Use supported authentication flows and explicit redirects. Never make app users members of the Supabase organization.

Before opening: test two genuinely different new users and expired/reused links; verify default private permissions, profile opt-in, journal/media isolation and account switching; review storage quotas, abuse responses, moderation coverage, legal/privacy/age policies, account deletion and backup/restore procedures. No claim of verified delivery until actual messages arrive. No paid provider without approval.

## Approval boundary

Prepare additive migrations and operational procedures locally first. Obtain approval before hosted role/MFA-policy, database, Storage, authentication-setting or deployment changes. Enable neither frontend signup nor hosted signup until the final readiness report is approved.
