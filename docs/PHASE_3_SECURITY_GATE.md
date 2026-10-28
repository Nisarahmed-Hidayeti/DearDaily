# Phase 3 security gate — October 28, 2026

Branch: feat/deardaily-phase-3, created from reviewed main commit be29da7. Persistent journals are blocked until this gate passes. The existing UI and all four themes remain unchanged.

## Current evidence

| Requirement | Result |
| --- | --- |
| Local account security suite | Rerun: 71 pgTAP tests passed; local database stopped preserving its volume |
| Hosted account schema/RLS | Phase 2 catalog checks passed; anonymous reads denied; see VALIDATION.md |
| Hosted public signup | Disabled; anonymous login and manual linking disabled; email confirmation enabled |
| Authorized hosted accounts | Zero accounts at read-only inspection; no accounts created |
| Site URL / redirects | Changed with explicit approval to http://localhost:5173, plus exact /auth/callback and /auth/reset-password URLs; saved state verified |
| Email delivery | Custom SMTP disabled; default service only supports project-team recipients |
| Google | Disabled; client configuration and approval pending |
| Migration history | to_regclass returned NULL for supabase_migrations.schema_migrations; no repair performed |
| Hosted profile/settings data | Both empty at inspection |
| Two-account API and auth flows | Not run; need approved tester provisioning and delivery setup |

The dashboard's main/PRODUCTION label identifies the default Supabase database branch; the selected project is deardaily-dev, not the public Netlify deployment.

## Stage 1 — authorized testers and email

Obtain two tester addresses controlled by the owner. Do not put addresses, passwords or tokens in committed files. Request approval for the exact account-creation method and any email recipients before executing it.

Dashboard account creation is a free provisioning option that does not require public signup or service-role keys in the application. The owner must enter each new password directly in the dashboard. If automatic email confirmation is used for synthetic isolation fixtures, explicitly record that this bypasses email verification and cannot satisfy the email-confirmation test. Prefer unconfirmed testers plus a verified email-delivery path when available.

Default SMTP delivers only to project-team addresses and is rate limited. Do not grant organization membership merely to bypass delivery limits. If the two addresses are not already authorized team recipients, select and approve a suitable SMTP service/sender first. No provider signup, purchase, DNS change or secret entry is authorized by this document. Store SMTP credentials only in the provider/Supabase dashboard.

An invitation flow must be reviewed against the actual SDK callback behavior before using it as onboarding; sending an invitation alone does not establish working password setup, confirmation or recovery.

Manual setup after account approval: Supabase → deardaily-dev → Authentication → Users → Add user. Keep Allow new users to sign up disabled. Password entry is performed by the owner, never through chat.

## Stage 2 — real browser authentication and API isolation

Use only synthetic profile/settings values and actual ordinary user sessions. No privileged/service-role credential may substitute for either user's session. Obtain approval for test fixture writes before running hosted mutations, even when the records are disposable. Record pass/fail without emails, UUIDs, passwords, token strings, callback URLs containing codes, or raw provider errors.

For each account verify email sign-in, unverified-email denial, email confirmation, callback cleanup, session restoration, protected routes, logout, token refresh and expiry. Verify recovery completion and expired/reused/wrong-browser recovery failures. Test A → logout → B and delayed account/theme requests. An admin-confirmed account does not prove the email-confirmation flow. A malformed token is not proof of actual expiration handling.

For A and B test own profile/settings create/read/update/delete; direct reads targeting the other ID; forged ownership insert; ownership/timestamp update denial; cross-user update/delete; anonymous and signed-out requests. Check returned rows and verify the original owner data after every negative write, since a successful HTTP response can affect zero rows. Tests must use the existing policies without widening grants. Do not erase any pre-existing data. Report partially completed fixture cleanup honestly.

## Stage 3 — safe migration-history reconciliation proposal

Only migration 20261027000100_account_foundation.sql exists. Its reviewed SHA-256 is 902ec29e1f922db30b04f10328e0980eee3d241c0c4949a86876b885db3534dc. SQL was applied in the dashboard; the CLI ledger remains absent.

1. Reconfirm the development target and compare remote tables, columns/defaults/constraints, all eight policy definitions, grants, trigger/function definitions and ownership behavior with the tested migration. Stop on drift. Inspect history again immediately before repair.
2. Authenticate the Supabase CLI privately using `npx supabase login`, then link only the approved development project. The owner handles credentials through the official login/prompt. No tokens/passwords in command arguments, chat, logs or source files. Do not reset database credentials merely to get CLI access.
3. After reviewing the target and receiving separate approval, mark only the already-applied version:

```bash
npx supabase migration repair 20261027000100 --status applied --linked
```

This updates migration bookkeeping and may initialize the CLI metadata schema/table. It must not execute the application migration, drop/recreate tables, alter policies or change account data. Never mark the migration reverted and never rerun its CREATE SQL.

4. Inspect `npx supabase migration list --linked`; verify exactly the intended version is recorded remotely. Compare the application schema and row counts before/after. Review `npx supabase db push --dry-run` only; it should list no pending migrations. Do not run an actual db push in this step.
5. If CLI authentication is unavailable or repair proposes unexpected objects/versions, stop and explain. A hand-written replacement ledger is not automatically authorized.

Official reference: https://supabase.com/docs/reference/cli/supabase-migration-repair

## Stage 4 — Google OAuth

Only after explicit approval: configure Google Auth Platform Branding/Audience (Testing with exactly approved testers), request only openid/email/profile, create a Web application client with localhost:5173 as its development origin and the exact callback shown by Supabase's Google provider. The Google callback is Supabase's /auth/v1/callback, distinct from DearDaily's /auth/callback. The owner enters the client secret directly in Supabase; never use a VITE variable for it. Keep Supabase public signup disabled and manual linking disabled. Test provider overlap and approved existing tester identity provisioning; do not assume a password account automatically proves Google access.

Official references:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/auth-smtp

## Exit criteria

All real auth flows, two-account isolation, migration reconciliation, local security tests, and blocking findings must pass before journal schema/frontend implementation. Every result needs dated evidence. No journal table, autosave, public publishing, deployment, or main merge is authorized by this gate document.
