# DearDaily account security model

Status: Phase 2 account foundation with an approved hosted schema in `deardaily-dev`; not a verified live authentication service or production release. Development connectivity, disabled hosted signup, enabled/forced RLS and anonymous HTTP read denial are verified. Real two-account authentication and isolation remain pending. Do not put real journal content into the temporary editor.

## Boundaries and assumptions

Supabase Auth owns password hashing, email verification, tokens, refresh, OAuth identity validation, and PKCE. The browser uses only a publishable key. React route guards protect UI presentation; database grants and RLS enforce access even if someone bypasses that UI.

All request identities used by policies come from the JWT validated by Supabase's API gateway. A client can suggest an ID for a write, but cannot authorize it: every insert policy requires equality to `auth.uid()`. Explicit insert IDs are also identity preconditions, preventing a delayed request for account A from initializing a record for account B after a session change. Owner columns cannot be updated, even to the current user's ID.

Authentication is disabled gracefully when configuration is absent or malformed. Registration is closed in local server configuration and disabled in the UI by default. A frontend flag cannot protect public registration: the hosted project's signup setting and Google tester configuration must be reviewed before connection.

## Data model and privileges

| Table         | Identity                                  | Other data                                                      | Client grants                                              |
| ------------- | ----------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| profiles      | id UUID → auth.users(id)                  | Optional display_name (1–80 characters), created_at, updated_at | SELECT/DELETE; INSERT id/display_name; UPDATE display_name |
| user_settings | user_id UUID primary key → auth.users(id) | Validated theme_id, created_at, updated_at                      | SELECT/DELETE; INSERT user_id/theme_id; UPDATE theme_id    |

Both foreign keys cascade on Auth user deletion. Both identity columns default to `auth.uid()`. Primary keys support ownership lookup. Tables have RLS enabled and forced. PUBLIC and anon receive no table grants; authenticated receives only the listed privileges. There are eight explicit policies: SELECT, INSERT, UPDATE, DELETE for each table. SELECT/DELETE use owner equality; INSERT uses WITH CHECK; UPDATE uses both USING and WITH CHECK. Missing identity cannot match a row.

Theme IDs are constrained to midnight-purple, forest-green, paper-white, and obsidian-black. Clients cannot edit timestamps. A security-invoker trigger with an empty search_path maintains updated_at; its function is not executable through the client API. No security-definer function, public view, or storage policy bypasses the account boundary.

No public profiles, journal table, storage bucket, uploads, or publishing endpoint exists. Delete policies support ownership security tests and future account tooling; no self-service Auth-account deletion UI is included.

## Client lifecycle

The auth-state callback is synchronous; it does not await other Supabase calls. Initial session restoration cannot replace a later auth event. Sign-out clears visible session state immediately; errors remain visible and do not falsely claim revocation. A failed sign-out locks out background session events until an explicit new login attempt. Completion of an older sign-out request cannot clear state or display an error over a newer login attempt; an intent counter rejects stale completions.

Account and theme components are keyed by authenticated user ID. A session change discards their state; account data is never displayed while session restoration is pending. Delayed cloud reads are ignored after unmount. Account reads/writes additionally filter by expected ID, with RLS as the authoritative boundary.

The guest theme is the only app value in localStorage. Supabase's SDK uses sessionStorage for session/PKCE persistence; the application does not invent or manually manipulate auth tokens. This is tab-scoped persistence, not cross-tab login. Browser storage remains accessible to injected JavaScript: XSS prevention, dependency review, secure hosting, and a reviewed Content Security Policy remain important launch work. No claim of complete security is made.

Journal title/body/mood/tags remain in React memory and are never passed to Supabase, browser storage, URLs, or telemetry. Display names intentionally persist to the user's private profile. Raw auth/provider errors and tokens are not logged or rendered.

## Theme synchronization

After login, read the cloud row first. Initialize only an absent row; a uniqueness conflict triggers a reread instead of an overwrite. Errors block further preference mutations until reload/retry. Saves are serialized locally and update the displayed theme only after the database returns the confirmed value. A failed response may represent an uncertain server outcome; retry reads reconcile it rather than guessing.

Visible pages poll every 30 seconds and reread on window focus. Changes on another device therefore converge eventually, not instantly. Concurrent explicit changes use last successful database write wins. No Realtime publication is enabled. Signed-in preferences do not replace the guest's saved browser theme.

## Redirects and recovery

Only approved exact localhost/Netlify origins can initiate email/OAuth redirects. Post-login destinations are a fixed internal allowlist. The SDK validates PKCE and exchanges codes. Callback data is removed from history after initialization. Recovery requires PASSWORD_RECOVERY; normal authenticated sessions cannot use this reset form. Recovery mode is cleared after a successful password update.

PKCE confirmation/recovery requires the initiating browser/tab. Expired, reused, cancelled, or wrong-browser callbacks show neutral errors. Signup/recovery feedback avoids disclosing whether an address exists. Provider overlap is delegated to Supabase; the app never silently links accounts itself.

Sign-out uses Supabase's local scope: other devices remain signed in. Access tokens can remain valid until expiry even after refresh-token revocation. Review token lifetime and account-wide revocation requirements before accepting sensitive records.

## Tests and audit

The transactional pgTAP suite simulates anon, two authenticated users, missing identity, malformed identity, and an unknown UUID. It checks own-row CRUD, cross-user denial, immutable ownership, validated themes, grants, RLS, and delete cascades. Negative writes are followed by owner/admin reads of actual row contents and counts. The JWT settings used in SQL are test impersonation, not an API authorization mechanism.

Run `npm run db:start`, `npm run db:reset`, `npm run db:test` on a Docker-capable machine. The CI workflow also runs the CLI against an isolated runner-local stack. See validation for actual outcomes; a mocked SDK test is not an integration test. Run Supabase Security Advisor on the configured development project separately.

## Secrets and operations

- Never commit database credentials, Google OAuth secrets, secret/service-role keys, or signing material.
- Only project URL and publishable key may enter browser code. Keys and approved origins are validated before initialization.
- Keep .env.local and CLI temporary state ignored. Do not copy raw CLI status output containing admin credentials into logs/issues.
- Apply version-controlled migrations only to a verified development target. Review dry-run output. Production changes require separate approval.
- Configure SMTP, confirmation, rate limits, signup restrictions, OAuth test users, and exact redirects manually.
- Before storing real records, establish backup retention, encryption/access responsibilities, tested restore procedures, deletion retention, incident response, and recovery ownership. Hosted backup/PITR availability depends on project configuration and plan.
- Privacy notice, data retention/export/deletion procedures, age/consent requirements, processing agreements, regional hosting, and applicable legal review remain launch requirements.

## Release recommendation

The local foundation can be reviewed independently. Do not announce working hosted authentication, enable public registration, or admit real journal users until the development integrations and security checks are verified. Phase 3 journal persistence, draft editing/deletion, and synchronization are deliberately deferred; public publishing remains a later phase.

## Executed database verification — October 28, 2026

The account migration was applied to a fresh local Supabase PostgreSQL database on CachyOS/Docker. All 71 pgTAP checks passed for anonymous and two-user isolation, own CRUD, cross-user mutation denial, ownership restrictions, constraints, invalid identities, and cascades. Catalog checks confirmed enabled/forced RLS on both application tables; transaction rollback left both tables empty. The database was stopped after verification, preserving its volume. Hosted schema/RLS and browser authentication flows remain unverified; this result is not a production-readiness claim.

## Approved hosted schema verification — October 28, 2026

The exact locally tested account migration was applied transactionally to deardaily-dev through Dashboard SQL Editor after user approval and an empty-schema conflict check. Both tables have enabled/forced RLS, four policies each, restricted grants and timestamp triggers. Catalog checks deny anonymous CRUD table privileges, ownership updates and timestamp writes. Anonymous HTTP reads return 401/42501. Advisor Center with filters cleared reported no issues. Both tables are empty. Signup remains disabled, email enabled, and confirmation required.

The CLI migration ledger was absent and has not been created or modified; reconcile it with separate approval before any future db push. Do not replay the CREATE migration. Hosted two-user API tests and real authentication/provider/email flows remain pending. Earlier placeholder/unconfigured statements are historical. See VALIDATION.md for the current report and limits.
